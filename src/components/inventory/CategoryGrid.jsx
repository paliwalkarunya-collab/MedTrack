import { categories, medicines } from '../../utils/inventoryData';
import { CategoryCard } from './CategoryCard';

export const CategoryGrid = ({ onSelectCategory }) => {
    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/70 dark:border-slate-800/70 shadow-xs">
            <div className="mb-5">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Medicine Categories</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Browse inventory grouped by category</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.map((category) => {
                    const count = medicines.filter((med) => med.category === category.id).length;
                    return (
                        <CategoryCard
                            key={category.id}
                            category={category}
                            count={count}
                            onClick={() => onSelectCategory(category.id)}
                        />
                    );
                })}
            </div>
        </div>
    );
};