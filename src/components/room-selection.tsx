import { useAuthStore } from 'explorviz-frontend/src/stores/auth';
import { useToastHandlerStore } from 'explorviz-frontend/src/stores/toast-handler';
import { isLoginSkipped } from 'explorviz-frontend/src/utils/auth-config';
import {
  isCollaborationServiceReachable,
  listRooms,
} from 'explorviz-frontend/src/utils/collaboration/collaboration-service';
import {
  MAX_DISPLAY_NAME_LENGTH,
  readDisplayName,
  rememberDisplayName,
} from 'explorviz-frontend/src/utils/collaboration/display-name';
import { enterListedRoom } from 'explorviz-frontend/src/utils/collaboration/listed-rooms';
import { useRoomConnectionStore } from 'explorviz-frontend/src/utils/collaboration/room-connection';
import type { RoomListing } from 'explorviz-frontend/src/utils/collaboration/room-contract.generated';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Form, Modal } from 'react-bootstrap';

type Listing =
  { status: 'loading' } | { status: 'unreachable' } | { status: 'failed' } | { status: 'loaded'; rooms: RoomListing[] };

const roomTitle = (room: RoomListing) => room.roomName || 'Unnamed room';
const joinLabel = (room: RoomListing) => `Join ${roomTitle(room)} hosted by ${room.hostName}`;
const landscapeTitle = (room: RoomListing) => room.landscapeName || 'Unnamed landscape';

/** The sortable columns, each with the value it sorts by: the text shown, or the number of users. */
const COLUMNS = [
  { label: 'Room name', value: roomTitle },
  { label: 'Host', value: (room: RoomListing) => room.hostName },
  { label: 'Landscape', value: landscapeTitle },
  { label: 'Users', value: (room: RoomListing) => room.users },
] as const;

type Sorting = { column: number; order: 'asc' | 'desc' };

/** The rooms sorted by the column; texts ignore case, users count numerically. */
function sortRooms(rooms: RoomListing[], { column, order }: Sorting) {
  const valueOf = COLUMNS[column].value;
  const direction = order === 'asc' ? 1 : -1;
  return [...rooms].sort((a, b) => {
    const valueA = valueOf(a);
    const valueB = valueOf(b);
    const comparison =
      typeof valueA === 'number' && typeof valueB === 'number'
        ? valueA - valueB
        : String(valueA).localeCompare(String(valueB), undefined, { sensitivity: 'base', numeric: true });
    return comparison * direction;
  });
}

/**
 * The Rooms tab of the Landscapes page: the public Rooms, loaded each time
 * the tab is opened and on Refresh. Joining one opens its Landscape.
 */
