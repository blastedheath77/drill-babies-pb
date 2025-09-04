'use client';

import React, { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ImageUpload } from '@/components/image-upload';
import { Edit3, X, Check } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from '@/hooks/use-toast';
import type { Player } from '@/lib/types';

interface PlayerProfileClientProps {
  player: Player;
}

export function PlayerProfileClient({ player }: PlayerProfileClientProps) {
  const { user } = useAuth();
  const [isEditingPhoto, setIsEditingPhoto] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [currentAvatar, setCurrentAvatar] = useState(player.avatar);
  const [currentName, setCurrentName] = useState(player.name);
  const [tempName, setTempName] = useState(player.name);

  // Check if current user can edit this profile
  const canEdit = user?.id === player.claimedByUserId || user?.role === 'admin';

  const handleUploadComplete = (newAvatarUrl: string) => {
    setCurrentAvatar(newAvatarUrl);
    setIsEditingPhoto(false);
  };

  const handleEditPhotoToggle = () => {
    setIsEditingPhoto(!isEditingPhoto);
  };

  const handleEditNameToggle = () => {
    setIsEditingName(!isEditingName);
    if (!isEditingName) {
      setTempName(currentName); // Reset temp name when starting edit
    }
  };

  const handleNameSave = async () => {
    if (tempName.trim() === currentName) {
      setIsEditingName(false);
      return;
    }

    if (!tempName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Name cannot be empty'
      });
      return;
    }

    try {
      await updateDoc(doc(db, 'players', player.id), {
        name: tempName.trim(),
        updatedAt: new Date().toISOString()
      });

      setCurrentName(tempName.trim());
      setIsEditingName(false);
      
      toast({
        title: 'Success',
        description: 'Name updated successfully'
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update name'
      });
    }
  };

  const handleNameCancel = () => {
    setTempName(currentName);
    setIsEditingName(false);
  };

  return (
    <Card>
      <CardContent className="pt-6 flex flex-col items-center text-center">
        {isEditingPhoto ? (
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
          <>
            <Avatar className="h-32 w-32 mb-4 border-4 border-primary shadow-lg">
              <AvatarImage src={currentAvatar} alt={currentName} />
              <AvatarFallback>{currentName.substring(0, 2)}</AvatarFallback>
            </Avatar>
            
            {canEdit && (
              <Button
                onClick={handleEditPhotoToggle}
                size="sm"
                variant="outline"
                className="mb-4 bg-white border border-gray-300 hover:bg-gray-50 shadow-sm"
              >
                <Edit3 className="h-4 w-4 mr-2" />
                Edit Photo
              </Button>
            )}

            <div className="space-y-1">
              {isEditingName ? (
                <div className="flex items-center gap-2 mb-2">
                  <Input
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    className="text-center text-2xl font-bold"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleNameSave();
                      if (e.key === 'Escape') handleNameCancel();
                    }}
                    autoFocus
                  />
                  <Button size="sm" onClick={handleNameSave} variant="default">
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button size="sm" onClick={handleNameCancel} variant="outline">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 justify-center">
                  <h2 className="text-2xl font-bold">{currentName}</h2>
                  {canEdit && (
                    <Button size="sm" variant="ghost" onClick={handleEditNameToggle}>
                      <Edit3 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}
              <p className="text-muted-foreground text-lg">Rating: {player.rating.toFixed(2)}</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}