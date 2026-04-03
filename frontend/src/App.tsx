import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { ThemeProvider } from 'next-themes';
import { AuthProvider } from '@/contexts/AuthContext';
import { ChatbotProvider } from '@/contexts/ChatbotContext';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { PublicRoute } from '@/components/layout/PublicRoute';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { AppLayout } from '@/components/layout/AppLayout';
import { Toaster } from '@/components/ui/sonner';
import { LoginPage } from '@/pages/LoginPage';
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/ResetPasswordPage';
import LandingPage from '@/pages/LandingPage';
import { RegistrationPage } from '@/pages/RegistrationPage';
import { VerifyEmailPage } from '@/pages/VerifyEmailPage';
import { TenantsPage } from '@/pages/admin/TenantsPage';
import { AppointmentsPage } from '@/pages/AppointmentsPage';
import { AppointmentDetailPage } from '@/pages/AppointmentDetailPage';
import { PatientsPage } from '@/pages/PatientsPage';
import { PatientDetailPage } from '@/pages/PatientDetailPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { DebtDashboardPage } from '@/pages/DebtDashboardPage';
import { HelpPage } from '@/pages/HelpPage';
import TermsPage from '@/pages/TermsPage';
import PrivacyPage from '@/pages/PrivacyPage';

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthProvider>
        <ChatbotProvider>
          <Router>
            <Routes>
              <Route
                path="/login"
                element={
                  <PublicRoute>
                    <LoginPage />
                  </PublicRoute>
                }
              />
              <Route
                path="/register"
                element={
                  <PublicRoute>
                    <RegistrationPage />
                  </PublicRoute>
                }
              />
              <Route
                path="/forgot-password"
                element={
                  <PublicRoute>
                    <ForgotPasswordPage />
                  </PublicRoute>
                }
              />
              <Route
                path="/reset-password"
                element={
                  <PublicRoute>
                    <ResetPasswordPage />
                  </PublicRoute>
                }
              />
              <Route path="/verify-email" element={<VerifyEmailPage />} />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={['super_admin']}>
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="tenants" element={<TenantsPage />} />
                <Route
                  index
                  element={<Navigate to="/admin/tenants" replace />}
                />
              </Route>
              <Route
                path="/app"
                element={
                  <ProtectedRoute allowedRoles={['professional']}>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="appointments" element={<AppointmentsPage />} />
                <Route
                  path="appointments/:id"
                  element={<AppointmentDetailPage />}
                />
                <Route path="patients" element={<PatientsPage />} />
                <Route path="patients/:id" element={<PatientDetailPage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="debt-dashboard" element={<DebtDashboardPage />} />
                <Route path="help" element={<HelpPage />} />
                <Route path="help/:section" element={<HelpPage />} />
                <Route
                  index
                  element={<Navigate to="/app/appointments" replace />}
                />
              </Route>
              <Route
                path="/"
                element={
                  <PublicRoute>
                    <LandingPage />
                  </PublicRoute>
                }
              />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
          <Toaster />
        </ChatbotProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
