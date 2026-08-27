import { Outlet } from 'react-router-dom';
import { SidebarProvider } from '../hooks/useSidebar';
import { Sidebar } from '../components/layout/Sidebar';
import { Header } from '../components/layout/Header';
import { PharmacySelector } from '../components/PharmacySelector';

export const AppLayout = () => {
  return (
    <SidebarProvider>
      <div className="flex h-screen bg-[#f6fbfc] dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden font-sans antialiased">
        {/* Responsive Collapsible Sidebar */}
        <Sidebar />

        {/* Main Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Sticky 72px Header */}
          <Header />

          {/* Pharmacy Selector */}
          <div className="px-5 lg:px-7 pb-2">
            <PharmacySelector />
          </div>

          {/* Page Content Outlet */}
          <main className="flex-1 overflow-y-auto p-5 lg:p-7 space-y-6">
            <div className="max-w-7xl mx-auto w-full">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AppLayout;