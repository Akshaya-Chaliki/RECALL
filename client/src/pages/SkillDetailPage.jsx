import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getTopics, deleteTopic, generateEntryTest, submitEntryTest, getSkills } from "../services/api";
import { ArrowLeft, Plus, X, Trash2, BrainCircuit, Loader2, ChevronRight, Sparkles, Activity } from "lucide-react";
import RetentionGraph from "../components/RetentionGraph";

const SkillDetailPage = () => {
  const { skillId } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [skill, setSkill] = useState(null);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal state machine
  const [modalState, setModalState] = useState(null);
  const [topicName, setTopicName] = useState("");
  const [topicDescription, setTopicDescription] = useState("");
  const [questions, setQuestions] = useState([]);
  const [selected, setSelected] = useState({});
  const [currentQ, setCurrentQ] = useState(0);
  const [submitError, setSubmitError] = useState("");

  const fetchData = async () => {
    try {
      const [skillsRes, topicsRes] = await Promise.all([
        getSkills(),
        getTopics(skillId),
      ]);
      const skillsList = skillsRes.data?.data || [];
      const foundSkill = skillsList.find(s => s._id === skillId);
      setSkill(foundSkill || { name: "Skill", _id: skillId });
      setTopics(topicsRes.data?.data || []);
    } catch (err) {
      if (err.response?.status === 401) { logout(); navigate("/login"); }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [skillId]);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!confirm("Delete this topic and all its data?")) return;
    try {
      await deleteTopic(id);
      fetchData();
    } catch (err) {
      alert("Failed to delete");
    }
  };

  // ── Skill Mastery Calculation ──
  const getRetentionNow = (ms) => {
    if (!ms) return 0;
    try {
      const h = Math.max(0.1, Number(ms.h || ms.halfLife || 24));
      const m = Number(ms.M || ms.initialMemoryStrength || 100);
      const lastCalc = ms.lastCalculated ? new Date(ms.lastCalculated).getTime() : Date.now();
      const hoursPassed = (Date.now() - lastCalc) / (1000 * 60 * 60);
      const retention = m * Math.pow(2, -hoursPassed / h);
      return Number.isNaN(retention) ? 0 : Math.max(0, Math.min(100, retention));
    } catch (e) {
      console.error("Retention calc error:", e);
      return 0;
    }
  };

  const currentSkillRetention = topics.length > 0
    ? topics.reduce((acc, t) => acc + getRetentionNow(t.memoryState), 0) / topics.length
    : 100;
  
  const safeRetention = Number.isNaN(currentSkillRetention) ? 0 : currentSkillRetention;

  const isRed = safeRetention < 50;
  const isYellow = safeRetention >= 50 && safeRetention < 70;
  const zoneColor = isRed ? "#ef4444" : isYellow ? "#eab308" : "#22c55e";

  const chartData = [];
  try {
    for (let day = 0; day <= 7; day++) {
      const hoursFromNow = day * 24;
      let sum = 0;
      topics.forEach(t => {
        const ms = t.memoryState;
        if (ms) {
          const h = Math.max(0.1, Number(ms.h || ms.halfLife || 24));
          const m = Number(ms.M || ms.initialMemoryStrength || 100);
          const lastCalc = ms.lastCalculated ? new Date(ms.lastCalculated).getTime() : Date.now();
          const hoursPassed = (Date.now() - lastCalc) / (1000 * 60 * 60) + hoursFromNow;
          const r = m * Math.pow(2, -hoursPassed / h);
          sum += Number.isNaN(r) ? 0 : r;
        } else {
          sum += 100; // Assume 100% for new topics
        }
      });
      const avg = topics.length > 0 ? sum / topics.length : 100;
      chartData.push({ day, retention: parseFloat(Math.max(0, Math.min(100, avg)).toFixed(2)) });
    }
  } catch (e) {
    console.error("Chart data generation error:", e);
  }

  // ── Test-Before-Add Flow ──
  const openAddTopicModal = () => {
    setModalState("name");
    setTopicName("");
    setTopicDescription("");
    setQuestions([]);
    setSelected({});
    setCurrentQ(0);
    setSubmitError("");
  };

  const closeModal = () => setModalState(null);

  const handleGenerateEntryTest = async (e) => {
    e.preventDefault();
    if (!topicName.trim()) return;
    setModalState("loading");
    try {
      const res = await generateEntryTest(topicName.trim());
      // Backend returns { success, data: { topic, questions } }
      const payload = res.data?.data;
      const questionsArray = Array.isArray(payload)
        ? payload
        : payload?.questions || [];
      
      if (questionsArray.length === 0) {
        setSubmitError("No questions were generated. Please try again.");
        setModalState("name");
        return;
      }
      
      setQuestions(questionsArray);
      setModalState("quiz");
    } catch (err) {
      setSubmitError(err.response?.data?.message || "Failed to generate questions");
      setModalState("name");
    }
  };

  const handleSubmitEntryTest = async () => {
    setModalState("submitting");
    setSubmitError("");
    try {
      let score = 0;
      questions.forEach((q, i) => { if (selected[i] === q.correctAnswer) score++; });
      const answersArray = questions.map((_, i) => selected[i] || "");

      await submitEntryTest({
        skillId,
        topicName: topicName.trim(),
        description: topicDescription.trim(),
        score,
        answers: answersArray,
      });

      closeModal();
      fetchData();
    } catch (err) {
      setSubmitError(err.response?.data?.message || "Failed to save topic");
      setModalState("quiz");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans">
      <header className="border-b border-white/5 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Sparkles size={18} />
            </div>
            <h1 className="text-xl font-bold tracking-tight">RECALL</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400">Hi, {user?.name}</span>
            <button onClick={() => { logout(); navigate("/login"); }} className="text-sm text-slate-500 hover:text-white transition">Sign Out</button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-10">
        <button onClick={() => navigate("/")} className="flex items-center gap-2 text-slate-400 hover:text-white transition text-sm mb-6">
          <ArrowLeft size={16} /> Back to Skills
        </button>

        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <h2 className="text-4xl font-extrabold tracking-tight mb-2">{skill?.name || "..."}</h2>
            <p className="text-slate-400 text-sm">Manage topics and track memory retention for this skill.</p>
          </div>
          <button
            onClick={openAddTopicModal}
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-5 py-3 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-indigo-500/20"
          >
            <Plus size={18} /> Add Topic
          </button>
        </div>

        {/* Skill Mastery Graph */}
        {!loading && topics.length > 0 && (
          <div className="bg-slate-900/60 border border-white/5 rounded-[2rem] p-8 mb-8 overflow-hidden relative" style={{ borderColor: `${zoneColor}22` }}>
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ background: `linear-gradient(180deg, ${zoneColor}20, transparent)` }} />
            <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <Activity size={24} style={{ color: zoneColor }} />
                  <h3 className="text-2xl font-bold text-white">Skill Mastery</h3>
                </div>
                <p className="text-slate-400 text-sm mb-6">Average retention across {topics.length} topic{topics.length === 1 ? '' : 's'}</p>
                <div className="text-5xl font-black mb-2" style={{ color: zoneColor }}>{safeRetention.toFixed(1)}%</div>
                <p className="text-xs text-slate-500">Predicted 7-Day Average Decay</p>
              </div>
              <div className="w-full md:w-2/3 h-[250px]">
                <RetentionGraph data={chartData} zoneColor={zoneColor} />
              </div>
            </div>
          </div>
        )}

        {/* ═══════════ Interview Readiness Tracker ═══════════ */}
        {!loading && topics.length > 0 && (() => {
          const readyTopics = topics.filter(t => getRetentionNow(t.memoryState) > 80);
          const rawMastery = topics.length > 0 ? (readyTopics.length / topics.length) * 100 : 0;
          const mastery = Number.isNaN(rawMastery) ? 0 : rawMastery;
          const masteryColor = mastery >= 80 ? "#22c55e" : mastery >= 50 ? "#eab308" : "#ef4444";
          const masteryLabel = mastery >= 80 ? "Interview Ready" : mastery >= 50 ? "Needs Practice" : "Not Ready";
          return (
            <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-6 mb-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${masteryColor}15` }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={masteryColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  </div>
                  <h3 className="text-base font-bold text-white">Interview Readiness</h3>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-lg" style={{ color: masteryColor, backgroundColor: `${masteryColor}15` }}>
                  {masteryLabel}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1 h-3 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${mastery}%`, background: `linear-gradient(90deg, ${masteryColor}, ${masteryColor}cc)` }}
                  />
                </div>
                <span className="text-lg font-black min-w-[4rem] text-right" style={{ color: masteryColor }}>{mastery.toFixed(0)}%</span>
              </div>
              <p className="text-xs text-slate-500 mt-3">{readyTopics.length} of {topics.length} topics above 80% retention threshold</p>
            </div>
          );
        })()}

        {/* Topics Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-12 h-12 border-4 border-indigo-500/20 rounded-full animate-spin border-t-indigo-500" />
          </div>
        ) : topics.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-24 h-24 bg-slate-800/50 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <BrainCircuit size={40} className="text-slate-600" />
            </div>
            <h3 className="text-xl font-semibold text-slate-300 mb-2">No topics yet</h3>
            <p className="text-slate-500 text-sm mb-6">Add a topic and take a quick entry test to start tracking.</p>
            <button onClick={openAddTopicModal} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl text-sm font-semibold transition">
              Add Your First Topic
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {topics.map((topic) => {
              const r = getRetentionNow(topic.memoryState);
              const isTopicRed = r < 50;
              const isTopicYellow = r >= 50 && r < 70;
              const tColor = isTopicRed ? "#ef4444" : isTopicYellow ? "#eab308" : "#22c55e";

              return (
                <div
                  key={topic._id}
                  onClick={() => navigate(`/topics/${topic._id}/analytics?name=${encodeURIComponent(topic.name)}`)}
                  className="relative bg-slate-900/50 border border-white/5 rounded-2xl p-6 cursor-pointer hover:border-indigo-500/30 hover:-translate-y-1 transition-all duration-200 group overflow-hidden"
                >
                  <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity" style={{ backgroundColor: tColor }} />

                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center" style={{ color: tColor }}>
                        <BrainCircuit size={20} />
                      </div>
                      <button
                        onClick={(e) => handleDelete(topic._id, e)}
                        className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all p-1"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <h3 className="text-base font-bold text-white mb-1 group-hover:text-indigo-300 transition">{topic.name}</h3>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="font-bold text-sm" style={{ color: tColor }}>{r.toFixed(0)}% retention</span>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                      <span className="text-xs text-slate-500">View analytics</span>
                      <ChevronRight size={16} className="text-slate-600 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══════════ Test-Before-Add Modal ═══════════ */}
      {modalState && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={closeModal}>
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl animate-in" onClick={(e) => e.stopPropagation()}>
            {/* Step 1 */}
            {modalState === "name" && (
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-white">Add New Topic</h3>
                  <button onClick={closeModal} className="text-slate-500 hover:text-white transition"><X size={20} /></button>
                </div>
                {submitError && (
                  <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3 mb-4">{submitError}</div>
                )}
                <form onSubmit={handleGenerateEntryTest} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Topic Name</label>
                    <input
                      type="text" required autoFocus
                      placeholder="e.g., React Hooks, Binary Search"
                      value={topicName}
                      onChange={(e) => setTopicName(e.target.value)}
                      className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Description (optional)</label>
                    <input
                      type="text"
                      placeholder="Short description"
                      value={topicDescription}
                      onChange={(e) => setTopicDescription(e.target.value)}
                      className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <button type="submit" className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 text-white py-3 rounded-lg text-sm font-semibold transition">
                    Generate Entry Test →
                  </button>
                  <p className="text-xs text-slate-500 text-center">You'll answer 3 questions to calibrate your baseline.</p>
                </form>
              </div>
            )}

            {/* Step 2 */}
            {modalState === "loading" && (
              <div className="p-12 flex flex-col items-center text-center">
                <div className="relative mb-6">
                  <div className="w-16 h-16 border-4 border-indigo-500/20 rounded-full animate-spin border-t-indigo-500" />
                  <BrainCircuit size={24} className="text-indigo-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Crafting assessment...</h3>
                <p className="text-slate-500 text-sm">Generating 3 questions about {topicName}</p>
              </div>
            )}

            {/* Step 3 */}
            {modalState === "quiz" && questions.length > 0 && (
              <div className="p-8">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold text-white">Entry Test: {topicName}</h3>
                  <button onClick={closeModal} className="text-slate-500 hover:text-white transition"><X size={20} /></button>
                </div>
                <p className="text-xs text-slate-500 mb-5">Question {currentQ + 1} of {questions.length}</p>

                <div className="h-1 bg-slate-800 rounded-full mb-6 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all" style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }} />
                </div>

                {submitError && <div className="bg-red-500/10 text-red-400 text-sm p-3 mb-4">{submitError}</div>}
                <h4 className="text-base text-slate-100 font-medium leading-relaxed mb-6">{questions[currentQ].question}</h4>

                <div className="space-y-2.5">
                  {questions[currentQ].options.map((opt, i) => {
                    const isSelected = selected[currentQ] === opt;
                    return (
                      <button
                        key={i}
                        onClick={() => setSelected({ ...selected, [currentQ]: opt })}
                        className={`w-full text-left p-3.5 rounded-xl border transition-all text-sm ${
                          isSelected ? "bg-indigo-500/15 border-indigo-500/50 text-white" : "bg-slate-800/30 border-white/5 text-slate-300 hover:bg-slate-800/50"
                        }`}
                      >
                        {opt} {isSelected && <span className="float-right text-indigo-400">✓</span>}
                      </button>
                    );
                  })}
                </div>

                <div className="flex justify-between mt-6">
                  <button onClick={() => setCurrentQ(i => i - 1)} disabled={currentQ === 0} className="px-4 py-2 text-sm text-slate-400">← Previous</button>
                  {currentQ === questions.length - 1 ? (
                    <button onClick={handleSubmitEntryTest} disabled={!selected[currentQ]} className="bg-emerald-600 text-white px-6 py-2 rounded-lg text-sm font-semibold disabled:opacity-50">Submit & Save Topic</button>
                  ) : (
                    <button onClick={() => setCurrentQ(i => i + 1)} disabled={!selected[currentQ]} className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-semibold disabled:opacity-50">Next →</button>
                  )}
                </div>
              </div>
            )}

            {/* Step 4 */}
            {modalState === "submitting" && (
              <div className="p-12 flex flex-col items-center text-center">
                <Loader2 size={40} className="text-indigo-500 animate-spin mb-4" />
                <h3 className="text-lg font-bold text-white mb-2">Saving topic...</h3>
                <p className="text-slate-500 text-sm">Calculating initial memory baseline</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SkillDetailPage;
