'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CircleFormDialog } from '@/components/circle-form-dialog';
import { DeleteCircleDialog } from '@/components/delete-circle-dialog';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Users2,
  Calendar,
  Crown,
  Trophy,
  UserPlus
} from 'lucide-react';
import type { Circle, Player } from '@/lib/types';
import { cn } from '@/lib/utils';

interface CircleDetailsClientProps {
  circle: Circle;
  members: Player[];
}

export function CircleDetailsClient({ circle, members }: CircleDetailsClientProps) {
  const router = useRouter();
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Sort members by win rate (highest first)
  const sortedMembers = [...members].sort((a, b) => {
    const aWinRate = a.wins + a.losses > 0 ? a.wins / (a.wins + a.losses) : 0;
    const bWinRate = b.wins + b.losses > 0 ? b.wins / (b.wins + b.losses) : 0;
    return bWinRate - aWinRate;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="mt-1"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{circle.name}</h1>
            {circle.description && (
              <p className="text-muted-foreground mt-2 max-w-2xl">
                {circle.description}
              </p>
            )}
            <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Created {new Date(circle.createdDate).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div>
          <DeleteCircleDialog circle={circle}>
            <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive hover:text-destructive-foreground">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </DeleteCircleDialog>
        </div>
      </div>

      <hr className="border-border" />

      {/* Members Section */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-semibold">Members</h2>
            <p className="text-muted-foreground">
              {members.length === 0
                ? 'No members in this circle yet'
                : `${members.length} player${members.length !== 1 ? 's' : ''} in this circle`
              }
            </p>
          </div>

          {members.length > 0 && (
            <CircleFormDialog
              circle={circle}
              open={editDialogOpen}
              onOpenChange={setEditDialogOpen}
            >
              <Button variant="outline" size="sm">
                <UserPlus className="h-4 w-4 mr-2" />
                Manage Circle
              </Button>
            </CircleFormDialog>
          )}
        </div>

        {members.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users2 className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Members Yet</h3>
              <p className="text-muted-foreground text-center mb-6 max-w-md">
                This circle doesn't have any members. Add players to start organizing your group.
              </p>
              <CircleFormDialog
                circle={circle}
                open={editDialogOpen}
                onOpenChange={setEditDialogOpen}
              >
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Manage Circle
                </Button>
              </CircleFormDialog>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {sortedMembers.map((member, index) => (
              <Card
                key={member.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => router.push(`/players/${member.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <Avatar className="h-12 w-12 border">
                          <AvatarImage src={member.avatar} alt={member.name} />
                          <AvatarFallback>{member.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        {index === 0 && (
                          <div className="absolute -top-1 -right-1 bg-yellow-500 rounded-full p-1">
                            <Crown className="h-3 w-3 text-yellow-100" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold truncate">{member.name}</h3>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Trophy className="h-3 w-3" />
                            {member.wins}W{member.draws ? `-${member.draws}D` : ''}-{member.losses}L
                          </div>
                          <div className="text-sm">
                            Win Rate: {member.wins + member.losses > 0
                              ? Math.round((member.wins / (member.wins + member.losses)) * 100)
                              : 0}%
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className={cn(
                        "text-2xl font-bold",
                        index === 0 && "text-yellow-600",
                        index === 1 && "text-gray-600",
                        index === 2 && "text-amber-700"
                      )}>
                        {member.wins + member.losses > 0
                          ? Math.round((member.wins / (member.wins + member.losses)) * 100)
                          : 0}%
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Win Rate
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}