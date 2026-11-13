// Every capability's collaboration module registers its hand-over before a Room is entered from here.
import 'explorviz-frontend/src/utils/collaboration/capabilities';
import {
  type CollaborationRoom,
  useRoomConnectionStore,
} from 'explorviz-frontend/src/utils/collaboration/room-connection';

/*
 * Entering a Room from the Rooms tab of the Landscapes page. Unlike joining
 * from the collaboration tab, no Landscape is open there, so there is no
 * local exploration to lose; the person is only asked before leaving another
 * Room (see RoomSelection).
 */

/**
 * Enters the listed Room with this code: stays in it if it is the joined
 * Room, otherwise leaves the joined Room and joins. Resolves to the Room's
 * Landscape token value once its first state is there ("" if the Room has no
 * Landscape), or undefined if joining failed (the refusal is shown as a toast).
 */
export async function enterListedRoom(code: string, name: string): Promise<string | undefined> {
  const connection = useRoomConnectionStore.getState();
  if (connection.room?.roomId !== code) {
    if (connection.room) await connection.leaveRoom();
    await connection.joinRoom(code, name);
  }
  const room = useRoomConnectionStore.getState().room;
  return room?.roomId === code ? landscapeOf(room) : undefined;
}

/** The Room's Landscape token value, once its first state is there. */
function landscapeOf(room: CollaborationRoom): Promise<string> {
  // Until the first full state arrives, the decoded state has no fields at all.
  if (room.state.landscapeToken !== undefined) return Promise.resolve(room.state.landscapeToken);
  return new Promise((resolve) => {
    let resolved = false;
    room.onStateChange(() => {
      if (resolved) return;
      resolved = true;
      resolve(room.state.landscapeToken ?? '');
    });
  });
}
