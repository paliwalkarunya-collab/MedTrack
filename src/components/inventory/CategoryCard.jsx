import { Pill, ShieldPlus, Sparkles, FlaskConical, Syringe, ArrowRight } from 'lucide-react';

const iconMap = { Pill, ShieldPlus, Sparkles, FlaskConical, Syringe };

const colorMap = {
    blue: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60',
    emerald: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60',
    amber: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60',
    indigo: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60',
    rose: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60',
};

export const CategoryCard = ({ category, count, onClick }) => {
    const Icon = iconMap[category.icon] || Pill;

    return (
        <button
            onClick={onClick}
            className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/70 dark:border-slate-800/70 shadow-xs text-left hover:shadow-premium hover:border-blue-200 dark:hover:border-blue-900/60 transition-all duration-150 group"
        >
            <div className="flex items-center justify-between mb-4">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${colorMap[category.color]}`}>
                    <Icon className="w-5.5 h-5.5" />
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">{category.name}</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{count} medicines</p>
        </button>
    );
};