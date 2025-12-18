import { useAuthStore } from 'explorviz-frontend/src/stores/auth';
import { useIdeWebsocketFacadeStore } from 'explorviz-frontend/src/stores/ide-websocket-facade';
import { Socket, io } from 'socket.io-client';
import { create } from 'zustand';
import { LandscapeToken } from '../stores/landscape-token';

interface IdeWebsocketStore {
  socket?: Socket;
  setupSocketListeners: () => void;
  restartAndSetSocket: (landscapeToken?: string) => void;
  closeConnection: () => void;
  dispose: () => void;
}

export const useIdeWebsocketStore = create<IdeWebsocketStore>((set, get) => ({
  socket: undefined,
  isConnected: false,

  // ---------- internal helpers ----------
  setupSocketListeners: () => {
    const socket = get().socket;
    if (!socket) return;

    const userServiceUrl = import.meta.env.VITE_USER_SERV_URL;
    const accessToken = useAuthStore.getState().accessToken;

    // remove old listener before adding new ones
    socket.removeAllListeners();

    socket.on('connect', () => {
      useIdeWebsocketFacadeStore.setState({ isConnected: true });
    });

    socket.on('reconnect', () => {
      useIdeWebsocketFacadeStore.setState({ isConnected: true });
    });

    // Disconnect-Event from a frontend client
    socket.on('disconnect', (err) => {
      if (err === 'transport close') {
        useIdeWebsocketFacadeStore.setState({ isConnected: false });
      }
    });

    socket.on(
      'create-landscape',
      async (
        alias: string,
        projectName: string,
        commitId: string,
        callback
      ) => {
        let uId = useAuthStore.getState().user?.sub;

        if (!uId) {
          if (callback) callback();
          return;
        }

        uId = encodeURI(uId);

        const tokenResponse = await fetch(
          `${userServiceUrl}/user/${uId}/token`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            method: 'POST',
            body: JSON.stringify({
              alias,
              isRequestedFromVSCodeExtension: true,
              projectName: projectName,
              commitId: commitId,
            }),
          }
        );

        if (!tokenResponse.ok) {
          if (callback) callback();
          return;
        }

        const response = await tokenResponse.json();

        const payload = {
          value: response.value,
          secret: response.secret,
        };

        if (callback) {
          callback(payload);
        }
      }
    );

    socket.on(
      'load-current-debug-room-list-from-frontend',
      async (callback) => {
        let uId = useAuthStore.getState().user?.sub;
        if (!uId) {
          if (callback) callback();
          return;
        }
        uId = encodeURI(uId);
        const tokenResponse = await fetch(
          `${userServiceUrl}/user/${uId}/token`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            method: 'GET',
          }
        );

        if (!tokenResponse.ok) {
          if (callback) callback();
          return;
        }
        const response = (await tokenResponse.json()) as LandscapeToken[];
        const filteredResponse = response.filter(
          (token) => token.isRequestedFromVSCodeExtension
        );
        if (callback) {
          callback(filteredResponse);
        }
      }
    );

    socket.on(
      'frontend-create-landscape',
      async (
        alias: string,
        projectName: string,
        commitId: string,
        callback
      ) => {
        let uId = useAuthStore.getState().user?.sub;
        if (!uId) {
          if (callback) callback();
          return;
        }
        uId = encodeURI(uId);

        const tokenResponse = await fetch(
          `${userServiceUrl}/user/${uId}/token`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            method: 'POST',
            body: JSON.stringify({
              alias,
              isRequestedFromVSCodeExtension: true,
              projectName: projectName,
              commitId: commitId,
            }),
          }
        );

        if (!tokenResponse.ok) {
          if (callback) callback();
          return;
        }

        const response = await tokenResponse.json();
        const payload = {
          value: response.value,
          secret: response.secret,
        };

        if (callback) {
          callback(payload);
          // TODO: is this the right approach to reload page of room list? If we go this way, we need to make sure that the socket connection won't be destroyed because we need to retrieve a message from the extension backend!
          //this.router.refresh();
        }
      }
    );
  },

  // ---------- consumer methods ----------

  restartAndSetSocket: (landscapeToken?: string) => {
    const url = import.meta.env.VITE_VSCODE_SERV_URL;
    const { socket } = get();
    socket?.disconnect();

    const newSocket = io(url, {
      path: '/v2/ide/',
      query: { client: 'frontend', landscapeToken: landscapeToken },
    });
    set({ socket: newSocket });

    get().setupSocketListeners();
  },

  closeConnection: () => {
    const { socket } = get();
    socket?.disconnect();
    useIdeWebsocketFacadeStore.setState({ isConnected: false });
  },

  dispose: () => {
    const { socket } = get();
    socket?.removeAllListeners();
    get().closeConnection();
    set({ socket: undefined });
  },
}));
