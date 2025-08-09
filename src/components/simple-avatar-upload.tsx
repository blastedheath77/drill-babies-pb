'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Save, X, Link } from 'lucide-react';

interface SimpleAvatarUploadProps {
  playerId: string;
  playerName: string;
  currentAvatar?: string;
  onUploadComplete: (newAvatarUrl: string) => void;
  className?: string;
}

export function SimpleAvatarUpload({
  playerId,
  playerName,
  currentAvatar,
  onUploadComplete,
  className = "",
}: SimpleAvatarUploadProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(currentAvatar || '');
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!avatarUrl.trim()) {
      setError('Please enter a valid image URL');
      return;
    }

    setIsUpdating(true);
    setError(null);

    try {
      // Dynamic import to avoid SSR issues
      const { db } = await import('@/lib/firebase');
      const { doc, updateDoc } = await import('firebase/firestore');

      // Update the player's avatar in Firestore
      const playerRef = doc(db, 'players', playerId);
      await updateDoc(playerRef, {
        avatar: avatarUrl.trim(),
      });

      // Call the callback with the new URL
      onUploadComplete(avatarUrl.trim());
      
    } catch (updateError) {
      console.error('Update error:', updateError);
      setError('Failed to update avatar. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancel = () => {
    setAvatarUrl(currentAvatar || '');
    setError(null);
  };

  // Test if the URL is a valid image
  const isValidImageUrl = (url: string) => {
    return url.match(/\.(jpg|jpeg|png|gif|webp)$/i) || 
           url.includes('gravatar.com') || 
           url.includes('placehold') ||
           url.includes('picsum.photos') ||
           url.includes('images.unsplash.com');
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Current/Preview Avatar */}
      <div className="flex justify-center">
        <Avatar className="h-32 w-32 border-4 border-primary shadow-lg">
          <AvatarImage 
            src={avatarUrl || currentAvatar} 
            alt={playerName}
          />
          <AvatarFallback>{playerName.substring(0, 2)}</AvatarFallback>
        </Avatar>
      </div>

      {/* URL Input */}
      <div className="space-y-2">
        <Label htmlFor="avatar-url">Avatar Image URL</Label>
        <Input
          id="avatar-url"
          type="url"
          value={avatarUrl}
          onChange={(e) => setAvatarUrl(e.target.value)}
          placeholder="https://example.com/your-image.jpg"
          disabled={isUpdating}
        />
        <p className="text-xs text-muted-foreground">
          Enter a direct link to an image (JPG, PNG, GIF, etc.)
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 justify-center">
        <Button 
          onClick={handleSave} 
          disabled={isUpdating || !avatarUrl.trim()}
          size="sm"
        >
          {isUpdating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Avatar
            </>
          )}
        </Button>
        <Button 
          onClick={handleCancel} 
          variant="outline"
          disabled={isUpdating}
          size="sm"
        >
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
      </div>

      {/* Validation Warning */}
      {avatarUrl && !isValidImageUrl(avatarUrl) && (
        <Alert variant="destructive">
          <AlertDescription>
            This URL may not be a valid image. Make sure it ends with .jpg, .png, .gif, etc.
          </AlertDescription>
        </Alert>
      )}

      {/* Error Message */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Quick Examples */}
      <div className="text-xs text-muted-foreground space-y-1">
        <p className="font-medium">Quick examples:</p>
        <div className="space-y-1">
          <button 
            className="block text-blue-600 hover:underline"
            onClick={() => setAvatarUrl('https://picsum.photos/200/200?random=' + Math.floor(Math.random() * 1000))}
            type="button"
          >
            • Random avatar from Picsum
          </button>
          <button 
            className="block text-blue-600 hover:underline"
            onClick={() => setAvatarUrl('https://placehold.co/200x200/4287f5/white?text=' + playerName.substring(0, 2))}
            type="button"
          >
            • Generated placeholder with initials
          </button>
        </div>
      </div>
    </div>
  );
}