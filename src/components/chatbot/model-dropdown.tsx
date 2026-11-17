import { ChatbotContext } from 'explorviz-frontend/src/components/chatbot/chatbot-context-store';
import { Dropdown } from 'explorviz-frontend/src/components/visualization/page-setup/dropdown';
import { use } from 'react';

export function ModelDropdown() {
  const { selectedProvider, selectedModel, setSelectedModel } = use(ChatbotContext);

  function onSelect(model: typeof selectedModel) {
    if (model.id === selectedModel.id) return;
    setSelectedModel(model);
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
