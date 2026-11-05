import { usePlayersList } from 'playroomkit';
import { type ReactNode } from 'react';

import { PlayroomPlayersContext } from './playroom-players-context-store';

export function PlayroomPlayersProvider({ children }: { children: ReactNode }) {
  const players = usePlayersList(true);
  return <PlayroomPlayersContext value={players}>{children}</PlayroomPlayersContext>;
}
