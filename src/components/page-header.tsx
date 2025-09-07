'use client';

import React from 'react';
import { useCircles } from '@/contexts/circle-context';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  showCircleContext?: boolean;
}

export function PageHeader({ title, description, children, showCircleContext = true }: PageHeaderProps) {
  let selectedCircleId: string | 'all' | null = null;
  let availableCircles: any[] = [];
  
  // Safely use the circles context
  try {
    const circles = useCircles();
    selectedCircleId = circles.selectedCircleId;
    availableCircles = circles.availableCircles;
  } catch (error) {
    // Context not available, use defaults
  }

  // Find current circle name
  const currentCircle = selectedCircleId === 'all' 
    ? { name: 'All Circles', description: 'Data from all your circles' }
    : availableCircles.find(c => c.id === selectedCircleId);

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          {showCircleContext && availableCircles.length > 0 && currentCircle && (
            <Badge variant="outline" className="text-sm">
              <Users className="h-3 w-3 mr-1" />
              {currentCircle.name}
            </Badge>
          )}
        </div>
        {description && <p className="text-muted-foreground">{description}</p>}
        {showCircleContext && currentCircle && selectedCircleId !== 'all' && currentCircle.description && (
          <p className="text-sm text-muted-foreground mt-1">
            Circle: {currentCircle.description}
          </p>
        )}
      </div>
      {children && <div className="flex shrink-0 gap-2">{children}</div>}
    </div>
  );
}
