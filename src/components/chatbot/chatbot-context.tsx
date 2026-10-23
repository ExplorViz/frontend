import { CopilotKit } from '@copilotkit/react-core';
import { CopilotErrorBoundary } from 'explorviz-frontend/src/components/chatbot/copilot-error-boundary';
import { type LandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/landscape-data';
import {
  createContext,
  PropsWithChildren,
  RefObject,
  use,
  useEffect,
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
  isCopilotRuntimeReady: boolean;
  copilotRuntimeError: string | null;
  copilotRuntimeUrl: string | undefined;
  copilotRuntimeHeaders: Record<string, string>;
  copilotRuntimeKey: string;
  reportCopilotCrash: (error: Error) => void;
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
  isCopilotRuntimeReady: false,
  copilotRuntimeError: null,
  copilotRuntimeUrl: undefined,
  copilotRuntimeHeaders: {},
  copilotRuntimeKey: 'none:none',
  reportCopilotCrash: () => {},
};

export const ChatbotContext = createContext(defaultContext);

function isUnreachableChatServiceError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (error.name === 'AbortError') return true;
  return error instanceof TypeError && error.message === 'Failed to fetch';
}

interface ChatbotProviderProps extends PropsWithChildren {
  /** When false, no provider fetch and no CopilotKit runtime (visualization-only). */
  copilotRuntimeRequested: boolean;
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
  copilotRuntimeRequested,
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
  const [copilotRuntimeError, setCopilotRuntimeError] = useState<string | null>(
    null
  );

  function setSelectedProviderPersistent(provider: Provider) {
    setSelectedProvider(provider);
    try {
      if (provider.id) {
        localStorage.setItem(PROVIDER_STORAGE_KEY, provider.id);
      }
    } catch {
      // localStorage is unavailable (e.g., private browsing); ignore.
    }
  }

  function setSelectedModelPersistent(model: Model) {
    setSelectedModel(model);
    try {
      if (model.id) {
        localStorage.setItem(MODEL_STORAGE_KEY, model.id);
      }
    } catch {
      // localStorage is unavailable; ignore.
    }
  }

  function pingScreenAtPoint(x: number, y: number) {
    setActivePing({ x, y });
    setTimeout(() => {
      setActivePing(undefined);
    }, 3000);
  }

  function reloadProviders() {
    setCopilotRuntimeError(null);
    setReloadCounter((value) => value + 1);
  }

  function handleCopilotCrash(error: Error) {
    setCopilotRuntimeError(
      error.message ||
        'The AI chat integration stopped unexpectedly. The visualization remains available.'
    );
  }

  useEffect(() => {
    if (!copilotRuntimeRequested) {
      return;
    }

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
        if (!isUnreachableChatServiceError(error)) {
          console.warn('Failed to load chatbot providers', error);
        }
        setProviders([]);
        setSelectedProvider(EMPTY_PROVIDER);
        setSelectedModel(EMPTY_MODEL);
        setProvidersError(
          isUnreachableChatServiceError(error)
            ? 'Failed to reach the AI chat service. Is it running?'
            : (error as Error).message || 'Failed to load chatbot providers.'
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
  }, [copilotRuntimeRequested, reloadCounter]);

  const copilotHeaders: Record<string, string> = {};
  if (selectedProvider.id) {
    copilotHeaders['x-explorviz-provider'] = selectedProvider.id;
  }
  if (selectedModel.id) {
    copilotHeaders['x-explorviz-model'] = selectedModel.id;
  }

  let copilotRuntimeUrl: string | undefined;
  if (copilotUrl) {
    const url = new URL(`${copilotUrl}/copilot`);
    if (selectedProvider.id) {
      url.searchParams.set('provider', selectedProvider.id);
    }
    if (selectedModel.id) {
      url.searchParams.set('model', selectedModel.id);
    }
    copilotRuntimeUrl = url.toString();
  }

  const copilotRuntimeKey = `${selectedProvider.id || 'none'}:${selectedModel.id || 'none'}`;

  const isCopilotRuntimeReady =
    copilotRuntimeRequested &&
    Boolean(copilotUrl) &&
    !providersError &&
    !isLoadingProviders &&
    providers.length > 0 &&
    Boolean(selectedModel.id) &&
    Boolean(copilotRuntimeUrl) &&
    !copilotRuntimeError;

  const chatbotContextValue = {
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
    isCopilotRuntimeReady,
    copilotRuntimeError,
    copilotRuntimeUrl,
    copilotRuntimeHeaders: copilotHeaders,
    copilotRuntimeKey,
    reportCopilotCrash: handleCopilotCrash,
  };

  return (
    <ChatbotContext value={chatbotContextValue}>
      {children}
      {activePing && <PingIndicator x={activePing.x} y={activePing.y} />}
    </ChatbotContext>
  );
}

function handleCopilotKitError(errorEvent: {
  message?: string;
  error?: unknown;
}) {
  const message =
    errorEvent.message ??
    (errorEvent.error instanceof Error
      ? errorEvent.error.message
      : 'CopilotKit reported an error.');
  console.warn('[CopilotKit]', message, errorEvent);
}

/**
 * CopilotKit runtime scoped to chat UI only so opening/closing the chatbot
 * does not remount the 3D visualization.
 */
export function CopilotRuntime({ children }: PropsWithChildren) {
  const {
    isCopilotRuntimeReady,
    copilotRuntimeUrl,
    copilotRuntimeHeaders,
    copilotRuntimeKey,
    reportCopilotCrash,
    landscapeData,
  } = use(ChatbotContext);

  if (!isCopilotRuntimeReady || !copilotRuntimeUrl) {
    return children;
  }

  const cities = Object.values(landscapeData?.flatLandscapeData?.cities ?? {});

  return (
    <CopilotErrorBoundary
      fallback={children}
      resetKey={copilotRuntimeKey}
      onError={reportCopilotCrash}
    >
      <CopilotKit
        key={copilotRuntimeKey}
        enableInspector={false}
        showDevConsole={false}
        runtimeUrl={copilotRuntimeUrl}
        headers={copilotRuntimeHeaders}
        onError={handleCopilotKitError}
      >
        <CopilotResources cities={cities} />
        <CopilotTools />
        {children}
      </CopilotKit>
    </CopilotErrorBoundary>
  );
}
