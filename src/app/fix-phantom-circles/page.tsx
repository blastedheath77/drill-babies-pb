'use client';

import { useState } from 'react';
import { collection, getDocs, updateDoc, doc, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';

export default function FixPhantomCirclesPage() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scanPhantomPlayers = async () => {
    setLoading(true);
    setError(null);
    setResults([]);
    
    try {
      console.log('Scanning for phantom players...');
      
      // Find all phantom players
      const phantomQuery = query(
        collection(db, 'players'),
        where('isPhantom', '==', true)
      );
      
      const snapshot = await getDocs(phantomQuery);
      console.log(`Found ${snapshot.size} phantom players`);
      
      const phantoms = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setResults(phantoms);
      
    } catch (err: any) {
      console.error('Scan failed:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fixPhantomPlayer = async (phantomId: string, circleId: string) => {
    try {
      console.log(`Updating phantom ${phantomId} with circleId: ${circleId}`);
      
      const playerRef = doc(db, 'players', phantomId);
      await updateDoc(playerRef, {
        circleId: circleId
      });
      
      console.log(`Successfully updated phantom ${phantomId}`);
      
      // Update the results to show the change
      setResults(prev => 
        prev.map(player => 
          player.id === phantomId 
            ? { ...player, circleId: circleId, updated: true }
            : player
        )
      );
      
    } catch (err: any) {
      console.error(`Failed to update phantom ${phantomId}:`, err);
      alert(`Failed to update phantom: ${err.message}`);
    }
  };

  const fixAllWithDLSmashers = async () => {
    const dlSmashersId = 'xipvm9a7sbPZCY9YveLv';
    for (const phantom of results) {
      if (!phantom.circleId && !phantom.updated) {
        await fixPhantomPlayer(phantom.id, dlSmashersId);
        // Small delay to avoid overwhelming Firebase
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Fix Phantom Player Circle IDs</h1>
      
      <div className="mb-4 flex gap-2">
        <Button onClick={scanPhantomPlayers} disabled={loading}>
          {loading ? 'Scanning...' : 'Scan Phantom Players'}
        </Button>
        
        {results.length > 0 && (
          <Button onClick={fixAllWithDLSmashers} variant="secondary">
            Fix All with DL Smashers Circle
          </Button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
          Error: {error}
        </div>
      )}

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Phantom Players ({results.length}):</h2>
        {results.map((phantom) => (
          <div 
            key={phantom.id} 
            className={`p-4 border rounded ${phantom.updated ? 'bg-green-50 border-green-200' : phantom.circleId ? 'bg-blue-50 border-blue-200' : 'bg-yellow-50 border-yellow-200'}`}
          >
            <div className="flex justify-between items-center">
              <div>
                <strong>{phantom.name}</strong>
                <div className="text-sm text-gray-600">
                  ID: {phantom.id}<br/>
                  Circle ID: {phantom.circleId || 'MISSING'}<br/>
                  Created At: {phantom.createdAt ? new Date(phantom.createdAt.seconds * 1000).toLocaleDateString() : 'Unknown'}<br/>
                  {phantom.updated && <span className="text-green-600 font-semibold">✅ UPDATED</span>}
                </div>
              </div>
              
              {!phantom.circleId && !phantom.updated && (
                <div className="flex gap-2">
                  <Button 
                    size="sm"
                    onClick={() => fixPhantomPlayer(phantom.id, 'xipvm9a7sbPZCY9YveLv')}
                  >
                    Set DL Smashers
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}