import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { LoginButton } from './LoginButton';
import { UserProfile } from './UserProfile';
import { Dialog, DialogContent, DialogOverlay } from '../ui/dialog';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  showProfile?: boolean;
}

export function AuthModal({ isOpen, onClose, showProfile = false }: AuthModalProps) {
  const { isAuthenticated, loading } = useAuth();

  const handleLoginSuccess = () => {
    // Close modal after successful login
    setTimeout(() => {
      onClose();
    }, 1000);
  };

  const handleLoginError = (error: Error) => {
    console.error('Login error:', error);
    // Could show toast notification here
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogOverlay className="bg-black/50 backdrop-blur-sm" />
      <DialogContent className="bg-transparent border-none shadow-none p-6 max-w-lg">
        <div className="relative">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute -top-2 -right-2 z-10 w-8 h-8 bg-gray-800 hover:bg-gray-700 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : isAuthenticated ? (
            <UserProfile compact={!showProfile} />
          ) : (
            <LoginButton 
              onSuccess={handleLoginSuccess} 
              onError={handleLoginError}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}