import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./context/AuthContext";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import TeacherDashboard from "./pages/TeacherDashboard";
import GradesPage from "./pages/GradesPage";
import ParentDashboard from "./pages/ParentDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import NotificationsPage from "./pages/NotificationsPage";
import ReportsPage from "./pages/ReportsPage";
import AIInsightsPage from "./pages/AIInsightsPage";
import SchoolDirectorDashboard from "./pages/SchoolDirectorDashboard";
import MessagesPage from "./pages/MessagesPage";
import AlertsPage from "./pages/AlertsPage";
import PasswordResetPage from "./pages/PasswordResetPage";
import { LoadingPage } from "./components/shared/LoadingPage";

const roleToDashboardPath = (role) => {
  if (role === "school_director") return "/school-director";
  if (role === "admin") return "/admin";
  if (role === "teacher") return "/teacher";
  if (role === "parent") return "/parent";
  return "/login";
};

function DashboardRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingPage />;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={roleToDashboardPath(user.role)} replace />;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/password-reset" element={<PasswordResetPage />} />

      <Route
        path="/teacher"
        element={
          <ProtectedRoute allowedRoles={["teacher", "admin"]}>
            <TeacherDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/parent"
        element={
          <ProtectedRoute allowedRoles={["parent", "admin"]}>
            <ParentDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <ProtectedRoute allowedRoles={["parent", "teacher", "admin", "school_director"]}>
            <NotificationsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/alerts"
        element={
          <ProtectedRoute allowedRoles={["parent", "teacher"]}>
            <AlertsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/messages"
        element={
          <ProtectedRoute allowedRoles={["parent", "teacher", "admin"]}>
            <MessagesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/grades"
        element={
          <ProtectedRoute allowedRoles={["teacher", "admin"]}>
            <GradesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute allowedRoles={["teacher", "admin", "school_director"]}>
            <ReportsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/school-director"
        element={
          <ProtectedRoute allowedRoles={["school_director"]}>
            <SchoolDirectorDashboard />
          </ProtectedRoute>
        }
      />
      <Route path="/dashboard" element={<DashboardRedirect />} />
      <Route
        path="/ai"
        element={
          <ProtectedRoute allowedRoles={["parent", "teacher", "admin"]}>
            <AIInsightsPage />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
