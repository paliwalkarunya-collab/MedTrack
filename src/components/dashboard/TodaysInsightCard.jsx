import { Sparkles, TrendingUp, PieChart as PieIcon, Clock } from 'lucide-react';

const insights = [
    {
        text: 'Inventory health improved by 4.5% compared to last week.',
        icon: TrendingUp,
        color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60',
    },
    {
        text: 'Pain Killers account for 34% of total inventory stock.',
        icon: PieIcon,
        color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60',
    },
    {
        text: 'Three medicines are expiring within the next 7 days.',
        icon: Clock,
        color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60',
    },
];

export const TodaysInsightCard = () => {
    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/70 dark:border-slate-800/70 shadow-xs">
            <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4" />
                </div>
                <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                        Today's Insight
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        Auto-generated summary from this week's inventory data
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {insights.map((item, idx) => {
                    const Icon = item.icon;
                    return (
                        <div
                            key={idx}
                            className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60"
                        >
                            <div className={`p-1.5 rounded-lg shrink-0 ${item.color}`}>
                                <Icon className="w-3.5 h-3.5" />
                            </div>
                            <p className="text-xs font-medium text-slate-700 dark:text-slate-300 leading-snug">
                                {item.text}
                            </p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};