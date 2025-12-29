import { CopilotKit } from '@copilotkit/react-core';
import { type LandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/landscape-data';
import { Application } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import {
  createContext,
  MutableRefObject,
  PropsWithChildren,
  useCallback,
  useEffect,
  useState,
} from 'react';
import { CopilotResources } from './copilot-resources';
import { CopilotTools } from './copilot-tools';
import { PingIndicator } from './ping-indicator';

const copilotUrl: string = import.meta.env.VITE_COPILOT_SERV_URL;

const providerKey = 'explorviz-copilot-provider';
const modelKey = 'explorviz-copilot-model';

interface Model {
  id: string;
  name: string;
}

interface Provider {
  id: string;
  name: string;
  models: Model[];
}

export type EntityFilteringFilters = {
  minTraceStartTimestamp?: number;
  minTraceDuration?: number;
  minClassMethodCount?: number;
};

export type EntityFilteringController = {
  applyFilters: (filters: EntityFilteringFilters) => void;
  reset: () => void;
};

export type ApplicationSearchController = {
  search: (params: { query: string; selectAll?: boolean }) => void;
  selectEntities: (ids: string[]) => void;
  reset: () => void;
};

interface Context {
  providers: Provider[];
  selectedProvider: Provider;
  setSelectedProvider: (provider: Provider) => void;
  selectedModel: Model;
  setSelectedModel: (model: Model) => void;
  landscapeData: LandscapeData | null;
  pingScreenAtPoint: (x: number, y: number) => void;
  showToolsSidebar: boolean;
  setShowToolsSidebar: (open: boolean) => void;
  showSettingsSidebar: boolean;
  setShowSettingsSidebar: (open: boolean) => void;
  openedToolComponent: string | null;
  setOpenedToolComponent: (component: string | null) => void;
  openedSettingComponent: string | null;
  setOpenedSettingComponent: (component: string | null) => void;
  entityFilteringControllerRef: MutableRefObject<EntityFilteringController | null> | null;
  applicationSearchControllerRef: MutableRefObject<ApplicationSearchController | null> | null;
}

const defaultContext: Context = {
  providers: [],
  selectedProvider: { id: '', name: '', models: [] },
  setSelectedProvider: () => {},
  selectedModel: { id: '', name: '' },
  setSelectedModel: () => {},
  landscapeData: null,
  pingScreenAtPoint: () => {},
  showToolsSidebar: false,
  setShowToolsSidebar: () => {},
  showSettingsSidebar: false,
  setShowSettingsSidebar: () => {},
  openedToolComponent: null,
  setOpenedToolComponent: () => {},
  openedSettingComponent: null,
  setOpenedSettingComponent: () => {},
  entityFilteringControllerRef: null,
  applicationSearchControllerRef: null,
};

export const ChatbotContext = createContext(defaultContext);

interface ChatbotProviderProps extends PropsWithChildren {
  landscapeData: LandscapeData | null;
  showToolsSidebar: boolean;
  setShowToolsSidebar: (open: boolean) => void;
  showSettingsSidebar: boolean;
  setShowSettingsSidebar: (open: boolean) => void;
  openedToolComponent: string | null;
  setOpenedToolComponent: (component: string | null) => void;
  openedSettingComponent: string | null;
  setOpenedSettingComponent: (component: string | null) => void;
  entityFilteringControllerRef: MutableRefObject<EntityFilteringController | null> | null;
  applicationSearchControllerRef: MutableRefObject<ApplicationSearchController | null> | null;
}

export function ChatbotProvider({
  children,
  landscapeData,
  showToolsSidebar,
  setShowToolsSidebar,
  showSettingsSidebar,
  setShowSettingsSidebar,
  openedToolComponent,
  setOpenedToolComponent,
  openedSettingComponent,
  setOpenedSettingComponent,
  entityFilteringControllerRef,
  applicationSearchControllerRef,
}: ChatbotProviderProps) {
  const [providers, setProviders] = useState(defaultContext.providers);
  const [selectedProvider, setSelectedProvider] = useState(
    defaultContext.selectedProvider
  );
  const [selectedModel, setSelectedModel] = useState(
    defaultContext.selectedModel
  );
  const [activePing, setActivePing] = useState<{ x: number; y: number }>();

  function setSelectedProviderPersistent(provider: Provider) {
    setSelectedProvider(provider);
    localStorage.setItem(providerKey, provider.id);
  }

  function setSelectedModelPersistent(model: Model) {
    setSelectedModel(model);
    localStorage.setItem(modelKey, model.id);
  }

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
      .then((data: { providers: Provider[] }) => {
        setProviders(data.providers);
        if (data.providers.length > 0) {
          const provider =
            data.providers.find(
              ({ id }) => id === localStorage.getItem(providerKey)
            ) || data.providers[0];
          setSelectedProviderPersistent(provider);
          if (provider.models.length > 0) {
            const model =
              provider.models.find(
                ({ id }) => id === localStorage.getItem(modelKey)
              ) || provider.models[0];
            setSelectedModelPersistent(model);
          }
        }
      });
  }, []);

  return (
    <ChatbotContext
      value={{
        providers,
        selectedProvider,
        setSelectedProvider: setSelectedProviderPersistent,
        selectedModel,
        setSelectedModel: setSelectedModelPersistent,
        landscapeData,
        pingScreenAtPoint,
        showToolsSidebar,
        setShowToolsSidebar,
        showSettingsSidebar,
        setShowSettingsSidebar,
        openedToolComponent,
        setOpenedToolComponent,
        openedSettingComponent,
        setOpenedSettingComponent,
        entityFilteringControllerRef,
        applicationSearchControllerRef,
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
    </ChatbotContext>
  );
}
