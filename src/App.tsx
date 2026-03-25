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
  const { currentUser, loading, authError, signIn, signUp, signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner message="로딩 중..." />
      </div>
    );
  }

  if (authError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 max-w-md">
          <div className="text-red-500 text-4xl mb-4">⚠</div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">연결 오류</h2>
          <p className="text-sm text-gray-500 mb-4">{authError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
          >
            다시 시도
          </button>
        </div>
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
