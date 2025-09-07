'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Users, 
  Plus, 
  Search, 
  Mail, 
  MapPin, 
  Trophy,
  Gamepad2,
  ArrowRight,
  CheckCircle,
  Globe,
  UserPlus,
  MessageCircle
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useCircles } from '@/contexts/circle-context';
import Link from 'next/link';

interface WelcomeScreenProps {
  onCreateCircle?: () => void;
  onFindCircles?: () => void;
}

export function WelcomeScreen({ onCreateCircle, onFindCircles }: WelcomeScreenProps) {
  const { user } = useAuth();
  const { availableCircles, isLoadingCircles } = useCircles();
  const [currentStep, setCurrentStep] = useState(1);

  // Don't show welcome screen if user has circles or circles are loading
  if (isLoadingCircles || availableCircles.length > 0) {
    return null;
  }

  const steps = [
    {
      id: 1,
      title: "Welcome to PBStats!",
      icon: Trophy,
      description: "Your personal pickleball statistics and community platform"
    },
    {
      id: 2,
      title: "Join the Community",
      icon: Users,
      description: "Connect with other players by joining or creating circles"
    },
    {
      id: 3,
      title: "Start Playing",
      icon: Gamepad2,
      description: "Log games, track stats, and climb the leaderboards"
    }
  ];

  const handleCreateCircle = () => {
    if (onCreateCircle) {
      onCreateCircle();
    } else {
      window.location.href = '/circles/create';
    }
  };

  const handleFindCircles = () => {
    if (onFindCircles) {
      onFindCircles();
    } else {
      window.location.href = '/circles/discover';
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="max-w-4xl w-full space-y-8">
        
        {/* Welcome Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="bg-primary/10 p-4 rounded-full">
              <Trophy className="h-12 w-12 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-foreground">
            Welcome to PBStats{user?.name ? `, ${user.name.split(' ')[0]}` : ''}!
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Get ready to track your pickleball journey, connect with players, and improve your game.
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center">
          <div className="flex items-center space-x-4">
            {steps.map((step, index) => (
              <React.Fragment key={step.id}>
                <div className="flex items-center space-x-2">
                  <div 
                    className={`p-2 rounded-full ${
                      currentStep >= step.id 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <step.icon className="h-4 w-4" />
                  </div>
                  <span className={`text-sm font-medium ${
                    currentStep >= step.id ? 'text-primary' : 'text-muted-foreground'
                  }`}>
                    {step.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Join Existing Circles */}
          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10" />
            <CardHeader className="relative">
              <div className="flex items-center gap-3">
                <div className="bg-blue-500/20 p-2 rounded-lg">
                  <Search className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-xl">Find Your Community</CardTitle>
                  <CardDescription>
                    Join existing circles in your area
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative space-y-4">
              <p className="text-muted-foreground">
                Connect with local pickleball clubs, groups, and leagues already using PBStats.
              </p>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Browse public circles near you</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Request invitations to join</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Start playing immediately</span>
                </div>
              </div>

              {user?.location && (
                <Alert>
                  <MapPin className="h-4 w-4" />
                  <AlertDescription>
                    We'll help you find circles near {user.location.city}, {user.location.country}
                  </AlertDescription>
                </Alert>
              )}

              <Button 
                onClick={handleFindCircles} 
                className="w-full" 
                size="lg"
              >
                <Search className="h-4 w-4 mr-2" />
                Find Circles Near Me
              </Button>
            </CardContent>
          </Card>

          {/* Create New Circle */}
          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-emerald-500/10" />
            <CardHeader className="relative">
              <div className="flex items-center gap-3">
                <div className="bg-green-500/20 p-2 rounded-lg">
                  <Plus className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-xl">Start Your Own</CardTitle>
                  <CardDescription>
                    Create a circle for your group
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative space-y-4">
              <p className="text-muted-foreground">
                Lead your friends, teammates, or local players by creating your own circle.
              </p>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Invite players by email or username</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Organize tournaments and events</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Manage your community</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">Admin Tools</Badge>
                <Badge variant="secondary">Player Management</Badge>
                <Badge variant="secondary">Statistics</Badge>
              </div>

              <Button 
                onClick={handleCreateCircle} 
                className="w-full" 
                size="lg"
                variant="outline"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create New Circle
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* What Happens Next */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              What Happens Next?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center space-y-2">
                <div className="bg-primary/10 p-3 rounded-full w-fit mx-auto">
                  <UserPlus className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold">Connect</h3>
                <p className="text-sm text-muted-foreground">
                  Join circles or create your own to connect with other players in your area.
                </p>
              </div>
              
              <div className="text-center space-y-2">
                <div className="bg-primary/10 p-3 rounded-full w-fit mx-auto">
                  <Gamepad2 className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold">Play</h3>
                <p className="text-sm text-muted-foreground">
                  Log your games and watch your statistics improve as you play more matches.
                </p>
              </div>
              
              <div className="text-center space-y-2">
                <div className="bg-primary/10 p-3 rounded-full w-fit mx-auto">
                  <Trophy className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold">Compete</h3>
                <p className="text-sm text-muted-foreground">
                  Climb the leaderboards, participate in tournaments, and track your progress.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Completion Reminder */}
        {user && (!user.location || !user.gender) && (
          <Alert>
            <MapPin className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>
                Complete your profile to help us find the best circles for you.
              </span>
              <Button asChild variant="outline" size="sm">
                <Link href="/profile">
                  Complete Profile
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Link>
              </Button>
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}

// Hook to determine if welcome screen should be shown
export function useShowWelcomeScreen() {
  const { user } = useAuth();
  const { availableCircles, isLoadingCircles } = useCircles();
  
  // Show welcome screen if user is authenticated, circles are loaded, and has no circles
  const shouldShowWelcome = user && !isLoadingCircles && availableCircles.length === 0;
  
  return {
    shouldShowWelcome,
    isLoading: isLoadingCircles
  };
}