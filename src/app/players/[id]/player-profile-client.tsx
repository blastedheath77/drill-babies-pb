'use client';

import React, { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ImageUpload } from '@/components/image-upload';
import { Edit3, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { Player, FormMetric } from '@/lib/types';
import { cn } from '@/lib/utils';

interface PlayerProfileClientProps {
  player: Player;
  form: FormMetric;
}

export function PlayerProfileClient({ player, form }: PlayerProfileClientProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [currentAvatar, setCurrentAvatar] = useState(player.avatar);

  const handleUploadComplete = (newAvatarUrl: string) => {
    setCurrentAvatar(newAvatarUrl);
    setIsEditing(false);
  };

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
  };

  const formScore = form.score;
  const formColorClass = formScore >= 65
    ? 'text-green-600 bg-green-50 border-green-200'
    : formScore <= 35
    ? 'text-red-600 bg-red-50 border-red-200'
    : 'text-yellow-600 bg-yellow-50 border-yellow-200';

  const TrendIcon = form.trend === 'up' ? TrendingUp : form.trend === 'down' ? TrendingDown : Minus;

  return (
    <>
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

      {/* Recent Form Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendIcon className="h-5 w-5" />
            Recent Form
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Form Score */}
            <div className="flex items-center justify-between">
              <div>
                <div className={cn("text-4xl font-bold", formColorClass.split(' ')[0])}>
                  {formScore}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Form Score (0-100)
                </div>
              </div>
              <Badge variant="outline" className={cn("text-lg px-4 py-2", formColorClass)}>
                {form.trend === 'up' && '↗ Good Form'}
                {form.trend === 'neutral' && '→ Neutral'}
                {form.trend === 'down' && '↘ Poor Form'}
              </Badge>
            </div>

            {/* Recent Record */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{form.recentWins}</div>
                <div className="text-xs text-muted-foreground">Wins</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{form.recentLosses}</div>
                <div className="text-xs text-muted-foreground">Losses</div>
              </div>
              {form.recentDraws > 0 && (
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-600">{form.recentDraws}</div>
                  <div className="text-xs text-muted-foreground">Draws</div>
                </div>
              )}
            </div>

            {/* Stats Summary */}
            <div className="pt-4 border-t space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Win Rate (Last {form.gamesPlayed})</span>
                <span className="font-medium">{form.winRate}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Games Played</span>
                <span className="font-medium">{form.gamesPlayed} {form.gamesPlayed < 10 ? '(building form)' : ''}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}