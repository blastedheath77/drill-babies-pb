'use client';

import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Ghost, 
  Mail, 
  UserCheck, 
  Clock, 
  AlertTriangle,
  Eye,
  EyeOff,
  Crown,
  Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, parseISO } from 'date-fns';
import type { Player, PlayerWithClaimStatus } from '@/lib/types';

/**
 * Phantom Player Status Indicator Components
 * 
 * These components provide visual indicators throughout the app to show
 * phantom player status, claiming information, and admin controls.
 */

interface PhantomPlayerBadgeProps {
  player: Player | PlayerWithClaimStatus;
  variant?: 'default' | 'compact' | 'detailed';
  showTooltip?: boolean;
  className?: string;
}

export function PhantomPlayerBadge({
  player,
  variant = 'default',
  showTooltip = true,
  className
}: PhantomPlayerBadgeProps) {
  if (!player.isPhantom && !player.claimedByUserId) {
    return null; // Regular player, no indicator needed
  }

  const getStatusInfo = () => {
    if (player.claimedByUserId) {
      return {
        icon: UserCheck,
        label: 'Claimed',
        color: 'bg-green-100 text-green-800 border-green-200',
        tooltip: `This player was claimed ${player.claimedAt && typeof player.claimedAt === 'string' && player.claimedAt.trim() ? (() => {
          try {
            return formatDistanceToNow(parseISO(player.claimedAt)) + ' ago';
          } catch (error) {
            return 'recently';
          }
        })() : 'recently'}`
      };
    }
    
    if (player.isPhantom && player.email) {
      return {
        icon: Mail,
        label: 'Claimable',
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        tooltip: 'This phantom player can be claimed by registering with the associated email'
      };
    }
    
    if (player.isPhantom) {
      return {
        icon: Ghost,
        label: 'Phantom',
        color: 'bg-gray-100 text-gray-800 border-gray-200',
        tooltip: 'This is a phantom player - game statistics without a user account'
      };
    }

    return null;
  };

  const statusInfo = getStatusInfo();
  if (!statusInfo) return null;

  const { icon: Icon, label, color, tooltip } = statusInfo;

  const badgeContent = (
    <Badge
      variant="outline"
      className={cn(
        'flex items-center space-x-1',
        color,
        variant === 'compact' && 'px-1.5 py-0.5 text-xs',
        className
      )}
    >
      <Icon className={cn(
        'h-3 w-3',
        variant === 'compact' && 'h-2.5 w-2.5'
      )} />
      {variant !== 'compact' && <span>{label}</span>}
    </Badge>
  );

  if (!showTooltip) {
    return badgeContent;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badgeContent}
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs max-w-xs">{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface PhantomPlayerListItemProps {
  player: PlayerWithClaimStatus;
  showAdminActions?: boolean;
  onAdminAction?: (action: 'edit' | 'delete' | 'make-claimable' | 'unclaim', playerId: string) => void;
  className?: string;
}

