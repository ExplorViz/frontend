import React from 'react';

// import { LandscapeToken } from 'explorviz-frontend/services/landscape-token';
import { useLandscapeTokenStore } from 'react-lib/src/stores/landscape-token';
// import CollaborationSession from 'explorviz-frontend/services/collaboration/collaboration-session';
import { useCollaborationSessionStore } from 'react-lib/src/stores/collaboration/collaboration-session';
// import RoomService from 'explorviz-frontend/services/collaboration/room-service';
import { useRoomServiceStore } from 'react-lib/src/stores/collaboration/room-service';
import { RoomListRecord } from 'react-lib/src/utils/collaboration/room-payload/receivable/room-list';
import { useToastHandlerStore } from 'react-lib/src/stores/toast-handler';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';
import { SyncIcon } from '@primer/octicons-react';
import Button from 'react-bootstrap/Button';

interface RoomListArgs {
  tokens: (typeof useLandscapeTokenStore)[];
  selectToken(token: (typeof useLandscapeTokenStore)[]): void;
}

export default function RoomList({ tokens, selectToken }: RoomListArgs) {
  const showErrorToastMessage = useToastHandlerStore(
    (state) => state.showErrorToastMessage
  );
  const showSuccessToastMessage = useToastHandlerStore(
    (state) => state.showSuccessToastMessage
  );
  const collaborationSession = useCollaborationSessionStore(
    (state) => state.collaborationSession
  );
  const roomService = useRoomServiceStore((state) => state.roomService);

  // Don't know how to implement this
  // constructor(owner: any, args: RoomListArgs) {
  //     super(owner, args);

  //     this.loadRooms(false);
  // }
  // maybe like this:
  // useEffect(() => {
  //      loadRooms(false);
  // }, []);

  //  @tracked
  const rooms: RoomListRecord[] = [];

  // async
  const loadRooms = (alert = true) => {
    let rooms: RoomListRecord[] = [];
    try {
      rooms = await roomService.listRooms();
    } catch (error) {
      showErrorToastMessage('Could not load rooms');
      return;
    }

    rooms.forEach((room) => {
      room.alias = tokens.find(
        (elem) => elem.value == room.landscapeToken
      )?.alias;
    });
    rooms = rooms.filter(
      (room) =>
        tokens.find((elem) => elem.value == room.landscapeToken) !== undefined
    );
    if (alert) {
      showSuccessToastMessage('Updated room list');
    }
  };

  const joinRoom = (room: RoomListRecord) => {
    collaborationSession.joinRoom(room.roomId);
  };

  return (
    <div className="d-flex flex-row justify-content-center overflow-scroll">
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
          {/* </tbody>{{#each this.rooms as |room|}} */}
          {rooms.length > 0 ? (
            rooms.map((room) => (
              <tr
                key={room.roomId}
                onClick={() => joinRoom(room)}
                title="Join Room"
                className="room-entry"
              >
                <td>{room.roomName}</td>
                <td>{room.size}</td>
                <td>{room.alias ? room.alias : room.landscapeToken}</td>
                <OverlayTrigger
                  placement="bottom"
                  trigger={['hover', 'focus']}
                  overlay={<Tooltip> room.landscapeToken</Tooltip>}
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