export default function RoomSelection({ openRoomLandscape }: { openRoomLandscape: (landscapeToken: string) => void }) {
  const [listing, setListing] = useState<Listing>({ status: 'loading' });
  const [joinTarget, setJoinTarget] = useState<RoomListing | undefined>();
  // Until a column is chosen, the rooms keep the service's order (oldest first).
  const [sorting, setSorting] = useState<Sorting | undefined>();
  const joinedRoom = useRoomConnectionStore((state) => state.room);
  const connecting = useRoomConnectionStore((state) => state.connecting);
  const loginName = useAuthStore((state) => state.user?.name);
  // With login on, the name comes from the login and there is nothing to ask.
  const typesName = isLoginSkipped();
  const loads = useRef(0);

  const load = useCallback(async () => {
    const load = ++loads.current;
    setListing({ status: 'loading' });
    let next: Listing;
    if (!(await isCollaborationServiceReachable())) {
      next = { status: 'unreachable' };
    } else {
      try {
        next = { status: 'loaded', rooms: await listRooms() };
      } catch {
        next = { status: 'failed' };
      }
    }
    // Only the latest load is shown, and none after the tab was closed.
    if (load === loads.current) setListing(next);
  }, []);

  useEffect(() => {
    void load();
    return () => {
      loads.current++;
    };
  }, [load]);

  const enter = async (room: RoomListing, name: string) => {
    setJoinTarget(undefined);
    const landscapeToken = await enterListedRoom(room.roomCode, name);
    if (landscapeToken === undefined) return;
    if (landscapeToken) {
      openRoomLandscape(landscapeToken);
    } else {
      useToastHandlerStore
        .getState()
        .showInfoToastMessage('You joined the room, but it has no Landscape open yet.', 'Collaboration');
    }
  };

  /** A click on a column header sorts by it; another click on the same header reverses the order. */
  const sortBy = (column: number) =>
    setSorting((current) =>
      current?.column === column
        ? { column, order: current.order === 'asc' ? 'desc' : 'asc' }
        : { column, order: 'asc' }
    );

  const join = (room: RoomListing) => {
    const leavesAnotherRoom = joinedRoom !== undefined && joinedRoom.roomId !== room.roomCode;
    if (typesName || leavesAnotherRoom) setJoinTarget(room);
    else void enter(room, loginName ?? '');
  };

  return (
    <section aria-label="Rooms">
      <div className="d-flex justify-content-end mb-2">
        <Button size="sm" variant="outline-secondary" disabled={listing.status === 'loading'} onClick={load}>
          {listing.status === 'loading' ? 'Loading…' : 'Refresh'}
        </Button>
      </div>
      {listing.status === 'unreachable' && (
        <p className="text-muted text-center">
          Collaboration is currently disabled because the collaboration service is not reachable.
        </p>
      )}
      {listing.status === 'failed' && (
        <p role="alert" className="text-danger text-center">
          Could not load the rooms. Please try again.
        </p>
      )}
      {listing.status === 'loaded' && (
        <div className="table-responsive">
          <table className="table table-striped explorviz-table" id="room-selection-table">
            <thead>
              <tr>
                {COLUMNS.map(({ label }, column) => (
                  <th
                    key={label}
                    scope="col"
                    style={{ cursor: 'ns-resize' }}
                    tabIndex={0}
                    title={`Sort by ${label.toLowerCase()}`}
                    aria-sort={
                      sorting?.column === column ? (sorting.order === 'asc' ? 'ascending' : 'descending') : 'none'
                    }
                    onClick={() => sortBy(column)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        sortBy(column);
                      }
                    }}
                  >
                    {label}
                  </th>
                ))}
                {/* On narrow screens the Join button is left out; clicking the row joins. */}
                <th scope="col" className="d-none d-md-table-cell">
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {listing.rooms.length > 0 ? (
                (sorting ? sortRooms(listing.rooms, sorting) : listing.rooms).map((room) => (
                  <tr
                    key={room.roomCode}
                    className="token-selection-row"
                    tabIndex={0}
                    aria-label={joinLabel(room)}
                    onClick={(event) => {
                      // The Join button handles its own clicks.
                      if (!connecting && !(event.target as Element).closest('button')) join(room);
                    }}
                    onKeyDown={(event) => {
                      if (event.target !== event.currentTarget || connecting) return;
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        join(room);
                      }
                    }}
                  >
                    <td>{roomTitle(room)}</td>
                    <td>{room.hostName}</td>
                    <td>{landscapeTitle(room)}</td>
                    <td>{room.users}</td>
                    <td className="d-none d-md-table-cell text-end">
                      <Button size="sm" disabled={connecting} aria-label={joinLabel(room)} onClick={() => join(room)}>
                        {joinedRoom?.roomId === room.roomCode ? 'Open' : 'Join'}
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="text-center">
                    No public rooms.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {joinTarget && (
        <JoinDialog
          room={joinTarget}
          typesName={typesName}
          leavesRoom={joinedRoom && joinedRoom.roomId !== joinTarget.roomCode ? joinedRoom.roomId : undefined}
          onCancel={() => setJoinTarget(undefined)}
          onJoin={(name) => {
            if (typesName) rememberDisplayName(name);
            void enter(joinTarget, typesName ? name : (loginName ?? ''));
          }}
        />
      )}
    </section>
  );
}

/** Asks for the display name (login off) and confirms leaving another Room, before joining. */
function JoinDialog({
  room,
  typesName,
  leavesRoom,
  onCancel,
  onJoin,
}: {
  room: RoomListing;
  typesName: boolean;
  /** The code of the joined Room that joining leaves, if any. */
  leavesRoom: string | undefined;
  onCancel: () => void;
  onJoin: (name: string) => void;
}) {
  const [displayName, setDisplayName] = useState(readDisplayName);
  const submit = () => onJoin(displayName.trim());

  return (
    <Modal show onHide={onCancel} centered aria-labelledby="join-room-title">
      <Form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <Modal.Header closeButton>
          <Modal.Title id="join-room-title">Join {roomTitle(room)}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {leavesRoom && (
            <p>
              You are in room <span className="font-monospace">{leavesRoom}</span>. Joining this room leaves it.
            </p>
          )}
          {typesName && (
            <Form.Group controlId="join-room-display-name">
              <Form.Label>User display name</Form.Label>
              <Form.Control
                autoFocus
                maxLength={MAX_DISPLAY_NAME_LENGTH}
                placeholder="Optional — Anonymous if empty"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
              />
            </Form.Group>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">{leavesRoom ? 'Leave and join' : 'Join'}</Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
