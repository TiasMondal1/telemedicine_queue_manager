import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { useAuthStore } from '../store/authStore';
import Login from '../pages/Login';
import Register from '../pages/Register';

// Import pages
import BookAppointment from '../pages/patient/BookAppointment';
import MyAppointments from '../pages/patient/MyAppointments';
import DoctorQueue from '../pages/doctor/DoctorQueue';
import QueueDashboard from '../pages/receptionist/QueueDashboard';
import VideoRoom from '../pages/video/VideoRoom';
import Notifications from '../pages/Notifications';
import PatientDashboard from '../pages/patient/PatientDashboard';
import AdminDashboard from '../pages/admin/AdminDashboard';
import UserManagement from '../pages/admin/UserManagement';
import Reports from '../pages/admin/Reports';
import PaymentCheckout from '../pages/patient/PaymentCheckout';
import PaymentSuccess from '../pages/patient/PaymentSuccess';
import PaymentHistory from '../pages/patient/PaymentHistory';
import Prescriptions from '../pages/doctor/Prescriptions';
import Settings from '../pages/admin/Settings';

export default function AppRoutes() {
  const { isAuthenticated, user } = useAuthStore();

  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/login"
        element={!isAuthenticated ? <Login /> : <Navigate to={getDefaultRoute(user?.role)} />}
      />
      <Route
        path="/register"
        element={!isAuthenticated ? <Register /> : <Navigate to={getDefaultRoute(user?.role)} />}
      />

      {/* Protected routes - Patient */}
      <Route
        path="/patient/dashboard"
        element={
          <ProtectedRoute allowedRoles={['PATIENT']}>
            <PatientDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/patient/book-appointment"
        element={
          <ProtectedRoute allowedRoles={['PATIENT']}>
            <BookAppointment />
          </ProtectedRoute>
        }
      />
      <Route
        path="/patient/appointments"
        element={
          <ProtectedRoute allowedRoles={['PATIENT']}>
            <MyAppointments />
          </ProtectedRoute>
        }
      />
      <Route
        path="/payment/checkout"
        element={
          <ProtectedRoute allowedRoles={['PATIENT']}>
            <PaymentCheckout />
          </ProtectedRoute>
        }
      />
      <Route
        path="/payment/success"
        element={
          <ProtectedRoute allowedRoles={['PATIENT']}>
            <PaymentSuccess />
          </ProtectedRoute>
        }
      />
      <Route
        path="/payment/history"
        element={
          <ProtectedRoute>
            <PaymentHistory />
          </ProtectedRoute>
        }
      />

      {/* Protected routes - Doctor */}
      <Route
        path="/doctor/queue"
        element={
          <ProtectedRoute allowedRoles={['DOCTOR']}>
            <DoctorQueue />
          </ProtectedRoute>
        }
      />
      <Route
        path="/doctor/prescriptions"
        element={
          <ProtectedRoute allowedRoles={['DOCTOR']}>
            <Prescriptions />
          </ProtectedRoute>
        }
      />

      {/* Protected routes - Receptionist */}
      <Route
        path="/receptionist/queue"
        element={
          <ProtectedRoute allowedRoles={['RECEPTIONIST', 'ADMIN']}>
            <QueueDashboard />
          </ProtectedRoute>
        }
      />

      {/* Protected routes - Admin */}
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <UserManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/reports"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'RECEPTIONIST']}>
            <Reports />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/settings"
        element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <Settings />
          </ProtectedRoute>
        }
      />

      {/* Video Call Route */}
      <Route
        path="/video/:appointmentId"
        element={
          <ProtectedRoute>
            <VideoRoom />
          </ProtectedRoute>
        }
      />

      {/* Notifications Route */}
      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <Notifications />
          </ProtectedRoute>
        }
      />

      {/* Root route */}
      <Route
        path="/"
        element={
          isAuthenticated ? (
            <Navigate to={getDefaultRoute(user?.role)} />
          ) : (
            <Navigate to="/login" />
          )
        }
      />

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

function getDefaultRoute(role?: string): string {
  switch (role) {
    case 'ADMIN':
      return '/admin/dashboard';
    case 'DOCTOR':
      return '/doctor/queue';
    case 'RECEPTIONIST':
      return '/receptionist/queue';
    case 'PATIENT':
      return '/patient/dashboard';
    default:
      return '/login';
  }
}
