import React, { useEffect, useState } from 'react';

import {
  useLandscapeTokenStore,
  LandscapeToken,
} from 'react-lib/src/stores/landscape-token';
import { useCollaborationSessionStore } from 'react-lib/src/stores/collaboration/collaboration-session';
import { useRoomServiceStore } from 'react-lib/src/stores/collaboration/room-service';
import { RoomListRecord } from 'react-lib/src/utils/collaboration/room-payload/receivable/room-list';
import { useToastHandlerStore } from 'react-lib/src/stores/toast-handler';
import { OverlayTrigger, Tooltip, Button } from 'react-bootstrap';
import { SyncIcon } from '@primer/octicons-react';

interface RoomListArgs {
  tokens: LandscapeToken[];
  selectToken(token: LandscapeToken): void;
}

export default function RoomList({ tokens, selectToken }: RoomListArgs) {
  const showErrorToastMessage = useToastHandlerStore(
    (state) => state.showErrorToastMessage
  );
  const showSuccessToastMessage = useToastHandlerStore(
    (state) => state.showSuccessToastMessage
  );

  const joinRoom = useCollaborationSessionStore((state) => state.joinRoom);
  const listRooms = useRoomServiceStore((state) => state.listRooms);

  const [rooms, setRooms] = useState<RoomListRecord[]>([]);

  useEffect(() => {
    loadRooms(false);
  }, []);

  const loadRooms = async (alert = true) => {
    let rooms: RoomListRecord[] = [];
    try {
      rooms = await listRooms();
    } catch (error) {
      showErrorToastMessage('Could not load rooms');
      return;
    }

    rooms.forEach((room) => {
      room.alias = tokens.find(
        (elem) => elem.value == room.landscapeToken
      )?.alias;
    });
    setRooms(
      rooms.filter(
        (room) =>
          tokens.find((elem) => elem.value == room.landscapeToken) !== undefined
      )
    );
    if (alert) {
      showSuccessToastMessage('Updated room list');
    }
  };

  return (
    <div className="d-flex flex-row justify-content-center selection-table" style={{ maxHeight: '80vh', minWidth: '60vh'}}>
      <table id="room-selection-table" className="table table-striped">
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Users</th>
            <th scope="col">Landscape</th>
            <th scope="col">Token</th>
          </tr>
        </thead>
        <tbody>
          {rooms.length > 0 ? (
            rooms.map((room) => (
              <tr
                key={room.roomId}
                onClick={() => joinRoom(room.roomId)}
                title="Join Room"
                className="room-entry"
              >
                <td>{room.roomName}</td>
                <td>{room.size}</td>
                <td>{room.alias ? room.alias : room.landscapeToken}</td>
                <OverlayTrigger
                  placement="bottom"
                  trigger={['hover', 'focus']}
                  overlay={<Tooltip>{room.landscapeToken}</Tooltip>}
                >
                  <td className="room-token">{room.landscapeToken}</td>
                </OverlayTrigger>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={4} className="text-center">
                There are no open rooms at the moment.
              </td>
            </tr>
          )}
          <tr>
            <td colSpan={4} className="p-1">
              <div className="d-flex flex-row justify-content-center">
                <Button
                  variant="primary"
                  className="align-self-center pt-2 px-3"
                  onClick={() => loadRooms(true)}
                >
                  <SyncIcon size="small" />
                </Button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
