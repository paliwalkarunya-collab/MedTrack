import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ReceiptText,
  ShoppingCart,
  Building2,
  FileText,
  Bell,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Activity,
  X,
  ListFilter,
  Grid,
  AlertTriangle,
  Clock,
  RotateCcw,
  History,
  CalendarDays,
  UsersRound,
} from 'lucide-react';
import { useSidebar } from '../../hooks/useSidebarContext';
import { useAuth } from '../../hooks/useAuth';
import { pathPermissions } from '../../utils/permissions';

const inventorySubItems = [
  { name: 'All Medicines', path: '/inventory', icon: ListFilter },
  { name: 'Categories', path: '/inventory?tab=categories', icon: Grid },
  { name: 'Low Stock', path: '/inventory?filter=low-stock', icon: AlertTriangle },
  { name: 'Expiring Soon', path: '/inventory?filter=expiring', icon: Clock },
];

const mainNavItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Inventory', path: '/inventory', icon: Package, hasSubmenu: true },
  { name: 'Billing', path: '/billing', icon: ReceiptText },
  { name: 'Billing History', path: '/billing-history', icon: FileText },
  { name: 'Returns', path: '/returns', icon: RotateCcw },
  { name: 'Return History', path: '/return-history', icon: History },
  { name: 'Purchases', path: '/purchases', icon: ShoppingCart },
  { name: 'Suppliers', path: '/suppliers', icon: Building2 },
  { name: 'Reports', path: '/reports', icon: FileText },
  { name: 'Alerts', path: '/alerts', icon: Bell },
  { name: 'Expiry Management', path: '/expiry', icon: CalendarDays },
  { name: 'Settings', path: '/settings', icon: Settings },
  { name: 'Users', path: '/users', icon: UsersRound },
];

export const Sidebar = () => {
  const { isCollapsed, toggleCollapse, isMobileOpen, closeMobileMenu } = useSidebar();
  const { hasPermission } = useAuth();
  const location = useLocation();

  const isInventoryActive = location.pathname.startsWith('/inventory');
  const [isInventoryOpen, setIsInventoryOpen] = useState(isInventoryActive);

  useEffect(() => {
    if (isInventoryActive) {
      const openInventoryMenu = window.setTimeout(() => setIsInventoryOpen(true), 0);
      return () => window.clearTimeout(openInventoryMenu);
    }
  }, [isInventoryActive]);

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900/95 border-r border-slate-200/70 dark:border-slate-800/70 transition-all duration-300 relative select-none shadow-xs">
      {/* Brand Header (72px height matching main header) */}
      <div className={`flex items-center h-[72px] px-5 border-b border-slate-200/70 dark:border-slate-800/70 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-md shadow-blue-500/20">
            <Activity className="w-5.5 h-5.5" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col whitespace-nowrap">
              <span className="font-bold text-slate-900 dark:text-white text-lg tracking-tight leading-none">MedTrack</span>
              <span className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold tracking-wide uppercase leading-tight mt-1">Healthcare Platform</span>
            </div>
          )}
        </div>
        {/* Mobile Close Button */}
        <button
          onClick={closeMobileMenu}
          className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Close Mobile Navigation"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Items */}
      <div className="flex-1 py-6 px-3.5 space-y-1.5 overflow-y-auto">
        {mainNavItems.filter((item) => hasPermission(pathPermissions[item.path])).map((item) => {
          const Icon = item.icon;
          const isActive = item.hasSubmenu
            ? isInventoryActive
            : location.pathname === item.path;

          if (item.hasSubmenu) {
            return (
              <div key={item.name} className="space-y-1">
                {/* Inventory Top-Level Menu Header */}
                <div
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 cursor-pointer group ${
                    isActive
                      ? 'bg-blue-50/80 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100'
                  } ${isCollapsed ? 'justify-center px-2' : ''}`}
                  onClick={() => {
                    if (isCollapsed) {
                      toggleCollapse();
                      setIsInventoryOpen(true);
                    } else {
                      setIsInventoryOpen((prev) => !prev);
                    }
                  }}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <Icon className={`w-5 h-5 shrink-0 transition-colors ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`} />
                    {!isCollapsed && <span className="truncate">{item.name}</span>}
                  </div>
                  {!isCollapsed && (
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 dark:text-slate-500 transition-transform duration-200 ${
                        isInventoryOpen ? 'rotate-180 text-blue-600 dark:text-blue-400' : ''
                      }`}
                    />
                  )}
                  {/* Tooltip for collapsed mode */}
                  {isCollapsed && (
                    <div className="absolute left-full ml-3 px-3 py-1.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 shadow-lg z-50">
                      {item.name}
                    </div>
                  )}
                </div>

                {/* Submenu Items */}
                {!isCollapsed && isInventoryOpen && (
                  <div className="pl-9 pr-1 space-y-1 pt-0.5 animate-in slide-in-from-top-1 duration-150">
                    {inventorySubItems.map((subItem) => {
                      const SubIcon = subItem.icon;
                      const isSubActive =
                        location.pathname + location.search === subItem.path ||
                        (subItem.path === '/inventory' && location.pathname === '/inventory' && !location.search);
                      return (
                        <NavLink
                          key={subItem.name}
                          to={subItem.path}
                          onClick={closeMobileMenu}
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 ${
                            isSubActive
                              ? 'bg-blue-100/60 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-semibold'
                              : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100/60 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-slate-200'
                          }`}
                        >
                          <SubIcon className="w-3.5 h-3.5 shrink-0 opacity-75" />
                          <span className="truncate">{subItem.name}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={closeMobileMenu}
              className={`flex items-center gap-3.5 px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 relative group ${
                isActive
                  ? 'bg-blue-50/80 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100'
              } ${isCollapsed ? 'justify-center px-2' : ''}`}
            >
              <Icon className={`w-5 h-5 shrink-0 transition-colors ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`} />
              {!isCollapsed && <span className="truncate">{item.name}</span>}
              {/* Tooltip for collapsed desktop view */}
              {isCollapsed && (
                <div className="absolute left-full ml-3 px-3 py-1.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 shadow-lg z-50">
                  {item.name}
                </div>
              )}
            </NavLink>
          );
        })}
      </div>

      {/* Desktop Collapse Toggle Footer */}
      <div className="hidden lg:flex items-center justify-end p-3.5 border-t border-slate-200/70 dark:border-slate-800/70">
        <button
          onClick={toggleCollapse}
          className="w-full flex items-center justify-center p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar (260px expanded / 72px collapsed) */}
      <aside
        className={`hidden lg:block h-screen sticky top-0 transition-all duration-300 z-30 ${
          isCollapsed ? 'w-[72px]' : 'w-[260px]'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity"
            onClick={closeMobileMenu}
          />
          <div className="relative w-[260px] max-w-[85vw] h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};