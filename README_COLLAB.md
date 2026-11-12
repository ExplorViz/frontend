# Collaboration Functionality

Collaboration is being rebuilt on the self-hosted, Colyseus-based collaboration service (repository `collaboration-service`). The previous implementation, which used the hosted Playroomkit service, has been removed.

For now, the Collaboration section of the sidebar checks whether the service is reachable. If it is, the section shows the (not yet functional) form for creating and joining a Room; otherwise it says that collaboration is currently disabled because the service is not reachable. Exploring alone works either way.

## Reaching the service

The browser reaches the service under `/collaboration/` on the frontend's own host, and the prefix is stripped before the request reaches the service. In development the Vite dev server does this (`vite.config.js`) and forwards to `http://localhost:2567`, or to `COLLAB_SERV_URL` / `VITE_COLLAB_SERV_URL` if set. Start the service with `npm start` in `collaboration-service`.

In the Docker image, nginx (`default.conf.template`) does the same. It forwards `/collaboration/` to `COLLAB_SERV_URL` (default `http://collaboration-service:2567`), including WebSocket upgrades, with a one-hour read timeout. The service's `/metrics` endpoint is not forwarded; Prometheus scrapes it inside the container network. The `deployment` repository runs the service next to the frontend.

## Room contract

The room contract (state definition, message types and contract version) lives in `collaboration-service` under `src/contract/`. The frontend uses a generated copy, `src/utils/collaboration/room-contract.generated.ts`, which is committed here. Do not edit it by hand. After a contract change, regenerate it from a `collaboration-service` checkout next to this one and commit the result:

```
cd ../collaboration-service
npm run contract:generate             # or: npm run contract:generate -- <path to this file>
```
