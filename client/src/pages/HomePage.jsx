import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getSkills, createSkill, deleteSkill, getAllTopics } from "../services/api";
import { Library, Plus, X, Trash2, ChevronRight, Sparkles, LogOut, AlertTriangle, BrainCircuit } from "lucide-react";
import SystemStatus from "../components/SystemStatus";

const HomePage = () => {
  const [skills, setSkills] = useState([]);
  const [criticalTopics, setCriticalTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newSkill, setNewSkill] = useState({ name: "", category: "" });
  const [creating, setCreating] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const getRetentionNow = (ms) => {
    if (!ms) return 0;
    try {
      const halfLife = Math.max(0.1, Number(ms.h || ms.halfLife || 24));
      const m = Number(ms.M || ms.initialMemoryStrength || 100);
      const lastCalc = ms.lastCalculated ? new Date(ms.lastCalculated).getTime() : Date.now();
      const hoursPassed = (Date.now() - lastCalc) / (1000 * 60 * 60);
      const retention = m * Math.pow(2, -hoursPassed / halfLife);
      return Number.isNaN(retention) ? 0 : Math.max(0, Math.min(100, retention));
    } catch (e) {
      console.error("Retention calculation error:", e);
      return 0;
    }
  };

  const fetchData = async () => {
    try {
      const [skillsRes, topicsRes] = await Promise.all([
        getSkills(),
        getAllTopics(),
      ]);
      setSkills(skillsRes.data?.data || []);

      // Find critical topics (retention < 50%)
      const allTopics = topicsRes.data?.data || [];
      const critical = allTopics
        .filter(t => t.memoryState)
        .map(t => ({ ...t, retention: getRetentionNow(t.memoryState) }))
        .filter(t => t.retention < 50)
        .sort((a, b) => a.retention - b.retention);
      setCriticalTopics(critical);
    } catch (err) {
      if (err.response?.status === 401) { logout(); navigate("/login"); }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newSkill.name.trim()) return;
    setCreating(true);
    try {
      await createSkill(newSkill);
      setNewSkill({ name: "", category: "" });
      setShowModal(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to create skill");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!confirm("Delete this skill and all its topics?")) return;
    try {
      await deleteSkill(id);
      fetchData();
    } catch (err) {
      alert("Failed to delete");
    }
  };

  const categoryColors = {
    General: { from: "from-indigo-500", to: "to-purple-600", bg: "bg-indigo-500/10", text: "text-indigo-400", border: "border-indigo-500/20" },
    Programming: { from: "from-emerald-500", to: "to-teal-600", bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20" },
    Science: { from: "from-blue-500", to: "to-cyan-600", bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20" },
    Languages: { from: "from-amber-500", to: "to-orange-600", bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20" },
  };
  const getColor = (cat) => categoryColors[cat] || categoryColors.General;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-white/5 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Sparkles size={18} className="text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">RECALL</h1>
          </div>
          <div className="flex items-center gap-4">
            <SystemStatus />
            <span className="text-sm text-slate-400">Hi, {user?.name}</span>
            <button onClick={() => { logout(); navigate("/login"); }} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-white transition">
              <LogOut size={14} /> Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-10">

        {/* ═══════════ Priority Review Alerts ═══════════ */}
        {!loading && criticalTopics.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 bg-red-500/15 rounded-lg flex items-center justify-center">
                <AlertTriangle size={16} className="text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-white">Priority Review</h3>
              <span className="text-xs font-semibold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">
                {criticalTopics.length} critical
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {criticalTopics.slice(0, 6).map((topic) => (
                <div
                  key={topic._id}
                  onClick={() => navigate(`/topics/${topic._id}/analytics?name=${encodeURIComponent(topic.name)}`)}
                  className="bg-red-500/5 border border-red-500/15 rounded-2xl p-4 cursor-pointer hover:bg-red-500/10 hover:border-red-500/30 transition-all group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <BrainCircuit size={16} className="text-red-400" />
                      <h4 className="text-sm font-bold text-white truncate">{topic.name}</h4>
                    </div>
                    <ChevronRight size={14} className="text-slate-600 group-hover:text-red-400 transition" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full transition-all"
                        style={{ width: `${Math.max(topic.retention, 2)}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-red-400 min-w-[3rem] text-right">{topic.retention.toFixed(0)}%</span>
                  </div>
                  <p className="text-[10px] text-red-400/60 mt-2 font-medium">⚠ Critical Revision Needed</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Title */}
        <div className="flex items-end justify-between mb-10">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight mb-2">Your Skills</h2>
            <p className="text-slate-400 text-sm">Select a skill to manage topics, or add a new one to start tracking.</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-5 py-3 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-indigo-500/20"
          >
            <Plus size={18} /> Add Skill
          </button>
        </div>

        {/* Skills Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-12 h-12 border-4 border-indigo-500/20 rounded-full animate-spin border-t-indigo-500" />
          </div>
        ) : skills.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-24 h-24 bg-slate-800/50 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Library size={40} className="text-slate-600" />
            </div>
            <h3 className="text-xl font-semibold text-slate-300 mb-2">No skills yet</h3>
            <p className="text-slate-500 text-sm mb-6">Add your first skill to start your memory retention journey.</p>
            <button
              onClick={() => setShowModal(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl text-sm font-semibold transition"
            >
              Create Your First Skill
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {skills.map((skill) => {
              const c = getColor(skill.category);
              return (
                <div
                  key={skill._id}
                  onClick={() => navigate(`/skills/${skill._id}/topics`)}
                  className={`relative bg-slate-900/50 border ${c.border} rounded-2xl p-6 cursor-pointer hover:border-indigo-500/40 hover:-translate-y-1 transition-all duration-200 group overflow-hidden`}
                >
                  <div className={`absolute -top-10 -right-10 w-40 h-40 ${c.bg} rounded-full blur-3xl opacity-40 group-hover:opacity-70 transition-opacity`} />

                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-5">
                      <div className={`w-12 h-12 bg-gradient-to-br ${c.from} ${c.to} rounded-xl flex items-center justify-center shadow-lg`}>
                        <Library size={22} className="text-white" />
                      </div>
                      <button
                        onClick={(e) => handleDelete(skill._id, e)}
                        className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all p-1"
                        title="Delete skill"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <h3 className="text-lg font-bold text-white mb-1 group-hover:text-indigo-300 transition">{skill.name}</h3>
                    <p className={`text-xs font-medium ${c.text} mb-4`}>{skill.category || "General"}</p>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">Click to view topics</span>
                      <ChevronRight size={16} className="text-slate-600 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Skill Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-8 w-full max-w-md shadow-2xl animate-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Add New Skill</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-white transition"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Skill Name</label>
                <input
                  type="text" required autoFocus
                  placeholder="e.g., React, Java, Machine Learning"
                  value={newSkill.name}
                  onChange={(e) => setNewSkill({ ...newSkill, name: e.target.value })}
                  className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Category (optional)</label>
                <input
                  type="text"
                  placeholder="e.g., Programming, Science, Languages"
                  value={newSkill.category}
                  onChange={(e) => setNewSkill({ ...newSkill, category: e.target.value })}
                  className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={creating} className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white py-3 rounded-lg text-sm font-semibold transition disabled:opacity-50">
                  {creating ? "Creating..." : "Create Skill"}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-3 rounded-lg text-sm text-slate-400 hover:text-white border border-white/10 hover:border-white/20 transition">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;
