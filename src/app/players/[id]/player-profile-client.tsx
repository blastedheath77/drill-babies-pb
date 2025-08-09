'use client';

import React, { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SimpleAvatarUpload } from '@/components/simple-avatar-upload';
import { Edit3, X } from 'lucide-react';
import type { Player } from '@/lib/types';

interface PlayerProfileClientProps {
  player: Player;
}

export function PlayerProfileClient({ player }: PlayerProfileClientProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [currentAvatar, setCurrentAvatar] = useState(player.avatar);

  const handleUploadComplete = (newAvatarUrl: string) => {
    setCurrentAvatar(newAvatarUrl);
    setIsEditing(false);
  };

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
  };

  return (
    <Card>
      <CardContent className="pt-6 flex flex-col items-center text-center">
        {isEditing ? (
          <div className="w-full">
            <SimpleAvatarUpload
              playerId={player.id}
              playerName={player.name}
              currentAvatar={currentAvatar}
              onUploadComplete={handleUploadComplete}
              className="mb-4"
            />
          </div>
        ) : (
          <>
            <Avatar className="h-32 w-32 mb-4 border-4 border-primary shadow-lg">
              <AvatarImage src={currentAvatar} alt={player.name} />
              <AvatarFallback>{player.name.substring(0, 2)}</AvatarFallback>
            </Avatar>
            
            <Button
              onClick={handleEditToggle}
              size="sm"
              variant="outline"
              className="mb-4 bg-white border border-gray-300 hover:bg-gray-50 shadow-sm"
            >
              <Edit3 className="h-4 w-4 mr-2" />
              Edit Photo
            </Button>

            <div className="space-y-1">
              <h2 className="text-2xl font-bold">{player.name}</h2>
              <p className="text-muted-foreground text-lg">Rating: {player.rating.toFixed(2)}</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}