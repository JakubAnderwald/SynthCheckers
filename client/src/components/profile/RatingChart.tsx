import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { TrendingUp, PieChart as PieChartIcon, BarChart3 } from 'lucide-react';
import type { RatingHistoryEntry } from '../../types/firestore';

interface RatingChartProps {
  ratingHistory: RatingHistoryEntry[];
  currentRating: number;
  wins: number;
  losses: number;
  draws: number;
}

export function RatingChart({ ratingHistory, currentRating, wins, losses, draws }: RatingChartProps) {
  // Prepare data for rating progression chart
  const chartData = ratingHistory.map((entry, index) => ({
    game: index + 1,
    rating: entry.rating,
    change: entry.change,
    date: entry.timestamp.toDate().toLocaleDateString(),
  }));

  // Prepare data for win/loss pie chart
  const pieData = [
    { name: 'Wins', value: wins, color: '#10b981' },
    { name: 'Losses', value: losses, color: '#ef4444' },
    { name: 'Draws', value: draws, color: '#f59e0b' },
  ].filter(item => item.value > 0);

  const totalGames = wins + losses + draws;

  // Custom tooltip for rating chart
  const RatingTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-800 border border-purple-500/30 rounded-lg p-3 shadow-lg">
          <p className="text-white font-medium">Game {label}</p>
          <p className="text-purple-300">Rating: {data.rating}</p>
          <p className={`${data.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            Change: {data.change >= 0 ? '+' : ''}{data.change}
          </p>
          <p className="text-gray-400 text-sm">{data.date}</p>
        </div>
      );
    }
    return null;
  };

  // Custom tooltip for pie chart
  const PieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const percentage = ((data.value / totalGames) * 100).toFixed(1);
      return (
        <div className="bg-gray-800 border border-purple-500/30 rounded-lg p-3 shadow-lg">
          <p className="text-white font-medium">{data.name}</p>
          <p className="text-purple-300">{data.value} games ({percentage}%)</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Rating Progression Chart */}
      {chartData.length > 0 && (
        <Card className="bg-gray-900/80 backdrop-blur-md border-purple-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <TrendingUp className="h-5 w-5 text-cyan-400" />
              Rating Progression
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="game" 
                    stroke="#9ca3af"
                    tick={{ fill: '#9ca3af' }}
                  />
                  <YAxis 
                    stroke="#9ca3af"
                    tick={{ fill: '#9ca3af' }}
                    domain={['dataMin - 50', 'dataMax + 50']}
                  />
                  <Tooltip content={<RatingTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="rating"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#8b5cf6', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            {/* Rating Statistics */}
            <div className="mt-4 grid grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-gray-800/50 rounded-lg">
                <div className="text-sm text-gray-400">Current</div>
                <div className="text-lg font-bold text-white">{currentRating}</div>
              </div>
              <div className="p-3 bg-gray-800/50 rounded-lg">
                <div className="text-sm text-gray-400">Peak</div>
                <div className="text-lg font-bold text-green-400">
                  {Math.max(...chartData.map(d => d.rating))}
                </div>
              </div>
              <div className="p-3 bg-gray-800/50 rounded-lg">
                <div className="text-sm text-gray-400">Lowest</div>
                <div className="text-lg font-bold text-red-400">
                  {Math.min(...chartData.map(d => d.rating))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Win/Loss Distribution */}
      {totalGames > 0 && (
        <Card className="bg-gray-900/80 backdrop-blur-md border-purple-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <PieChartIcon className="h-5 w-5 text-yellow-400" />
              Game Results Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col lg:flex-row items-center gap-6">
              {/* Pie Chart */}
              <div className="h-48 w-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Statistics */}
              <div className="flex-1 space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-gray-800/50 rounded-lg">
                    <div className="text-2xl font-bold text-green-400">{wins}</div>
                    <div className="text-sm text-gray-400">Wins</div>
                    <div className="text-xs text-green-300">
                      {totalGames > 0 ? ((wins / totalGames) * 100).toFixed(1) : 0}%
                    </div>
                  </div>
                  
                  <div className="text-center p-3 bg-gray-800/50 rounded-lg">
                    <div className="text-2xl font-bold text-red-400">{losses}</div>
                    <div className="text-sm text-gray-400">Losses</div>
                    <div className="text-xs text-red-300">
                      {totalGames > 0 ? ((losses / totalGames) * 100).toFixed(1) : 0}%
                    </div>
                  </div>
                </div>

                {draws > 0 && (
                  <div className="text-center p-3 bg-gray-800/50 rounded-lg">
                    <div className="text-xl font-bold text-yellow-400">{draws}</div>
                    <div className="text-sm text-gray-400">Draws</div>
                    <div className="text-xs text-yellow-300">
                      {totalGames > 0 ? ((draws / totalGames) * 100).toFixed(1) : 0}%
                    </div>
                  </div>
                )}

                {/* Win Rate */}
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-300">Win Rate</span>
                    <span className="text-white font-bold">
                      {totalGames > 0 ? ((wins / totalGames) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-green-500 to-green-400 h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${totalGames > 0 ? (wins / totalGames) * 100 : 0}%` 
                      }}
                    />
                  </div>
                </div>

                {/* W/L Ratio */}
                {losses > 0 && (
                  <div className="text-center text-sm text-gray-300">
                    Win/Loss Ratio: 
                    <span className="text-white font-semibold ml-1">
                      {(wins / losses).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Data State */}
      {totalGames === 0 && (
        <Card className="bg-gray-900/80 backdrop-blur-md border-gray-500/30">
          <CardContent className="text-center py-12">
            <BarChart3 className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-400 mb-2">No Game Data</h3>
            <p className="text-gray-500">
              Play some games to see your statistics and rating progression.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}