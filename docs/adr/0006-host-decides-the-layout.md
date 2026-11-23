# The Host decides the layout in a Room

In a Room every Participant sees each entity at the same place: the layout options (the settings that decide where Cities, Districts and Buildings are and how large their footprints are, `LAYOUT_SETTING_IDS`) and the stable layout's remembered places are Room state, and only the Host changes them. Everyone else's layout settings follow the Room's options and are locked in the settings; their own changes are taken back. With ELK, the same options and data give the same layout everywhere, so the options are enough. The stable layout depends on what was shown before (ADR 0005), so its places are shared as well: everyone but the Host lays out with the Room's places, and the Host sends the places its layout changed. Recompute Layout is the Host's.

This deviates from ADR 0003 in one respect: the Host lays out with its own places and its own layout settings and sends their changes to the Room, instead of requesting a change and waiting for the service. Both are computed by the Host alone, so nobody can overwrite them, and the stable layout places entities deterministically, so a Participant showing the same data computes the Host's places before they arrive. Waiting for the service would only delay the Host's own view.

## Considered Options

- **Share only the layout options**: enough for ELK, but someone joining a Room late would get a different stable layout, as they have not seen what the Host saw.
- **Let every Participant extend the Room's places**: Participants showing different Timestamps or Commits could place unseen entities, but two of them placing at once would collide, and the service would have to understand the layout to resolve it.

## Consequences

- Creating a Room makes the creator's layout options and places the Room's; joining drops the joiner's; leaving carries on with the Room's; a new Host carries on from the Room's places.
- A Landscape switch clears the Room's places, not its options.
- Participants who show another Timestamp or Commit than the Host see the shared entities at the Host's places; entities only they see are placed locally, consistently with the Room's places, until the Host lays them out.
- Large arrangements are sent in several messages (`layoutArrangementChunks`) to stay below the 64 KB message limit.
- Starting the evolution animation as a Participant who is not the Host cannot switch the Building layout, as it is a layout option.
