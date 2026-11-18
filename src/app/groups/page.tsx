'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, Loader2, Search } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { usePlayers } from '@/hooks/use-players';
import { useCircles, useCreateCircle, useUpdateCircle } from '@/hooks/use-circles';
import { PlayerAvatar } from '@/components/player-picker/player-avatar';
import { CLUB_ID } from '@/config/club';
import type { Circle } from '@/lib/types';

/**
 * Admin: assign players to groups in one grid. Groups are the filters shown
 * in every player picker (stored in the "circles" collection).
 */
export default function GroupsPage() {
  const { isAdmin, user } = useAuth();
  const { toast } = useToast();
  const { data: players = [], isLoading: playersLoading } = usePlayers(CLUB_ID);
  const { data: groupsData = [], isLoading: groupsLoading } = useCircles(CLUB_ID);
  const groups = groupsData as Circle[];
  const updateGroup = useUpdateCircle();
  const createGroup = useCreateCircle();
  const [pending, setPending] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [query, setQuery] = useState('');

  const sortedPlayers = useMemo(
    () =>
      players
        .filter((p) => p.name.toLowerCase().includes(query.trim().toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [players, query]
  );

  if (!isAdmin()) {
    return (
      <>
        <PageHeader title="Groups" description="Only admins can manage groups." />
        <Link href="/" className="text-primary">Back home</Link>
      </>
    );
  }

  const toggle = async (group: Circle, playerId: string) => {
    const key = `${group.id}:${playerId}`;
    setPending(key);
    const playerIds = group.playerIds.includes(playerId)
      ? group.playerIds.filter((id) => id !== playerId)
      : [...group.playerIds, playerId];
    try {
      await updateGroup.mutateAsync({ id: group.id, data: { playerIds } });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Could not update group', description: (error as Error).message });
    } finally {
      setPending(null);
    }
  };

  const addGroup = async () => {
    const name = newName.trim();
    if (!name || !user) return;
    try {
      await createGroup.mutateAsync({ name, playerIds: [], clubId: CLUB_ID, createdBy: user.id });
      setNewName('');
    } catch (error) {
      toast({ variant: 'destructive', title: 'Could not create group', description: (error as Error).message });
    }
  };

  const loading = playersLoading || groupsLoading;

  return (
    <>
      <PageHeader
        title="Groups"
        description="Tick players into groups. Groups appear as filters whenever you pick players."
      />

      <div className="flex gap-2 mb-4">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addGroup()}
          placeholder="New group, e.g. Warriors B"
          className="h-11"
          aria-label="New group name"
        />
        <Button onClick={addGroup} disabled={!newName.trim() || createGroup.isPending} className="h-11">
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>
      </div>

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find a player" className="pl-9" />
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : groups.length === 0 ? (
        <p className="text-muted-foreground py-6">No groups yet. Add one above.</p>
      ) : (
        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left font-medium p-3 sticky left-0 bg-muted/50 min-w-[160px]">Player</th>
                {groups.map((g) => (
                  <th key={g.id} className="p-3 font-medium text-center whitespace-nowrap">
                    <Link href={`/circles/${g.id}`} className="hover:underline">{g.name}</Link>
                    <div className="text-xs text-muted-foreground font-normal">{g.playerIds.length}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedPlayers.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="p-2 sticky left-0 bg-background">
                    <div className="flex items-center gap-2">
                      <PlayerAvatar name={p.name} src={p.avatar} className="h-7 w-7" />
                      <span className="truncate">{p.name}</span>
                    </div>
                  </td>
                  {groups.map((g) => {
                    const key = `${g.id}:${p.id}`;
                    return (
                      <td key={g.id} className="text-center p-2">
                        {pending === key ? (
                          <Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" />
                        ) : (
                          <Checkbox
                            checked={g.playerIds.includes(p.id)}
                            onCheckedChange={() => toggle(g, p.id)}
                            aria-label={`${p.name} in ${g.name}`}
                            className="h-5 w-5"
                          />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
