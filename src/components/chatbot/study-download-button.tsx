import { useCopilotChatInternal } from '@copilotkit/react-core';
import { DownloadIcon } from '@primer/octicons-react';
import { use } from 'react';
import Button from 'react-bootstrap/Button';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { defaultVizSettings } from 'explorviz-frontend/src/utils/settings/default-settings';
import {
  VisualizationSettings,
  VisualizationSettingId,
} from 'explorviz-frontend/src/utils/settings/settings-schemas';
import { getCircularReplacer } from 'explorviz-frontend/src/utils/circularReplacer';
import { ChatbotContext } from './chatbot-context';
import { EditingContext } from '../editing/editing-context';

function flattenSettings(settings: VisualizationSettings) {
  const flattened: Record<VisualizationSettingId, unknown> = {} as Record<
    VisualizationSettingId,
    unknown
  >;
  Object.entries(settings).forEach(([id, setting]) => {
    flattened[id as VisualizationSettingId] = (setting as any).value;
  });
  return flattened;
}

export function StudyDownloadButton() {
  const { messages } = useCopilotChatInternal();
  const {
    closedComponentIds,
    highlightedEntityIds,
    hoveredEntityId,
    removedComponentIds,
  } = useVisualizationStore();
  const {
    selectedProvider,
    selectedModel,
    landscapeData,
    showToolsSidebar,
    showSettingsSidebar,
    openedToolComponent,
    openedSettingComponent,
  } = use(ChatbotContext);
  const { canGoBack, canGoForward } = use(EditingContext);
  const visualizationSettings = useUserSettingsStore(
    (state) => state.visualizationSettings
  );

  const handleDownload = () => {
    const applicationSummary = landscapeData
      ? {
          applicationCount:
            landscapeData.structureLandscapeData?.nodes?.reduce(
              (count, node) => count + (node.applications?.length ?? 0),
              0
            ) ?? 0,
          nodeCount: landscapeData.structureLandscapeData?.nodes?.length ?? 0,
        }
      : null;

    const payload = {
      version: 1,
      createdAt: new Date().toISOString(),
      provider: selectedProvider,
      model: selectedModel,
      messages,
      landscapeData,
      landscapeSummary: applicationSummary,
      resourcesSnapshot: {
        closedComponentIds: [...closedComponentIds],
        highlightedEntityIds: [...highlightedEntityIds],
        hoveredEntityId: hoveredEntityId ?? null,
        removedComponentIds: [...removedComponentIds],
        canGoBack,
        canGoForward,
        showToolsSidebar,
        showSettingsSidebar,
        openedToolComponent,
        openedSettingComponent,
        visualizationSettings: flattenSettings(visualizationSettings),
        defaultVisualizationSettings: flattenSettings(defaultVizSettings),
      },
    };

    try {
      const blob = new Blob(
        [JSON.stringify(payload, getCircularReplacer(true), 2)],
        {
          type: 'application/json',
        }
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const fileName = `explorviz-copilot-study-${new Date()
        .toISOString()
        .replace(/[:.]/g, '-')}.json`;

      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to download study data', err);
    }
  };

  return (
    <Button
      title="Download study data (chat, landscape, resources)"
      variant="primary"
      onClick={handleDownload}
    >
      <DownloadIcon size="small" />
    </Button>
  );
}
