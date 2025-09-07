'use client';

import { useState } from 'react';
import { collection, getDocs, updateDoc, doc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ResetCirclesPage() {
  const [status, setStatus] = useState<string>('');
  const [results, setResults] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const logStatus = (message: string) => {
    console.log(message);
    setStatus(prev => prev + message + '\n');
  };

  const scanCurrentState = async () => {
    setLoading(true);
    setError(null);
    setStatus('');
    setResults({});
    
    try {
      logStatus('🔍 Scanning current database state...');
      
      // Count circles
      const circlesSnapshot = await getDocs(collection(db, 'circles'));
      const circlesCount = circlesSnapshot.size;
      logStatus(`   Circles: ${circlesCount}`);
      
      // Count circle memberships
      const membershipsSnapshot = await getDocs(collection(db, 'circleMemberships'));
      const membershipsCount = membershipsSnapshot.size;
      logStatus(`   Circle memberships: ${membershipsCount}`);
      
      // Count circle invites
      const invitesSnapshot = await getDocs(collection(db, 'circleInvites'));
      const invitesCount = invitesSnapshot.size;
      logStatus(`   Circle invites: ${invitesCount}`);
      
      // Count all players
      const playersSnapshot = await getDocs(collection(db, 'players'));
      const allPlayers = playersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const playersWithCircleId = allPlayers.filter(p => p.circleId);
      const phantomPlayers = allPlayers.filter(p => p.isPhantom);
      const phantomPlayersWithCircleId = phantomPlayers.filter(p => p.circleId);
      
      logStatus(`   Total players: ${allPlayers.length}`);
      logStatus(`   Players with circleId: ${playersWithCircleId.length}`);
      logStatus(`   Phantom players: ${phantomPlayers.length}`);
      logStatus(`   Phantom players with circleId: ${phantomPlayersWithCircleId.length}`);
      
      setResults({
        circles: circlesCount,
        memberships: membershipsCount,
        invites: invitesCount,
        totalPlayers: allPlayers.length,
        playersWithCircleId: playersWithCircleId.length,
        phantomPlayers: phantomPlayers.length,
        phantomPlayersWithCircleId: phantomPlayersWithCircleId.length,
        circleData: circlesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        playersWithCircleIdList: playersWithCircleId.map(p => ({ 
          id: p.id, 
          name: p.name, 
          circleId: p.circleId, 
          isPhantom: p.isPhantom 
        }))
      });
      
      logStatus('✅ Scan complete');
      
    } catch (err: any) {
      console.error('Scan failed:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetAllPlayerCircleIds = async () => {
    setLoading(true);
    setError(null);
    
    try {
      logStatus('🧹 Resetting all player circleId fields...');
      
      const playersSnapshot = await getDocs(collection(db, 'players'));
      const playersWithCircleId = playersSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(player => player.circleId);
      
      logStatus(`   Found ${playersWithCircleId.length} players with circleId`);
      
      const batch = writeBatch(db);
      let batchSize = 0;
      const maxBatchSize = 500; // Firestore batch limit
      
      for (const player of playersWithCircleId) {
        const playerRef = doc(db, 'players', player.id);
        batch.update(playerRef, {
          circleId: null  // Remove the circleId field
        });
        batchSize++;
        
        // Commit batch if we hit the limit
        if (batchSize >= maxBatchSize) {
          await batch.commit();
          logStatus(`   Committed batch of ${batchSize} updates`);
          batchSize = 0;
        }
      }
      
      // Commit remaining updates
      if (batchSize > 0) {
        await batch.commit();
        logStatus(`   Committed final batch of ${batchSize} updates`);
      }
      
      logStatus(`✅ Successfully reset ${playersWithCircleId.length} player circleId fields`);
      
    } catch (err: any) {
      console.error('Reset player circleIds failed:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteAllCircleData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      logStatus('🗑️ Deleting all circle-related data...');
      
      // Delete circles
      const circlesSnapshot = await getDocs(collection(db, 'circles'));
      logStatus(`   Deleting ${circlesSnapshot.size} circles...`);
      for (const circleDoc of circlesSnapshot.docs) {
        await deleteDoc(doc(db, 'circles', circleDoc.id));
      }
      
      // Delete circle memberships
      const membershipsSnapshot = await getDocs(collection(db, 'circleMemberships'));
      logStatus(`   Deleting ${membershipsSnapshot.size} memberships...`);
      for (const membershipDoc of membershipsSnapshot.docs) {
        await deleteDoc(doc(db, 'circleMemberships', membershipDoc.id));
      }
      
      // Delete circle invites
      const invitesSnapshot = await getDocs(collection(db, 'circleInvites'));
      logStatus(`   Deleting ${invitesSnapshot.size} invites...`);
      for (const inviteDoc of invitesSnapshot.docs) {
        await deleteDoc(doc(db, 'circleInvites', inviteDoc.id));
      }
      
      logStatus('✅ Successfully deleted all circle data');
      
    } catch (err: any) {
      console.error('Delete circle data failed:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const completeReset = async () => {
    setLoading(true);
    setError(null);
    setStatus('');
    
    try {
      logStatus('🔄 Starting complete circle data reset...');
      logStatus('');
      
      // Step 1: Reset player circleId fields
      await resetAllPlayerCircleIds();
      logStatus('');
      
      // Step 2: Delete all circle data
      await deleteAllCircleData();
      logStatus('');
      
      // Step 3: Verify clean state
      logStatus('🔍 Verifying clean state...');
      await scanCurrentState();
      
      logStatus('');
      logStatus('🎉 Complete reset finished!');
      
    } catch (err: any) {
      console.error('Complete reset failed:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Circle Data Reset Tool</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Database Scanner</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button onClick={scanCurrentState} disabled={loading}>
              {loading ? 'Scanning...' : 'Scan Current State'}
            </Button>
            <p className="text-sm text-gray-600">
              Check current circle data state
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Individual Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button 
              onClick={resetAllPlayerCircleIds} 
              disabled={loading}
              variant="outline"
            >
              Reset Player CircleIDs
            </Button>
            <Button 
              onClick={deleteAllCircleData} 
              disabled={loading}
              variant="outline"
            >
              Delete Circle Data
            </Button>
          </CardContent>
        </Card>
      </div>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-red-600">⚠️ Nuclear Option</CardTitle>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={completeReset} 
            disabled={loading}
            variant="destructive"
          >
            {loading ? 'Resetting...' : 'Complete Reset (Delete Everything)'}
          </Button>
          <p className="text-sm text-gray-600 mt-2">
            This will completely reset all circle data and remove all player circle associations.
          </p>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>
            Error: {error}
          </AlertDescription>
        </Alert>
      )}

      {status && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Status Log</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm whitespace-pre-wrap font-mono bg-gray-50 p-4 rounded">
              {status}
            </pre>
          </CardContent>
        </Card>
      )}

      {Object.keys(results).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Current State Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1 text-sm">
                <li>Circles: {results.circles}</li>
                <li>Circle Memberships: {results.memberships}</li>
                <li>Circle Invites: {results.invites}</li>
                <li>Total Players: {results.totalPlayers}</li>
                <li>Players with CircleID: {results.playersWithCircleId}</li>
                <li>Phantom Players: {results.phantomPlayers}</li>
                <li>Phantoms with CircleID: {results.phantomPlayersWithCircleId}</li>
              </ul>
            </CardContent>
          </Card>
          
          {results.playersWithCircleIdList?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Players with CircleID</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-64 overflow-y-auto space-y-1 text-sm">
                  {results.playersWithCircleIdList.map((player: any) => (
                    <div key={player.id} className="p-2 bg-gray-50 rounded">
                      <strong>{player.name}</strong>
                      <br />
                      <span className="text-gray-600">
                        ID: {player.id}<br />
                        CircleID: {player.circleId}<br />
                        Type: {player.isPhantom ? 'Phantom' : 'Real'}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}