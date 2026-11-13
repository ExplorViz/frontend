import { useLeaveForSnapshotStore } from 'explorviz-frontend/src/utils/collaboration/snapshots';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';

/** Asks whether to leave the Room when a Snapshot is opened in one (see `leaveRoomToOpenSnapshot`). */
export default function LeaveRoomForSnapshotNotice() {
  const answer = useLeaveForSnapshotStore((state) => state.answer);

  return (
    <Modal show={!!answer} onHide={() => answer?.(false)} aria-labelledby="leave-room-for-snapshot-title">
      <Modal.Header>
        <h4 className="modal-title" id="leave-room-for-snapshot-title">
          Open the Snapshot alone?
        </h4>
      </Modal.Header>
      <Modal.Body>
        A Snapshot is opened only for you, never in the room. To open it, you leave the room. To share a Snapshot, open
        it alone and then create a room: it starts from the Snapshot.
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={() => answer?.(false)}>
          Stay in the room
        </Button>
        <Button variant="primary" onClick={() => answer?.(true)}>
          Leave the room and open
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
