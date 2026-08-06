import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';

const movementData = [
  { day: 'Mon', received: 120, distributed: 85, remaining: 1240 },
  { day: 'Tue', received: 200, distributed: 110, remaining: 1330 },
  { day: 'Wed', received: 150, distributed: 140, remaining: 1340 },
  { day: 'Thu', received: 280, distributed: 190, remaining: 1430 },
  { day: 'Fri', received: 190, distributed: 160, remaining: 1460 },
  { day: 'Sat', received: 90, distributed: 130, remaining: 1420 },
  { day: 'Sun', received: 110, distributed: 70, remaining: 1460 },
];

export const StockMovementChart = () => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/70 dark:border-slate-800/70 shadow-xs flex flex-col h-full min-h-[340px]">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            Stock Movement
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Weekly received vs distributed vs remaining stock
          </p>
        </div>
      </div>

      <div className="flex-1 w-full h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={movementData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.15)" />
            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <YAxis
              yAxisId="right"
              orientation="right"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94a3b8', fontSize: 12 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                borderColor: 'transparent',
                borderRadius: '12px',
                color: '#fff',
                fontSize: '12px',
                padding: '8px 12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              }}
            />
            <Legend
              iconType="circle"
              formatter={(value) => (
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400 mr-2">{value}</span>
              )}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="received"
              name="Received"
              stroke="#2563eb"
              strokeWidth={2.5}
              dot={{ r: 3 }}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="distributed"
              name="Distributed"
              stroke="#10b981"
              strokeWidth={2.5}
              dot={{ r: 3 }}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="remaining"
              name="Remaining Stock"
              stroke="#6366f1"
              strokeWidth={2}
              strokeDasharray="4 3"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};