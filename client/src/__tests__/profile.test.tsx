import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProfileStats } from '../components/profile/ProfileStats';
import { ProfileEditor } from '../components/profile/ProfileEditor';
import { UserSearch } from '../components/profile/UserSearch';
import type { UserProfile } from '../types/firestore';

// Mock Firebase Timestamp
const mockTimestamp = {
  toDate: () => new Date('2024-01-01'),
};

const mockUserProfile: UserProfile = {
  uid: 'test-uid',
  email: 'test@example.com',
  displayName: 'TestUser',
  photoURL: 'https://example.com/photo.jpg',
  eloRating: 1450,
  totalGames: 50,
  wins: 30,
  losses: 18,
  draws: 2,
  peakRating: 1500,
  lowestRating: 1200,
  ratingHistory: [
    {
      rating: 1450,
      change: 25,
      gameId: 'game-1',
      timestamp: mockTimestamp as any,
      opponentUid: 'opponent-1',
      opponentRating: 1400,
      gameResult: 'win'
    }
  ],
  createdAt: mockTimestamp as any,
  updatedAt: mockTimestamp as any,
  lastOnline: mockTimestamp as any,
  isOnline: true,
  isNewUser: false,
  isVerified: true,
  accountStatus: 'active',
  gamePreferences: {
    preferredDifficulty: 'medium',
    allowChallenges: true,
    autoAcceptFriends: false,
    soundEnabled: true,
    musicEnabled: true,
    animationsEnabled: true
  },
  privacySettings: {
    profileVisible: true,
    statsVisible: true,
    onlineStatusVisible: true,
    allowDirectMessages: true,
    allowFriendRequests: true
  }
};

describe('ProfileStats Component', () => {
  it('should render user rating and title correctly', () => {
    render(<ProfileStats profile={mockUserProfile} isOwnProfile={true} />);
    
    expect(screen.getByText('1450')).toBeInTheDocument();
    expect(screen.getByText('Intermediate')).toBeInTheDocument();
  });

  it('should display game statistics correctly', () => {
    render(<ProfileStats profile={mockUserProfile} isOwnProfile={false} />);
    
    expect(screen.getByText('50')).toBeInTheDocument(); // Total games
    expect(screen.getByText('30')).toBeInTheDocument(); // Wins
    expect(screen.getByText('18')).toBeInTheDocument(); // Losses
  });

  it('should calculate win percentage correctly', () => {
    render(<ProfileStats profile={mockUserProfile} isOwnProfile={true} />);
    
    // 30 wins out of 50 games = 60%
    expect(screen.getByText('60%')).toBeInTheDocument();
  });

  it('should display peak and lowest ratings', () => {
    render(<ProfileStats profile={mockUserProfile} isOwnProfile={true} />);
    
    expect(screen.getByText('1500')).toBeInTheDocument(); // Peak rating
    expect(screen.getByText('1200')).toBeInTheDocument(); // Lowest rating
  });

  it('should show account information for own profile', () => {
    render(<ProfileStats profile={mockUserProfile} isOwnProfile={true} />);
    
    expect(screen.getByText('Account Information')).toBeInTheDocument();
    expect(screen.getByText('Member Since')).toBeInTheDocument();
  });

  it('should not show account information for other profiles', () => {
    render(<ProfileStats profile={mockUserProfile} isOwnProfile={false} />);
    
    expect(screen.queryByText('Account Information')).not.toBeInTheDocument();
  });

  it('should show privacy notice when stats are not visible', () => {
    const privateProfile = {
      ...mockUserProfile,
      privacySettings: {
        ...mockUserProfile.privacySettings,
        statsVisible: false
      }
    };

    render(<ProfileStats profile={privateProfile} isOwnProfile={false} />);
    
    expect(screen.getByText("This player's detailed statistics are private.")).toBeInTheDocument();
  });

  it('should display draws when present', () => {
    render(<ProfileStats profile={mockUserProfile} isOwnProfile={true} />);
    
    expect(screen.getByText('2')).toBeInTheDocument(); // Draws
  });

  it('should calculate win/loss ratio correctly', () => {
    render(<ProfileStats profile={mockUserProfile} isOwnProfile={true} />);
    
    // 30 wins / 18 losses = 1.67
    expect(screen.getByText('1.67')).toBeInTheDocument();
  });
});

