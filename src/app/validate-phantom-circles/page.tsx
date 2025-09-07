'use client';

import { useState } from 'react';
import { collection, getDocs, query, where, updateDoc, doc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PhantomPlayer {
  id: string;
  name: string;
  isPhantom: boolean;
  circleId?: string;
  membershipCircleIds?: string[];
  hasInconsistency: boolean;
  issues: string[];
}

export default function ValidatePhantomCirclesPage() {
  const [status, setStatus] = useState<string>('');
  const [phantomPlayers, setPhantomPlayers] = useState<PhantomPlayer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const logStatus = (message: string) => {
    console.log(message);
    setStatus(prev => prev + message + '\n');
  };

  const validatePhantomPlayerConsistency = async () => {
    setLoading(true);
    setError(null);
    setStatus('');
    setPhantomPlayers([]);
    
    try {
      logStatus('🔍 Validating phantom player circle consistency...');
      
      // Get all phantom players
      const phantomQuery = query(
        collection(db, 'players'),
        where('isPhantom', '==', true)
      );
      const phantomSnapshot = await getDocs(phantomQuery);
      logStatus(`   Found ${phantomSnapshot.size} phantom players`);
      
      // Get all circle memberships
      const membershipsSnapshot = await getDocs(collection(db, 'circleMemberships'));
      logStatus(`   Found ${membershipsSnapshot.size} total memberships`);
      
      // Build membership lookup map (playerId -> circle IDs)
      const membershipMap = new Map<string, string[]>();
      membershipsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const playerId = data.userId;
        const circleId = data.circleId;
        
        if (!membershipMap.has(playerId)) {
          membershipMap.set(playerId, []);
        }
        membershipMap.get(playerId)!.push(circleId);
      });
      
      const inconsistentPlayers: PhantomPlayer[] = [];
      
      phantomSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const playerId = doc.id;
        const playerCircleId = data.circleId;
        const membershipCircleIds = membershipMap.get(playerId) || [];
        
        const issues: string[] = [];
        let hasInconsistency = false;
        
        // Check if player has circleId but no membership
        if (playerCircleId && !membershipCircleIds.includes(playerCircleId)) {
          issues.push(`Has circleId "${playerCircleId}" but no matching membership`);
          hasInconsistency = true;
        }
        
        // Check if player has membership but no circleId
        if (membershipCircleIds.length > 0 && !playerCircleId) {
          issues.push(`Has memberships [${membershipCircleIds.join(', ')}] but no circleId`);
          hasInconsistency = true;
        }
        
        // Check if player has circleId different from memberships
        if (playerCircleId && membershipCircleIds.length > 0 && !membershipCircleIds.includes(playerCircleId)) {
          issues.push(`circleId "${playerCircleId}" doesn't match memberships [${membershipCircleIds.join(', ')}]`);
          hasInconsistency = true;
        }
        
        // Check if player has multiple memberships (should only have one)
        if (membershipCircleIds.length > 1) {
          issues.push(`Multiple memberships: [${membershipCircleIds.join(', ')}]`);
          hasInconsistency = true;
        }
        
        if (hasInconsistency || membershipCircleIds.length > 0) {
          inconsistentPlayers.push({
            id: playerId,
            name: data.name,
            isPhantom: true,
            circleId: playerCircleId,
            membershipCircleIds,
            hasInconsistency,
            issues
          });
        }
      });
      
      setPhantomPlayers(inconsistentPlayers);
      logStatus(`✅ Validation complete`);
      logStatus(`   ${inconsistentPlayers.filter(p => p.hasInconsistency).length} players with inconsistencies`);
      logStatus(`   ${inconsistentPlayers.filter(p => !p.hasInconsistency).length} players with consistent circle memberships`);
      
    } catch (err: any) {
      console.error('Validation failed:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fixPhantomPlayer = async (player: PhantomPlayer) => {
    try {
      logStatus(`🔧 Fixing ${player.name} (${player.id})...`);
      
      const playerRef = doc(db, 'players', player.id);
      
      // Determine the correct circleId based on memberships
      let targetCircleId: string | null = null;
      
      if (player.membershipCircleIds && player.membershipCircleIds.length === 1) {
        // Single membership - use that circle
        targetCircleId = player.membershipCircleIds[0];
      } else if (player.membershipCircleIds && player.membershipCircleIds.length > 1) {
        // Multiple memberships - use the first one and log warning
        targetCircleId = player.membershipCircleIds[0];
        logStatus(`   ⚠️ Multiple memberships found, using first: ${targetCircleId}`);
      } else if (player.circleId && !player.membershipCircleIds?.length) {
        // Has circleId but no memberships - clear the circleId
        targetCircleId = null;
        logStatus(`   🧹 Clearing orphaned circleId`);
      }
      
      // Update player circleId
      await updateDoc(playerRef, {
        circleId: targetCircleId
      });
      
      logStatus(`   ✅ Updated ${player.name}: circleId = ${targetCircleId || 'null'}`);
      
      // Update local state
      setPhantomPlayers(prev => prev.map(p => 
        p.id === player.id 
          ? { ...p, circleId: targetCircleId || undefined, hasInconsistency: false, issues: [] }
          : p
      ));
      
    } catch (err: any) {
      console.error(`Failed to fix phantom player ${player.id}:`, err);
      logStatus(`   ❌ Failed to fix ${player.name}: ${err.message}`);
    }
  };

  const fixAllInconsistentPlayers = async () => {
    const inconsistentPlayers = phantomPlayers.filter(p => p.hasInconsistency);
    
    for (const player of inconsistentPlayers) {
      await fixPhantomPlayer(player);
      // Small delay to avoid overwhelming Firebase
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    logStatus(`🎉 Fixed all ${inconsistentPlayers.length} inconsistent phantom players`);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Phantom Player Circle Validation</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Data Consistency Check</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button onClick={validatePhantomPlayerConsistency} disabled={loading}>
              {loading ? 'Validating...' : 'Validate Phantom Players'}
            </Button>
            <p className="text-sm text-gray-600">
              Check for inconsistencies between phantom player circleId fields and circle memberships
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Bulk Fix</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button 
              onClick={fixAllInconsistentPlayers} 
              disabled={loading || phantomPlayers.filter(p => p.hasInconsistency).length === 0}
              variant="secondary"
            >
              Fix All Inconsistencies
            </Button>
            <p className="text-sm text-gray-600">
              Automatically fix all detected inconsistencies
            </p>
          </CardContent>
        </Card>
      </div>

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
            <CardTitle>Validation Log</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm whitespace-pre-wrap font-mono bg-gray-50 p-4 rounded">
              {status}
            </pre>
          </CardContent>
        </Card>
      )}

      {phantomPlayers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              Phantom Players ({phantomPlayers.length})
              <span className="text-sm font-normal ml-2">
                ({phantomPlayers.filter(p => p.hasInconsistency).length} inconsistent, {phantomPlayers.filter(p => !p.hasInconsistency).length} consistent)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {phantomPlayers.map((player) => (
                <div 
                  key={player.id} 
                  className={`p-3 border rounded ${
                    player.hasInconsistency 
                      ? 'bg-red-50 border-red-200' 
                      : 'bg-green-50 border-green-200'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-semibold">{player.name}</div>
                      <div className="text-sm text-gray-600">
                        ID: {player.id}<br/>
                        circleId: {player.circleId || 'null'}<br/>
                        Memberships: {player.membershipCircleIds?.join(', ') || 'none'}
                      </div>
                      {player.issues.length > 0 && (
                        <div className="text-sm text-red-600 mt-1">
                          Issues: {player.issues.join('; ')}
                        </div>
                      )}
                    </div>
                    
                    {player.hasInconsistency && (
                      <Button 
                        size="sm"
                        onClick={() => fixPhantomPlayer(player)}
                        disabled={loading}
                      >
                        Fix
                      </Button>
                    )}
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