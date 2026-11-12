import { isCollaborationServiceReachable } from 'explorviz-frontend/src/utils/collaboration/collaboration-service';
import { useEffect, useState } from 'react';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';

type Reachability = 'checking' | 'reachable' | 'unreachable';

// The Collaboration section of the sidebar.
export default function CollaborationControls() {
  const [reachability, setReachability] = useState<Reachability>('checking');

  useEffect(() => {
    let active = true;
    isCollaborationServiceReachable().then((reachable) => {
      if (active) setReachability(reachable ? 'reachable' : 'unreachable');
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="collaboration-controls">
      <h6 className="bold mb-3">Collaboration</h6>
      {reachability === 'checking' && <p className="small text-muted mb-0">Looking for the collaboration service…</p>}
      {reachability === 'unreachable' && (
        <p className="small text-muted mb-0">
          Collaboration is currently disabled because the collaboration service is not reachable.
        </p>
      )}
      {reachability === 'reachable' && <RoomEntryForm />}
    </div>
  );
}

// Not functional yet: creating and joining a Room come with the next ticket.
function RoomEntryForm() {
  const [roomCode, setRoomCode] = useState('');

  return (
    <Form onSubmit={(event) => event.preventDefault()}>
      <Button variant="success" className="w-100 mb-3" disabled>
        Create room
      </Button>
      <Form.Group controlId="collaboration-room-code" className="d-flex gap-2">
        <Form.Label visuallyHidden>Room code</Form.Label>
        <Form.Control
          size="sm"
          placeholder="Room code"
          value={roomCode}
          onChange={(event) => setRoomCode(event.target.value)}
        />
        <Button type="submit" size="sm" variant="outline-primary" disabled>
          Join
        </Button>
      </Form.Group>
    </Form>
  );
}
