import React, { useState, useEffect } from "react";
import { checkHealth, checkAIHealth } from "../services/api";
import { Activity } from "lucide-react";

const SystemStatus = () => {
  const [apiStatus, setApiStatus] = useState("checking");
  const [aiStatus, setAiStatus] = useState("checking");

  useEffect(() => {
    const check = async () => {
      try {
        await checkHealth();
        setApiStatus("online");
      } catch {
        setApiStatus("offline");
      }
      try {
        const res = await checkAIHealth();
        setAiStatus(res.data?.status === "online" ? "online" : "offline");
      } catch {
        setAiStatus("offline");
      }
    };
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, []);

  const statusColor = (s) =>
    s === "online" ? "bg-emerald-400" : s === "offline" ? "bg-red-400" : "bg-yellow-400 animate-pulse";

  return (
    <div className="flex items-center gap-3 text-xs text-slate-500">
      <div className="flex items-center gap-1.5">
        <div className={`w-1.5 h-1.5 rounded-full ${statusColor(apiStatus)}`} />
        <span>API</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className={`w-1.5 h-1.5 rounded-full ${statusColor(aiStatus)}`} />
        <span>AI</span>
      </div>
    </div>
  );
};

export default SystemStatus;