export function PhantomPlayerListItem({
  player,
  showAdminActions = false,
  onAdminAction,
  className
}: PhantomPlayerListItemProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'claimed': return 'text-green-600';
      case 'claimable': return 'text-blue-600';
      case 'anonymous': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  const getVisibilityIcon = () => {
    if (player.claimStatus === 'claimed') return <Eye className="h-4 w-4" />;
    if (player.claimStatus === 'claimable') return <Mail className="h-4 w-4" />;
    return <EyeOff className="h-4 w-4" />;
  };

  return (
    <div className={cn(
      'flex items-center justify-between p-3 border rounded-lg',
      player.claimStatus === 'claimed' && 'bg-green-50 border-green-200',
      player.claimStatus === 'claimable' && 'bg-blue-50 border-blue-200',
      player.claimStatus === 'anonymous' && 'bg-gray-50 border-gray-200',
      className
    )}>
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          {getVisibilityIcon()}
          <div>
            <div className="font-medium flex items-center space-x-2">
              <span>{player.name}</span>
              <PhantomPlayerBadge player={player} variant="compact" />
            </div>
            <div className="text-sm text-muted-foreground">
              Rating: {player.rating.toFixed(1)} • Games: {player.wins + player.losses}
              {player.email && (
                <span className="ml-2">• {player.email}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Badge 
          variant="secondary" 
          className={getStatusColor(player.claimStatus)}
        >
          {player.claimStatus}
        </Badge>
        
        {player.createdAt && typeof player.createdAt === 'string' && player.createdAt.trim() && (
          <div className="text-xs text-muted-foreground flex items-center space-x-1">
            <Calendar className="h-3 w-3" />
            <span>Created {(() => {
              try {
                return formatDistanceToNow(parseISO(player.createdAt)) + ' ago';
              } catch (error) {
                return 'recently';
              }
            })()}</span>
          </div>
        )}

        {showAdminActions && onAdminAction && (
          <AdminActionDropdown 
            player={player} 
            onAction={onAdminAction}
          />
        )}
      </div>
    </div>
  );
}

interface AdminActionDropdownProps {
  player: PlayerWithClaimStatus;
  onAction: (action: 'edit' | 'delete' | 'make-claimable' | 'unclaim', playerId: string) => void;
}

function AdminActionDropdown({ player, onAction }: AdminActionDropdownProps) {
  return (
    <div className="flex space-x-1">
      {player.claimStatus === 'anonymous' && (
        <button
          onClick={() => onAction('make-claimable', player.id)}
          className="p-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
          title="Make Claimable"
        >
          <Mail className="h-3 w-3" />
        </button>
      )}
      
      {player.claimStatus === 'claimed' && (
        <button
          onClick={() => onAction('unclaim', player.id)}
          className="p-1 text-xs bg-orange-100 text-orange-700 rounded hover:bg-orange-200"
          title="Unclaim Player"
        >
          <AlertTriangle className="h-3 w-3" />
        </button>
      )}
      
      {player.claimStatus !== 'claimed' && (
        <button
          onClick={() => onAction('delete', player.id)}
          className="p-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
          title="Delete Phantom Player"
        >
          ×
        </button>
      )}
    </div>
  );
}

interface OnboardingProgressIndicatorProps {
  hasUnclaimedPlayers: boolean;
  unclaimedCount: number;
  hasUnhandledInvitations: boolean;
  invitationCount: number;
  onboardingScore: number;
  className?: string;
}

export function OnboardingProgressIndicator({
  hasUnclaimedPlayers,
  unclaimedCount,
  hasUnhandledInvitations,
  invitationCount,
  onboardingScore,
  className
}: OnboardingProgressIndicatorProps) {
  if (onboardingScore === 100) {
    return null; // Fully onboarded
  }

  return (
    <div className={cn(
      'p-4 bg-amber-50 border border-amber-200 rounded-lg',
      className
    )}>
      <div className="flex items-start space-x-3">
        <div className="p-2 bg-amber-100 rounded-full">
          <Clock className="h-5 w-5 text-amber-600" />
        </div>
        
        <div className="flex-1">
          <div className="font-medium text-amber-900">
            Complete Your Account Setup
          </div>
          <div className="text-sm text-amber-700 mt-1">
            You're {onboardingScore}% complete. Here's what's waiting:
          </div>
          
          <div className="mt-3 space-y-2">
            {hasUnclaimedPlayers && (
              <div className="flex items-center space-x-2 text-sm">
                <Ghost className="h-4 w-4 text-amber-600" />
                <span>
                  {unclaimedCount} phantom player{unclaimedCount > 1 ? 's' : ''} ready to claim
                </span>
              </div>
            )}
            
            {hasUnhandledInvitations && (
              <div className="flex items-center space-x-2 text-sm">
                <Mail className="h-4 w-4 text-amber-600" />
                <span>
                  {invitationCount} circle invitation{invitationCount > 1 ? 's' : ''} pending
                </span>
              </div>
            )}
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-2xl font-bold text-amber-600">
            {onboardingScore}%
          </div>
          <div className="text-xs text-amber-700">
            Complete
          </div>
        </div>
      </div>
    </div>
  );
}

interface PhantomPlayerStatsCardProps {
  stats: {
    totalPhantom: number;
    claimable: number;
    anonymous: number;
    claimed: number;
  };
  className?: string;
}

export function PhantomPlayerStatsCard({ stats, className }: PhantomPlayerStatsCardProps) {
  const statItems = [
    {
      label: 'Total Phantom',
      value: stats.totalPhantom,
      icon: Ghost,
      color: 'text-gray-600'
    },
    {
      label: 'Claimable',
      value: stats.claimable,
      icon: Mail,
      color: 'text-blue-600'
    },
    {
      label: 'Claimed',
      value: stats.claimed,
      icon: UserCheck,
      color: 'text-green-600'
    },
    {
      label: 'Anonymous',
      value: stats.anonymous,
      icon: EyeOff,
      color: 'text-gray-600'
    }
  ];

  return (
    <div className={cn('grid grid-cols-2 md:grid-cols-4 gap-4', className)}>
      {statItems.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.label} className="p-4 border rounded-lg bg-card">
            <div className="flex items-center space-x-2">
              <Icon className={cn('h-4 w-4', item.color)} />
              <div className="text-sm font-medium">{item.label}</div>
            </div>
            <div className={cn('text-2xl font-bold mt-2', item.color)}>
              {item.value}
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface ClaimSuccessIndicatorProps {
  claimedPlayerName: string;
  gamesInherited: number;
  ratingInherited: number;
  showDetails?: boolean;
  onDismiss?: () => void;
  className?: string;
}

export function ClaimSuccessIndicator({
  claimedPlayerName,
  gamesInherited,
  ratingInherited,
  showDetails = true,
  onDismiss,
  className
}: ClaimSuccessIndicatorProps) {
  return (
    <div className={cn(
      'p-4 bg-green-50 border border-green-200 rounded-lg',
      className
    )}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className="p-2 bg-green-100 rounded-full">
            <Crown className="h-5 w-5 text-green-600" />
          </div>
          
          <div>
            <div className="font-medium text-green-900">
              Successfully claimed {claimedPlayerName}!
            </div>
            
            {showDetails && (
              <div className="text-sm text-green-700 mt-1">
                You've inherited {gamesInherited} games and a {ratingInherited.toFixed(1)} rating
              </div>
            )}
          </div>
        </div>
        
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-green-600 hover:text-green-800"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}

export default PhantomPlayerBadge;