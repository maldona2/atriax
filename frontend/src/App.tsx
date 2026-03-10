import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { AppLayout } from '@/components/layout/AppLayout';
import { Toaster } from '@/components/ui/sonner';
import { LoginPage } from '@/pages/LoginPage';
import { TenantsPage } from '@/pages/admin/TenantsPage';
import { AppointmentsPage } from '@/pages/AppointmentsPage';
import { AppointmentDetailPage } from '@/pages/AppointmentDetailPage';
import { PatientsPage } from '@/pages/PatientsPage';
import { PatientDetailPage } from '@/pages/PatientDetailPage';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route path="tenants" element={<TenantsPage />} />
            <Route index element={<Navigate to="/admin/tenants" replace />} />
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
            <Route path="appointments/:id" element={<AppointmentDetailPage />} />
            <Route path="patients" element={<PatientsPage />} />
            <Route path="patients/:id" element={<PatientDetailPage />} />
            <Route index element={<Navigate to="/app/appointments" replace />} />
          </Route>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
      <Toaster />
    </AuthProvider>
  );
}

export default App;
