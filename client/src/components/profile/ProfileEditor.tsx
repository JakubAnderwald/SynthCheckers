import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Separator } from '../ui/separator';
import { Edit3, Save, X, User, Shield, Bell, Eye } from 'lucide-react';
import type { UserProfile, GamePreferences, PrivacySettings } from '../../types/firestore';

interface ProfileEditorProps {
  profile: UserProfile;
  onClose: () => void;
  onSave: (updates: Partial<UserProfile>) => Promise<void>;
}

export function ProfileEditor({ profile, onClose, onSave }: ProfileEditorProps) {
  const { updateDisplayName } = useAuth();
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [gamePreferences, setGamePreferences] = useState<GamePreferences>(profile.gamePreferences);
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>(profile.privacySettings);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateDisplayName = (name: string): string | null => {
    if (name.length < 2) return 'Display name must be at least 2 characters';
    if (name.length > 30) return 'Display name must be less than 30 characters';
    if (!/^[a-zA-Z0-9\s_-]+$/.test(name)) return 'Display name can only contain letters, numbers, spaces, hyphens, and underscores';
    return null;
  };

  const handleSave = async () => {
    setIsLoading(true);
    setErrors({});

    try {
      // Validate display name
      const displayNameError = validateDisplayName(displayName);
      if (displayNameError) {
        setErrors({ displayName: displayNameError });
        setIsLoading(false);
        return;
      }

      // Prepare updates
      const updates: Partial<UserProfile> = {
        gamePreferences,
        privacySettings,
      };

      // Update display name if changed
      if (displayName !== profile.displayName) {
        await updateDisplayName(displayName);
        updates.displayName = displayName;
      }

      // Save all updates
      await onSave(updates);
      onClose();
    } catch (error) {
      console.error('Error saving profile:', error);
      setErrors({ general: 'Failed to save profile changes. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const hasChanges = 
    displayName !== profile.displayName ||
    JSON.stringify(gamePreferences) !== JSON.stringify(profile.gamePreferences) ||
    JSON.stringify(privacySettings) !== JSON.stringify(profile.privacySettings);

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <Card className="bg-gray-900/80 backdrop-blur-md border-purple-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Edit3 className="h-5 w-5 text-purple-400" />
            Edit Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Display Name */}
          <div className="space-y-2">
            <Label htmlFor="displayName" className="text-white flex items-center gap-2">
              <User className="h-4 w-4" />
              Display Name
            </Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="bg-gray-800/50 border-gray-600 text-white"
              placeholder="Enter your display name"
            />
            {errors.displayName && (
              <p className="text-sm text-red-400">{errors.displayName}</p>
            )}
          </div>

          <Separator className="bg-gray-600" />

          {/* Game Preferences */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Bell className="h-5 w-5 text-cyan-400" />
              Game Preferences
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-white">Allow Game Challenges</Label>
                  <p className="text-sm text-gray-400">Let other players challenge you to games</p>
                </div>
                <Switch
                  checked={gamePreferences.allowChallenges}
                  onCheckedChange={(checked) => 
                    setGamePreferences(prev => ({ ...prev, allowChallenges: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-white">Auto-Accept Friend Requests</Label>
                  <p className="text-sm text-gray-400">Automatically accept incoming friend requests</p>
                </div>
                <Switch
                  checked={gamePreferences.autoAcceptFriends}
                  onCheckedChange={(checked) => 
                    setGamePreferences(prev => ({ ...prev, autoAcceptFriends: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-white">Sound Effects</Label>
                  <p className="text-sm text-gray-400">Play sound effects during games</p>
                </div>
                <Switch
                  checked={gamePreferences.soundEnabled}
                  onCheckedChange={(checked) => 
                    setGamePreferences(prev => ({ ...prev, soundEnabled: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-white">Background Music</Label>
                  <p className="text-sm text-gray-400">Play background music</p>
                </div>
                <Switch
                  checked={gamePreferences.musicEnabled}
                  onCheckedChange={(checked) => 
                    setGamePreferences(prev => ({ ...prev, musicEnabled: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-white">Animations</Label>
                  <p className="text-sm text-gray-400">Show piece movement animations</p>
                </div>
                <Switch
                  checked={gamePreferences.animationsEnabled}
                  onCheckedChange={(checked) => 
                    setGamePreferences(prev => ({ ...prev, animationsEnabled: checked }))
                  }
                />
              </div>
            </div>
          </div>

          <Separator className="bg-gray-600" />

          {/* Privacy Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Shield className="h-5 w-5 text-yellow-400" />
              Privacy Settings
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-white">Public Profile</Label>
                  <p className="text-sm text-gray-400">Allow others to view your profile</p>
                </div>
                <Switch
                  checked={privacySettings.profileVisible}
                  onCheckedChange={(checked) => 
                    setPrivacySettings(prev => ({ ...prev, profileVisible: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-white">Show Statistics</Label>
                  <p className="text-sm text-gray-400">Display your game stats on your profile</p>
                </div>
                <Switch
                  checked={privacySettings.statsVisible}
                  onCheckedChange={(checked) => 
                    setPrivacySettings(prev => ({ ...prev, statsVisible: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-white">Online Status</Label>
                  <p className="text-sm text-gray-400">Show when you're online</p>
                </div>
                <Switch
                  checked={privacySettings.onlineStatusVisible}
                  onCheckedChange={(checked) => 
                    setPrivacySettings(prev => ({ ...prev, onlineStatusVisible: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-white">Friend Requests</Label>
                  <p className="text-sm text-gray-400">Allow others to send friend requests</p>
                </div>
                <Switch
                  checked={privacySettings.allowFriendRequests}
                  onCheckedChange={(checked) => 
                    setPrivacySettings(prev => ({ ...prev, allowFriendRequests: checked }))
                  }
                />
              </div>
            </div>
          </div>

          {/* Error Message */}
          {errors.general && (
            <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
              <p className="text-red-400 text-sm">{errors.general}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleSave}
              disabled={!hasChanges || isLoading}
              className="flex-1 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  Save Changes
                </div>
              )}
            </Button>
            <Button
              onClick={onClose}
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}