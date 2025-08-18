import { CopilotKit } from '@copilotkit/react-core';
import { createContext, PropsWithChildren, useEffect, useState } from 'react';
import { McpServerManager } from './mcp-server-manager';

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
}

const defaultContext: Context = {
  providers: [],
  selectedProvider: { id: '', name: '', models: [] },
  setSelectedProvider: () => {},
  selectedModel: { id: '', name: '' },
  setSelectedModel: () => {},
};

export const ChatbotContext = createContext(defaultContext);

export function ChatbotProvider({ children }: PropsWithChildren) {
  const [providers, setProviders] = useState(defaultContext.providers);
  const [selectedProvider, setSelectedProvider] = useState(
    defaultContext.selectedProvider
  );
  const [selectedModel, setSelectedModel] = useState(
    defaultContext.selectedModel
  );

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
      }}
    >
      <CopilotKit
        runtimeUrl={`${copilotUrl}/copilot`}
        headers={{
          ['x-explorviz-provider']: selectedProvider.id,
          ['x-explorviz-model']: selectedModel.id,
        }}
      >
        <McpServerManager />
        {children}
      </CopilotKit>
    </ChatbotContext.Provider>
  );
}
