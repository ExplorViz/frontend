import { PlayerState } from 'playroomkit';
import { createContext, use } from 'react';

export const PlayroomPlayersContext = createContext<PlayerState[] | undefined>(undefined);

export function usePlayroomPlayers(): PlayerState[] {
  const players = use(PlayroomPlayersContext);
  if (players === undefined) {
    throw new Error('usePlayroomPlayers must be used within PlayroomPlayersProvider');
  }
  return players;
}
