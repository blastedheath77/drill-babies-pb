'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useCircles } from '@/contexts/circle-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Mail, 
  Send, 
  Check, 
  Clock, 
  User,
  UserPlus,
  Search,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  getInvitablePhantomPlayers,
  invitePhantomPlayer,
  getUserSentInvitations,
  type PhantomInvitation
} from '@/lib/phantom-invitations';
import type { Player } from '@/lib/types';

export function PhantomPlayerInviter() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { selectedCircleId } = useCircles();

  const [invitablePlayers, setInvitablePlayers] = useState<Player[]>([]);
  const [sentInvitations, setSentInvitations] = useState<PhantomInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Invitation dialog state
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [invitationMessage, setInvitationMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const loadData = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      // Use circle context to filter phantom players
      const circleId = selectedCircleId === 'all' ? undefined : selectedCircleId;
      const [players, invitations] = await Promise.all([
        getInvitablePhantomPlayers(user.id, circleId),
        getUserSentInvitations(user.id)
      ]);
      
      setInvitablePlayers(players);
      setSentInvitations(invitations);
    } catch (error) {
      console.error('Failed to load phantom player data:', error);
      toast({
        variant: 'destructive',
        title: 'Loading Failed',
        description: 'Failed to load phantom player data.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user, selectedCircleId]);

  const handleSendInvitation = async () => {
    if (!selectedPlayer || !user) return;

    setIsSending(true);
    try {
      const result = await invitePhantomPlayer(
        selectedPlayer.id,
        user.id,
        user.name,
        invitationMessage
      );

      if (result.success) {
        toast({
          title: 'Invitation Sent!',
          description: `Invitation sent to ${selectedPlayer.email}`,
        });

        // Refresh data
        await loadData();
        
        // Close dialog and reset
        setSelectedPlayer(null);
        setInvitationMessage('');
      } else {
        toast({
          variant: 'destructive',
          title: 'Invitation Failed',
          description: result.error || 'Failed to send invitation.',
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'An unexpected error occurred.',
      });
    } finally {
      setIsSending(false);
    }
  };

  const filteredPlayers = invitablePlayers.filter(player =>
    player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    player.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Invite Phantom Players</h2>
        <p className="text-muted-foreground">
          Send email invitations to phantom players {selectedCircleId === 'all' ? 'from all your circles' : 'in the current circle'} so they can claim their profiles
        </p>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {/* Invitable Players */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">
          Players Ready to Invite ({filteredPlayers.length})
        </h3>

        {filteredPlayers.length === 0 && !searchTerm && (
          <Alert>
            <UserPlus className="h-4 w-4" />
            <AlertDescription>
              No phantom players with email addresses found {selectedCircleId === 'all' ? 'in any of your circles' : 'in this circle'}. Create phantom players with emails to invite them.
            </AlertDescription>
          </Alert>
        )}

        {filteredPlayers.length === 0 && searchTerm && (
          <Alert>
            <Search className="h-4 w-4" />
            <AlertDescription>
              No players found matching "{searchTerm}". Try a different search term.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPlayers.map((player) => (
            <Card key={player.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <User className="h-4 w-4" />
                      {player.name}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {player.email}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">Phantom</Badge>
                </div>
              </CardHeader>
              
              <CardContent>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      className="w-full"
                      onClick={() => {
                        setSelectedPlayer(player);
                        setInvitationMessage('');
                      }}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Send Invitation
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Invite {player.name}</DialogTitle>
                      <DialogDescription>
                        Send an email invitation to {player.email} so they can claim this player profile.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="message">Personal Message (Optional)</Label>
                        <Textarea
                          id="message"
                          placeholder="Hi! I've created a player profile for you on PBStats. Click the link below to claim it and start tracking your pickleball stats..."
                          value={invitationMessage}
                          onChange={(e) => setInvitationMessage(e.target.value)}
                          rows={4}
                        />
                      </div>
                      
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          The invitation will include a link to claim their player profile during registration.
                        </AlertDescription>
                      </Alert>
                    </div>
                    
                    <DialogFooter>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setSelectedPlayer(null);
                          setInvitationMessage('');
                        }}
                      >
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleSendInvitation}
                        disabled={isSending}
                      >
                        {isSending ? 'Sending...' : 'Send Invitation'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent Invitations */}
      {sentInvitations.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">
            Recent Invitations ({sentInvitations.length})
          </h3>
          
          <div className="space-y-3">
            {sentInvitations.slice(0, 5).map((invitation) => (
              <div key={invitation.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="space-y-1">
                  <div className="font-medium">{invitation.playerName}</div>
                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {invitation.email}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Sent {new Date(invitation.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <Badge 
                    variant={
                      invitation.status === 'registered' ? 'default' :
                      invitation.status === 'expired' ? 'destructive' : 
                      'secondary'
                    }
                  >
                    {invitation.status === 'registered' && <Check className="h-3 w-3 mr-1" />}
                    {invitation.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                    {invitation.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>

          {sentInvitations.length > 5 && (
            <p className="text-sm text-muted-foreground text-center">
              And {sentInvitations.length - 5} more...
            </p>
          )}
        </div>
      )}
    </div>
  );
}