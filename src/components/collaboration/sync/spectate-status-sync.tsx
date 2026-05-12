import { useSpectateStatusStore } from 'explorviz-frontend/src/stores/collaboration/spectate-status-store';
import { myPlayer, usePlayersState } from 'playroomkit';
import { useEffect } from 'react';

// Listens to all other players' spectatingTarget with one Playroom subscription
// (avoids per-player usePlayerState / connected listeners).

export default function SpectateStatusSync() {
  const me = myPlayer();
  const entries = usePlayersState('spectatingTarget');
  const addSpectator = useSpectateStatusStore((state) => state.addSpectator);
  const removeSpectator = useSpectateStatusStore((state) => state.removeSpectator);

  useEffect(() => {
    if (!me) return;

    const next = new Set<string>();
    for (const { player, state: spectatingTarget } of entries) {
      if (player.id === me.id) continue;
      if (spectatingTarget === me.id) {
        next.add(player.id);
      }
    }

    const prev = useSpectateStatusStore.getState().spectators;
    for (const id of next) {
      if (!prev.has(id)) addSpectator(id);
    }
    for (const id of prev) {
      if (!next.has(id)) removeSpectator(id);
    }
  }, [entries, me, addSpectator, removeSpectator]);

  return null;
}