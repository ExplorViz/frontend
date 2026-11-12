# ExplorViz Frontend

Visualizes analyzed software systems as 3D code cities, combining static code analysis with runtime telemetry.

## Language

### Landscapes

**Landscape**:
An analyzed software system that a user creates, names, shares and explores.
_Avoid_: Landscape Token (as a name for the whole Landscape)

**Landscape Token**:
The identifier that Data Sources use to send data to a Landscape.

**Landscape Secret**:
The credential that Data Sources present together with the Landscape Token to be allowed to send data to a Landscape. Viewing a Landscape is governed by sharing, not by the Secret.

**Data Source**:
Anything that sends analysis data to a Landscape, identified by the Landscape Token, such as instrumented software (runtime analysis) or the code analyzer (static analysis).
_Avoid_: Collector, Exporter (as synonyms; they only pass data on)

**Snapshot**:
A saved state of a Landscape exploration (the selected data, camera position and exploration state, such as closed Districts, highlights and annotations) that can be reopened and shared.
_Avoid_: Snapshot Token

**Git Host Token**:
A user's credential for an external Git host, stored in ExplorViz.
_Avoid_: API Token, User API Token

### Collaboration

**Room**:
A shared exploration of one Landscape that people join with a room code.
_Avoid_: Lobby, Session

**Participant**:
A person in a Room.
_Avoid_: Player, User (a user who is not in a Room is not a Participant)

**Host**:
The Participant who may switch the Room's Landscape and District sharing, mute and kick other Participants, and hand the Host right over.

**Spectating**:
Following another Participant's camera.

### Time

**Timestamp**:
A fixed point in time on a Landscape's runtime timeline, placed at a regular interval (e.g. every 10 seconds); each Timestamp starts the Time Window that lasts until the next one.

**Time Window**:
A stretch of time with a start and an end, such as the interval between two Timestamps or the duration of a trace or span. A trace belongs to the Time Window between two Timestamps in which it starts.
_Avoid_: Timestamp (for anything that has a duration)

**Commit**:
A version of an analyzed repository's code. A Landscape's runtime data belongs to at most one Commit per repository, and usually is not attributed to any.

### City metaphor

**City**:
The top-level unit of the analyzed system, such as a service or a repository, depending on what the analysis produced.
_Avoid_: Application, Foundation, Service and Repository (as synonyms; each is one kind of City); Node (a legacy term for hosts, which are not part of the model)

**Building**:
A leaf element of the analyzed system, such as a source file, an HTTP endpoint or a database table; its type states which.
_Avoid_: Class, Clazz, File (as a synonym; a file is one kind of Building)

**District**:
A grouping of Buildings and nested Districts within a City, such as a package, a directory or an endpoint path segment, depending on what the analysis grouped by.
_Avoid_: Package, Component (as synonyms; a package is one kind of District)
