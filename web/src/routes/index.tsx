import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { useAuthStore } from '../store/authStore';
import Login from '../pages/Login';
import Register from '../pages/Register';

// Import pages
import BookAppointment from '../pages/patient/BookAppointment';
import MyAppointments from '../pages/patient/MyAppointments';

// Placeholder components - to be implemented
const PatientDashboard = () => <div className="p-8"><h1 className="text-2xl font-bold">Patient Dashboard</h1></div>;
const DoctorQueue = () => <div className="p-8"><h1 className="text-2xl font-bold">Doctor Queue</h1></div>;
const ReceptionistQueue = () => <div className="p-8"><h1 className="text-2xl font-bold">Receptionist Queue</h1></div>;
const AdminDashboard = () => <div className="p-8"><h1 className="text-2xl font-bold">Admin Dashboard</h1></div>;

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

      {/* Protected routes - Doctor */}
      <Route
        path="/doctor/queue"
        element={
          <ProtectedRoute allowedRoles={['DOCTOR']}>
            <DoctorQueue />
          </ProtectedRoute>
        }
      />

      {/* Protected routes - Receptionist */}
      <Route
        path="/receptionist/queue"
        element={
          <ProtectedRoute allowedRoles={['RECEPTIONIST', 'ADMIN']}>
            <ReceptionistQueue />
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
