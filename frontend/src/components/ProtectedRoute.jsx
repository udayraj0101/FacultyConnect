import React from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getDefaultPathForRole } from '../lib/roleRouting';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, isAuthenticated, booting } = useAuth();

  // Hold rendering while the AuthProvider is rehydrating the in-memory
  // access token from the httpOnly refresh cookie. Without this, child
  // pages fire authenticated API calls with no access token, race the
  // 401 interceptor's refresh against the AuthProvider's bootstrap,
  // and one of the two 401s because the refresh-token hash rotates.
  if (booting) {
    return (
      <div className="min-h-screen flex items-center justify-center text-text-muted">
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={getDefaultPathForRole(user.role)} replace />;
  }
  return children;
}
