import { useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Menu, Search, Bell, Moon, Sun, User } from 'lucide-react';
import { useSidebar } from '../../hooks/useSidebarContext';
import { useAuth } from '../../hooks/useAuth';

const pageTitles = {
  '/': 'Dashboard Overview',
  '/inventory': 'Medicine Inventory',
  '/billing': 'Billing',
  '/purchases': 'Purchase Orders',
  '/suppliers': 'Suppliers',
  '/analytics': 'Analytics & Insights',
  '/reports': 'Reports & Exports',
  '/alerts': 'Alerts & Expirations',
  '/expiry': 'Expiry Management',
  '/settings': 'System Settings',
  '/users': 'User Management',
};

export const Header = () => {
  const { toggleMobileMenu, isDarkMode, toggleDarkMode } = useSidebar();
  const { currentUser, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const title = pageTitles[location.pathname] || 'MedTrack';

  return (
    <header className="sticky top-0 z-20 h-[72px] bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/70 dark:border-slate-800/70 px-4 lg:px-8 flex items-center justify-between gap-4 transition-colors">
      {/* Left Area: Mobile Menu Trigger & Page Title */}
      <div className="flex items-center gap-3.5">
        <button
          onClick={toggleMobileMenu}
          className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Open Mobile Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight hidden sm:block">
          {title}
        </h1>
      </div>

      {/* Center Area: Prominent Global Search Input */}
      <div className="flex-1 max-w-xl mx-2 sm:mx-6">
        <div className="relative group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 transition-colors" />
          <input
            type="text"
            placeholder="Search medicines, categories, suppliers..."
            className="w-full pl-10 pr-20 py-2.5 text-sm bg-slate-100/80 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-xl border border-slate-200/60 dark:border-slate-700/60 focus:border-blue-500/80 dark:focus:border-blue-500/80 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 shadow-search transition-all duration-200"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-0.5">
            <kbd className="px-1.5 py-0.5 text-[11px] font-semibold text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-2xs">
              Ctrl
            </kbd>
            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">+</span>
            <kbd className="px-1.5 py-0.5 text-[11px] font-semibold text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-2xs">
              K
            </kbd>
          </div>
        </div>
      </div>

      {/* Right Area: Controls & User Profile */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Dark Mode Toggle */}
        <button
          onClick={toggleDarkMode}
          className="p-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-colors"
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDarkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* Notifications Button */}
        <button
          className="relative p-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-colors"
          title="Notifications"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-blue-600 rounded-full ring-2 ring-white dark:ring-slate-900" />
        </button>

        {/* User Profile */}
        <div className="flex items-center gap-3 pl-3 border-l border-slate-200/70 dark:border-slate-800/70">
          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center font-semibold text-sm ring-1 ring-blue-500/20 shadow-2xs">
            <User className="w-4.5 h-4.5" />
          </div>
          <div className="hidden md:flex flex-col text-left">
            <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-tight">{currentUser?.name || 'User'}</span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">{currentUser?.role || 'Account'}</span>
          </div>
          <button type="button" onClick={() => { logout(); navigate('/login', { replace: true }); }} className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40" title="Sign out" aria-label="Sign out"><LogOut className="w-4 h-4" /></button>
        </div>
      </div>
    </header>
  );
};
