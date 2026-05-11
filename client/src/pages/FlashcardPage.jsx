import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { getFlashcards } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { ArrowLeft, RotateCcw, Sparkles, BookOpen } from "lucide-react";

const FlashcardPage = () => {
  const { topicId } = useParams();
  const [searchParams] = useSearchParams();
  const topicName = searchParams.get("name") || "Topic";
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [cards, setCards] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    const fetchCards = async () => {
      setLoading(true);
      try {
        const res = await getFlashcards(topicId);
        const payload = res.data?.data;
        const flashcards = payload?.flashcards || payload || [];
        if (flashcards.length === 0) {
          setError("No flashcards were generated. Please try again.");
          return;
        }
        setCards(flashcards);
      } catch (err) {
        if (err.response?.status === 401) { logout(); navigate("/login"); return; }
        setError("Failed to generate flashcards. Please try again.");
      } finally {
        setLoading(false);
        setTimeout(() => setAnimateIn(true), 100);
      }
    };
    if (topicId) fetchCards();
  }, [topicId]);

  const handleNext = () => {
    setFlipped(false);
    setCurrentIdx((i) => Math.min(i + 1, cards.length - 1));
  };

  const handlePrev = () => {
    setFlipped(false);
    setCurrentIdx((i) => Math.max(i - 1, 0));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <div className="relative mb-6">
          <div className="w-20 h-20 border-4 border-indigo-500/20 rounded-full animate-spin border-t-indigo-500" />
          <BookOpen size={28} className="text-indigo-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Generating flashcards...</h2>
        <p className="text-slate-500 text-sm">{topicName}</p>
        <p className="text-slate-600 text-xs mt-4">Creating 10 review cards. This may take a few seconds.</p>
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

  if (cards.length === 0) return null;

  const card = cards[currentIdx];
  const progress = ((currentIdx + 1) / cards.length) * 100;

  return (
    <div className={`min-h-screen bg-slate-950 text-white font-sans transition-all duration-700 ease-out ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      {/* Header */}
      <header className="border-b border-white/5 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
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

      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* Back */}
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 hover:text-white transition text-sm mb-6">
          <ArrowLeft size={16} /> Back
        </button>

        {/* Title */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight mb-1">{topicName}</h2>
            <p className="text-slate-500 text-sm">Quick Review — AI-Generated Flashcards</p>
          </div>
          <span className="text-sm font-semibold text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
            {currentIdx + 1} / {cards.length}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-slate-800 rounded-full mb-10 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>

        {/* Flashcard */}
        <div
          onClick={() => setFlipped(!flipped)}
          className="cursor-pointer select-none"
        >
          <div className={`bg-slate-900/60 border rounded-3xl p-10 md:p-14 min-h-[280px] flex flex-col items-center justify-center text-center transition-all duration-500 hover:border-indigo-500/30 ${flipped ? 'border-purple-500/30 shadow-xl shadow-purple-500/10' : 'border-white/5'}`}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-6" style={{ color: flipped ? '#a78bfa' : '#64748b' }}>
              {flipped ? "Answer" : "Question"}
            </p>
            <p className={`text-xl md:text-2xl font-semibold leading-relaxed ${flipped ? 'text-purple-200' : 'text-slate-100'}`}>
              {flipped ? card.back : card.front}
            </p>
            <p className="text-xs text-slate-600 mt-8 flex items-center gap-1.5">
              <RotateCcw size={12} /> Click to flip
            </p>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center mt-8">
          <button
            onClick={handlePrev}
            disabled={currentIdx === 0}
            className="px-6 py-3 rounded-xl text-sm font-semibold text-slate-400 hover:text-white disabled:text-slate-700 disabled:cursor-not-allowed transition bg-slate-800/50 border border-white/5"
          >
            ← Previous
          </button>
          <button
            onClick={handleNext}
            disabled={currentIdx === cards.length - 1}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-8 py-3 rounded-xl text-sm font-bold transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
};

export default FlashcardPage;
