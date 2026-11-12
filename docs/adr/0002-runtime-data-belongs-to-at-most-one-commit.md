# Runtime data belongs to at most one Commit per repository

We assume that a Landscape's runtime data belongs to at most one Commit per analyzed repository, and usually it is not attributed to any Commit at all. We chose this simplification over tracking which Commit was deployed at which point in time, since data sources rarely report the deployed version and per-deployment attribution would require that information for every Time Window.

## Consequences

- Runtime data recorded across a redeployment is still attributed to a single Commit (or none), so it may mix behavior of different code versions.
- Combining runtime data with code from a specific Commit is only meaningful when the runtime data was attributed to that Commit.
