import type { Player } from './types';

/**
 * Returns the display value for a player's rating based on their exclusion status and viewer's admin status
 * @param player - Player object with rating and excludeFromRankings flag
 * @param isAdmin - Whether the current user is an admin
 * @returns Formatted rating string or "---" for hidden ratings
 */
export function getDisplayRating(player: Player, isAdmin: boolean): string {
  if (player.excludeFromRankings && !isAdmin) {
    return '---';
  }
  return player.rating.toFixed(2);
}

/**
 * Returns whether rating changes should be displayed for a player
 * @param player - Player object with excludeFromRankings flag
 * @param isAdmin - Whether the current user is an admin
 * @returns Boolean indicating if rating changes should be shown
 */
export function shouldShowRatingChanges(player: Player, isAdmin: boolean): boolean {
  return isAdmin || !player.excludeFromRankings;
}
