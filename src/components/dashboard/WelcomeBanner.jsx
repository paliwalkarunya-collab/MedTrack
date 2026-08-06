import { Calendar, ShieldCheck } from 'lucide-react';

export const WelcomeBanner = () => {
  const hour = new Date().getHours();
  const greeting =
    hour < 12
      ? 'Good morning'
      : hour < 18
      ? 'Good afternoon'
      : 'Good evening';

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 p-6 sm:p-8 text-white shadow-lg shadow-blue-500/10">
      {/* Background glow effects */}
      <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute right-1/3 -top-12 w-48 h-48 bg-blue-400/20 rounded-full blur-xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2 text-blue-100 text-xs font-semibold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-blue-200" />
            <span>Central Pharmacy Hub</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            {greeting}, Dr. Sarah Jenkins 👋
          </h2>
          <p className="text-blue-100 text-sm sm:text-base leading-relaxed">
            Welcome back to MedTrack Medicine Inventory. Here is your daily operational summary.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto bg-white/15 backdrop-blur-md px-4 py-2.5 rounded-xl text-xs font-medium text-blue-50 border border-white/20 shadow-xs">
          <Calendar className="w-4 h-4 text-blue-200 shrink-0" />
          <span>{currentDate}</span>
        </div>
      </div>
    </div>
  );
};
