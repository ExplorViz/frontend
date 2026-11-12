# Collaboration

People explore a Landscape together in a **Room**. A Room lives in the self-hosted collaboration service (repository `collaboration-service`, built on Colyseus). The browser talks only to that service, under `/collaboration/` on the frontend's own host; no third-party service is involved.

The terms used here are defined in `GLOSSARY.md`: Room, room code, Participant, Host, District sharing, Spectating.

## Design

**Shared state has one home** (`docs/adr/0003-shared-state-has-one-home.md`). Each piece of exploration state is either the person's own state in the browser or the Room's state in the service, never both. In a Room, a user action is a message to the service; the view changes when the service's state patch arrives. The service checks every action (who may do it, whether the payload is valid). Nothing is mirrored between local stores and the Room.

**Hand-overs** are the only moments when state changes home:

- Creating a Room hands the creator's exploration to the Room (Landscape, closed and hidden Districts, highlights, annotations). Their popups stay their own until they share them.
- Joining drops the joiner's exploration, so the join notice always asks first: go back, take a Snapshot first, or drop the exploration and join.
- Leaving, for any reason (button, kick, lost connection), makes the Room's last state the person's own; they carry on alone from what they last saw.
- Switching District sharing off or on (see below).

**The Room contract** (state schema, message types, join options and refusal codes, contract version) lives in `collaboration-service/src/contract/`. The frontend uses the generated copy `src/utils/collaboration/room-contract.generated.ts` (see "Room contract" below). Rules that the browser needs too, such as how District and highlight actions apply, are contract functions that run in both places.

## What a Room offers

**Entering.** The Collaboration section of the settings sidebar checks that the service is reachable (`/collaboration/__healthcheck`); if not, it says collaboration is disabled, and exploring alone works as before. A person creates a Room, which gets a six-character room code, or joins one with its code. With login off they type a display name, which the browser remembers; with login on the name comes from the login, and the service checks the access token when creating or joining. Each Participant has a color, which they can change with the color picker next to their name. A Room holds at most 16 Participants (service setting `MAX_PARTICIPANTS`).

**Host rights.** The creator is the Host. The Host can switch the Room's Landscape and District sharing, mute and unmute, kick (the kicked Participant is told so and may rejoin with the code), and hand the Host right to another Participant. When the Host leaves for good, the right passes to whoever has been in the Room longest.

**Landscape.** A Room is on one Landscape. When the Host opens another Landscape, the Room switches and everyone loads it; anyone else who opens another Landscape is told that only the Host can switch it and is taken back. A switch clears everything tied to the old Landscape (Districts, highlights, annotations, shared popups); Participants, chat and District sharing stay.

**Districts.** Opening, closing, hiding and showing Districts acts on the Room. The Host can switch District sharing off ("Share Districts", on by default, shown to everyone). Switching off hands the Room's Districts to everyone as their own, so no view changes, and from then on everyone opens and closes Districts for themselves. Switching on makes the Host's own Districts the Room's. Someone who joins while sharing is off starts with all Districts open.

**Highlights** are shown in the color of the Participant who made them. An entity has one highlighter at a time: highlighting someone else's highlight takes it over, clicking your own removes it, and "Clear Highlighting" removes only your own. A Participant's highlights go when they leave the Room.

**Annotations** are all shared. Anyone may add, edit or remove one; each records its creator and last editor. Where an annotation is shown (position, minimized, edit mode) stays with each person.

**Popups** stay one's own until shared with the share button (shown only in a Room; sharing also pins it). A shared popup is open for everyone and shows who shared it; each person keeps their own position and loaded details. Anyone can close a shared popup, which closes it for everyone.

**Chat.** The history is Room state, so latecomers see earlier entries (the service keeps the last 200). The Host can mute a Participant; the service refuses a muted Participant's messages. The author or the Host can delete a message. After leaving, the history stays as the person's own copy until cleared.

**Pings and events.** A ping goes to the other Participants, who see it in the pinger's color; pings are not stored. The service writes a chat event for every ping and for every new highlight. A ping event can be replayed, a highlight event offers "Look At".

**Spectating.** A Participant can follow another's camera. The followed person's browser sends its camera only while somebody spectates it (at most 30 times a second, only when it changed). The Participants list shows who spectates whom.

**Immersive view.** Others see a marker in your color on the entity you view immersively, and the Participants list says who is in immersive view.

**Snapshots** work alongside Rooms but are never loaded into one. Saving a Snapshot in a Room saves what the person sees. "Take a Snapshot first" in the join notice saves the current exploration and then joins (nobody joins if saving fails). Opening a Snapshot in a Room asks to leave the Room first. To share a Snapshot, open it alone and create a Room: the Room starts from it.

**Reconnecting.** A short network drop does not end the Room. The service holds the seat for 60 seconds (`RECONNECTION_SECONDS`) and the SDK reconnects with the same identity. Meanwhile the section and a navbar icon say "Reconnecting…", the last seen state stays on screen, and shared actions are ignored rather than sent later. If reconnecting fails, the hold expires or the service restarts, it counts as leaving and the person is told the connection to the Room was lost. A kicked Participant is not reconnected.

