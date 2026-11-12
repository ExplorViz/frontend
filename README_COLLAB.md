# Collaboration Functionality

Collaboration is being rebuilt on the self-hosted, Colyseus-based collaboration service (repository `collaboration-service`). The previous implementation, which used the hosted Playroomkit service, has been removed.

The Collaboration section of the sidebar checks whether the service is reachable. If it is, a person can create a Room, which gets a six-character room code from the service, or join one with its code; inside, the section shows the code and the Participants with their colors, marks the Host, and offers to leave. The Host can kick another Participant (who is told so and may rejoin with the code) or hand the Host right to them; when the Host leaves, the right passes to whoever has been in the Room longest. With login off, the person types a display name, which the browser remembers. With login on, the name comes from the login and the access token (refreshed first if it is about to expire) is sent when creating or joining; the service checks it only then. Each Participant can change their own color with the color picker next to their name. If the service is not reachable, the section says that collaboration is currently disabled. Exploring alone works either way.

Inside a Room the section also shows the chat. Its history is Room state, so people who join late see the earlier entries (the service keeps the last 200). The Host can mute and unmute a Participant; the service refuses a muted Participant's messages and the frontend says so. A message can be deleted for everyone by its author or the Host. After leaving, the history stays visible as the person's own copy until they clear it; joining a Room drops it.

Shared so far: closed and hidden Districts. Joining always asks first, because it drops the person's own exploration (Districts, highlights, annotations, open popups); the notice offers to go back, to take a Snapshot first, or to drop it and join. Creating a Room hands the creator's Districts to the Room. After leaving, the person carries on with what they saw in the Room.

## Code

- `src/utils/collaboration/room-connection.ts`: `useRoomConnectionStore` holds the joined SDK `Room` (`room`, `connecting`, `createRoom`, `joinRoom`, `leaveRoom`) and shows refusals as toasts. `useRoomState()` reads the Room's state as an immutable snapshot (via `@colyseus/react`); the state is never copied into a store.
- `src/components/collaboration/.../collaboration/collaboration-controls.tsx`: the Collaboration section.
- `src/utils/collaboration/chat.ts`: the chat module. `useChat()` gives the history (the Room's, or the own copy after leaving) and the actions; `setParticipantMuted` is the Host's mute. The UI is `components/visualization/page-setup/sidebar/customizationbar/chat/chat-box.tsx`.
- `src/utils/collaboration/districts.ts`: the collaboration module for Districts (see below).
- `src/utils/collaboration/capabilities.ts`: loads every capability's module so its hand-over is registered; `local-exploration.ts` drops the capabilities that have no module yet on joining.
- `tests/fake-collaboration-service.ts`: a stand-in for the service at the `@colyseus/sdk` boundary, with real state encoding, for tests of anything that reads or changes Room state.

## One collaboration module per capability

Every piece of exploration state has one home: the person's own state in the browser, or the Room's state on the service. Nothing is mirrored (`docs/adr/0003-shared-state-has-one-home.md`). Each capability has one module under `src/utils/collaboration/` that hides which home is used; the rest of the frontend neither imports Colyseus nor asks whether a Room is joined. A module offers:

- **What to show**: a hook for rendering (e.g. `useDistricts(select)`) and a getter for code outside rendering (e.g. `getDistricts()`). Alone they read the own state (a zustand store only the module touches); in a Room they read the Room's state directly (`useRoomStatePart(key)` / `room.state`).
- **The user did this**: one function taking one user action (e.g. `changeDistricts(actions)`). Alone it changes the own state. In a Room it sends one message and changes nothing locally; the view follows the service's patch.
- **Hand-overs**: `registerHandOver({ startingState, enter, leave })` from `room-connection.ts`. `startingState()` adds the module's part of the creator's state to the create options; `enter(room, 'created' | 'joined')` drops the own state; `leave(lastState)` makes the Room's last state the own state before the Room stops being shown. Register it at the module's top level and import the module from `capabilities.ts`.

The rules of a capability's actions live in the contract when the browser needs them too (`applyDistrictActions` runs alone in the browser and in the Room in the service).

## Reaching the service

The browser reaches the service under `/collaboration/` on the frontend's own host, and the prefix is stripped before the request reaches the service. In development the Vite dev server does this (`vite.config.js`) and forwards to `http://localhost:2567`, or to `COLLAB_SERV_URL` / `VITE_COLLAB_SERV_URL` if set. Start the service with `npm start` in `collaboration-service`.

In the Docker image, nginx (`default.conf.template`) does the same. It forwards `/collaboration/` to `COLLAB_SERV_URL` (default `http://collaboration-service:2567`), including WebSocket upgrades, with a one-hour read timeout. The service's `/metrics` endpoint is not forwarded; Prometheus scrapes it inside the container network. The `deployment` repository runs the service next to the frontend.

## Room contract

The room contract (state definition, message types and contract version) lives in `collaboration-service` under `src/contract/`. The frontend uses a generated copy, `src/utils/collaboration/room-contract.generated.ts`, which is committed here. Do not edit it by hand. After a contract change, regenerate it from a `collaboration-service` checkout next to this one and commit the result:

```
cd ../collaboration-service
npm run contract:generate             # or: npm run contract:generate -- <path to this file>
```
