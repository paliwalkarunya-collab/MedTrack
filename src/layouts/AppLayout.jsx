import { Outlet } from 'react-router-dom';
import { SidebarProvider } from '../hooks/useSidebar';
import { Sidebar } from '../components/layout/Sidebar';
import { Header } from '../components/layout/Header';
import { InventoryProvider } from '../hooks/InventoryProvider';
import { SupplierProvider } from '../hooks/SupplierProvider';
import { PurchaseProvider } from '../hooks/PurchaseProvider';
import { BillingProvider } from '../hooks/BillingProvider';
import { ReturnProvider } from '../hooks/ReturnProvider';

export const AppLayout = () => {
  return (
    <SupplierProvider>
    <BillingProvider>
    <PurchaseProvider>
    <InventoryProvider>
    <ReturnProvider>
    <SidebarProvider>
      <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden font-sans antialiased selection:bg-blue-500 selection:text-white">
        {/* Responsive Collapsible Sidebar */}
        <Sidebar />

        {/* Main Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Sticky 72px Header */}
          <Header />

          {/* Page Content Outlet */}
          <main className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6">
            <div className="max-w-7xl mx-auto w-full">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
    </ReturnProvider>
    </InventoryProvider>
    </PurchaseProvider>
    </BillingProvider>
    </SupplierProvider>
  );
};
