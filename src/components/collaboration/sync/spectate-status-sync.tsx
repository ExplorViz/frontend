import { useSpectateStatusStore } from 'explorviz-frontend/src/stores/collaboration/spectate-status-store';
import { myPlayer, PlayerState, usePlayersList, usePlayerState } from 'playroomkit';
import { useEffect } from 'react';

// This component listens to all other players in the current room and checks wether they are spectating

export default function SpectateStatusSync() {
    const players = usePlayersList();
    const me = myPlayer();

    return (
        <>
            {players.map(player => {
                if (me && player.id === me.id) return null;
                return <PlayerSpectateListener key={player.id} player={player} />;
            })}
        </>
    );
}

function PlayerSpectateListener({ player }: { player: PlayerState }) {
    const me = myPlayer();

    const [spectatingTarget] = usePlayerState(player, 'spectatingTarget', null);

    const addSpectator = useSpectateStatusStore(state => state.addSpectator);
    const removeSpectator = useSpectateStatusStore(state => state.removeSpectator);

    useEffect(() => {
        if (!me) return;

        if (spectatingTarget === me.id) {
            addSpectator(player.id);
        } else {
            removeSpectator(player.id);
        }

        return () => {
            removeSpectator(player.id);
        };
    }, [spectatingTarget, me, player.id, addSpectator, removeSpectator]);

    return null;
}