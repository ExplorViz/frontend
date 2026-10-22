import {
  FOCUS_ENTITY_SEARCH_EVENT,
  ToolbarContext,
  ToolbarTool,
} from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/toolbar/toolbar-context';
import { useCameraControlsStore } from 'explorviz-frontend/src/stores/camera-controls-store';
import { useConfigurationStore } from 'explorviz-frontend/src/stores/configuration';
import { useToastHandlerStore } from 'explorviz-frontend/src/stores/toast-handler';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import { use, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';

/**
 * Component responsible for handling global keyboard hotkeys to quickly change settings.
 */
export default function HotkeyHandler() {
  const { openTool } = use(ToolbarContext);

  const { updateSetting, visualizationSettings } = useUserSettingsStore(
    useShallow((state) => ({
      updateSetting: state.updateSetting,
      visualizationSettings: state.visualizationSettings,
    }))
  );

  const { isCommRendered, setIsCommRendered } = useConfigurationStore(
    useShallow((state) => ({
      isCommRendered: state.isCommRendered,
      setIsCommRendered: state.setIsCommRendered,
    }))
  );

  const { resetVisualizationState } = useVisualizationStore(
    useShallow((state) => ({
      resetVisualizationState: state.actions.resetVisualizationState,
    }))
  );

  const { resetCamera } = useCameraControlsStore(
    useShallow((state) => ({
      resetCamera: state.resetCamera,
    }))
  );

  const { showInfoToastMessage } = useToastHandlerStore(
    useShallow((state) => ({
      showInfoToastMessage: state.showInfoToastMessage,
    }))
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const hasModKey = event.metaKey || event.ctrlKey;

      // Cmd+F (macOS) / Ctrl+F (other) opens entity search instead of browser find
      // or the plain "f" FPS-counter toggle.
      if (hasModKey && key === 'f' && !event.altKey && !event.shiftKey) {
        event.preventDefault();
        openTool(ToolbarTool.EntitySearch);
        // Delay so Entity Search can mount before focusing its input.
        setTimeout(() => {
          window.dispatchEvent(new Event(FOCUS_ENTITY_SEARCH_EVENT));
        }, 0);
        return;
      }

      // Ignore letter hotkeys while typing or when modifiers are held
      // (e.g. Ctrl/Cmd+F must not toggle the FPS counter).
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        (event.target as HTMLElement).isContentEditable ||
        hasModKey ||
        event.altKey
      ) {
        return;
      }

      switch (key) {
        case 'a': {
          const newValue = !visualizationSettings.enableAnimations.value;
          updateSetting('enableAnimations', newValue);
          showInfoToastMessage(
            `Animations ${newValue ? 'enabled' : 'disabled'}`
          );
          break;
        }
        case 'c': {
          const newValue = !isCommRendered;
          setIsCommRendered(newValue);
          showInfoToastMessage(
            `Communications ${newValue ? 'enabled' : 'disabled'}`
          );
          break;
        }
        case 'f': {
          const newValue = !visualizationSettings.showFpsCounter.value;
          updateSetting('showFpsCounter', newValue);
          showInfoToastMessage(
            `FPS Counter ${newValue ? 'enabled' : 'disabled'}`
          );
          break;
        }
        case 'h': {
          const newValue = !visualizationSettings.heatmapEnabled.value;
          updateSetting('heatmapEnabled', newValue);
          showInfoToastMessage(`Heatmap ${newValue ? 'enabled' : 'disabled'}`);
          break;
        }
        case 'm': {
          const newValue = !visualizationSettings.isMagnifierActive.value;
          updateSetting('isMagnifierActive', newValue);
          showInfoToastMessage(
            `Magnifier ${newValue ? 'enabled' : 'disabled'}`
          );
          break;
        }
        case 'o':
          resetCamera();
          showInfoToastMessage('Returned to origin');
          break;
        case 'r':
          resetVisualizationState();
          showInfoToastMessage('Visualization state reset');
          break;
        case 'x': {
          const newValue = !visualizationSettings.showAxesHelper.value;
          updateSetting('showAxesHelper', newValue);
          showInfoToastMessage(
            `Axes Helper ${newValue ? 'enabled' : 'disabled'}`
          );
          break;
        }
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    visualizationSettings,
    isCommRendered,
    updateSetting,
    setIsCommRendered,
    resetVisualizationState,
    resetCamera,
    showInfoToastMessage,
    openTool,
  ]);

  return null;
}
