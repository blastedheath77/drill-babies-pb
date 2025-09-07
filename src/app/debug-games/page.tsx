'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface GameData {
  id: string;
  type: string;
  date: any;
  circleId?: string;
  team1: {
    playerIds: string[];
    score: number;
  };
  team2: {
    playerIds: string[];
    score: number;
  };
  playerIds: string[];
}

export default function DebugGamesPage() {
  const [games, setGames] = useState<GameData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGames = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔍 Fetching recent games...');
      
      const q = query(
        collection(db, 'games'),
        orderBy('date', 'desc'),
        limit(10)
      );
      
      const snapshot = await getDocs(q);
      console.log(`Found ${snapshot.size} games`);
      
      const gameData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as GameData[];
      
      setGames(gameData);
      
      // Log each game for debugging
      gameData.forEach((game, index) => {
        console.log(`Game ${index + 1}:`, {
          id: game.id,
          type: game.type,
          date: game.date?.toDate ? game.date.toDate().toISOString() : game.date,
          circleId: game.circleId || 'NO CIRCLE ID',
          playerCount: game.playerIds?.length || 0,
          team1Score: game.team1?.score,
          team2Score: game.team2?.score
        });
      });
      
    } catch (err: any) {
      console.error('Failed to fetch games:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const testCircleFilter = async (circleId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log(`🎯 Testing circle filter for: ${circleId}`);
      
      // Test the compound query that should work with our new index
      const circleQuery = query(
        collection(db, 'games'),
        where('circleId', '==', circleId),
        orderBy('date', 'desc'),
        limit(20)
      );
      
      const circleSnapshot = await getDocs(circleQuery);
      console.log(`Found ${circleSnapshot.size} games for circle ${circleId}`);
      
      const circleGames = circleSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as GameData[];
      
      // Also test a simple query without orderBy to see if there are games at all
      const simpleQuery = query(
        collection(db, 'games'),
        where('circleId', '==', circleId)
      );
      
      const simpleSnapshot = await getDocs(simpleQuery);
      console.log(`Simple query (no orderBy) found ${simpleSnapshot.size} games for circle ${circleId}`);
      
      // Show results in games state
      setGames(circleGames);
      
      // Log results
      console.log('Circle filter test results:', {
        circleId,
        withOrderBy: circleSnapshot.size,
        withoutOrderBy: simpleSnapshot.size,
        gamesFound: circleGames.length
      });
      
    } catch (err: any) {
      console.error(`Failed to test circle filter for ${circleId}:`, err);
      setError(`Circle filter test failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: any) => {
    try {
      if (date?.toDate) {
        return date.toDate().toLocaleString();
      } else if (date instanceof Date) {
        return date.toLocaleString();
      } else {
        return String(date);
      }
    } catch {
      return 'Invalid Date';
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Games Debug Page</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Debug Recent Games</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button onClick={fetchGames} disabled={loading}>
              {loading ? 'Loading...' : 'Fetch Recent Games'}
            </Button>
            <Button onClick={() => testCircleFilter('I6Ei00HTwmiSJeAnB8L9')} disabled={loading} variant="secondary">
              Test Circle Filter
            </Button>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Recent games shows all games. Circle filter tests the specific circle ID "I6Ei00HTwmiSJeAnB8L9"
          </p>
        </CardContent>
      </Card>

      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded mb-6">
          <h3 className="font-semibold text-red-800">Error:</h3>
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {games.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Games ({games.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {games.map((game, index) => (
                <div 
                  key={game.id} 
                  className={`p-4 border rounded ${
                    game.circleId ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
                  }`}
                >
                  <div className="font-semibold">
                    Game #{index + 1} - {game.type}
                  </div>
                  <div className="text-sm space-y-1 mt-2">
                    <div><strong>ID:</strong> {game.id}</div>
                    <div><strong>Date:</strong> {formatDate(game.date)}</div>
                    <div><strong>Circle ID:</strong> {game.circleId || '❌ NO CIRCLE ID'}</div>
                    <div><strong>Score:</strong> {game.team1?.score} - {game.team2?.score}</div>
                    <div><strong>Players:</strong> {game.playerIds?.join(', ') || 'No player IDs'}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}