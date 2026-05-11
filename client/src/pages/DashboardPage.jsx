import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getDashboardData, getAllTopics } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

const DashboardPage = () => {
  const { topicId } = useParams();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [data, setData] = useState(null);
  const [readinessScore, setReadinessScore] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [res, topicsRes] = await Promise.all([
          getDashboardData(topicId),
          getAllTopics().catch(() => ({ data: { data: [] } }))
        ]);
        if (res.data?.data) {
          setData(res.data.data);
        } else {
          throw new Error("No dashboard data");
        }

        const allTopics = topicsRes.data?.data || [];
        if (allTopics.length > 0) {
          const avg = allTopics.reduce((acc, t) => {
            const h = Math.max(0.1, Number(t.memoryState?.halfLife || t.memoryState?.h || 24));
            const m = Number(t.memoryState?.initialMemoryStrength || t.memoryState?.M || 100);
            const lc = t.memoryState?.lastCalculated ? new Date(t.memoryState.lastCalculated).getTime() : Date.now();
            const hrs = (Date.now() - lc) / (1000 * 60 * 60);
            const r = m * Math.pow(2, -hrs / h);
            return acc + (Number.isNaN(r) ? 0 : Math.max(0, Math.min(100, r)));
          }, 0) / allTopics.length;
          setReadinessScore(avg);
        }
      } catch (err) {
        if (err.response?.status === 401) { logout(); navigate("/login"); }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [topicId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-500/20 rounded-full animate-spin border-t-indigo-500" />
      </div>
    );
  }

  if (!data) return null;

  const { topic, M, h, lastCalculated, currentRetention, assessments, isNew } = data;

  // Safe numeric extraction
  const safeM = Math.max(0, Number(M || 100));
  const safeH = Math.max(0.1, Number(h || 24));
  const safeRetention = Number.isNaN(Number(currentRetention)) ? 0 : Math.max(0, Math.min(100, Number(currentRetention)));

  // Generate curve data: past 24 hours + future 72 hours
  const generateCurveData = () => {
    const points = [];
    if (!lastCalculated) return points;

    try {
      const lastCalcTime = new Date(lastCalculated).getTime();
      const now = Date.now();
      const hoursSinceCalc = (now - lastCalcTime) / (1000 * 60 * 60);

      // Plot from -24h (past) to +72h (future) relative to now
      for (let offsetHrs = -Math.min(24, Math.max(0, hoursSinceCalc)); offsetHrs <= 72; offsetHrs += 1) {
        const tFromCalc = hoursSinceCalc + offsetHrs; // hours since lastCalculated
        if (tFromCalc < 0) continue;
        const r = safeM * Math.pow(2, -tFromCalc / safeH);
        const retention = Number.isNaN(r) ? 0 : r;
        
        let label;
        if (offsetHrs < -12) label = "Past";
        else if (offsetHrs < 0) label = `${Math.abs(offsetHrs).toFixed(0)}h ago`;
        else if (offsetHrs === 0) label = "Now";
        else if (offsetHrs < 24) label = `+${offsetHrs}h`;
        else label = `+${(offsetHrs / 24).toFixed(0)}d`;

        points.push({ label, retention: Math.max(0, Math.min(100, retention)), hour: offsetHrs });
      }
    } catch (e) {
      console.error("Curve generation error:", e);
    }
    return points;
  };

  const curveData = generateCurveData();

  // Zone colors
  const isRed = safeRetention < 50;
  const isYellow = safeRetention >= 50 && safeRetention < 70;
  const zoneColor = isRed ? "#ef4444" : isYellow ? "#eab308" : "#22c55e";
  const zoneName = isRed ? "Red Zone" : isYellow ? "Yellow Zone" : "Green Zone";

  // Review countdown
  const hoursElapsed = lastCalculated ? (Date.now() - new Date(lastCalculated).getTime()) / (1000 * 60 * 60) : 0;
  const rawReviewIn = safeH - hoursElapsed;
  const reviewIn = Number.isNaN(rawReviewIn) ? 0 : Math.max(0, rawReviewIn);

  // Professional Readiness — derive a clean readiness tier
  const getReadinessTier = (score) => {
    if (score === null) return { label: "N/A", color: "#64748b", bg: "rgba(100,116,139,0.1)" };
    if (score >= 85) return { label: "Expo Ready", color: "#22c55e", bg: "rgba(34,197,94,0.1)" };
    if (score >= 70) return { label: "Strong", color: "#3b82f6", bg: "rgba(59,130,246,0.1)" };
    if (score >= 50) return { label: "Moderate", color: "#eab308", bg: "rgba(234,179,8,0.1)" };
    return { label: "Needs Work", color: "#ef4444", bg: "rgba(239,68,68,0.1)" };
  };
  const readinessTier = getReadinessTier(readinessScore);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload?.[0]) {
      return (
        <div className="bg-slate-800/90 backdrop-blur-md border border-white/10 rounded-lg px-3 py-2 shadow-xl">
          <p className="text-xs text-slate-400">{payload[0].payload.label}</p>
          <p className="text-lg font-bold" style={{ color: zoneColor }}>{payload[0].value.toFixed(1)}%</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-white/5 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/topics")} className="text-slate-500 hover:text-white transition">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div>
              <h1 className="text-xl font-bold">{topic?.name || "Topic"}</h1>
              {topic?.category && <p className="text-xs text-slate-500">{topic.category}</p>}
            </div>
          </div>
          <button
            onClick={() => navigate(`/quiz/${topicId}?name=${encodeURIComponent(topic?.name || "")}`)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            Take Quiz
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-slate-900/40 border border-white/5 rounded-xl p-5">
            <p className="text-xs text-slate-500 mb-1">Current Retention</p>
            <p className="text-3xl font-bold" style={{ color: zoneColor }}>{safeRetention.toFixed(1)}%</p>
            <span className="text-xs font-semibold mt-1 inline-block px-2 py-0.5 rounded-full" style={{ background: `${zoneColor}20`, color: zoneColor }}>{zoneName}</span>
          </div>
          <div className="bg-slate-900/40 border border-white/5 rounded-xl p-5">
            <p className="text-xs text-slate-500 mb-1">Memory Strength (M)</p>
            <p className="text-3xl font-bold text-blue-400">{safeM.toFixed(0)}%</p>
          </div>
          <div className="bg-slate-900/40 border border-white/5 rounded-xl p-5">
            <p className="text-xs text-slate-500 mb-1">Half-Life (h)</p>
            <p className="text-3xl font-bold text-purple-400">{safeH.toFixed(0)}<span className="text-base font-normal text-slate-500 ml-1">hours</span></p>
          </div>
          <div className="bg-slate-900/40 border border-white/5 rounded-xl p-5">
            <p className="text-xs text-slate-500 mb-1">Optimal Review In</p>
            <p className="text-3xl font-bold" style={{ color: zoneColor }}>
              {reviewIn < 1 ? "Now!" : `${reviewIn.toFixed(0)}h`}
            </p>
            <p className="text-xs text-slate-600 mt-1">T<sub>review</sub> = h (R drops to 50%)</p>
          </div>

          {/* ═══ Professional Readiness Score ═══ */}
          <div className="bg-slate-900/40 border border-white/5 rounded-xl p-5 relative overflow-hidden group hover:border-white/10 transition-colors">
            {/* Subtle glow background */}
            <div
              className="absolute -top-8 -right-8 w-28 h-28 rounded-full blur-2xl opacity-30 group-hover:opacity-50 transition-opacity"
              style={{ backgroundColor: readinessTier.color }}
            />
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-1">
                <p className="text-xs text-slate-500">Professional Readiness</p>
              </div>

              {/* Score Display */}
              <div className="flex items-baseline gap-1.5">
                <p className="text-3xl font-bold" style={{ color: readinessTier.color }}>
                  {readinessScore !== null ? `${readinessScore.toFixed(0)}` : "—"}
                </p>
                {readinessScore !== null && (
                  <span className="text-sm font-medium" style={{ color: readinessTier.color }}>%</span>
                )}
              </div>

              {/* Tier Badge */}
              <span
                className="text-[10px] font-bold mt-1.5 inline-block px-2 py-0.5 rounded-full uppercase tracking-wide"
                style={{ backgroundColor: readinessTier.bg, color: readinessTier.color }}
              >
                {readinessTier.label}
              </span>

              {/* Mini progress bar */}
              {readinessScore !== null && (
                <div className="mt-2 h-1 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.max(2, readinessScore)}%`,
                      backgroundColor: readinessTier.color,
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RECALL NOW or Chart */}
        <div className={`bg-slate-900/30 border rounded-2xl p-6 mb-8 transition-colors ${isRed ? "border-red-500/30" : "border-white/5"}`}>
          {isRed && !isNew ? (
            <div className="flex flex-col items-center py-12 text-center">
              <div className="w-20 h-20 bg-red-500/15 rounded-full flex items-center justify-center mb-6 animate-pulse">
                <span className="text-4xl">🚨</span>
              </div>
              <h2 className="text-2xl font-bold text-red-400 mb-2">RECALL NOW: Memory Decay Critical</h2>
              <p className="text-slate-400 max-w-md mb-8">
                Your retention for <strong className="text-red-300">{topic?.name}</strong> has dropped below 50%.
                Take a reinforcement quiz immediately to restore your memory curve.
              </p>
              <button
                onClick={() => navigate(`/quiz/${topicId}?name=${encodeURIComponent(topic?.name || "")}`)}
                className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white px-12 py-4 rounded-xl text-lg font-bold uppercase tracking-widest shadow-2xl shadow-red-500/30 hover:shadow-red-500/50 transition-all hover:scale-105"
              >
                RECALL NOW
              </button>
            </div>
          ) : isNew ? (
            <div className="flex flex-col items-center py-12 text-center">
              <div className="w-20 h-20 bg-indigo-500/15 rounded-full flex items-center justify-center mb-6">
                <svg className="w-10 h-10 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Take Your Baseline Assessment</h2>
              <p className="text-slate-400 max-w-md mb-6">Complete your first quiz to establish initial memory strength and half-life values.</p>
              <button
                onClick={() => navigate(`/quiz/${topicId}?name=${encodeURIComponent(topic?.name || "")}`)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-semibold transition"
              >
                Start Baseline Quiz →
              </button>
            </div>
          ) : (
            <>
              <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                <div className="w-1 h-5 rounded-full" style={{ background: zoneColor }} />
                Ebbinghaus Forgetting Curve
              </h3>
              <div className="h-80">
                {curveData && curveData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={curveData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="retGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={zoneColor} stopOpacity={0.25} />
                          <stop offset="95%" stopColor={zoneColor} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                      <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={40} />
                      <YAxis tick={{ fill: "#64748b", fontSize: 10 }} tickLine={false} axisLine={false} domain={[0, 100]} tickFormatter={v => `${v}%`} />
                      <Tooltip content={<CustomTooltip />} />
                      <ReferenceLine y={50} stroke="#ef444455" strokeDasharray="4 4" label={{ value: "50% Threshold", fill: "#ef444488", fontSize: 10, position: "right" }} />
                      <ReferenceLine x="Now" stroke="#6366f155" strokeDasharray="3 3" />
                      <Area type="monotone" dataKey="retention" stroke={zoneColor} strokeWidth={2.5} fill="url(#retGrad)" animationDuration={1500} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 bg-slate-900/10 rounded-2xl border border-dashed border-white/5">
                    <p className="text-sm">No curve data—refresh or take a quiz!</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Assessment History */}
        {assessments && assessments.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-slate-400 mb-3">Recent Assessments</h3>
            <div className="space-y-2">
              {assessments.map((a) => (
                <div key={a._id} className="bg-slate-900/30 border border-white/5 rounded-lg px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`text-lg font-bold ${a.score >= 4 ? "text-emerald-400" : a.score >= 3 ? "text-yellow-400" : "text-red-400"}`}>
                      {a.score}/5
                    </span>
                    <span className="text-xs text-slate-500">{new Date(a.dateTaken).toLocaleDateString()} {new Date(a.dateTaken).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
