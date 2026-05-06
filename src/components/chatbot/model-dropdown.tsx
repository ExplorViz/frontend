import { useCopilotChat } from '@copilotkit/react-core';
import { ChatbotContext } from 'explorviz-frontend/src/components/chatbot/chatbot-context';
import { Dropdown } from 'explorviz-frontend/src/components/visualization/page-setup/dropdown';
import { use } from 'react';

export function ModelDropdown() {
  const { selectedProvider, selectedModel, setSelectedModel } =
    use(ChatbotContext);
  const { reset } = useCopilotChat();

  function onSelect(model: typeof selectedModel) {
    if (model.id === selectedModel.id) return;
    setSelectedModel(model);
    reset();
  }

  return (
    <Dropdown
      items={selectedProvider.models}
      selectedItem={selectedModel}
      onSelect={onSelect}
      fallbackLabel="Select Model"
    />
  );
}
