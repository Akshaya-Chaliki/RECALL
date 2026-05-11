import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getTopicRetention } from "../services/api";
import RetentionGraph from "../components/RetentionGraph";
import { ArrowLeft, Activity, Clock, CalendarClock, AlertTriangle, Zap, Sparkles, BookOpen } from "lucide-react";

const TopicAnalyticsPage = () => {
  const { topicId } = useParams();
  const [searchParams] = useSearchParams();
  const topicName = searchParams.get("name") || "Topic";
  const fromQuiz = searchParams.get("fromQuiz") === "true";
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [retention, setRetention] = useState(100);
  const [halfLife, setHalfLife] = useState(24);
  const [chartData, setChartData] = useState([]);
  const [isNew, setIsNew] = useState(false);
  const [loading, setLoading] = useState(true);
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await getTopicRetention(topicId);
        const d = res.data?.data;
        if (d) {
          const safeR = Number(d.retentionPercentage || 0);
          const safeH = Number(d.halfLife || 24);
          
          setRetention(safeR);
          setHalfLife(safeH);
          setIsNew(!!d.isNew);

          // Use projection from backend if available, otherwise generate it
          let points = Array.isArray(d.projection) ? d.projection : [];
          
          // Normalize: ensure every point has { day, retention } keys
          points = points.map((p, i) => ({
            day: p.day !== undefined ? p.day : i,
            retention: Number(p.retention ?? p.retention_value ?? 0),
          }));
          
          if (points.length === 0) {
            console.log("[TopicAnalytics] No projection from backend — generating client-side fallback");
            const currentR = safeR;
            const h = safeH;
            for (let day = 0; day <= 7; day++) {
              const hoursFromNow = day * 24;
              const r = currentR * Math.pow(2, -hoursFromNow / h);
              const safeDailyR = Number.isNaN(r) ? 0 : Math.max(0, Math.min(100, r));
              points.push({ day, retention: parseFloat(safeDailyR.toFixed(2)) });
            }
          }
          
          setChartData(points);
          console.log("[TopicAnalytics] Chart Data:", JSON.stringify(points));
        } else {
          console.warn("No topic data received from backend");
        }


      } catch (err) {
        if (err.response?.status === 401) { logout(); navigate("/login"); }
        console.error("Failed to fetch retention:", err);
      } finally {
        setLoading(false);
        // Ensure the page becomes visible even if data fails to load
        setTimeout(() => setAnimateIn(true), fromQuiz ? 100 : 50);
      }
    };
    if (topicId) fetchData();
  }, [topicId, fromQuiz]);

  const isRed = retention < 50;
  const isYellow = retention >= 50 && retention < 70;
  const zoneColor = isRed ? "#ef4444" : isYellow ? "#eab308" : "#22c55e";
  const zoneName = isRed ? "Critical" : isYellow ? "Decaying" : "Healthy";

  // Calculate when retention hits 50%: t_50 = -halfLife * log2(50 / currentRetention)
  const safeRetentionVal = Math.max(0.1, Number(retention || 0));
  const safeHalfLifeVal = Math.max(0.1, Number(halfLife || 24));
  const hoursUntil50 = safeRetentionVal > 50 ? -safeHalfLifeVal * Math.log2(50 / safeRetentionVal) : 0;
  const safeHours = Number.isNaN(hoursUntil50) ? 0 : hoursUntil50;
  const optimalReviewDate = new Date(Date.now() + safeHours * 3600 * 1000);

  const formatReviewTime = () => {
    if (retention <= 50) return "Now — retention is already below 50%";
    if (safeHours < 1) return "Less than 1 hour from now";
    if (safeHours < 24) return `${safeHours.toFixed(1)} hours from now`;
    const days = safeHours / 24;
    if (days < 7) return `${days.toFixed(1)} days from now`;
    if (Number.isNaN(optimalReviewDate.getTime())) return "Check back later";
    return optimalReviewDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  };

  return (
    <div className={`min-h-screen bg-slate-950 text-white font-sans transition-all duration-700 ease-out ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      {/* Header */}
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

      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Back */}
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 hover:text-white transition text-sm mb-6">
          <ArrowLeft size={16} /> Back to Topics
        </button>

        {/* Title */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <h2 className="text-4xl font-extrabold tracking-tight mb-3">{topicName}</h2>
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: zoneColor, boxShadow: `0 0 12px ${zoneColor}80` }} />
              <span className="text-sm font-semibold uppercase tracking-wider" style={{ color: zoneColor }}>{zoneName}</span>
              <span className="text-slate-500 text-sm">— {retention.toFixed(1)}% retention</span>
            </div>
          </div>
          {!isRed && !isNew && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(`/topics/${topicId}/flashcards?name=${encodeURIComponent(topicName)}`)}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 hover:bg-indigo-500/20 hover:border-indigo-500/30 transition-all text-sm font-semibold"
              >
                <BookOpen size={18} className="text-indigo-400" /> Quick Review
              </button>
              <button
                onClick={() => navigate(`/quiz/${topicId}?name=${encodeURIComponent(topicName)}`)}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-200 hover:bg-white/10 hover:border-white/20 transition-all text-sm font-semibold"
              >
                <Zap size={18} className="text-yellow-500" /> Review Quiz
              </button>
            </div>
          )}
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Retention Today */}
          <div className="bg-slate-900/60 border border-white/5 rounded-3xl p-7 relative overflow-hidden group hover:border-white/10 transition-colors">
            <div className="absolute -top-6 -right-6 w-32 h-32 bg-blue-500/10 blur-2xl rounded-full group-hover:bg-blue-500/20 transition-colors" />
            <div className="flex justify-between items-center mb-4 relative z-10">
              <span className="text-slate-400 text-sm font-semibold tracking-wide">Retention Today</span>
              <Activity size={20} className="text-blue-400" />
            </div>
            <div className="text-4xl font-extrabold text-white relative z-10">{retention.toFixed(1)}%</div>
            <div className="h-1.5 bg-slate-800 rounded-full mt-4 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${Math.max(2, retention)}%`, backgroundColor: zoneColor }} />
            </div>
          </div>

          {/* Half-Life */}
          <div className="bg-slate-900/60 border border-white/5 rounded-3xl p-7 relative overflow-hidden group hover:border-white/10 transition-colors">
            <div className="absolute -top-6 -right-6 w-32 h-32 bg-purple-500/10 blur-2xl rounded-full group-hover:bg-purple-500/20 transition-colors" />
            <div className="flex justify-between items-center mb-4 relative z-10">
              <span className="text-slate-400 text-sm font-semibold tracking-wide">Half-Life</span>
              <Clock size={20} className="text-purple-400" />
            </div>
            <div className="text-4xl font-extrabold text-white relative z-10">
              {halfLife.toFixed(1)} <span className="text-xl font-normal text-slate-500">hrs</span>
            </div>
            <p className="text-xs text-slate-500 mt-2">Time for retention to halve</p>
          </div>

          {/* Optimal Review */}
          <div className="bg-slate-900/60 border rounded-3xl p-7 relative overflow-hidden" style={{ borderColor: `${zoneColor}22` }}>
            <div className="absolute -top-6 -right-6 w-32 h-32 blur-2xl rounded-full" style={{ backgroundColor: `${zoneColor}15` }} />
            <div className="flex justify-between items-center mb-4 relative z-10">
              <span className="text-slate-400 text-sm font-semibold tracking-wide">Optimal Review</span>
              <CalendarClock size={20} style={{ color: zoneColor }} />
            </div>
            <div className="text-lg font-bold relative z-10 leading-snug" style={{ color: zoneColor }}>
              {formatReviewTime()}
            </div>
            <p className="text-xs text-slate-500 mt-2">When retention is predicted to hit 50%</p>
          </div>
        </div>

        {/* Graph or RECALL NOW */}
        <div className="bg-slate-900/50 backdrop-blur-xl border rounded-[2rem] p-8 md:p-10 relative overflow-hidden transition-colors duration-500" style={{ borderColor: `${zoneColor}22`, boxShadow: `0 20px 60px -15px ${zoneColor}10` }}>
          <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ background: `linear-gradient(180deg, ${zoneColor}15, transparent)` }} />

          {isRed ? (
            <div className="relative z-10 flex flex-col items-center py-12 text-center">
              <div className="w-28 h-28 bg-red-500/10 rounded-full flex items-center justify-center mb-8 animate-pulse shadow-[0_0_50px_rgba(239,68,68,0.2)]">
                <AlertTriangle size={56} className="text-red-500" />
              </div>
              <h2 className="text-4xl font-black text-red-400 mb-4 tracking-tight">🚨 RECALL NOW</h2>
              <p className="text-slate-400 text-lg max-w-2xl leading-relaxed mb-10">
                Your retention for <strong className="text-red-400 font-semibold">{topicName}</strong> has dropped below 50%.
                Take a review quiz immediately to reinforce your memory.
              </p>
              <button
                onClick={() => navigate(`/quiz/${topicId}?name=${encodeURIComponent(topicName)}`)}
                className="bg-gradient-to-br from-red-600 to-red-500 text-white px-12 py-5 rounded-2xl text-xl font-extrabold uppercase tracking-widest shadow-[0_10px_40px_rgba(220,38,38,0.4)] hover:shadow-[0_15px_50px_rgba(220,38,38,0.6)] hover:-translate-y-1 transition-all duration-300"
              >
                Retake Quiz
              </button>
            </div>
          ) : (
            <div className="relative z-10">
              <h2 className="text-xl font-bold text-slate-200 mb-8 flex items-center gap-4">
                <div className="w-1.5 h-7 rounded-full" style={{ backgroundColor: zoneColor }} />
                7-Day Retention Projection
              </h2>
              <div className="h-[420px] w-full">
                {loading ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="w-14 h-14 rounded-full border-4 border-t-transparent animate-spin" style={{ borderColor: `${zoneColor}30`, borderTopColor: zoneColor }} />
                  </div>
                ) : chartData.length > 0 ? (
                  <RetentionGraph data={chartData} zoneColor={zoneColor} fromQuiz={fromQuiz} />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 bg-slate-900/20 rounded-2xl border border-dashed border-white/5">
                    <Zap size={32} className="mb-3 opacity-20" />
                    <p className="text-sm font-medium">No data available. Take a quiz to generate your retention curve!</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TopicAnalyticsPage;
