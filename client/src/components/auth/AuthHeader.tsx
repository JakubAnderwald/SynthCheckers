import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { UserProfile } from './UserProfile';
import { AuthModal } from './AuthModal';
import { Button } from '../ui/button';
import { User, LogIn } from 'lucide-react';

export function AuthHeader() {
  const { isAuthenticated } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  if (isAuthenticated) {
    return (
      <>
        <div className="fixed top-4 right-4 z-50">
          <button 
            onClick={() => setShowProfileModal(true)}
            className="bg-gray-900/80 backdrop-blur-md border border-purple-500/30 rounded-lg p-2 hover:bg-gray-800/80 transition-colors"
          >
            <UserProfile compact />
          </button>
        </div>
        
        <AuthModal 
          isOpen={showProfileModal} 
          onClose={() => setShowProfileModal(false)}
          showProfile 
        />
      </>
    );
  }

  return (
    <>
      <div className="fixed top-4 right-4 z-50">
        <Button
          onClick={() => setShowAuthModal(true)}
          className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 text-white font-semibold px-4 py-2 rounded-lg transition-all duration-200 transform hover:scale-105"
        >
          <LogIn className="h-4 w-4 mr-2" />
          Sign In
        </Button>
      </div>
      
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />
    </>
  );
}