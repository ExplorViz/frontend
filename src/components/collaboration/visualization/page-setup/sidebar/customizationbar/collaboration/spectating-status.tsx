import { DeviceCameraVideoIcon } from '@primer/octicons-react';
import type { Participant } from 'explorviz-frontend/src/utils/collaboration/room-contract.generated';
import { spectate, stopSpectating, useSpectating } from 'explorviz-frontend/src/utils/collaboration/spectating';

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
      {spectated && <span>spectating {spectated.name}</span>}
      {participant.immersiveEntityId && <span>in immersive view</span>}
    </>
  );
}

/** Starts or stops following this Participant's camera. */
export function SpectateButton({ sessionId, name }: { sessionId: string; name: string }) {
  const { target } = useSpectating();
  const following = target === sessionId;
  const label = following ? `Stop spectating ${name}` : `Spectate ${name}`;
  return (
    <button
      type="button"
      className={`collab-icon-button${following ? ' active' : ''}`}
      title={label}
      aria-label={label}
      aria-pressed={following}
      onClick={() => (following ? stopSpectating() : spectate(sessionId))}
    >
      <DeviceCameraVideoIcon size={14} />
    </button>
  );
}
