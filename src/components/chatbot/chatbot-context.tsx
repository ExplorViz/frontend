import { CopilotKitProvider, type CopilotKitCoreErrorCode } from '@copilotkit/react-core/v2';
import { CopilotErrorBoundary } from 'explorviz-frontend/src/components/chatbot/copilot-error-boundary';
import { type LandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/landscape-data';
import { PropsWithChildren, RefObject, use, useEffect, useState } from 'react';
import { SettingsSidebarTab } from '../visualization/page-setup/sidebar/customizationbar/settings-sidebar-context';
import { ToolbarTool } from '../visualization/page-setup/sidebar/toolbar/toolbar-context';
import { CopilotResources } from './copilot-resources';
import { CopilotTools } from './copilot-tools';
import {
  EMPTY_MODEL,
  EMPTY_PROVIDER,
  type ChatbotContextData,
  type EntityFilteringController,
  type EntitySearchController,
  type Model,
  type Provider,
  type SidebarSelectionOptions,
  ChatbotContext,
} from './chatbot-context-store';
import { PingIndicator } from './ping-indicator';

const copilotUrl: string =
  (import.meta.env.VITE_COPILOT_SERV_URL as string | undefined) || (import.meta.env.PROD ? window.location.origin : '');

/** How often to check whether the AI chat service is (still) reachable. */
const REACHABILITY_INTERVAL_IN_MS = 30_000;
const REACHABILITY_TIMEOUT_IN_MS = 5_000;

/**
 * Whether the AI chat service answers. Probes `/providers` rather than
 * `/health`: behind the production nginx only `/providers` and `/copilot` are
 * forwarded, and `/health` would be answered by the frontend itself.
 */
function useChatServiceReachable() {
  const [isReachable, setIsReachable] = useState(false);

  useEffect(() => {
    if (!copilotUrl) {
      return;
    }

    let cancelled = false;
    let controller: AbortController | undefined;

    const probe = async () => {
      // A hidden tab keeps its last answer and checks again once visible.
      if (document.hidden) {
        return;
      }
      controller?.abort();
      controller = new AbortController();
      const timeout = setTimeout(() => controller?.abort(), REACHABILITY_TIMEOUT_IN_MS);
      try {
        const response = await fetch(`${copilotUrl}/providers`, { signal: controller.signal });
        const data: unknown = response.ok ? await response.json() : null;
        if (!cancelled) {
          setIsReachable(Array.isArray((data as { providers?: unknown } | null)?.providers));
        }
      } catch {
        if (!cancelled) {
          setIsReachable(false);
        }
      } finally {
        clearTimeout(timeout);
      }
    };

    probe();
    const interval = setInterval(probe, REACHABILITY_INTERVAL_IN_MS);
    document.addEventListener('visibilitychange', probe);
    window.addEventListener('online', probe);

    return () => {
      cancelled = true;
      controller?.abort();
      clearInterval(interval);
      document.removeEventListener('visibilitychange', probe);
      window.removeEventListener('online', probe);
    };
  }, []);

  return isReachable;
}

const PROVIDER_STORAGE_KEY = 'explorviz-copilot-provider';
const MODEL_STORAGE_KEY = 'explorviz-copilot-model';

function isUnreachableChatServiceError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (error.name === 'AbortError') return true;
  return error instanceof TypeError && error.message === 'Failed to fetch';
}

