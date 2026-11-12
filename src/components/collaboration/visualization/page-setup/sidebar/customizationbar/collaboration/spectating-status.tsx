import { DeviceCameraVideoIcon } from '@primer/octicons-react';
import type { Participant } from 'explorviz-frontend/src/utils/collaboration/room-contract.generated';
import { spectate, stopSpectating, useSpectating } from 'explorviz-frontend/src/utils/collaboration/spectating';
import Button from 'react-bootstrap/Button';

/** Whom a Participant spectates and whether they are in an immersive view, as small notes in their row. */
export function SpectatingStatus({
  participant,
  participants,
}: {
  participant: Participant;
  participants: Record<string, Participant>;
}) {
  const spectated = participant.spectating ? participants[participant.spectating] : undefined;
  return (
    <>
      {spectated && <span className="small text-muted">spectating {spectated.name}</span>}
      {participant.immersiveEntityId && <span className="small text-muted">in immersive view</span>}
    </>
  );
}

/** Starts or stops following this Participant's camera. */
export function SpectateButton({ sessionId, name }: { sessionId: string; name: string }) {
  const { target } = useSpectating();
  const following = target === sessionId;
  const label = following ? `Stop spectating ${name}` : `Spectate ${name}`;
  return (
    <Button
      size="sm"
      className="py-0"
      variant={following ? 'danger' : 'outline-success'}
      title={label}
      aria-label={label}
      onClick={() => (following ? stopSpectating() : spectate(sessionId))}
    >
      <DeviceCameraVideoIcon size="small" />
    </Button>
  );
}
