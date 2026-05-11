import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

const CustomTooltip = ({ active, payload, label, zoneColor }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 backdrop-blur-md px-4 py-3 rounded-xl border border-white/10 shadow-2xl">
        <p className="text-slate-400 text-xs mb-1 font-medium">Day {label}</p>
        <p className="text-xl font-bold m-0" style={{ color: zoneColor }}>
          {Number(payload?.[0]?.value || 0).toFixed(1)}%
        </p>
      </div>
    );
  }
  return null;
};

const RetentionGraph = ({ data, zoneColor, fromQuiz }) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="retentionGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={zoneColor} stopOpacity={0.3} />
            <stop offset="95%" stopColor={zoneColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
        <XAxis
          dataKey="day" stroke="#64748b"
          tick={{ fill: "#64748b", fontSize: 11 }}
          tickLine={false} axisLine={false}
          tickFormatter={v => `Day ${v}`} minTickGap={30}
        />
        <YAxis
          stroke="#64748b"
          tick={{ fill: "#64748b", fontSize: 11 }}
          tickLine={false} axisLine={false}
          tickFormatter={v => `${v}%`} domain={[0, 100]}
        />
        <Tooltip content={<CustomTooltip zoneColor={zoneColor} />} cursor={{ stroke: "rgba(255,255,255,0.06)", strokeWidth: 2 }} />
        <ReferenceLine y={50} stroke="#ef4444" strokeDasharray="3 3" opacity={0.6} />
        <Area
          type="monotone" dataKey="retention"
          stroke={zoneColor} strokeWidth={3}
          fillOpacity={1} fill="url(#retentionGradient)"
          animationDuration={fromQuiz ? 2000 : 800}
          animationEasing="ease-out"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default RetentionGraph;