interface ChatbotProviderProps extends PropsWithChildren {
  landscapeData: LandscapeData | null;
  showToolsSidebar: boolean;
  setShowToolsSidebar: (open: boolean) => void;
  showSettingsSidebar: boolean;
  setShowSettingsSidebar: (open: boolean) => void;
  selectedToolbarTool: ToolbarTool | null;
  setSelectedToolbarTool: (tool: ToolbarTool | null, options?: SidebarSelectionOptions) => void;
  selectedSettingsSidebarTab: string | null;
  setSelectedSettingsSidebarTab: (tab: SettingsSidebarTab | null, options?: SidebarSelectionOptions) => void;
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
  selectedToolbarTool,
  setSelectedToolbarTool,
  selectedSettingsSidebarTab,
  setSelectedSettingsSidebarTab,
  entityFilteringControllerRef,
  entitySearchControllerRef,
}: ChatbotProviderProps) {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<Provider>(EMPTY_PROVIDER);
  const [selectedModel, setSelectedModel] = useState<Model>(EMPTY_MODEL);
  const [activePing, setActivePing] = useState<{ x: number; y: number }>();
  const [providersError, setProvidersError] = useState<string | null>(null);
  const [isLoadingProviders, setIsLoadingProviders] = useState(false);
  const [reloadCounter, setReloadCounter] = useState(0);
  const [copilotRuntimeError, setCopilotRuntimeError] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  // Latched on first open: until then there is no provider fetch and no
  // CopilotKit runtime (visualization-only). Afterwards the runtime stays
  // mounted so closing the chat window keeps the conversation.
  const [copilotRuntimeRequested, setCopilotRuntimeRequested] = useState(false);
  const isChatServiceReachable = useChatServiceReachable();

  function setIsChatOpenAndRequestRuntime(open: boolean) {
    setIsChatOpen(open);
    if (open) {
      setCopilotRuntimeRequested(true);
    }
  }

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
      error.message || 'The AI chat integration stopped unexpectedly. The visualization remains available.'
    );
  }

  useEffect(() => {
    if (!copilotRuntimeRequested) {
      return;
    }

    if (!copilotUrl) {
      setProvidersError('VITE_COPILOT_SERV_URL is not configured. The chatbot is disabled.');
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
          throw new Error(`Provider service responded with HTTP ${response.status}`);
        }
        const data: { providers?: Provider[] } = await response.json();
        const fetched = Array.isArray(data?.providers) ? data.providers : [];
        if (cancelled) return;

        if (fetched.some(({ models }) => models.some(({ agentId }) => !agentId))) {
          throw new Error(
            'The AI chat service is outdated (its models have no CopilotKit agent ids). Update the ai-chat-service.'
          );
        }

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

        const provider = fetched.find(({ id }) => id === storedProviderId) ?? fetched[0];
        setSelectedProviderPersistent(provider);

        if (provider.models.length > 0) {
          const model = provider.models.find(({ id }) => id === storedModelId) ?? provider.models[0];
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

  const copilotRuntimeUrl = copilotUrl ? `${copilotUrl}/copilot` : undefined;

  const isCopilotRuntimeReady =
    copilotRuntimeRequested &&
    Boolean(copilotUrl) &&
    !providersError &&
    !isLoadingProviders &&
    providers.length > 0 &&
    Boolean(selectedModel.agentId) &&
    Boolean(copilotRuntimeUrl) &&
    !copilotRuntimeError;

  const chatbotContextValue: ChatbotContextData = {
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
    selectedToolbarTool,
    setSelectedToolbarTool,
    selectedSettingsSidebarTab,
    setSelectedSettingsSidebarTab,
    entityFilteringControllerRef,
    entitySearchControllerRef,
    providersError,
    isLoadingProviders,
    reloadProviders,
    isCopilotRuntimeReady,
    copilotRuntimeError,
    copilotRuntimeUrl,
    reportCopilotCrash: handleCopilotCrash,
    isChatOpen,
    setIsChatOpen: setIsChatOpenAndRequestRuntime,
    copilotRuntimeRequested,
    isChatServiceReachable,
  };

  return (
    <ChatbotContext value={chatbotContextValue}>
      {children}
      {activePing && <PingIndicator x={activePing.x} y={activePing.y} />}
    </ChatbotContext>
  );
}

function handleCopilotKitError(event: {
  error: Error;
  code: CopilotKitCoreErrorCode;
  context: Record<string, unknown>;
}) {
  console.warn('[CopilotKit]', event.code, event.error.message || 'CopilotKit reported an error.', event.context);
}

/**
 * CopilotKit runtime scoped to chat UI only so opening/closing the chatbot
 * does not remount the 3D visualization.
 */
export function CopilotRuntime({ children }: PropsWithChildren) {
  const { isCopilotRuntimeReady, copilotRuntimeUrl, selectedModel, reportCopilotCrash, landscapeData } =
    use(ChatbotContext);

  if (!isCopilotRuntimeReady || !copilotRuntimeUrl) {
    return children;
  }

  const cities = Object.values(landscapeData?.flatLandscapeData?.cities ?? {});

  return (
    <CopilotErrorBoundary fallback={children} resetKey={selectedModel.agentId} onError={reportCopilotCrash}>
      {/* Each model is its own agent on the AI chat service; switching models
          switches the agent, which starts with its own conversation. */}
      <CopilotKitProvider
        runtimeUrl={copilotRuntimeUrl}
        agentId={selectedModel.agentId}
        useSingleEndpoint={false}
        enableInspector={false}
        showIntelligenceIndicator={false}
        onError={handleCopilotKitError}
      >
        <CopilotResources cities={cities} />
        <CopilotTools />
        {children}
      </CopilotKitProvider>
    </CopilotErrorBoundary>
  );
}
