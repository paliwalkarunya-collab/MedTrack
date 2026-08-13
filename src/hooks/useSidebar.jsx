import { useState, useEffect } from 'react';
import { SidebarContext } from './sidebarContext';

export const SidebarProvider = ({ children }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Always start in light mode. We intentionally do NOT read a saved
  // preference on load so the app never opens in dark mode just because
  // some other project (or a previous visit) left a value behind in this
  // browser's storage for localhost.
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    document.documentElement.classList.remove('dark');
    sessionStorage.removeItem('medtrack-theme');
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      // sessionStorage clears itself when the tab/browser is closed, so a
      // toggle only persists for the current session instead of forever.
      sessionStorage.setItem('medtrack-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      sessionStorage.removeItem('medtrack-theme');
    }
  }, [isDarkMode]);

  const toggleCollapse = () => setIsCollapsed((prev) => !prev);
  const toggleMobileMenu = () => setIsMobileOpen((prev) => !prev);
  const closeMobileMenu = () => setIsMobileOpen(false);
  const toggleDarkMode = () => setIsDarkMode((prev) => !prev);

  return (
    <SidebarContext.Provider
      value={{
        isCollapsed,
        toggleCollapse,
        isMobileOpen,
        toggleMobileMenu,
        closeMobileMenu,
        isDarkMode,
        setDarkMode: setIsDarkMode,
        toggleDarkMode,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
};
