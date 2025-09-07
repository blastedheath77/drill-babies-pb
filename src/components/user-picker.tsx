'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Search, 
  UserPlus, 
  Users, 
  ChevronDown,
  ChevronUp,
  Loader2,
  Mail,
  MapPin,
  User as UserIcon,
  Ghost
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { searchUsers, searchUsersNotInCircle, UserSearchOptions, UserSearchResult } from '@/lib/user-search';
import { useDebounce } from '@/hooks/use-debounce';
import type { User } from '@/lib/types';

export interface UserPickerProps {
  onUserSelect: (user: User) => void;
  selectedUserId?: string;
  placeholder?: string;
  searchOptions?: Omit<UserSearchOptions, 'searchTerm' | 'startAfter'>;
  className?: string;
  disabled?: boolean;
  showEmail?: boolean;
  showRole?: boolean;
  showLocation?: boolean;
  showGender?: boolean;
  maxHeight?: string;
  circleId?: string; // Add circleId to exclude circle members
  customSearchFunction?: (options: UserSearchOptions) => Promise<UserSearchResult>;
}

export function UserPicker({
  onUserSelect,
  selectedUserId,
  placeholder = "Search for users...",
  searchOptions = {},
  className,
  disabled = false,
  showEmail = true,
  showRole = true,
  showLocation = false,
  showGender = false,
  maxHeight = "400px",
  circleId,
  customSearchFunction
}: UserPickerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [searchResult, setSearchResult] = useState<UserSearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Search function
  const performSearch = useCallback(async (term: string, loadMore = false) => {
    if (!isOpen && !loadMore) return;

    try {
      setIsLoading(!loadMore);
      setIsLoadingMore(loadMore);

      const options: UserSearchOptions = {
        ...searchOptions,
        searchTerm: term,
        startAfter: loadMore ? searchResult?.lastDoc : undefined,
      };

      let result: UserSearchResult;
      
      if (customSearchFunction) {
        // Use custom search function
        result = await customSearchFunction(options);
      } else if (circleId) {
        // Use searchUsersNotInCircle to exclude circle members
        result = await searchUsersNotInCircle(circleId, options);
      } else {
        // Use default search function
        result = await searchUsers(options);
      }

      if (loadMore && searchResult) {
        // Append new results
        setSearchResult({
          ...result,
          users: [...searchResult.users, ...result.users],
        });
      } else {
        // Replace results
        setSearchResult(result);
      }
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [isOpen, searchOptions, searchResult, customSearchFunction, circleId]);

  // Effect for searching when term changes
  useEffect(() => {
    if (isOpen) {
      performSearch(debouncedSearchTerm);
    }
  }, [debouncedSearchTerm, performSearch, isOpen]);

  // Effect for initial load when opened
  useEffect(() => {
    if (isOpen && !searchResult) {
      performSearch('');
    }
  }, [isOpen, searchResult, performSearch]);

  // Handle user selection
  const handleUserSelect = useCallback((user: User) => {
    setSelectedUser(user);
    setIsOpen(false);
    onUserSelect(user);
  }, [onUserSelect]);

  // Handle load more
  const handleLoadMore = useCallback(() => {
    if (searchResult?.hasMore && !isLoadingMore) {
      performSearch(debouncedSearchTerm, true);
    }
  }, [searchResult?.hasMore, isLoadingMore, performSearch, debouncedSearchTerm]);

  // Find selected user by ID if provided
  useEffect(() => {
    if (selectedUserId && searchResult) {
      const user = searchResult.users.find(u => u.id === selectedUserId);
      if (user) {
        setSelectedUser(user);
      }
    }
  }, [selectedUserId, searchResult]);

  return (
    <div className={cn("relative", className)}>
      {/* Search Input / Selected User Display */}
      <div className="relative">
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={isOpen}
          className={cn(
            "w-full justify-start text-left font-normal",
            !selectedUser && "text-muted-foreground",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
        >
          {selectedUser ? (
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <Avatar className="h-6 w-6">
                <AvatarImage src={selectedUser.avatar} alt={selectedUser.name} />
                <AvatarFallback className="text-xs">
                  {selectedUser.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="truncate font-medium">{selectedUser.name}</div>
                <div className="space-y-0.5">
                  {showEmail && (
                    <div className="truncate text-xs text-muted-foreground">
                      {selectedUser.email}
                    </div>
                  )}
                  {showLocation && selectedUser.location && (
                    <div className="truncate text-xs text-muted-foreground flex items-center">
                      <MapPin className="h-3 w-3 mr-1" />
                      {selectedUser.location.city}, {selectedUser.location.country}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                {selectedUser.role === 'phantom' && (
                  <Badge variant="secondary" className="text-xs flex items-center gap-1">
                    <Ghost className="h-3 w-3" />
                    Phantom
                  </Badge>
                )}
                {showRole && selectedUser.role !== 'phantom' && (
                  <Badge variant="secondary" className="text-xs">
                    {selectedUser.role}
                  </Badge>
                )}
                {showGender && selectedUser.gender && (
                  <Badge variant="outline" className="text-xs">
                    {selectedUser.gender}
                  </Badge>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4" />
              <span>{placeholder}</span>
            </div>
          )}
          {isOpen ? (
            <ChevronUp className="ml-2 h-4 w-4 shrink-0" />
          ) : (
            <ChevronDown className="ml-2 h-4 w-4 shrink-0" />
          )}
        </Button>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <Card className="absolute top-full left-0 right-0 z-50 mt-1 shadow-lg">
          <CardContent className="p-0">
            {/* Search Input */}
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Type to search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                  autoFocus
                />
              </div>
            </div>

            {/* Results */}
            <div className="max-h-[400px] overflow-y-auto overscroll-contain">
              {isLoading && !searchResult ? (
                // Initial loading state
                <div className="p-3 space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center space-x-3 p-2">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="flex-1 space-y-1">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                      <Skeleton className="h-5 w-12" />
                    </div>
                  ))}
                </div>
              ) : searchResult && searchResult.users.length > 0 ? (
                // Results list
                <div className="py-2">
                  {searchResult.users.map((user) => (
                    <div
                      key={user.id}
                      className={cn(
                        "flex items-center space-x-3 p-3 cursor-pointer hover:bg-accent transition-colors",
                        selectedUser?.id === user.id && "bg-accent"
                      )}
                      onClick={() => handleUserSelect(user)}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatar} alt={user.name} />
                        <AvatarFallback className="text-xs">
                          {user.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="truncate font-medium">{user.name}</div>
                        <div className="space-y-0.5">
                          {showEmail && (
                            <div className="truncate text-sm text-muted-foreground flex items-center space-x-1">
                              <Mail className="h-3 w-3" />
                              <span>{user.email}</span>
                            </div>
                          )}
                          {showLocation && user.location && (
                            <div className="truncate text-sm text-muted-foreground flex items-center space-x-1">
                              <MapPin className="h-3 w-3" />
                              <span>{user.location.city}, {user.location.country}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-1">
                        {user.role === 'phantom' && (
                          <Badge variant="outline" className="text-xs flex items-center gap-1">
                            <Ghost className="h-3 w-3" />
                            Phantom
                          </Badge>
                        )}
                        {showRole && user.role !== 'phantom' && (
                          <Badge variant="outline" className="text-xs">
                            {user.role}
                          </Badge>
                        )}
                        {showGender && user.gender && (
                          <Badge variant="secondary" className="text-xs">
                            {user.gender}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Load More Button */}
                  {searchResult.hasMore && (
                    <div className="p-3 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleLoadMore}
                        disabled={isLoadingMore}
                        className="w-full"
                      >
                        {isLoadingMore ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Loading more...
                          </>
                        ) : (
                          <>
                            <Users className="mr-2 h-4 w-4" />
                            Load more users
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              ) : searchResult && searchResult.users.length === 0 ? (
                // No results
                <div className="p-6 text-center text-muted-foreground">
                  <UserIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <div className="text-sm">
                    {searchTerm.trim() 
                      ? `No users found matching "${searchTerm}"`
                      : "No users available"
                    }
                  </div>
                </div>
              ) : null}
            </div>

            {/* Footer with result count */}
            {searchResult && searchResult.users.length > 0 && (
              <div className="border-t px-3 py-2 text-xs text-muted-foreground">
                {searchResult.users.length} user{searchResult.users.length !== 1 ? 's' : ''} shown
                {searchResult.hasMore && ' • More available'}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default UserPicker;