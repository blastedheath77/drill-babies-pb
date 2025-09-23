'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCreateBoxLeague } from '@/hooks/use-box-leagues';
import { useAuth } from '@/contexts/auth-context';
import { ArrowLeft, Grid3x3, Users, Settings, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function CreateBoxLeagueClient() {
  const router = useRouter();
  const { user } = useAuth();
  const createBoxLeague = useCreateBoxLeague();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    roundsPerCycle: 3,
    totalBoxes: 2,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      console.error('User not authenticated');
      return;
    }

    try {
      const boxLeagueData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        status: 'active' as const,
        createdBy: user.id || user.uid || '',
        roundsPerCycle: formData.roundsPerCycle,
        newPlayerEntryBox: formData.totalBoxes, // Default to bottom box
        totalBoxes: formData.totalBoxes,
      };

      const boxLeagueId = await createBoxLeague.mutateAsync(boxLeagueData);

      // Navigate to the created box league
      router.push(`/box-leagues/${boxLeagueId}`);
    } catch (error) {
      console.error('Error creating box league:', error);
    }
  };

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const totalPlayersNeeded = formData.totalBoxes * 4;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/box-leagues">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Create Box League</h1>
          <p className="text-muted-foreground">
            Set up a new competitive box league system
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Configuration */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Grid3x3 className="h-5 w-5" />
                  League Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">League Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => updateFormData('name', e.target.value)}
                    placeholder="e.g., Summer Box League 2024"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => updateFormData('description', e.target.value)}
                    placeholder="Optional description of the league..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* League Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  League Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="totalBoxes">Number of Boxes *</Label>
                    <Select
                      value={formData.totalBoxes.toString()}
                      onValueChange={(value) => updateFormData('totalBoxes', parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[2, 3, 4, 5, 6, 7, 8].map(num => (
                          <SelectItem key={num} value={num.toString()}>
                            {num} boxes ({num * 4} players)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="roundsPerCycle">Rounds per Cycle *</Label>
                    <Select
                      value={formData.roundsPerCycle.toString()}
                      onValueChange={(value) => updateFormData('roundsPerCycle', parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5].map(num => (
                          <SelectItem key={num} value={num.toString()}>
                            {num} round{num !== 1 ? 's' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Number of rounds before promotion/relegation
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Summary Panel */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  League Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Boxes:</span>
                    <span className="font-medium">{formData.totalBoxes}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Players Needed:</span>
                    <span className="font-medium">{totalPlayersNeeded}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Rounds per Cycle:</span>
                    <span className="font-medium">{formData.roundsPerCycle}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Matches per Round:</span>
                    <span className="font-medium">{formData.totalBoxes * 3}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Match Format
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm space-y-2">
                  <div className="font-medium">Each round consists of:</div>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Match 1: Players 1&2 vs 3&4</li>
                    <li>• Match 2: Players 1&3 vs 2&4</li>
                    <li>• Match 3: Players 1&4 vs 2&3</li>
                  </ul>
                  <div className="mt-3 text-xs text-muted-foreground">
                    Every player partners with each other player exactly once and
                    opposes each other player exactly twice.
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Important Notice */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Next Step:</strong> After creating the league, you'll need to set up the boxes
            and assign players before starting the first round. You'll need exactly {totalPlayersNeeded} players
            to fill all boxes.
          </AlertDescription>
        </Alert>

        {/* Submit Buttons */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" asChild>
            <Link href="/box-leagues">Cancel</Link>
          </Button>
          <Button
            type="submit"
            disabled={createBoxLeague.isPending || !formData.name.trim()}
          >
            {createBoxLeague.isPending ? 'Creating...' : 'Create Box League'}
          </Button>
        </div>
      </form>
    </div>
  );
}