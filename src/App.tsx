import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { CustomersPage } from './pages/CustomersPage';
import { CustomerDetailPage } from './pages/CustomerDetailPage';
import { AdminSettingsPage } from './pages/AdminSettingsPage';
import { PermissionGuard } from './components/PermissionGuard';
import { LoadingSpinner } from './components/ui/LoadingSpinner';

function AppRoutes() {
  const { currentUser, loading, signIn, signUp, signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner message="로딩 중..." />
      </div>
    );
  }

  if (!currentUser) {
    return <LoginPage signIn={signIn} signUp={signUp} />;
  }

  return (
    <Routes>
      <Route element={<AppLayout onSignOut={signOut} />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/customers/:id" element={<CustomerDetailPage />} />
        <Route
          path="/settings"
          element={
            <PermissionGuard action="manage_settings" fallback={<Navigate to="/" replace />}>
              <AdminSettingsPage />
            </PermissionGuard>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
