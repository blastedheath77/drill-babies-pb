'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Upload, Camera, X } from 'lucide-react';

interface ImageUploadProps {
  playerId: string;
  playerName: string;
  currentAvatar?: string;
  onUploadComplete: (newAvatarUrl: string) => void;
  className?: string;
}

export function ImageUpload({
  playerId,
  playerName,
  currentAvatar,
  onUploadComplete,
  className = "",
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB');
      return;
    }

    setSelectedFile(file);
    setError(null);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setError(null);

    try {
      // Dynamic import to avoid SSR issues
      const { storage, db } = await import('@/lib/firebase');
      const { ref, uploadBytes, getDownloadURL, deleteObject } = await import('firebase/storage');
      const { doc, updateDoc } = await import('firebase/firestore');

      // Create a reference to the file in Firebase Storage
      const timestamp = Date.now();
      const fileName = `player-avatars/${playerId}-${timestamp}.${selectedFile.name.split('.').pop()}`;
      const storageRef = ref(storage, fileName);

      // Upload the file
      const snapshot = await uploadBytes(storageRef, selectedFile);
      
      // Get the download URL
      const downloadURL = await getDownloadURL(snapshot.ref);

      // Update the player's avatar in Firestore
      const playerRef = doc(db, 'players', playerId);
      await updateDoc(playerRef, {
        avatar: downloadURL,
      });

      // Delete the old avatar if it exists and is not a placeholder
      if (currentAvatar && currentAvatar.includes('firebase') && currentAvatar !== downloadURL) {
        try {
          const oldImageRef = ref(storage, currentAvatar);
          await deleteObject(oldImageRef);
        } catch (deleteError) {
          // Ignore delete errors for old images
          console.log('Could not delete old avatar:', deleteError);
        }
      }

      // Call the callback with the new URL
      onUploadComplete(downloadURL);

      // Reset the form
      setSelectedFile(null);
      setPreview(null);
      
    } catch (uploadError) {
      console.error('Upload error:', uploadError);
      setError('Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setPreview(null);
    setError(null);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Current/Preview Avatar */}
      <div className="flex justify-center">
        <Avatar className="h-32 w-32 border-4 border-primary shadow-lg">
          <AvatarImage 
            src={preview || currentAvatar} 
            alt={playerName}
          />
          <AvatarFallback>{playerName.substring(0, 2)}</AvatarFallback>
        </Avatar>
      </div>

      {/* Upload Controls */}
      <div className="space-y-3">
        {!selectedFile ? (
          <div className="flex flex-col items-center space-y-2">
            <Input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              id="avatar-upload"
            />
            <label htmlFor="avatar-upload">
              <Button variant="outline" className="cursor-pointer" asChild>
                <span>
                  <Camera className="h-4 w-4 mr-2" />
                  Choose New Photo
                </span>
              </Button>
            </label>
            <p className="text-xs text-muted-foreground text-center">
              Supported formats: JPG, PNG, GIF (max 5MB)
            </p>
          </div>
        ) : (
          <div className="flex gap-2 justify-center">
            <Button 
              onClick={handleUpload} 
              disabled={isUploading}
              size="sm"
            >
              {isUploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Photo
                </>
              )}
            </Button>
            <Button 
              onClick={handleCancel} 
              variant="outline"
              disabled={isUploading}
              size="sm"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {selectedFile && !isUploading && (
        <Alert>
          <AlertDescription>
            Ready to upload: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}