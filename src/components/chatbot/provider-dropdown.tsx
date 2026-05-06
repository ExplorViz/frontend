import { useCopilotChat } from '@copilotkit/react-core';
import { ChatbotContext } from 'explorviz-frontend/src/components/chatbot/chatbot-context';
import { Dropdown } from 'explorviz-frontend/src/components/visualization/page-setup/dropdown';
import { use } from 'react';

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
    if (provider.id === selectedProvider.id) return;

    setSelectedProvider(provider);
    const isCurrentModelSupported = provider.models.some(
      (model) => model.id === selectedModel.id
    );
    if (!isCurrentModelSupported) {
      setSelectedModel(provider.models[0] ?? { id: '', name: '' });
    }
    reset();
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
