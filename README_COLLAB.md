# Collaboration Functionality

Collaboration is being rebuilt on the self-hosted, Colyseus-based collaboration service (repository `collaboration-service`). The previous implementation, which used the hosted Playroomkit service, has been removed.

The Collaboration section of the sidebar checks whether the service is reachable. If it is, a person can create a Room, which gets a six-character room code from the service, or join one with its code; inside, the section shows the code and the Participants with their colors, marks the Host, and offers to leave. With login off, the person types a display name, which the browser remembers. If the service is not reachable, the section says that collaboration is currently disabled. Exploring alone works either way.

Inside a Room the section also shows the chat. Its history is Room state, so people who join late see the earlier entries (the service keeps the last 200). The Host can mute and unmute a Participant; the service refuses a muted Participant's messages and the frontend says so. A message can be deleted for everyone by its author or the Host. After leaving, the history stays visible as the person's own copy until they clear it; joining a Room drops it.

## Code

- `src/utils/collaboration/room-connection.ts`: `useRoomConnectionStore` holds the joined SDK `Room` (`room`, `connecting`, `createRoom`, `joinRoom`, `leaveRoom`) and shows refusals as toasts. `useRoomState()` reads the Room's state as an immutable snapshot (via `@colyseus/react`); the state is never copied into a store.
- `src/components/collaboration/.../collaboration/collaboration-controls.tsx`: the Collaboration section.
- `src/utils/collaboration/chat.ts`: the chat module. `useChat()` gives the history (the Room's, or the own copy after leaving) and the actions; `setParticipantMuted` is the Host's mute. The UI is `components/visualization/page-setup/sidebar/customizationbar/chat/chat-box.tsx`.
- `tests/fake-collaboration-service.ts`: a stand-in for the service at the `@colyseus/sdk` boundary, with real state encoding, for tests of anything that reads or changes Room state.

## Reaching the service

The browser reaches the service under `/collaboration/` on the frontend's own host, and the prefix is stripped before the request reaches the service. In development the Vite dev server does this (`vite.config.js`) and forwards to `http://localhost:2567`, or to `COLLAB_SERV_URL` / `VITE_COLLAB_SERV_URL` if set. Start the service with `npm start` in `collaboration-service`.

## Room contract

The room contract (state definition, message types and contract version) lives in `collaboration-service` under `src/contract/`. The frontend uses a generated copy, `src/utils/collaboration/room-contract.generated.ts`, which is committed here. Do not edit it by hand. After a contract change, regenerate it from a `collaboration-service` checkout next to this one and commit the result:

```
cd ../collaboration-service
npm run contract:generate             # or: npm run contract:generate -- <path to this file>
```
