import { Navigate, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './hooks/AuthProvider';
import { PermissionRoute, ProtectedRoute, PublicOnlyRoute } from './components/auth/RouteGuards';
import { AppLayout } from './layouts/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { InventoryPage } from './pages/InventoryPage';
import { BillingPage } from './pages/BillingPage';
import { PurchasesPage } from './pages/PurchasesPage';
import { SuppliersPage } from './pages/SuppliersPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { ReportsPage } from './pages/ReportsPage';
import { AlertsPage } from './pages/AlertsPage';
import { SettingsPage } from './pages/SettingsPage';
import { ExpiryPage } from './pages/ExpiryPage';
import { LoginPage } from './pages/LoginPage';
import { UsersPage } from './pages/UsersPage';

function App() {
  return (
    <AuthProvider>
    <Routes>
      <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
      <Route element={<ProtectedRoute />}>
      <Route path="/" element={<AppLayout />}>
        <Route element={<PermissionRoute permission="dashboard:view" />}><Route index element={<DashboardPage />} /></Route>
        <Route element={<PermissionRoute permission="inventory:view" />}><Route path="inventory" element={<InventoryPage />} /></Route>
        <Route element={<PermissionRoute permission="billing:use" />}><Route path="billing" element={<BillingPage />} /><Route path="distribution" element={<Navigate to="/billing" replace />} /></Route>
        <Route element={<PermissionRoute permission="purchases:use" />}><Route path="purchases" element={<PurchasesPage />} /></Route>
        <Route element={<PermissionRoute permission="suppliers:view" />}><Route path="suppliers" element={<SuppliersPage />} /></Route>
        <Route element={<PermissionRoute permission="analytics:view" />}><Route path="analytics" element={<AnalyticsPage />} /></Route>
        <Route element={<PermissionRoute permission="reports:view" />}><Route path="reports" element={<ReportsPage />} /></Route>
        <Route element={<PermissionRoute permission="alerts:view" />}><Route path="alerts" element={<AlertsPage />} /></Route>
        <Route element={<PermissionRoute permission="expiry:view" />}><Route path="expiry" element={<ExpiryPage />} /></Route>
        <Route element={<PermissionRoute permission="settings:manage" />}><Route path="settings" element={<SettingsPage />} /></Route>
        <Route element={<PermissionRoute permission="users:manage" />}><Route path="users" element={<UsersPage />} /></Route>
      </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </AuthProvider>
  );
}

export default App;
