import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { User, Check } from 'lucide-react';

interface DisplayNameSetupProps {
  onComplete?: () => void;
  onSkip?: () => void;
}

export function DisplayNameSetup({ onComplete, onSkip }: DisplayNameSetupProps) {
  const { user, updateDisplayName, loading } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!displayName.trim()) {
      setError('Display name is required');
      return;
    }

    if (displayName.length < 2) {
      setError('Display name must be at least 2 characters');
      return;
    }

    if (displayName.length > 30) {
      setError('Display name must be less than 30 characters');
      return;
    }

    try {
      setIsUpdating(true);
      await updateDisplayName(displayName.trim());
      onComplete?.();
    } catch (error) {
      console.error('Error updating display name:', error);
      setError('Failed to update display name. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSkip = () => {
    onSkip?.();
  };

  return (
    <Card className="w-full max-w-md mx-auto bg-gray-900/80 backdrop-blur-md border-purple-500/30">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-3">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-white" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
          Choose Your Display Name
        </CardTitle>
        <CardDescription className="text-gray-300">
          This is how other players will see you in games and leaderboards
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="displayName" className="text-sm font-medium text-gray-300">
              Display Name
            </label>
            <Input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your display name"
              className="bg-gray-800/50 border-purple-500/30 text-white placeholder-gray-400 focus:border-purple-400"
              disabled={isUpdating || loading}
              maxLength={30}
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>2-30 characters</span>
              <span>{displayName.length}/30</span>
            </div>
          </div>

          {error && (
            <div className="text-red-400 text-sm bg-red-900/20 border border-red-500/30 rounded-lg p-2">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Button
              type="submit"
              disabled={isUpdating || loading || !displayName.trim()}
              className="w-full bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
            >
              {isUpdating ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Updating...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <Check className="w-4 h-4" />
                  <span>Set Display Name</span>
                </div>
              )}
            </Button>

            {user?.displayName && (
              <Button
                type="button"
                variant="outline"
                onClick={handleSkip}
                className="w-full border-gray-600 text-gray-300 hover:bg-gray-800/50"
                disabled={isUpdating || loading}
              >
                Keep Current Name ({user.displayName})
              </Button>
            )}
          </div>
        </form>

        <div className="mt-4 text-xs text-gray-400 text-center space-y-1">
          <p>You can change your display name later in settings</p>
          <p>Choose wisely - it represents you in the game</p>
        </div>
      </CardContent>
    </Card>
  );
}