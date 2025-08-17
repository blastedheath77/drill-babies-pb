'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { convertExistingRatings } from '@/lib/convert-ratings';
import { updateGameDatesForTesting } from '@/lib/update-game-dates';
import { backfillRatingHistory } from '@/lib/backfill-rating-history';
import { syncAllPlayerStats } from '@/lib/sync-all-player-stats';
import { useState } from 'react';

export default function AdminPage() {
  const [isConverting, setIsConverting] = useState(false);
  const [isUpdatingDates, setIsUpdatingDates] = useState(false);
  const [isBackfilling, setIsBackfilling] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [message, setMessage] = useState<string>('');
  const [dateMessage, setDateMessage] = useState<string>('');
  const [backfillMessage, setBackfillMessage] = useState<string>('');
  const [syncMessage, setSyncMessage] = useState<string>('');

  const handleConvertRatings = async () => {
    setIsConverting(true);
    setMessage('Converting ratings...');

    try {
      await convertExistingRatings();
      setMessage('✅ Successfully converted all ratings to DUPR scale (2.0-8.0)!');

      // Refresh the page after conversion
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    } catch (error) {
      setMessage(`❌ Error: ${error}`);
    } finally {
      setIsConverting(false);
    }
  };

  const handleUpdateDates = async () => {
    setIsUpdatingDates(true);
    setDateMessage('Updating game dates...');

    try {
      await updateGameDatesForTesting();
      setDateMessage(
        '✅ Successfully updated game dates for testing! Games now span backwards from today, 2 days apart.'
      );

      // Refresh the page after update
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    } catch (error) {
      setDateMessage(`❌ Error: ${error}`);
    } finally {
      setIsUpdatingDates(false);
    }
  };

  const handleBackfillRatings = async () => {
    setIsBackfilling(true);
    setBackfillMessage('Backfilling rating history...');

    try {
      await backfillRatingHistory();
      setBackfillMessage(
        '✅ Successfully backfilled rating history for all games! Charts will now show realistic data.'
      );

      // Refresh the page after backfill
      setTimeout(() => {
        window.location.href = '/';
      }, 3000);
    } catch (error) {
      setBackfillMessage(`❌ Error: ${error}`);
    } finally {
      setIsBackfilling(false);
    }
  };

  const handleSyncRatings = async () => {
    setIsSyncing(true);
    setSyncMessage('Syncing all player stats...');

    try {
      await syncAllPlayerStats();
      setSyncMessage(
        '✅ Successfully synced ALL player stats (rating, wins, losses, points) with game history!'
      );

      // Refresh the page after sync
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    } catch (error) {
      setSyncMessage(`❌ Error: ${error}`);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="container max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Admin Tools</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-lg font-medium mb-2">Convert Rating System</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Convert existing ELO ratings (1200-1700) to DUPR scale (2.0-8.0) for better pickleball
              rating representation.
            </p>
            <Button onClick={handleConvertRatings} disabled={isConverting} className="mb-2">
              {isConverting ? 'Converting...' : 'Convert to DUPR Scale'}
            </Button>
            {message && (
              <p
                className={`text-sm ${message.includes('❌') ? 'text-red-600' : 'text-green-600'}`}
              >
                {message}
              </p>
            )}
          </div>

          <div className="border-t pt-4">
            <h3 className="text-lg font-medium mb-2">Update Game Dates</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Update existing games to have staggered dates (today, 2 days ago, 4 days ago, etc.)
              for testing rating history charts.
            </p>
            <Button
              onClick={handleUpdateDates}
              disabled={isUpdatingDates}
              variant="outline"
              className="mb-2"
            >
              {isUpdatingDates ? 'Updating...' : 'Update Game Dates for Testing'}
            </Button>
            {dateMessage && (
              <p
                className={`text-sm ${dateMessage.includes('❌') ? 'text-red-600' : 'text-green-600'}`}
              >
                {dateMessage}
              </p>
            )}
          </div>

          <div className="border-t pt-4">
            <h3 className="text-lg font-medium mb-2">Backfill Rating History</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Generate historical rating changes for existing games to populate the rating history
              charts. This simulates what the ratings would have been after each game.
            </p>
            <Button
              onClick={handleBackfillRatings}
              disabled={isBackfilling}
              variant="secondary"
              className="mb-2"
            >
              {isBackfilling ? 'Backfilling...' : 'Backfill Rating History'}
            </Button>
            {backfillMessage && (
              <p
                className={`text-sm ${backfillMessage.includes('❌') ? 'text-red-600' : 'text-green-600'}`}
              >
                {backfillMessage}
              </p>
            )}
          </div>

          <div className="border-t pt-4">
            <h3 className="text-lg font-medium mb-2">Sync All Player Stats</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Recalculate ALL player stats (rating, wins, losses, points for/against) from actual
              game history. Fixes discrepancies between stored stats and game results.
            </p>
            <Button
              onClick={handleSyncRatings}
              disabled={isSyncing}
              variant="outline"
              className="mb-2"
            >
              {isSyncing ? 'Syncing...' : 'Sync All Player Stats'}
            </Button>
            {syncMessage && (
              <p
                className={`text-sm ${syncMessage.includes('❌') ? 'text-red-600' : 'text-green-600'}`}
              >
                {syncMessage}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
