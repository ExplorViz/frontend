import { useCopilotChat } from '@copilotkit/react-core';
import { ChatbotContext } from 'explorviz-frontend/src/components/chatbot/chatbot-context';
import { Dropdown } from 'explorviz-frontend/src/components/visualization/page-setup/dropdown';
import { use } from 'react';

export function ProviderDropdown() {
  const { providers, selectedProvider, setSelectedProvider } =
    use(ChatbotContext);
  const { reset } = useCopilotChat();

  function onSelect(provider: typeof selectedProvider) {
    setSelectedProvider(provider);
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
