# The stable layout remembers places instead of recomputing them

Besides ELK, which recomputes the whole layout for every change of the Landscape, the frontend offers a stable layout (`layoutEngine: maxrects`) built on maxrects-packer. Every container (the Landscape, a City or a District) remembers where it put each child. When the Landscape changes (another Timestamp or Commit), children keep their place, new children are put into free space, and children that are gone keep their place reserved. A child that outgrew its place grows where it is; if a sibling is in the way, a strip of room is inserted next to it, shifting the siblings beyond the strip but keeping every child next to its neighbours. An earlier version moved an outgrown child to free space instead; under steady growth across Commits this moved Cities in almost every step and left holes, so the landscape grew to several times the size of a fresh layout. The remembered places are dropped, and everything is packed afresh, only when the user asks for it (Recompute Layout in the settings or the background context menu), when a setting that changes sizes or spacing changes, or when the visualization session is reset. We chose this over a stable layout that is a pure function of the shown data (e.g. packing in a fixed order), because such a layout still shifts its neighbours whenever an entity appears or disappears, and users lose their bearings.

## Considered Options

- **Pure function of the data, fixed packing order**: reproducible for everyone, but not stable across data changes.
- **Anchor to the data at the last recompute and place only the difference**: reproducible given the anchor, but entities that appeared later can still move when further entities appear.

## Consequences

- The layout depends on what was shown before, not only on what is shown now: containers only grow, and gaps remain until the layout is recomputed.
- Growth can still shift Cities, but never past each other: Cities that were next to or above each other stay so.
- In a Room the remembered places are the Room's, decided by the Host (see ADR 0006). Someone opening a Snapshot may still see a different layout of the same data than whoever took it, as the places are not part of a Snapshot.
- Filters do not change the remembered places: they are made from the Landscape before any filter, and a filtered Landscape is shown with the room of the filtered entities closed up (containers that lost children reflow the rest in their remembered order). Removing the filter shows the stable layout as before. Telling a filter from a data change relies on filters marking the copies they make (`markFilteredFrom`).
- Both layouters size Cities, Districts and Buildings with the same rules (`layout-dimensions.ts`), so switching engines changes positions, not sizes.
