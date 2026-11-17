import { ChatbotContext, EMPTY_MODEL } from 'explorviz-frontend/src/components/chatbot/chatbot-context-store';
import { Dropdown } from 'explorviz-frontend/src/components/visualization/page-setup/dropdown';
import { use } from 'react';

export function ProviderDropdown() {
  const { providers, selectedProvider, selectedModel, setSelectedProvider, setSelectedModel } = use(ChatbotContext);

  function onSelect(provider: typeof selectedProvider) {
    if (provider.id === selectedProvider.id) return;

    setSelectedProvider(provider);
    const isCurrentModelSupported = provider.models.some((model) => model.id === selectedModel.id);
    if (!isCurrentModelSupported) {
      setSelectedModel(provider.models[0] ?? EMPTY_MODEL);
    }
  }

  return (
    <Dropdown items={providers} selectedItem={selectedProvider} onSelect={onSelect} fallbackLabel="Select Provider" />
  );
}
