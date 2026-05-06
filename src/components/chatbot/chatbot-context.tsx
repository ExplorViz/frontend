import { CopilotKit } from '@copilotkit/react-core';
import { type LandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/landscape-data';
import {
  createContext,
  PropsWithChildren,
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { CopilotResources } from './copilot-resources';
import { CopilotTools } from './copilot-tools';
import { PingIndicator } from './ping-indicator';

const copilotUrl: string =
  (import.meta.env.VITE_COPILOT_SERV_URL as string | undefined) ?? '';

const PROVIDER_STORAGE_KEY = 'explorviz-copilot-provider';
const MODEL_STORAGE_KEY = 'explorviz-copilot-model';

interface Model {
  id: string;
  name: string;
}

interface Provider {
  id: string;
  name: string;
  models: Model[];
}

const EMPTY_MODEL: Model = { id: '', name: '' };
const EMPTY_PROVIDER: Provider = { id: '', name: '', models: [] };

export type EntityFilteringFilters = {
  minTraceStartTimestamp?: number;
  minTraceDuration?: number;
  minClassMethodCount?: number;
};

export type EntityFilteringController = {
  applyFilters: (filters: EntityFilteringFilters) => void;
  reset: () => void;
};

export type EntitySearchController = {
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
  entityFilteringControllerRef: RefObject<EntityFilteringController | null> | null;
  entitySearchControllerRef: RefObject<EntitySearchController | null> | null;
  providersError: string | null;
  isLoadingProviders: boolean;
  reloadProviders: () => void;
}

const defaultContext: Context = {
  providers: [],
  selectedProvider: EMPTY_PROVIDER,
  setSelectedProvider: () => {},
  selectedModel: EMPTY_MODEL,
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
  entitySearchControllerRef: null,
  providersError: null,
  isLoadingProviders: false,
  reloadProviders: () => {},
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
  entityFilteringControllerRef: RefObject<EntityFilteringController | null> | null;
  entitySearchControllerRef: RefObject<EntitySearchController | null> | null;
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
  entitySearchControllerRef,
}: ChatbotProviderProps) {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedProvider, setSelectedProvider] =
    useState<Provider>(EMPTY_PROVIDER);
  const [selectedModel, setSelectedModel] = useState<Model>(EMPTY_MODEL);
  const [activePing, setActivePing] = useState<{ x: number; y: number }>();
  const [providersError, setProvidersError] = useState<string | null>(null);
  const [isLoadingProviders, setIsLoadingProviders] = useState(false);
  const [reloadCounter, setReloadCounter] = useState(0);

  const setSelectedProviderPersistent = useCallback((provider: Provider) => {
    setSelectedProvider(provider);
    try {
      if (provider.id) {
        localStorage.setItem(PROVIDER_STORAGE_KEY, provider.id);
      }
    } catch {
      // localStorage is unavailable (e.g., private browsing); ignore.
    }
  }, []);

  const setSelectedModelPersistent = useCallback((model: Model) => {
    setSelectedModel(model);
    try {
      if (model.id) {
        localStorage.setItem(MODEL_STORAGE_KEY, model.id);
      }
    } catch {
      // localStorage is unavailable; ignore.
    }
  }, []);

  const cities = useMemo(
    () => Object.values(landscapeData?.flatLandscapeData?.cities ?? {}),
    [landscapeData]
  );

  const pingScreenAtPoint = useCallback((x: number, y: number) => {
    setActivePing({ x, y });
    setTimeout(() => {
      setActivePing(undefined);
    }, 3000);
  }, []);

  const reloadProviders = useCallback(() => {
    setReloadCounter((value) => value + 1);
  }, []);

  useEffect(() => {
    if (!copilotUrl) {
      setProvidersError(
        'VITE_COPILOT_SERV_URL is not configured. The chatbot is disabled.'
      );
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    const loadProviders = async () => {
      setIsLoadingProviders(true);
      setProvidersError(null);
      try {
        const response = await fetch(`${copilotUrl}/providers`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(
            `Provider service responded with HTTP ${response.status}`
          );
        }
        const data: { providers?: Provider[] } = await response.json();
        const fetched = Array.isArray(data?.providers) ? data.providers : [];
        if (cancelled) return;

        setProviders(fetched);
        if (fetched.length === 0) {
          setSelectedProvider(EMPTY_PROVIDER);
          setSelectedModel(EMPTY_MODEL);
          setProvidersError(
            'No LLM providers are configured on the chat service. Set OPENAI_API_KEY, ANTHROPIC_API_KEY, or GOOGLE_API_KEY on the backend.'
          );
          return;
        }

        let storedProviderId: string | null = null;
        let storedModelId: string | null = null;
        try {
          storedProviderId = localStorage.getItem(PROVIDER_STORAGE_KEY);
          storedModelId = localStorage.getItem(MODEL_STORAGE_KEY);
        } catch {
          // ignore unavailable storage
        }

        const provider =
          fetched.find(({ id }) => id === storedProviderId) ?? fetched[0];
        setSelectedProviderPersistent(provider);

        if (provider.models.length > 0) {
          const model =
            provider.models.find(({ id }) => id === storedModelId) ??
            provider.models[0];
          setSelectedModelPersistent(model);
        } else {
          setSelectedModel(EMPTY_MODEL);
        }
      } catch (error) {
        if (cancelled || (error as Error).name === 'AbortError') return;
        console.error('Failed to load chatbot providers', error);
        setProviders([]);
        setSelectedProvider(EMPTY_PROVIDER);
        setSelectedModel(EMPTY_MODEL);
        setProvidersError(
          (error as Error).message ||
            'Failed to reach the AI chat service. Is it running?'
        );
      } finally {
        if (!cancelled) setIsLoadingProviders(false);
      }
    };

    loadProviders();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [
    reloadCounter,
    setSelectedProviderPersistent,
    setSelectedModelPersistent,
  ]);

  const copilotHeaders = useMemo(() => {
    const headers: Record<string, string> = {};
    if (selectedProvider.id) {
      headers['x-explorviz-provider'] = selectedProvider.id;
    }
    if (selectedModel.id) {
      headers['x-explorviz-model'] = selectedModel.id;
    }
    return headers;
  }, [selectedProvider.id, selectedModel.id]);

  const copilotRuntimeUrl = useMemo(() => {
    if (!copilotUrl) return undefined;
    const url = new URL(`${copilotUrl}/copilot`);
    if (selectedProvider.id) {
      url.searchParams.set('provider', selectedProvider.id);
    }
    if (selectedModel.id) {
      url.searchParams.set('model', selectedModel.id);
    }
    return url.toString();
  }, [selectedProvider.id, selectedModel.id]);

  const copilotRuntimeKey = useMemo(
    () => `${selectedProvider.id || 'none'}:${selectedModel.id || 'none'}`,
    [selectedProvider.id, selectedModel.id]
  );

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
        entitySearchControllerRef,
        providersError,
        isLoadingProviders,
        reloadProviders,
      }}
    >
      <CopilotKit
        key={copilotRuntimeKey}
        showDevConsole={false}
        enableInspector={false}
        runtimeUrl={copilotRuntimeUrl}
        headers={copilotHeaders}
      >
        <CopilotResources cities={cities} />
        <CopilotTools cities={cities} />
        {children}
        {activePing && <PingIndicator x={activePing.x} y={activePing.y} />}
      </CopilotKit>
    </ChatbotContext>
  );
}
