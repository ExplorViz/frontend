import { PlayerState, usePlayersList } from 'playroomkit';
import { createContext, type ReactNode, useContext } from 'react';

const PlayroomPlayersContext = createContext<PlayerState[] | undefined>(
  undefined
);

/**
 * Single usePlayersList(true) for the whole Canvas tree so Playroom does not
 * register one "connected" listener per consumer (default Node limit is 10).
 */
export function PlayroomPlayersProvider({ children }: { children: ReactNode }) {
  const players = usePlayersList(true);
  return (
    <PlayroomPlayersContext.Provider value={players}>
      {children}
    </PlayroomPlayersContext.Provider>
  );
}

export function usePlayroomPlayers(): PlayerState[] {
  const players = useContext(PlayroomPlayersContext);
  if (players === undefined) {
    throw new Error(
      'usePlayroomPlayers must be used within PlayroomPlayersProvider'
    );
  }
  return players;
}
