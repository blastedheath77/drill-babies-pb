'use client';

import { useState } from 'react';
import { getPlayersInCircle } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function DebugPhantomsPage() {
  const [circleId, setCircleId] = useState('xipvm9a7sbPZCY9YveLv'); // DL Smashers circle ID
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testQuery = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Testing getPlayersInCircle with circleId:', circleId);
      const result = await getPlayersInCircle(circleId);
      console.log('Query result:', result);
      setPlayers(result);
    } catch (err: any) {
      console.error('Query failed:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Debug Phantom Players</h1>
      
      <div className="mb-4 flex gap-2">
        <Input
          value={circleId}
          onChange={(e) => setCircleId(e.target.value)}
          placeholder="Circle ID"
        />
        <Button onClick={testQuery} disabled={loading}>
          {loading ? 'Loading...' : 'Test Query'}
        </Button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
          Error: {error}
        </div>
      )}

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Results ({players.length} players):</h2>
        {players.map((player) => (
          <div key={player.id} className="p-2 border rounded">
            <strong>{player.name}</strong> 
            <span className="ml-2 text-sm text-gray-600">
              (Rating: {player.rating}, 
              Phantom: {player.isPhantom ? 'Yes' : 'No'}, 
              Circle: {player.circleId || 'None'})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}