describe('ProfileEditor Component', () => {
  const mockProps = {
    profile: mockUserProfile,
    onClose: vi.fn(),
    onSave: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render with current profile data', () => {
    render(<ProfileEditor {...mockProps} />);
    
    expect(screen.getByDisplayValue('TestUser')).toBeInTheDocument();
    expect(screen.getByText('Edit Profile')).toBeInTheDocument();
  });

  it('should validate display name length', async () => {
    render(<ProfileEditor {...mockProps} />);
    
    const displayNameInput = screen.getByDisplayValue('TestUser');
    fireEvent.change(displayNameInput, { target: { value: 'A' } });
    
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(screen.getByText('Display name must be at least 2 characters')).toBeInTheDocument();
    });
  });

  it('should validate display name characters', async () => {
    render(<ProfileEditor {...mockProps} />);
    
    const displayNameInput = screen.getByDisplayValue('TestUser');
    fireEvent.change(displayNameInput, { target: { value: 'Invalid@Name!' } });
    
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(screen.getByText(/can only contain letters, numbers/)).toBeInTheDocument();
    });
  });

  it('should toggle game preferences', () => {
    render(<ProfileEditor {...mockProps} />);
    
    const challengeToggle = screen.getByRole('switch', { name: /Allow Game Challenges/i });
    expect(challengeToggle).toBeChecked();
    
    fireEvent.click(challengeToggle);
    expect(challengeToggle).not.toBeChecked();
  });

  it('should toggle privacy settings', () => {
    render(<ProfileEditor {...mockProps} />);
    
    const publicProfileToggle = screen.getByRole('switch', { name: /Public Profile/i });
    expect(publicProfileToggle).toBeChecked();
    
    fireEvent.click(publicProfileToggle);
    expect(publicProfileToggle).not.toBeChecked();
  });

  it('should detect changes and enable save button', async () => {
    render(<ProfileEditor {...mockProps} />);
    
    const saveButton = screen.getByText('Save Changes');
    expect(saveButton).toBeDisabled();
    
    const displayNameInput = screen.getByDisplayValue('TestUser');
    fireEvent.change(displayNameInput, { target: { value: 'NewName' } });
    
    await waitFor(() => {
      expect(saveButton).not.toBeDisabled();
    });
  });

  it('should call onClose when cancel is clicked', () => {
    render(<ProfileEditor {...mockProps} />);
    
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    
    expect(mockProps.onClose).toHaveBeenCalledOnce();
  });

  it('should call onSave with updates when save is clicked', async () => {
    mockProps.onSave.mockResolvedValue(undefined);
    render(<ProfileEditor {...mockProps} />);
    
    const displayNameInput = screen.getByDisplayValue('TestUser');
    fireEvent.change(displayNameInput, { target: { value: 'UpdatedName' } });
    
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(mockProps.onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          gamePreferences: expect.any(Object),
          privacySettings: expect.any(Object)
        })
      );
    });
  });
});

