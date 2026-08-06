import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { PieChart as PieIcon } from 'lucide-react';

const categoryData = [
  { name: 'Pain Killers', value: 380, color: '#2563eb' },
  { name: 'Antibiotics', value: 290, color: '#10b981' },
  { name: 'Vitamins', value: 240, color: '#f59e0b' },
  { name: 'Syrups', value: 180, color: '#6366f1' },
  { name: 'Injections', value: 130, color: '#8b5cf6' },
  { name: 'Others', value: 90, color: '#94a3b8' },
];

export const InventoryDistributionChart = () => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/70 dark:border-slate-800/70 shadow-xs flex flex-col h-full min-h-[340px]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <PieIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            Inventory Distribution
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Stock proportion by category</p>
        </div>
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
          6 Categories
        </span>
      </div>

      <div className="flex-1 w-full h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={categoryData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={4}
              dataKey="value"
            >
              {categoryData.map((entry) => (
                <Cell key={entry.name} fill={entry.color} stroke="transparent" />
              ))}
            </Pie>
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
              itemStyle={{ color: '#fff' }}
              formatter={(value) => [`${value} units`, 'Count']}
            />
            <Legend
              verticalAlign="bottom"
              height={48}
              iconType="circle"
              formatter={(value) => (
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400 mr-2">
                  {value}
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};