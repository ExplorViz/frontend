import { use } from 'react';
import { ChatbotContext } from './chatbot-context';
import { useCopilotChat } from '@copilotkit/react-core';
import { Dropdown } from '../visualization/page-setup/dropdown';

export function ProviderDropdown() {
  const {
    providers,
    selectedProvider,
    selectedModel,
    setSelectedProvider,
    setSelectedModel,
  } = use(ChatbotContext);
  const { reset } = useCopilotChat();

  function onSelect(provider: typeof selectedProvider) {
    setSelectedProvider(provider);
    if (!provider.models.some((model) => model.id === selectedModel.id)) {
      setSelectedModel(provider.models[0]);
    }
    reset(); // Reset the chat when a new provider is selected
  }

  return (
    <Dropdown
      items={providers}
      selectedItem={selectedProvider}
      onSelect={onSelect}
      fallbackLabel="Select Provider"
    />
  );
}
