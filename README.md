# ExplorViz

ExplorViz is a software visualization as a service approach that researches how to facilitate program comprehension via collaboration, device-heterogenity, and different integration concepts.

Our [website](https://explorviz.uni-kiel.de) contains additional information such as a quickstart guide and a demo.

## About this repository

This repository contains the **ExplorViz frontend** component.
Follow the [Getting started](https://explorviz.dev/2-getting-started/) segment on our website to deploy ExplorViz or the [development](#development) paragraph below to get started with frontend development.

## Development

Development instructions can be found in the [.dev/README](.dev/README.md) file.

## Container deployment

Build the production assets with `pnpm install --frozen-lockfile` and
`pnpm build`, then run `docker build -t explorviz/frontend:latest .`. The same
image can be deployed on any hostname. Production browser API URLs are relative
to the current origin; nginx connects to the backend using Docker DNS names.
The production environment explicitly clears development URLs so `.env` cannot
embed localhost backend addresses in the bundle.

Use the Compose stack in the deployment repository for the complete application.
For a custom container network, override the nginx upstream variables
`CODE_ANALYZER_URL`, `LANDSCAPE_SERV_URL`, `TRACE_SERV_URL`, `METRICS_SERV_URL`,
`LOG_SERV_URL`, `USER_SERV_URL`, `VSCODE_SERV_URL`, `COPILOT_SERV_URL`, and
`KEYCLOAK_URL` only if their internal addresses differ from the Dockerfile
defaults. Use an origin such as `http://user-service:8080`, without a trailing
slash or path. Optional services do not have to be running for nginx to start.
`RESOLVER` defaults to the first nameserver in the container's `/etc/resolv.conf`.

Set `KEYCLOAK_AUTH_ENABLED=true` to enable login at container startup; it defaults
to `false` to match the deployment stack. The entrypoint writes this setting to
`/runtime-config.js`, which loads before the application bundle. Vite development
continues to use `VITE_ENABLE_SKIP_LOGIN` from `.env`. Authentication uses the
current browser origin unless a Keycloak URL was explicitly supplied at build
time. Configure Keycloak's public hostname and redirect URIs for your server.

For HTTPS, put a TLS reverse proxy in front of nginx, preserve `Host` and
`X-Forwarded-Proto`, and enable WebSocket upgrades and SSE streaming. The site
must be served at `/`. Share links use the current browser origin automatically.
Backend CORS filtering should be disabled in a same-origin deployment, or
configured separately if clients call backend ports directly.

## Citation

Publications can be found [on our website](https://explorviz.dev/4-publications/).

To cite ExplorViz please use:

- Wilhelm Hasselbring, Alexander Krause, Christian Zirkelbach, (2020): ExplorViz: Research on software visualization, comprehension and collaboration. Software Impacts, Volume 6. DOI https://doi.org/10.1016/j.simpa.2020.100034.
  [[BibTex]](https://oceanrep.geomar.de/cgi/export/eprint/50471/BibTeX/geomar-eprint-50471.bib) | [[Endnote]](https://oceanrep.geomar.de/cgi/export/eprint/50471/EndNote/geomar-eprint-50471.enw)

- Florian Fittkau, Alexander Krause, Wilhelm Hasselbring (2017): Software landscape and application visualization for system comprehension with ExplorViz. Information and Software Technology, Volume 87. pp. 259-277. DOI https://doi.org/10.1016/j.infsof.2016.07.004.
  [[BibTex]](https://oceanrep.geomar.de/cgi/export/eprint/33464/BibTeX/geomar-eprint-33464.bib) | [[Endnote]](https://oceanrep.geomar.de/cgi/export/eprint/33464/EndNote/geomar-eprint-33464.enw)

## Regression tests

Run `pnpm test` for the regression suite, `pnpm test:watch` while developing,
and `pnpm test:coverage` for the CI coverage gate.
