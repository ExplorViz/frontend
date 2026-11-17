# Screen Wall Tiles are assigned by display name

A Tile of a Screen Wall belongs to the Participant whose display name it carries, not to a session id or a device id. The Host can then configure a whole wall before its browsers join (e.g. Tiles "wall-1" … "wall-6"), save it as JSON with the names and restore it in a later Room, and a browser that reloads or reconnects takes its Tile back without any step of its own. We accept that names are assumed unique: if several Participants have a Tile's name, the one who joined first gets the Tile while it is free (a Tile stays with its holder while they keep the name), and the editor flags the duplicate.

## Considered Options

- **Session id**: unambiguous, but a reload rejoins as a new session and loses the Tile, and a wall cannot be configured before its browsers join.
- **Stable device id** (kept in the browser, sent when joining; what the earlier `?deviceId=` implementations did): survives reloads, but the Host has to learn each browser's id, and it needs a new join option.

## Consequences

- Renaming oneself to the name of a free Tile claims it; with login on, the name comes from the login.
- Two browsers logged in with the same account cannot both be Tiles unless login is off.
