import { create } from 'zustand';
import eventEmitter from '../utils/event-emitter';
import { CommunicationLink } from 'react-lib/src/ide/ide-websocket';

interface IdeWebsocketFacadeState {
  roomName: string;
  isConnected: boolean;
  numConnectedIDEs: number;
  refreshVizData: (cl: CommunicationLink[]) => void;
  restartConnection: () => void;
}

export const useIdeWebsocketFacadeStore = create<IdeWebsocketFacadeState>(
  (set, get) => ({
    roomName: 'undefined', // tracked
    isConnected: false, // tracked
    numConnectedIDEs: 0, // tracked

    refreshVizData: (cl: CommunicationLink[]) => {
      eventEmitter.emit('ide-refresh-data', cl);
    },

    restartConnection: () => {
      eventEmitter.emit('ide-restart-connection');
    },
  })
);
