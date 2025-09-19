'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Users,
  Plus,
  Trash2,
  Edit,
  Check,
  X,
  AlertCircle
} from 'lucide-react';

export function AdminCircleManagement() {
  const [circles, setCircles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newCircleName, setNewCircleName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const { toast } = useToast();

  const loadCircles = async () => {
    // Placeholder - would load actual circles from database
    setCircles([]);
  };

  const createCircle = async () => {
    if (!newCircleName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Circle name is required'
      });
      return;
    }

    setLoading(true);
    try {
      // Placeholder - would create circle in database
      toast({
        title: 'Success',
        description: `Circle "${newCircleName}" created successfully`
      });
      setNewCircleName('');
      await loadCircles();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create circle'
      });
    } finally {
      setLoading(false);
    }
  };

  const updateCircle = async (id: string, name: string) => {
    setLoading(true);
    try {
      // Placeholder - would update circle in database
      toast({
        title: 'Success',
        description: `Circle updated successfully`
      });
      setEditingId(null);
      await loadCircles();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update circle'
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteCircle = async (id: string) => {
    setLoading(true);
    try {
      // Placeholder - would delete circle from database
      toast({
        title: 'Success',
        description: 'Circle deleted successfully'
      });
      await loadCircles();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete circle'
      });
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadCircles();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Users className="h-5 w-5 mr-2" />
          Circle Management
        </CardTitle>
        <CardDescription>
          Manage player circles (groups/clubs) in the system
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Create New Circle */}
        <div className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor="newCircle">Create New Circle</Label>
            <Input
              id="newCircle"
              placeholder="Enter circle name..."
              value={newCircleName}
              onChange={(e) => setNewCircleName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && createCircle()}
            />
          </div>
          <div className="flex items-end">
            <Button onClick={createCircle} disabled={loading}>
              <Plus className="h-4 w-4 mr-2" />
              Create
            </Button>
          </div>
        </div>

        {/* Circles List */}
        {circles.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No circles found. Create a circle to organize players into groups.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-2">
            {circles.map((circle: any) => (
              <div key={circle.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  {editingId === circle.id ? (
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          updateCircle(circle.id, editName);
                        }
                        if (e.key === 'Escape') {
                          setEditingId(null);
                        }
                      }}
                      className="w-48"
                      autoFocus
                    />
                  ) : (
                    <>
                      <span className="font-medium">{circle.name}</span>
                      <Badge variant="outline">{circle.memberCount || 0} members</Badge>
                    </>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  {editingId === circle.id ? (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => updateCircle(circle.id, editName)}
                        disabled={loading}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingId(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingId(circle.id);
                          setEditName(circle.name);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteCircle(circle.id)}
                        disabled={loading}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}