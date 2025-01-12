import { createStore } from 'zustand/vanilla';

interface IdeWebsocketFacadeState {
    roomName: string;
    isConnected: boolean;
    numConnectedIDEs: number;
    // refreshVizData: (cl: CommunicationLink[]) => void;
    // restartConnection: () => void;
}

export const useIdeWebsocketFacadeStore = createStore<IdeWebsocketFacadeState>(() => ({
    roomName: 'undefined',
    isConnected: false,
    numConnectedIDEs: 0,
    // refreshVizData: (cl: CommunicationLink[]) => void,
    // restartConnection: () => void,
}));