describe('UserSearch Component', () => {
  const mockProps = {
    onSelectUser: vi.fn(),
    onSendFriendRequest: vi.fn(),
    currentUserUid: 'current-user'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render search input', () => {
    render(<UserSearch {...mockProps} />);
    
    expect(screen.getByPlaceholderText('Search by display name...')).toBeInTheDocument();
    expect(screen.getByText('Find Players')).toBeInTheDocument();
  });

  it('should show initial state message', () => {
    render(<UserSearch {...mockProps} />);
    
    expect(screen.getByText('Search for players by their display name')).toBeInTheDocument();
    expect(screen.getByText('Enter at least 2 characters to start searching')).toBeInTheDocument();
  });

  it('should not search with less than 2 characters', async () => {
    render(<UserSearch {...mockProps} />);
    
    const searchInput = screen.getByPlaceholderText('Search by display name...');
    fireEvent.change(searchInput, { target: { value: 'A' } });
    
    // Wait to ensure search doesn't trigger
    await new Promise(resolve => setTimeout(resolve, 400));
    
    expect(screen.getByText('Enter at least 2 characters to start searching')).toBeInTheDocument();
  });

  it('should show loading state during search', async () => {
    render(<UserSearch {...mockProps} />);
    
    const searchInput = screen.getByPlaceholderText('Search by display name...');
    fireEvent.change(searchInput, { target: { value: 'Test' } });
    
    // Should show loading skeletons immediately
    await waitFor(() => {
      expect(screen.getAllByTestId('skeleton')).toHaveLength(3);
    }, { timeout: 100 });
  });

  it('should display search results after loading', async () => {
    render(<UserSearch {...mockProps} />);
    
    const searchInput = screen.getByPlaceholderText('Search by display name...');
    fireEvent.change(searchInput, { target: { value: 'Chess' } });
    
    await waitFor(() => {
      expect(screen.getByText('ChessMaster2024')).toBeInTheDocument();
    }, { timeout: 1000 });
  });

  it('should show no results message when no users found', async () => {
    render(<UserSearch {...mockProps} />);
    
    const searchInput = screen.getByPlaceholderText('Search by display name...');
    fireEvent.change(searchInput, { target: { value: 'NonexistentUser' } });
    
    await waitFor(() => {
      expect(screen.getByText(/No players found matching/)).toBeInTheDocument();
    }, { timeout: 1000 });
  });

  it('should call onSelectUser when view profile is clicked', async () => {
    render(<UserSearch {...mockProps} />);
    
    const searchInput = screen.getByPlaceholderText('Search by display name...');
    fireEvent.change(searchInput, { target: { value: 'Chess' } });
    
    await waitFor(() => {
      const viewButton = screen.getAllByRole('button')[1]; // First result's view button
      fireEvent.click(viewButton);
      
      expect(mockProps.onSelectUser).toHaveBeenCalledWith(
        expect.objectContaining({
          displayName: 'ChessMaster2024'
        })
      );
    }, { timeout: 1000 });
  });

  it('should call onSendFriendRequest when add friend is clicked', async () => {
    mockProps.onSendFriendRequest.mockResolvedValue(undefined);
    render(<UserSearch {...mockProps} />);
    
    const searchInput = screen.getByPlaceholderText('Search by display name...');
    fireEvent.change(searchInput, { target: { value: 'Strategic' } });
    
    await waitFor(() => {
      const addFriendButtons = screen.getAllByRole('button').filter(
        btn => btn.querySelector('svg') // Friend request buttons have icons
      );
      if (addFriendButtons.length > 0) {
        fireEvent.click(addFriendButtons[0]);
        expect(mockProps.onSendFriendRequest).toHaveBeenCalled();
      }
    }, { timeout: 1000 });
  });

  it('should show private label for private profiles', async () => {
    render(<UserSearch {...mockProps} />);
    
    const searchInput = screen.getByPlaceholderText('Search by display name...');
    fireEvent.change(searchInput, { target: { value: 'Private' } });
    
    await waitFor(() => {
      expect(screen.getByText('Private')).toBeInTheDocument();
    }, { timeout: 1000 });
  });

  it('should format online status correctly', async () => {
    render(<UserSearch {...mockProps} />);
    
    const searchInput = screen.getByPlaceholderText('Search by display name...');
    fireEvent.change(searchInput, { target: { value: 'Chess' } });
    
    await waitFor(() => {
      // Should show green dot for online users
      const onlineIndicators = document.querySelectorAll('.bg-green-500');
      expect(onlineIndicators.length).toBeGreaterThan(0);
    }, { timeout: 1000 });
  });
});