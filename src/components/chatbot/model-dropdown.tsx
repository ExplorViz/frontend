import { use } from 'react';
import { ChatbotContext } from './chatbot-context';
import { Dropdown } from '../visualization/page-setup/dropdown';

export function ModelDropdown() {
  const { selectedProvider, selectedModel, setSelectedModel } =
    use(ChatbotContext);

  function onSelect(model: typeof selectedModel) {
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
