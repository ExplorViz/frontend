# Shared exploration state has one home, and the service decides

Exploration state (closed and hidden Districts, highlights, annotations, shared popups) lives either in the browser as a person's own state or in the collaboration service as the Room's state, never in both. In a Room, a user action is a request to the service, and the view changes only after the service has handled it. We chose this over mirroring local stores into the Room and over optimistic local updates, because the mirrored design it replaces needed one sync component per capability and let Participants overwrite each other.

## Considered Options

- **Mirror local stores into the Room** (the previous design): every capability existed twice and was kept in step by diffing.
- **Optimistic updates with rollback**: clicks feel instant, but each action needs conflict and rollback handling. It can still be added per action if waiting for the service feels sluggish.

## Consequences

- State changes home only by a one-time hand-over: creating a Room, joining, switching District sharing, and leaving.
- Joining a Room drops the joiner's local exploration state; leaving carries on from the Room's state.
- Components outside the collaboration modules do not know whether a Room is joined.
- In a Room, every shared action costs one round trip to the service before it is visible.
