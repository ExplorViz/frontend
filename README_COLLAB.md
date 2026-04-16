# Collaboration Functionality

## Technology Used

To implement the collaboration services, the library [Playroomkit](https://joinplayroom.com/) is used. 
Playroomkit was originally designed for browser-based multiplayer games. The main functionalities it provides are a lobby creation system, individual player states, a global state, and RPCs (Remote Procedure Calls). It does not require a dedicated backend server and works out of the box, operating entirely as a SaaS. 
Currently, we use Playroomkit without an account. This disables certain functionalities, such as a global lobby list and persistent player profiles.

## Implemented Collaboration Functionalities

### Login and Session Handling

#### How to use

When in the visualization of a landscape, click the settings icon > collaboration > Connect/Create Room. You can then decide whether you want to create a new room or join an existing one using a room code. The room code is visible to everyone inside the room under the settings > collaboration tab (and can be copied and sent to new users).

#### Implementation

This functionality is mainly implemented in the files `src/components/collaboration/visualization/rendering/playroom-wrapper.tsx` and `src/stores/collaboration/playroom-connection-store.tsx`. These components manage the popup screen for choosing between creating or entering a room. When one of those buttons is clicked, the `insertCoin()` function is called. This function opens the lobby and creates or connects to the room.

### Kick

#### How to Use

The admin can kick users from the room using a button (only visible to the admin) located in the members list under the settings > collaboration tab.

#### Implementation

This functionality is implemented in the files `src/components/collaboration/visualization/page-setup/sidebar/customizationbar/collaboration/collaboration-controls.tsx` and `src/components/collaboration/collaboration-kick-RPC.tsx`. When the admin wants to kick a user, the target user is informed via an RPC call. The application of the kicked user then automatically disconnects from the room. Note that this is not a server-enforced kick and can be bypassed ("hacked") by a modified client.

### Spectating

#### How to Use

A user can follow the camera of another user (spectate) by clicking the camera icon next to that user in the settings > collab tab.

#### Implementation

The implementation can be found in the following files: 
* `src/components/collaboration/visualization/page-setup/sidebar/customizationbar/collaboration/collaboration-controls.tsx`
* `src/components/collaboration/sync/spectate-status-sync.tsx`
* `src/components/visualization/rendering/collaboration-camera-sync.tsx`
* `src/components/visualization/rendering/spectate-camera-controller.tsx`
* `src/stores/collaboration/spectate-status-store.ts`
* `src/stores/collaboration/spectate-user.ts`

When User A wants to spectate User B, the following happens: User A updates its player state to indicate the intention to spectate User B. Since User B observes all player states, it notices this request and starts pushing its camera data (position, target, matrix, etc.) to its own player state. User A can then read this information from User B's player state and overwrite its local camera configuration with B's data.

### Immersive View Indicators

#### How to Use

Whenever a user in a collaboration room enters the immersive view mode, every other user sees a small sphere in that player's color above the corresponding building.

#### Implementation

This feature is implemented in the files `src/components/collaboration/sync/immersive-state-sync.ts` and `src/components/visualization/rendering/remote-immersive-indicators.tsx`. Whenever a player enters the immersive view mode, the building ID of the specified building is uploaded to their player state. Since all users observe the player states of everyone else, this action is detected. Upon noticing another player entering immersive view, the clients render the corresponding colored sphere.

### Chat (with mute function)

#### How to Use

For communication between users in a room, there is a chat in the settings > collaboration tab where each player can send messages. Additionally, the admin is able to mute users via a button in the users list.

#### Implementation

This functionality is implemented in the files `src/components/visualization/page-setup/sidebar/customizationbar/chat/chat-box.tsx`,