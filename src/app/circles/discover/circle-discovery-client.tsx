'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Search, 
  MapPin, 
  Users, 
  Plus, 
  Check, 
  Clock, 
  X,
  Filter,
  Globe,
  Lock,
  Send
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  searchDiscoverableCircles, 
  requestToJoinCircle,
  getUserJoinRequests,
  cancelJoinRequest,
  type CircleSearchOptions,
  type CircleJoinRequest
} from '@/lib/circle-discovery';
import type { Circle } from '@/lib/types';

export function CircleDiscoveryClient() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [circles, setCircles] = useState<Circle[]>([]);
  const [userRequests, setUserRequests] = useState<CircleJoinRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [searchFilters, setSearchFilters] = useState<CircleSearchOptions>({
    searchTerm: '',
    location: user?.location || undefined,
    limit: 20
  });
  
  // Join request dialog state
  const [selectedCircle, setSelectedCircle] = useState<Circle | null>(null);
  const [joinMessage, setJoinMessage] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const loadCircles = async (filters: CircleSearchOptions = searchFilters) => {
    try {
      setIsSearching(true);
      const result = await searchDiscoverableCircles(filters);
      setCircles(result.circles);
    } catch (error) {
      console.error('Failed to load circles:', error);
      toast({
        variant: 'destructive',
        title: 'Search Failed',
        description: 'Failed to search for circles. Please try again.',
      });
    } finally {
      setIsSearching(false);
    }
  };

  const loadUserRequests = async () => {
    if (!user) return;
    
    try {
      const requests = await getUserJoinRequests(user.id);
      setUserRequests(requests);
    } catch (error) {
      console.error('Failed to load user requests:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([
        loadCircles(),
        loadUserRequests()
      ]);
      setIsLoading(false);
    };

    loadData();
  }, [user]);

  const handleSearch = async () => {
    await loadCircles(searchFilters);
  };

  const handleJoinRequest = async () => {
    if (!selectedCircle || !user) return;

    setIsJoining(true);
    try {
      const result = await requestToJoinCircle(
        selectedCircle.id, 
        user, 
        joinMessage
      );

      if (result.success) {
        toast({
          title: 'Request Sent!',
          description: `Your join request for "${selectedCircle.name}" has been sent to the admins.`,
        });
        
        // Refresh user requests
        await loadUserRequests();
        
        // Close dialog and reset
        setSelectedCircle(null);
        setJoinMessage('');
      } else {
        toast({
          variant: 'destructive',
          title: 'Request Failed',
          description: result.error || 'Failed to send join request.',
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'An unexpected error occurred.',
      });
    } finally {
      setIsJoining(false);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    if (!user) return;

    try {
      const result = await cancelJoinRequest(requestId, user.id);
      
      if (result.success) {
        toast({
          title: 'Request Canceled',
          description: 'Your join request has been canceled.',
        });
        
        // Refresh user requests
        await loadUserRequests();
      } else {
        toast({
          variant: 'destructive',
          title: 'Cancel Failed',
          description: result.error || 'Failed to cancel join request.',
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'An unexpected error occurred.',
      });
    }
  };

  const getCircleStatus = (circle: Circle) => {
    const request = userRequests.find(r => r.circleId === circle.id && r.status === 'pending');
    if (request) return 'pending';
    
    const approvedRequest = userRequests.find(r => r.circleId === circle.id && r.status === 'approved');
    if (approvedRequest) return 'member';
    
    return 'available';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="flex items-center gap-1"><Clock className="h-3 w-3" />Pending</Badge>;
      case 'member':
        return <Badge variant="default" className="flex items-center gap-1"><Check className="h-3 w-3" />Member</Badge>;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="container max-w-6xl mx-auto p-4 sm:p-6">
        <div className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-48" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto p-4 sm:p-6">
      <div className="space-y-6">
        
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Discover Circles</h1>
          <p className="text-muted-foreground">
            Find and join pickleball communities in your area
          </p>
        </div>

        {/* Search Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="search">Search</Label>
                <Input
                  id="search"
                  placeholder="Circle name or description..."
                  value={searchFilters.searchTerm || ''}
                  onChange={(e) => setSearchFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  placeholder="City"
                  value={searchFilters.location?.city || ''}
                  onChange={(e) => setSearchFilters(prev => ({
                    ...prev,
                    location: { ...prev.location, city: e.target.value }
                  }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  placeholder="Country"
                  value={searchFilters.location?.country || ''}
                  onChange={(e) => setSearchFilters(prev => ({
                    ...prev,
                    location: { ...prev.location, country: e.target.value }
                  }))}
                />
              </div>

              <div className="space-y-2">
                <Label>&nbsp;</Label>
                <Button 
                  onClick={handleSearch} 
                  disabled={isSearching}
                  className="w-full"
                >
                  {isSearching ? 'Searching...' : 'Search'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User's Pending Requests */}
        {userRequests.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Your Join Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {userRequests.map((request) => (
                  <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="space-y-1">
                      <div className="font-medium">{request.circle?.name || 'Unknown Circle'}</div>
                      <div className="text-sm text-muted-foreground">
                        Requested {new Date(request.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={
                          request.status === 'approved' ? 'default' :
                          request.status === 'declined' ? 'destructive' : 
                          'secondary'
                        }
                      >
                        {request.status === 'approved' && <Check className="h-3 w-3 mr-1" />}
                        {request.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                        {request.status === 'declined' && <X className="h-3 w-3 mr-1" />}
                        {request.status}
                      </Badge>
                      {request.status === 'pending' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCancelRequest(request.id)}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              Available Circles ({circles.length})
            </h2>
          </div>

          {circles.length === 0 && !isSearching && (
            <Card>
              <CardContent className="text-center py-12">
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Circles Found</h3>
                <p className="text-muted-foreground mb-4">
                  Try adjusting your search filters or create your own circle.
                </p>
                <Button asChild>
                  <a href="/circles/create">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Circle
                  </a>
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {circles.map((circle) => {
              const status = getCircleStatus(circle);
              
              return (
                <Card key={circle.id} className="relative">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <CardTitle className="flex items-center gap-2">
                          {circle.isPrivate ? (
                            <Lock className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Globe className="h-4 w-4 text-muted-foreground" />
                          )}
                          {circle.name}
                        </CardTitle>
                        <CardDescription className="line-clamp-2">
                          {circle.description}
                        </CardDescription>
                      </div>
                      {getStatusBadge(status)}
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        {circle.memberCount || 0} members
                      </div>
                      
                      {circle.location && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          {circle.location.city}, {circle.location.country}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      {status === 'available' && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              className="flex-1"
                              onClick={() => {
                                setSelectedCircle(circle);
                                setJoinMessage('');
                              }}
                            >
                              <Send className="h-4 w-4 mr-2" />
                              Request to Join
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Request to Join "{circle.name}"</DialogTitle>
                              <DialogDescription>
                                Send a request to join this circle. The admins will review your request.
                              </DialogDescription>
                            </DialogHeader>
                            
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <Label htmlFor="message">Message (Optional)</Label>
                                <Textarea
                                  id="message"
                                  placeholder="Introduce yourself or explain why you'd like to join..."
                                  value={joinMessage}
                                  onChange={(e) => setJoinMessage(e.target.value)}
                                  rows={3}
                                />
                              </div>
                            </div>
                            
                            <DialogFooter>
                              <Button 
                                variant="outline" 
                                onClick={() => {
                                  setSelectedCircle(null);
                                  setJoinMessage('');
                                }}
                              >
                                Cancel
                              </Button>
                              <Button 
                                onClick={handleJoinRequest}
                                disabled={isJoining}
                              >
                                {isJoining ? 'Sending...' : 'Send Request'}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      )}
                      
                      {status === 'pending' && (
                        <Button variant="secondary" className="flex-1" disabled>
                          <Clock className="h-4 w-4 mr-2" />
                          Request Pending
                        </Button>
                      )}
                      
                      {status === 'member' && (
                        <Button variant="secondary" className="flex-1" disabled>
                          <Check className="h-4 w-4 mr-2" />
                          Already Member
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Help Section */}
        <Card>
          <CardHeader>
            <CardTitle>Need Help Finding Circles?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-2">Search Tips</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Try searching by city or club name</li>
                  <li>• Use broader location terms if no results</li>
                  <li>• Check back regularly for new circles</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Can't Find What You're Looking For?</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Consider creating your own circle to connect with players in your area.
                </p>
                <Button asChild variant="outline">
                  <a href="/circles/create">
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Circle
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}