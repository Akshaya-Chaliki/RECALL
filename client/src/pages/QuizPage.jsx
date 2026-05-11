import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { generateQuiz, submitQuiz } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { BrainCircuit, CheckCircle2, ArrowRight } from "lucide-react";

const QuizPage = () => {
  const { topicId } = useParams();
  const [searchParams] = useSearchParams();
  const topicName = searchParams.get("name") || "Topic";
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState({});
  
  // Behavioral Signals State
  const [confidence, setConfidence] = useState({});
  const [latency, setLatency] = useState({});
  const [startTime, setStartTime] = useState(Date.now());

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  useEffect(() => {
    const fetchQuestions = async () => {
      setLoading(true);
      try {
        const res = await generateQuiz(topicId);
        // Backend returns { success, data: { topic, questions } }
        // Extract the questions array from the nested response
        const payload = res.data?.data;
        const questionsArray = Array.isArray(payload)
          ? payload
          : payload?.questions || [];
        
        if (questionsArray.length === 0) {
          setError("No questions were generated. Please try again.");
          return;
        }
        
        setQuestions(questionsArray);
        setStartTime(Date.now());
      } catch (err) {
        if (err.response?.status === 401) { logout(); navigate("/login"); return; }
        setError("Failed to generate questions. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchQuestions();
  }, [topicId]);

  const recordLatency = () => {
    const elapsed = (Date.now() - startTime) / 1000;
    setLatency((prev) => ({
      ...prev,
      [currentIdx]: (prev[currentIdx] || 0) + elapsed,
    }));
    setStartTime(Date.now());
  };

  const handleNext = () => {
    recordLatency();
    setCurrentIdx(i => i + 1);
  };

  const handlePrev = () => {
    recordLatency();
    setCurrentIdx(i => i - 1);
  };

  const handleSubmit = async () => {
    // Record final latency for the current question
    const elapsed = (Date.now() - startTime) / 1000;
    const finalLatency = {
      ...latency,
      [currentIdx]: (latency[currentIdx] || 0) + elapsed,
    };

    setSubmitting(true);
    try {
      // Calculate raw correct count
      let score = 0;
      questions.forEach((q, i) => {
        if (selected[i] === q.correctAnswer) score++;
      });

      // Construct behavioral payload
      const answersArray = questions.map((q, i) => ({
        question: q.question,
        selectedOption: selected[i] || "",
        latency: finalLatency[i] || 0,
        confidence: confidence[i] || 3, // Default confidence to 3 if untouched
        confidenceLevel: confidence[i] || 3, // Required by auditor checks
      }));

      const res = await submitQuiz(topicId, { score, answers: answersArray });
      setResult({ ...res.data.data, total: questions.length });
    } catch (err) {
      if (err.response?.status === 401) { logout(); navigate("/login"); return; }
      setError("Failed to submit quiz.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading State ──
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <div className="relative mb-6">
          <div className="w-20 h-20 border-4 border-indigo-500/20 rounded-full animate-spin border-t-indigo-500" />
          <BrainCircuit size={28} className="text-indigo-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">AI is crafting your assessment...</h2>
        <p className="text-slate-500 text-sm">{topicName}</p>
        <p className="text-slate-600 text-xs mt-4">Generating 5 challenging questions. This may take a few seconds.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-8 text-center max-w-md">
          <p className="text-red-400 font-medium mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="bg-red-500/20 text-red-300 px-6 py-2.5 rounded-lg hover:bg-red-500/30 transition font-medium">Retry</button>
        </div>
      </div>
    );
  }

  // ── Results Screen ──
  if (result) {
    // result.score now represents the raw correctness (or whatever backend sends)
    const scoreColor = result.score >= 4 ? "text-emerald-400" : result.score >= 3 ? "text-yellow-400" : "text-red-400";
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-10 w-full max-w-lg text-center">
          <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl shadow-indigo-500/20">
            <span className="text-4xl font-black text-white">{result.score}</span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-1">Quiz Complete!</h2>
          <p className="text-slate-400 mb-8">{topicName}</p>

          <div className="grid grid-cols-2 gap-4 mb-10">
            <div className="bg-slate-800/50 rounded-2xl p-5">
              <p className="text-xs text-slate-500 mb-1.5 font-medium">Score</p>
              <p className={`text-2xl font-bold ${scoreColor}`}>{result.score}/{result.total}</p>
            </div>
            <div className="bg-slate-800/50 rounded-2xl p-5">
              <p className="text-xs text-slate-500 mb-1.5 font-medium">New Half-Life</p>
              <p className="text-2xl font-bold text-purple-400">{result.newHalfLife.toFixed(1)}h</p>
            </div>
          </div>
          
          {result.behavioralScore && (
             <p className="text-xs text-slate-500 mb-6">Behavioral Score applied: {result.behavioralScore.toFixed(1)}/5 (Factored Latency & Confidence)</p>
          )}

          <button
            onClick={() => navigate(`/topics/${topicId}/analytics?name=${encodeURIComponent(topicName)}&fromQuiz=true`)}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-8 py-4 rounded-xl font-semibold transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
          >
            <CheckCircle2 size={18} /> View Updated Retention <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  // ── Quiz UI ──
  if (questions.length === 0) return null;
  const q = questions[currentIdx];
  const isLast = currentIdx === questions.length - 1;
  const progress = ((currentIdx + 1) / questions.length) * 100;
  const currentConfidence = confidence[currentIdx] || 3;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950/30 to-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-bold text-white">Assessment: {topicName}</h1>
          </div>
          <span className="text-sm font-semibold text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
            {currentIdx + 1} / {questions.length}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-slate-800 rounded-full mb-8 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>

        {/* Question */}
        <div className="bg-slate-900/60 border border-white/5 rounded-3xl p-8 mb-6 shadow-xl">
          <h2 className="text-lg text-slate-100 font-medium leading-relaxed mb-8">{q.question}</h2>
          <div className="space-y-3 mb-8">
            {q.options.map((opt, i) => {
              const isSelected = selected[currentIdx] === opt;
              return (
                <button
                  key={i}
                  onClick={() => setSelected({ ...selected, [currentIdx]: opt })}
                  className={`w-full text-left p-4 rounded-2xl border transition-all ${
                    isSelected
                      ? "bg-indigo-500/15 border-indigo-500/50 text-white shadow-lg shadow-indigo-500/10"
                      : "bg-slate-800/30 border-white/5 text-slate-300 hover:bg-slate-800/80 hover:border-white/10"
                  }`}
                >
                  <span className="text-sm">{opt}</span>
                  {isSelected && <span className="float-right text-indigo-400">✓</span>}
                </button>
              );
            })}
          </div>

          {/* Confidence Slider */}
          <div className="bg-slate-950/50 rounded-2xl p-5 border border-white/5">
            <div className="flex justify-between items-center mb-3">
              <label className="text-sm font-semibold text-slate-300">Your Confidence</label>
              <span className={`text-xs font-bold px-2 py-1 rounded-md ${currentConfidence <= 2 ? 'bg-red-500/20 text-red-400' : currentConfidence >= 4 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                {currentConfidence === 1 && "Very Low"}
                {currentConfidence === 2 && "Low"}
                {currentConfidence === 3 && "Medium"}
                {currentConfidence === 4 && "High"}
                {currentConfidence === 5 && "Certain"}
              </span>
            </div>
            <input 
              type="range" 
              min="1" max="5" step="1" 
              value={currentConfidence}
              onChange={(e) => setConfidence({ ...confidence, [currentIdx]: parseInt(e.target.value) })}
              className="w-full accent-indigo-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-medium mt-2 px-1">
              <span>1</span>
              <span>2</span>
              <span>3</span>
              <span>4</span>
              <span>5</span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            onClick={handlePrev}
            disabled={currentIdx === 0}
            className="px-6 py-3 rounded-xl text-sm font-semibold text-slate-400 hover:text-white disabled:text-slate-700 disabled:cursor-not-allowed transition bg-slate-800/50 border border-white/5"
          >
            ← Previous
          </button>

          {isLast ? (
            <button
              onClick={handleSubmit}
              disabled={!selected[currentIdx] || submitting}
              className="bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white px-8 py-3 rounded-xl text-sm font-bold transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20"
            >
              {submitting ? "Submitting..." : "Submit Quiz"}
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={!selected[currentIdx]}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-8 py-3 rounded-xl text-sm font-bold transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20"
            >
              Next →
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizPage;
