import { createContext, useContext, useState, useEffect } from 'react';

const SidebarContext = createContext({
  isCollapsed: false,
  toggleCollapse: () => {},
  isMobileOpen: false,
  toggleMobileMenu: () => {},
  closeMobileMenu: () => {},
  isDarkMode: false,
  toggleDarkMode: () => {},
});

export const SidebarProvider = ({ children }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('medtrack-theme') === 'dark';
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('medtrack-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('medtrack-theme', 'light');
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
        toggleDarkMode,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = () => useContext(SidebarContext);
