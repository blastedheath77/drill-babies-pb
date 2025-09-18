'use client';

import React, { useState } from 'react';
import { Search, Users, Loader2, X, Ghost, MapPin, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { searchUsersAndPhantomPlayersNotInCircle } from '@/lib/user-search';
import type { User } from '@/lib/types';

interface SimpleMultiInviteProps {
  circleId: string;
  excludeUserIds?: string[];
  onUsersSelect: (users: User[]) => void;
  selectedUsers: User[];
  className?: string;
  showLocation?: boolean;
  showGender?: boolean;
}

export function SimpleMultiInvite({
  circleId,
  excludeUserIds = [],
  onUsersSelect,
  selectedUsers,
  className,
  showLocation = false,
  showGender = false
}: SimpleMultiInviteProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Manual search trigger - no automatic effects
  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      return;
    }

    setIsSearching(true);
    setHasSearched(true);

    try {
      const result = await searchUsersAndPhantomPlayersNotInCircle(circleId, {
        searchTerm: searchTerm.trim(),
        excludeUserIds,
        limit: 50
      });
      setSearchResults(result.users);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle user selection toggle
  const toggleUserSelection = (user: User) => {
    const isSelected = selectedUsers.some(selected => selected.id === user.id);

    if (isSelected) {
      // Remove user
      const newSelectedUsers = selectedUsers.filter(selected => selected.id !== user.id);
      onUsersSelect(newSelectedUsers);
    } else {
      // Add user
      const newSelectedUsers = [...selectedUsers, user];
      onUsersSelect(newSelectedUsers);
    }
  };

  // Remove selected user
  const removeSelectedUser = (user: User) => {
    const newSelectedUsers = selectedUsers.filter(selected => selected.id !== user.id);
    onUsersSelect(newSelectedUsers);
  };

  // Clear all selections
  const clearAllSelections = () => {
    onUsersSelect([]);
  };

  // Handle Enter key in search input
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isSearching) {
      handleSearch();
    }
  };

  return (
    <div className={className}>
      {/* Selected Users Section */}
      {selectedUsers.length > 0 && (
        <Card className="mb-4 bg-blue-50 border-blue-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm text-blue-900">
                {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''} selected
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllSelections}
                className="text-blue-700 hover:text-blue-900 hover:bg-blue-100"
              >
                Clear All
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-2">
              {selectedUsers.map((user) => (
                <Badge
                  key={user.id}
                  variant="secondary"
                  className="text-xs flex items-center gap-2 bg-blue-100 text-blue-800 pr-1"
                >
                  <span>{user.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-blue-200"
                    onClick={() => removeSelectedUser(user)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Section */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Search className="h-4 w-4" />
            Search Users
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
            />
            <Button
              onClick={handleSearch}
              disabled={isSearching || !searchTerm.trim()}
              className="px-6"
            >
              {isSearching ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Search Results Section */}
      {hasSearched && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              Search Results ({searchResults.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {searchResults.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <div className="text-sm">
                  {searchTerm.trim()
                    ? `No users found matching "${searchTerm}"`
                    : "No users available"
                  }
                </div>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {searchResults.map((user) => {
                  const isSelected = selectedUsers.some(selected => selected.id === user.id);

                  return (
                    <div
                      key={user.id}
                      className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer hover:bg-accent transition-colors ${
                        isSelected ? 'bg-blue-50 border border-blue-200' : 'border border-transparent'
                      }`}
                      onClick={() => toggleUserSelection(user)}
                    >
                      <Checkbox
                        checked={isSelected}
                        onChange={() => {}}
                        className="pointer-events-none"
                      />

                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatar} alt={user.name} />
                        <AvatarFallback className="text-xs">
                          {user.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{user.name}</div>
                        <div className="space-y-0.5">
                          {user.email && (
                            <div className="text-sm text-muted-foreground flex items-center space-x-1">
                              <Mail className="h-3 w-3" />
                              <span className="truncate">{user.email}</span>
                            </div>
                          )}
                          {showLocation && user.location && (
                            <div className="text-sm text-muted-foreground flex items-center space-x-1">
                              <MapPin className="h-3 w-3" />
                              <span className="truncate">{user.location.city}, {user.location.country}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col gap-1">
                        {user.role === 'phantom' && (
                          <Badge variant="secondary" className="text-xs flex items-center gap-1">
                            <Ghost className="h-3 w-3" />
                            Phantom
                          </Badge>
                        )}
                        {showGender && user.gender && (
                          <Badge variant="secondary" className="text-xs">
                            {user.gender}
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default SimpleMultiInvite;