**Not shared** (each person's own): camera (except while spectating), annotation and popup positions, the selected Timestamp and Commits, heatmap, visualization settings, VR avatars and controllers.

## Code

All paths are relative to `src/`.

- `utils/collaboration/room-connection.ts`: `useRoomConnectionStore` holds the joined SDK `Room` (`room`, `connecting`, `reconnecting`, `createRoom`, `joinRoom`, `leaveRoom`, `kick`, `handOverHost`) and shows refusals and leave notices as toasts. `useRoomState()` and `useRoomStatePart(key)` read the Room's state as immutable snapshots (via `@colyseus/react`); both are undefined while alone and until the Room's first state has arrived. `registerHandOver` is where capability modules plug in.
- `utils/collaboration/collaboration-service.ts`: the `/collaboration` path and the reachability check.
- `utils/collaboration/capabilities.ts`: imports every capability module, so all hand-overs are registered before anyone can create or join.
- Capability modules in `utils/collaboration/`: `districts.ts`, `highlights.ts`, `annotations.ts`, `popups.ts`, `landscape.ts`, `chat.ts`, `pings.ts`, `spectating.ts`, `immersive-view-sharing.ts`, `snapshots.ts`. Existing entry points keep their names and call these modules, for example `utils/city-rendering/entity-manipulation.ts` (Districts), `utils/city-rendering/highlighting.ts` (highlights) and `view-objects/3d/city/ping-animation.ts` (pings).
- `components/collaboration/visualization/page-setup/sidebar/customizationbar/collaboration/collaboration-controls.tsx`: the Collaboration section (entry form, join notice, Room panel); `spectating-status.tsx` next to it.
- `components/visualization/page-setup/sidebar/customizationbar/chat/chat-box.tsx`: the chat.
- `components/visualization/rendering/spectate-camera-controller.tsx` and `remote-immersive-indicators.tsx`: mounted in the Canvas (`canvas-wrapper.tsx`).
- `components/collaboration/leave-room-for-snapshot-notice.tsx`: the question before opening a Snapshot in a Room (mounted in `pages/application.tsx`).
- `components/page-setup/status-icons.tsx`: the navbar's reconnecting and spectating icons.

### One collaboration module per capability

Each capability has one module that hides which home its state has; the rest of the frontend neither imports Colyseus nor asks whether a Room is joined. A module offers:

- **What to show**: a hook for rendering (e.g. `useDistricts(select)`) and a getter for code outside rendering (e.g. `getDistricts()`). Alone they read the own state (a store only the module writes); in a Room they read the Room's state.
- **The user did this**: one function per user action (e.g. `changeDistricts(actions)`). Alone it changes the own state. In a Room it sends one message and changes nothing locally. Nothing is sent for an action that would not change the Room's state.
- **Hand-overs**: `registerHandOver({ startingState, enter, leave })` at the module's top level. `startingState()` adds the module's part to the create options, `enter(room, 'created' | 'joined')` drops the own state, and `leave(lastState)` makes the Room's last state the own state. Import the module from `capabilities.ts`.

Message types without a handler in the service get the sender disconnected, so every message the frontend sends needs a handler there.

## Tests

`tests/fake-collaboration-service.ts` stands in for the service at the `@colyseus/sdk` boundary, with real state encoding and decoding (through the service's reflection, as the SDK does). Install it with

```ts
vi.mock('@colyseus/sdk', async () => (await import('./fake-collaboration-service')).fakeColyseusSdk());
```

and reset `fakeCollaborationService` before each test. Its state schema mirrors the service's `src/contract/state.ts`; change both together. The rules of a Room (who may do what, limits) are tested in the service. The collaboration tests are the `tests/*collaboration*`, `chat`, `host-rights`, `reconnecting`, `spectat*`, `immersive-indicators`, `snapshots-and-rooms` and `room-state-before-first-state` files.

## Running it

**Development.** Start the service with `KEYCLOAK_AUTH_ENABLED=false npm start` in `collaboration-service` (port 2567). The Vite dev server forwards `/collaboration/` to `http://localhost:2567` (or to `COLLAB_SERV_URL` / `VITE_COLLAB_SERV_URL`), including WebSockets, and strips the prefix.

**Docker.** nginx in the frontend image (`default.conf.template`) forwards `/collaboration/` to `COLLAB_SERV_URL` (default `http://collaboration-service:2567`), with WebSocket upgrades and a one-hour read timeout. It does not forward `/collaboration/metrics`; Prometheus scrapes the service's `/metrics` inside the container network. The `deployment` repository runs the service (`explorviz/collaboration-service`) next to the frontend and passes it the Keycloak settings.

**Login.** With `KEYCLOAK_AUTH_ENABLED=true`, the service checks access tokens against `KEYCLOAK_JWKS_URL` and requires the issuer `KEYCLOAK_ISSUER`. The issuer is the Keycloak address the browser uses (in the compose setup `http://localhost:5657/realms/explorviz`).

## Room contract

Do not edit `src/utils/collaboration/room-contract.generated.ts` by hand. After a contract change, regenerate it from a `collaboration-service` checkout next to this one and commit the result:

```
cd ../collaboration-service
npm run contract:generate             # or: npm run contract:generate -- <path to this file>
```
