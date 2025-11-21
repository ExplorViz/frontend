import { CopilotKit } from '@copilotkit/react-core';
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useEffect,
  useState,
} from 'react';
import { CopilotTools } from './copilot-tools';
import { CopilotResources } from './copilot-resources';
import { type LandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/landscape-data';
import { Application } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import { PingIndicator } from './ping-indicator';

const copilotUrl: string = import.meta.env.VITE_COPILOT_SERV_URL;

interface Model {
  id: string;
  name: string;
}

interface Provider {
  id: string;
  name: string;
  models: Model[];
}

interface Context {
  providers: Provider[];
  selectedProvider: Provider;
  setSelectedProvider: (provider: Provider) => void;
  selectedModel: Model;
  setSelectedModel: (model: Model) => void;
  pingScreenAtPoint: (x: number, y: number) => void;
}

const defaultContext: Context = {
  providers: [],
  selectedProvider: { id: '', name: '', models: [] },
  setSelectedProvider: () => {},
  selectedModel: { id: '', name: '' },
  setSelectedModel: () => {},
  pingScreenAtPoint: () => {},
};

export const ChatbotContext = createContext(defaultContext);

interface ChatbotProviderProps extends PropsWithChildren {
  landscapeData: LandscapeData | null;
}

export function ChatbotProvider({
  children,
  landscapeData,
}: ChatbotProviderProps) {
  const [providers, setProviders] = useState(defaultContext.providers);
  const [selectedProvider, setSelectedProvider] = useState(
    defaultContext.selectedProvider
  );
  const [selectedModel, setSelectedModel] = useState(
    defaultContext.selectedModel
  );
  const [activePing, setActivePing] = useState<{ x: number; y: number }>();

  const applications = landscapeData?.structureLandscapeData.nodes.reduce(
    (acc, node) => {
      return acc.concat(node.applications);
    },
    [] as Application[]
  );

  const pingScreenAtPoint = useCallback((x: number, y: number) => {
    setActivePing({ x, y });
    setTimeout(() => {
      setActivePing(undefined);
    }, 3000);
  }, []);

  useEffect(() => {
    fetch(`${copilotUrl}/providers`)
      .then((req) => req.json())
      .then((data) => {
        setProviders(data.providers);
        if (data.providers.length > 0) {
          setSelectedProvider(data.providers[0]);
          if (data.providers[0].models.length > 0) {
            setSelectedModel(data.providers[0].models[0]);
          }
        }
      });
  }, []);

  return (
    <ChatbotContext.Provider
      value={{
        providers,
        selectedProvider,
        setSelectedProvider,
        selectedModel,
        setSelectedModel,
        pingScreenAtPoint,
      }}
    >
      <CopilotKit
        showDevConsole={true}
        runtimeUrl={`${copilotUrl}/copilot`}
        headers={{
          ['x-explorviz-provider']: selectedProvider.id,
          ['x-explorviz-model']: selectedModel.id,
        }}
      >
        <CopilotResources applications={applications} />
        <CopilotTools applications={applications} />
        {children}
        {activePing && <PingIndicator x={activePing.x} y={activePing.y} />}
      </CopilotKit>
    </ChatbotContext.Provider>
  );
}
