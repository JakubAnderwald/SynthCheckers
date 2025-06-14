import React, { ReactNode } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { AuthModal } from './AuthModal';

interface ProtectedRouteProps {
  children: ReactNode;
  fallback?: ReactNode;
  requireAuth?: boolean;
  showModal?: boolean;
}

export function ProtectedRoute({ 
  children, 
  fallback,
  requireAuth = true,
  showModal = true 
}: ProtectedRouteProps) {
  const { isAuthenticated, loading } = useAuth();
  const [showAuthModal, setShowAuthModal] = React.useState(false);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // If authentication is required and user is not authenticated
  if (requireAuth && !isAuthenticated) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (showModal) {
      return (
        <>
          <div className="flex items-center justify-center min-h-screen bg-gray-900/50">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-white">Authentication Required</h2>
              <p className="text-gray-300">Please sign in to access this feature</p>
              <button
                onClick={() => setShowAuthModal(true)}
                className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 text-white font-semibold px-6 py-3 rounded-lg transition-all duration-200 transform hover:scale-105"
              >
                Sign In
              </button>
            </div>
          </div>
          <AuthModal 
            isOpen={showAuthModal} 
            onClose={() => setShowAuthModal(false)} 
          />
        </>
      );
    }

    return null;
  }

  // If authentication is not required or user is authenticated, show children
  return <>{children}</>;
}

// Higher-order component version for easier integration
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options: Omit<ProtectedRouteProps, 'children'> = {}
) {
  return function AuthenticatedComponent(props: P) {
    return (
      <ProtectedRoute {...options}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}

// Hook for conditional rendering based on auth status
export function useRequireAuth() {
  const { isAuthenticated, loading } = useAuth();
  
  return {
    isAuthenticated,
    loading,
    canAccess: isAuthenticated && !loading,
    needsAuth: !isAuthenticated && !loading
  };
}