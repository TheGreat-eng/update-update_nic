// src/App.tsx
import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { Spin } from 'antd';
import AppLayout from './layout/AppLayout';
import NotFoundPage from './pages/NotFoundPage';
import PrivateRoute from './components/PrivateRoute';
import NetworkStatus from './components/NetworkStatus';


// ✅ Lazy load các trang
const LandingPage = lazy(() => import('./pages/LandingPage')); // ✅ THÊM LANDING PAGE
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const DevicesPage = lazy(() => import('./pages/DevicesPage'));
const RulesPage = lazy(() => import('./pages/RulesPage'));
const FarmsPage = lazy(() => import('./pages/FarmsPage'));
const AIPredictionPage = lazy(() => import('./pages/AIPredictionPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const ChangePasswordPage = lazy(() => import('./pages/ChangePasswordPage'));
const CreateRulePage = lazy(() => import('./pages/CreateRulePage'));
const EditRulePage = lazy(() => import('./pages/EditRulePage'));
const UserManagementPage = lazy(() => import('./pages/admin/UserManagementPage'));
const PlantHealthPage = lazy(() => import('./pages/PlantHealthPage'));
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const SystemSettingsPage = lazy(() => import('./pages/admin/SystemSettingsPage')); // <<<< THÊM IMPORT
const NotificationsPage = lazy(() => import('./pages/NotificationsPage')); // VVVV--- THÊM IMPORT NÀY ---VVVV
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage')); // THÊM IMPORT NÀY


const LoadingFallback = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
    <Spin size="large" />
  </div>
);

function App() {
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    // Việc kiểm tra auth này không còn quá quan trọng ở App.tsx nữa
    // vì PrivateRoute sẽ xử lý, nhưng giữ lại cũng không sao.
    const timer = setTimeout(() => setIsCheckingAuth(false), 100);
    return () => clearTimeout(timer);
  }, []);

  if (isCheckingAuth) {
    return <LoadingFallback />;
  }

  return (
    <Router>
      <NetworkStatus />
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          {/* ✅ Public routes: Landing, Login, Register */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* ✅ Protected routes (tất cả các trang bên trong ứng dụng) */}
          {/* Khi người dùng truy cập /dashboard, PrivateRoute sẽ kiểm tra auth */}
          <Route
            path="/dashboard"
            element={<PrivateRoute><AppLayout /></PrivateRoute>}
          >
            <Route index element={<DashboardPage />} />
          </Route>
          <Route
            path="/farms"
            element={<PrivateRoute><AppLayout /></PrivateRoute>}
          >
            <Route index element={<FarmsPage />} />
          </Route>
          <Route
            path="/devices"
            element={<PrivateRoute><AppLayout /></PrivateRoute>}
          >
            <Route index element={<DevicesPage />} />
          </Route>
          <Route
            path="/rules"
            element={<PrivateRoute><AppLayout /></PrivateRoute>}
          >
            <Route index element={<RulesPage />} />
            <Route path="create" element={<CreateRulePage />} />
            <Route path="edit/:ruleId" element={<EditRulePage />} />
          </Route>
          <Route path="/ai" element={<PrivateRoute><AppLayout><AIPredictionPage /></AppLayout></PrivateRoute>} />
          <Route path="/profile" element={<PrivateRoute><AppLayout><ProfilePage /></AppLayout></PrivateRoute>} />
          <Route path="/change-password" element={<PrivateRoute><AppLayout><ChangePasswordPage /></AppLayout></PrivateRoute>} />
          {/* VVVV--- THÊM ROUTE MỚI CHO TRANG NOTIFICATIONS ---VVVV */}
          <Route path="/notifications" element={<PrivateRoute><AppLayout><NotificationsPage /></AppLayout></PrivateRoute>} />
          {/* ^^^^---------------------------------------------^^^^ */}
          <Route path="/plant-health" element={<PrivateRoute><AppLayout><PlantHealthPage /></AppLayout></PrivateRoute>} />
          <Route path="/analytics" element={<PrivateRoute><AppLayout><AnalyticsPage /></AppLayout></PrivateRoute>} />
          <Route path="/settings" element={<PrivateRoute><AppLayout><SettingsPage /></AppLayout></PrivateRoute>} />
          <Route path="/admin/dashboard" element={<PrivateRoute><AppLayout><AdminDashboardPage /></AppLayout></PrivateRoute>} />
          <Route path="/admin/users" element={<PrivateRoute><AppLayout><UserManagementPage /></AppLayout></PrivateRoute>} />
          {/* <<<< THÊM ROUTE MỚI >>>> */}
          <Route path="/admin/settings" element={<PrivateRoute><AppLayout><SystemSettingsPage /></AppLayout></PrivateRoute>} />
          {/* ✅ 404 Page */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;