import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

interface LoginButtonProps {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function LoginButton({ onSuccess, onError }: LoginButtonProps) {
  const { signInWithGoogle, loading } = useAuth();
  const [rememberMe, setRememberMe] = useState(false);

  const handleSignIn = async () => {
    try {
      await signInWithGoogle(rememberMe);
      onSuccess?.();
    } catch (error) {
      onError?.(error as Error);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto bg-gray-900/80 backdrop-blur-md border-purple-500/30">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
          Welcome to Synth Checkers
        </CardTitle>
        <CardDescription className="text-gray-300">
          Sign in to play online matches and track your progress
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={handleSignIn}
          disabled={loading}
          className="w-full bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
        >
          {loading ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Signing in...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center space-x-2">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span>Continue with Google</span>
            </div>
          )}
        </Button>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="remember-me"
            checked={rememberMe}
            onCheckedChange={(checked) => setRememberMe(checked === true)}
            className="border-purple-400 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
          />
          <label
            htmlFor="remember-me"
            className="text-sm text-gray-300 cursor-pointer select-none"
          >
            Remember me on this device
          </label>
        </div>

        <p className="text-xs text-gray-400 text-center">
          By signing in, you agree to our terms of service and privacy policy.
        </p>
      </CardContent>
    </Card>
  );
}