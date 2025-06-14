import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import { ChevronLeft, ChevronRight, Calendar, Clock, Trophy, Target, User } from 'lucide-react';
import type { GameRecord, UserProfile } from '../../types/firestore';

interface GameHistoryProps {
  userUid: string;
  isOwnHistory?: boolean;
}

interface GameHistoryEntry extends GameRecord {
  opponent: {
    uid: string;
    displayName: string;
    eloRating: number;
  };
  userColor: 'red' | 'blue';
  result: 'win' | 'loss' | 'draw';
  eloChange: number;
}

export function GameHistory({ userUid, isOwnHistory = false }: GameHistoryProps) {
  const [games, setGames] = useState<GameHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState<'all' | 'wins' | 'losses' | 'draws'>('all');
  
  const gamesPerPage = 10;

  // Mock data - would be replaced with Firestore queries
  useEffect(() => {
    const fetchGameHistory = async () => {
      setLoading(true);
      try {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock game history data
        const mockGames: GameHistoryEntry[] = [
          {
            gameId: 'game-1',
            playerRed: { uid: userUid, displayName: 'You', eloRating: 1250, isReady: true, hasResigned: false },
            playerBlue: { uid: 'opponent-1', displayName: 'Player123', eloRating: 1200, isReady: true, hasResigned: false },
            status: 'completed',
            currentTurn: 'red',
            moveHistory: [],
            boardState: '',
            createdAt: { toDate: () => new Date('2024-06-14T10:30:00') } as any,
            startedAt: { toDate: () => new Date('2024-06-14T10:31:00') } as any,
            completedAt: { toDate: () => new Date('2024-06-14T10:45:00') } as any,
            lastMoveAt: { toDate: () => new Date('2024-06-14T10:45:00') } as any,
            winner: 'red',
            endReason: 'checkmate',
            eloChanges: { red: 25, blue: -25 },
            gameType: 'ranked',
            opponent: { uid: 'opponent-1', displayName: 'Player123', eloRating: 1200 },
            userColor: 'red',
            result: 'win',
            eloChange: 25
          },
          {
            gameId: 'game-2',
            playerRed: { uid: 'opponent-2', displayName: 'ChessMaster', eloRating: 1400, isReady: true, hasResigned: false },
            playerBlue: { uid: userUid, displayName: 'You', eloRating: 1225, isReady: true, hasResigned: false },
            status: 'completed',
            currentTurn: 'blue',
            moveHistory: [],
            boardState: '',
            createdAt: { toDate: () => new Date('2024-06-13T15:20:00') } as any,
            startedAt: { toDate: () => new Date('2024-06-13T15:21:00') } as any,
            completedAt: { toDate: () => new Date('2024-06-13T15:38:00') } as any,
            lastMoveAt: { toDate: () => new Date('2024-06-13T15:38:00') } as any,
            winner: 'red',
            endReason: 'resignation',
            eloChanges: { red: 15, blue: -15 },
            gameType: 'ranked',
            opponent: { uid: 'opponent-2', displayName: 'ChessMaster', eloRating: 1400 },
            userColor: 'blue',
            result: 'loss',
            eloChange: -15
          },
          {
            gameId: 'game-3',
            playerRed: { uid: userUid, displayName: 'You', eloRating: 1210, isReady: true, hasResigned: false },
            playerBlue: { uid: 'opponent-3', displayName: 'Newbie42', eloRating: 1180, isReady: true, hasResigned: false },
            status: 'completed',
            currentTurn: 'red',
            moveHistory: [],
            boardState: '',
            createdAt: { toDate: () => new Date('2024-06-13T09:15:00') } as any,
            startedAt: { toDate: () => new Date('2024-06-13T09:16:00') } as any,
            completedAt: { toDate: () => new Date('2024-06-13T09:35:00') } as any,
            lastMoveAt: { toDate: () => new Date('2024-06-13T09:35:00') } as any,
            winner: 'draw',
            endReason: 'draw',
            eloChanges: { red: 0, blue: 0 },
            gameType: 'casual',
            opponent: { uid: 'opponent-3', displayName: 'Newbie42', eloRating: 1180 },
            userColor: 'red',
            result: 'draw',
            eloChange: 0
          }
        ];
        
        const filteredGames = filter === 'all' 
          ? mockGames 
          : mockGames.filter(game => game.result === filter);
          
        setGames(filteredGames.slice((currentPage - 1) * gamesPerPage, currentPage * gamesPerPage));
        setTotalPages(Math.ceil(filteredGames.length / gamesPerPage));
      } catch (error) {
        console.error('Error fetching game history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGameHistory();
  }, [userUid, currentPage, filter]);

  const getResultBadge = (result: string, eloChange: number) => {
    switch (result) {
      case 'win':
        return (
          <Badge className="bg-green-600 hover:bg-green-700 text-white">
            Win {eloChange > 0 && `+${eloChange}`}
          </Badge>
        );
      case 'loss':
        return (
          <Badge className="bg-red-600 hover:bg-red-700 text-white">
            Loss {eloChange < 0 && eloChange}
          </Badge>
        );
      case 'draw':
        return (
          <Badge className="bg-yellow-600 hover:bg-yellow-700 text-white">
            Draw
          </Badge>
        );
      default:
        return null;
    }
  };

  const formatGameDuration = (startTime: Date, endTime: Date) => {
    const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000 / 60);
    return `${duration}m`;
  };

  if (loading) {
    return (
      <Card className="bg-gray-900/80 backdrop-blur-md border-purple-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Calendar className="h-5 w-5 text-indigo-400" />
            Game History
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 bg-gray-800/50" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-900/80 backdrop-blur-md border-purple-500/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Calendar className="h-5 w-5 text-indigo-400" />
          Game History
        </CardTitle>
        
        {/* Filter Buttons */}
        <div className="flex gap-2 mt-4">
          {(['all', 'wins', 'losses', 'draws'] as const).map((filterType) => (
            <Button
              key={filterType}
              variant={filter === filterType ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setFilter(filterType);
                setCurrentPage(1);
              }}
              className={`capitalize ${
                filter === filterType 
                  ? 'bg-purple-600 hover:bg-purple-700' 
                  : 'border-gray-600 text-gray-300 hover:bg-gray-800'
              }`}
            >
              {filterType}
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {games.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            No games found for the selected filter.
          </div>
        ) : (
          games.map((game) => (
            <div
              key={game.gameId}
              className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg hover:bg-gray-800/70 transition-colors"
            >
              <div className="flex items-center gap-4">
                {/* Opponent Info */}
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-400" />
                  <div>
                    <div className="text-white font-medium">{game.opponent.displayName}</div>
                    <div className="text-sm text-gray-400">
                      ELO: {game.opponent.eloRating}
                    </div>
                  </div>
                </div>

                {/* Game Info */}
                <div className="text-sm text-gray-400">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatGameDuration(game.startedAt!.toDate(), game.completedAt!.toDate())}
                  </div>
                  <div className="flex items-center gap-1">
                    <Target className="h-3 w-3" />
                    {game.gameType}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Game Date */}
                <div className="text-sm text-gray-400 text-right">
                  <div>{game.completedAt!.toDate().toLocaleDateString()}</div>
                  <div>{game.completedAt!.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                </div>

                {/* Result Badge */}
                {getResultBadge(game.result, game.eloChange)}
              </div>
            </div>
          ))
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>

            <span className="text-sm text-gray-400">
              Page {currentPage} of {totalPages}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}