'use client';

import { Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface MobileLoadingProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function MobileLoading({ message = 'Loading...', size = 'md' }: MobileLoadingProps) {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  const containerClasses = {
    sm: 'h-24',
    md: 'h-32',
    lg: 'h-48',
  };

  return (
    <Card className="w-full">
      <CardContent className={`flex flex-col items-center justify-center space-y-4 ${containerClasses[size]}`}>
        <Loader2 className={`${sizeClasses[size]} animate-spin text-primary`} />
        <p className="text-sm sm:text-base text-muted-foreground text-center">{message}</p>
      </CardContent>
    </Card>
  );
}

export function FullScreenMobileLoading({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="flex flex-col items-center justify-center space-y-4 py-8">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-base text-muted-foreground text-center">{message}</p>
        </CardContent>
      </Card>
    </div>
  );
}