import { create } from 'zustand';
import { Socket, io } from 'socket.io-client';
import { useIdeWebsocketFacadeStore } from 'explorviz-frontend/src/stores/ide-websocket-facade';
import { useToastHandlerStore } from 'explorviz-frontend/src/stores/toast-handler';
import eventEmitter from 'explorviz-frontend/src/utils/event-emitter';
import { useAuthStore } from '../stores/auth';

const { vsCodeService } = import.meta.env.VITE_VSCODE_SERV_URL;
const { userService } = import.meta.env.VITE_USER_SERV_URL;
interface IdeWebsocketStore {
  socket?: Socket;
  baseUrl: string;

  setupSocketListeners: () => void;
  restartAndSetSocket: (url: string, landscapeToken?: string) => void;
  closeConnection: () => void;
  dispose: () => void;
}

export const useIdeWebsocketStore = create<IdeWebsocketStore>((set, get) => ({
  socket: undefined,
  baseUrl: vsCodeService,
  isConnected: false,

  // ---------- internal helpers ----------
  setupSocketListeners: () => {
    const socket = get().socket;
    if (!socket) return;

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
      if(err === "transport close") {
        useIdeWebsocketFacadeStore.setState({ isConnected: false });
      }
    });

    socket.on(
      'create-landscape', async (data, callback) => {

        let uId = useAuthStore.getState().user?.sub;
        const accessToken = useAuthStore.getState().accessToken;

        if (!uId) {
          if (callback)
            callback();
          return;
        }

        uId = encodeURI(uId);
        const alias = data;

        const tokenResponse = await fetch(`${userService}/user/${uId}/token`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          method: 'POST',
          body: JSON.stringify({
            alias,
          }),
        });

        if (!tokenResponse.ok) {
          if (callback)
            callback();
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
    });
  },

   // ---------- consumer methods ----------

  restartAndSetSocket: (landscapeToken?: string) => {
    const { socket, baseUrl } = get();
    socket?.disconnect();

    const newSocket = io(baseUrl, { path: '/v2/ide/', query: { client: 'frontend', landscapeToken: landscapeToken } });
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
