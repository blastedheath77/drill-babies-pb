'use client';

import React, { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ImageUpload } from '@/components/image-upload';
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
      <CardContent className="pt-6">
        {isEditing ? (
          <div className="w-full">
            <ImageUpload
              playerId={player.id}
              playerName={player.name}
              currentAvatar={currentAvatar}
              onUploadComplete={handleUploadComplete}
              className="mb-4"
            />
          </div>
        ) : (
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-center">
              <Avatar className="h-24 w-24 mb-3 border-4 border-primary shadow-lg">
                <AvatarImage src={currentAvatar} alt={player.name} />
                <AvatarFallback>{player.name.substring(0, 2)}</AvatarFallback>
              </Avatar>

              <Button
                onClick={handleEditToggle}
                size="sm"
                variant="outline"
              >
                <Edit3 className="h-4 w-4 mr-2" />
                Edit Photo
              </Button>
            </div>

            <div className="flex-1">
              <h2 className="text-3xl font-bold mb-2">{player.name}</h2>
              <p className="text-muted-foreground text-xl">Rating: {player.rating.toFixed(2)}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}