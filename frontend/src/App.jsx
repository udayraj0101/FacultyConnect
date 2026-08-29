import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/ui/Toast';
import ProtectedRoute from './components/ProtectedRoute';
import AppHeader from './components/shared/AppHeader';
import Home from './pages/Home';
import FacultyProfile from './pages/FacultyProfile';
import FdpsPage from './pages/discover/FdpsPage';
import ConferencesPage from './pages/discover/ConferencesPage';
import GrantsPage from './pages/discover/GrantsPage';
import JournalsPage from './pages/discover/JournalsPage';
import OpportunityDetail from './pages/discover/OpportunityDetail';
import JobBoard from './pages/JobBoard';
import Directory from './pages/Directory';
import DirectoryProfile from './pages/DirectoryProfile';
import ConnectRequests from './pages/ConnectRequests';
import Notifications from './pages/Notifications';
import CollegeAdminDashboard from './pages/CollegeAdminDashboard';
import PlatformAdminConsole from './pages/PlatformAdminConsole';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Landing from './pages/Landing';
import PublicProfile from './pages/PublicProfile';
import Onboarding from './pages/Onboarding';
import { getDefaultPathForRole } from './lib/roleRouting';

function FacultyShell() {
  return (
    <div className="min-h-screen bg-bg-dark">
      <AppHeader />
      <Outlet />
    </div>
  );
}

/**
 * Root route: shows the public Landing page for anonymous visitors, or bounces
 * authenticated users to their role's home portal.
 */
function RootRoute() {
  const { user, isAuthenticated } = useAuth();
  if (isAuthenticated) return <Navigate to={getDefaultPathForRole(user.role)} replace />;
  return <Landing />;
}

/**
 * Unknown paths: send authed users home, anonymous ones to landing.
 */
function CatchAllRoute() {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/" replace />;
  return <Navigate to={getDefaultPathForRole(user.role)} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/onboarding/:token" element={<Onboarding />} />

            {/* Public SEO profile — no auth required, renders even for anon visitors. */}
            <Route path="/f/:id" element={<PublicProfile />} />

            {/* Faculty portal: top nav shell */}
            <Route
              element={
                <ProtectedRoute allowedRoles={['Faculty', 'OpportunityOrganizer']}>
                  <FacultyShell />
                </ProtectedRoute>
              }
            >
              <Route path="/home" element={<Home />} />
              <Route path="/profile" element={<FacultyProfile />} />
              <Route path="/discover" element={<Navigate to="/discover/fdps" replace />} />
              <Route path="/discover/fdps" element={<FdpsPage />} />
              <Route path="/discover/conferences" element={<ConferencesPage />} />
              <Route path="/discover/grants" element={<GrantsPage />} />
              <Route path="/discover/journals" element={<JournalsPage />} />
              <Route path="/discover/:slug/:id" element={<OpportunityDetail />} />
              <Route path="/jobs" element={<JobBoard />} />
              <Route path="/directory" element={<Directory />} />
              <Route path="/directory/:id" element={<DirectoryProfile />} />
              <Route path="/requests" element={<ConnectRequests />} />
              <Route path="/notifications" element={<Notifications />} />
            </Route>

            {/* College Admin portal */}
            <Route
              path="/admin/college"
              element={
                <ProtectedRoute allowedRoles={['CollegeAdmin']}>
                  <CollegeAdminDashboard />
                </ProtectedRoute>
              }
            />

            {/* Platform Admin portal */}
            <Route
              path="/admin/platform"
              element={
                <ProtectedRoute allowedRoles={['PlatformAdmin']}>
                  <PlatformAdminConsole />
                </ProtectedRoute>
              }
            />

            <Route path="/" element={<RootRoute />} />
            <Route path="*" element={<CatchAllRoute />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
