import { useEffect, Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { initializeAuth } from './services/authService';
import Layout from './components/layout/Layout';
import LoadingSpinner from './components/ui/LoadingSpinner';

// ─── Lazy loaded pages ────────────────────────────────────────────────────────
const Login          = lazy(() => import('./pages/auth/Login'));
const Register       = lazy(() => import('./pages/auth/Register'));
const Dashboard      = lazy(() => import('./pages/Dashboard'));
const WorkspaceList  = lazy(() => import('./pages/workspace/WorkspaceList'));
const WorkspaceDetail = lazy(() => import('./pages/workspace/WorkspaceDetail'));
const NewMeeting     = lazy(() => import('./pages/meeting/NewMeeting'));
const MeetingDetail  = lazy(() => import('./pages/meeting/MeetingDetail'));
const MeetingReview  = lazy(() => import('./pages/meeting/MeetingReview'));
const MyTasks        = lazy(() => import('./pages/tasks/MyTasks'));
const Settings       = lazy(() => import('./pages/Settings'));

// ─── Route guards ─────────────────────────────────────────────────────────────
const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-dark-900">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-dark-900">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return !isAuthenticated ? <>{children}</> : <Navigate to="/dashboard" replace />;
};

// ─── Page suspense wrapper ────────────────────────────────────────────────────
const PageLoader = () => (
  <div className="flex-1 flex items-center justify-center">
    <LoadingSpinner size="lg" />
  </div>
);

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const { isLoading } = useAuthStore();

  // Initialize auth on mount
  useEffect(() => {
    initializeAuth().then(() => {
      // Hide the initial HTML loader
      if (typeof window.__hideLoader === 'function') {
        window.__hideLoader();
      }
    });
  }, []);

  // Extend window type for __hideLoader
  useEffect(() => {
    if (!isLoading && typeof window.__hideLoader === 'function') {
      window.__hideLoader();
    }
  }, [isLoading]);

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* ── Public routes ── */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          }
        />

        {/* ── Protected routes (inside Layout) ── */}
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          {/* Default redirect */}
          <Route index element={<Navigate to="/dashboard" replace />} />

          {/* Dashboard */}
          <Route path="dashboard" element={<Dashboard />} />

          {/* Workspaces */}
          <Route path="workspaces" element={<WorkspaceList />} />
          <Route path="workspaces/:workspaceId" element={<WorkspaceDetail />} />

          {/* Meetings */}
          <Route
            path="workspaces/:workspaceId/meetings/new"
            element={<NewMeeting />}
          />
          <Route path="meetings/:meetingId" element={<MeetingDetail />} />
          <Route path="meetings/:meetingId/review" element={<MeetingReview />} />

          {/* Tasks */}
          <Route path="tasks" element={<MyTasks />} />

          {/* Settings */}
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* ── 404 catch-all ── */}
        <Route
          path="*"
          element={
            <div className="h-screen flex flex-col items-center justify-center bg-dark-900 text-slate-100">
              <div className="text-8xl font-bold text-dark-700 mb-4">404</div>
              <h1 className="text-2xl font-bold text-slate-300 mb-2">
                Page Not Found
              </h1>
              <p className="text-slate-500 mb-8">
                The page you're looking for doesn't exist.
              </p>
              <a href="/dashboard" className="btn-primary">
                Go to Dashboard
              </a>
            </div>
          }
        />
      </Routes>
    </Suspense>
  );
}

// ─── Extend window type ───────────────────────────────────────────────────────
declare global {
  interface Window {
    __hideLoader?: () => void;
  }
}