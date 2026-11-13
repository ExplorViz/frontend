# City structure is defined by the analysis, not by the metaphor

Cities, Districts and Buildings are generic shapes, not fixed code concepts: a Building is whatever leaf element the analysis produced (a file, an HTTP endpoint, a database table), a District is whatever grouping it produced (a package, a directory, an endpoint path segment), and a City is whatever top-level unit it produced (a service, a repository). Each element's model type states what it represents. We chose this over fixed mappings (Building = Class, District = Package, City = Application, as in the legacy structure model) so that code analysis, runtime telemetry and non-code sources such as HTTP or database analysis can all be shown in a single city view.

## Consequences

- Two Landscapes of the same system are not guaranteed to have the same Cities, Districts or Buildings if they were produced by different analyses. Comparing them only makes sense within the same analysis.
- The legacy names (`Application`, `Package`, `Class`, `FoundationMesh`, `ComponentMesh`, `ClazzMesh`) each describe one kind of shape and are misleading as general terms.
- Hosts are not part of the model; the legacy `Node` level has no counterpart and the term should be avoided.
- A grouping of Cities into Regions may be added in the future.
