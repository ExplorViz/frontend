import React, { useState } from 'react';

import ColorPicker from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/customizationbar/settings/color-picker';
import ColorSchemeSelector from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/customizationbar/settings/color-scheme-selector';
import ButtonSetting from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/customizationbar/settings/setting-type/button-setting';
import FlagSetting from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/customizationbar/settings/setting-type/flag-setting';
import RangeSetting from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/customizationbar/settings/setting-type/range-setting';
import ResetButton from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/customizationbar/settings/setting-type/reset-button';
import { useApplicationRendererStore } from 'explorviz-frontend/src/stores/application-renderer';
import { useLocalUserStore } from 'explorviz-frontend/src/stores/collaboration/local-user';
import { useMessageSenderStore } from 'explorviz-frontend/src/stores/collaboration/message-sender';
import { useRoomSerializerStore } from 'explorviz-frontend/src/stores/collaboration/room-serializer';
import { useHeatmapConfigurationStore } from 'explorviz-frontend/src/stores/heatmap/heatmap-configuration';
import { useHighlightingStore } from 'explorviz-frontend/src/stores/highlighting';
import { useMinimapStore } from 'explorviz-frontend/src/stores/minimap-service';
import { useSceneRepositoryStore } from 'explorviz-frontend/src/stores/repos/scene-repository';
import { useToastHandlerStore } from 'explorviz-frontend/src/stores/toast-handler';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { ColorSchemeId } from 'explorviz-frontend/src/utils/settings/color-schemes';
import {
  ColorSettingId,
  isButtonSetting,
  isColorSetting,
  isFlagSetting,
  isRangeSetting,
  isSelectSetting,
  RangeSetting as RangeSettingSchema,
  SettingGroup,
  SettingLevel,
  VisualizationSettingId,
  VisualizationSettings,
} from 'explorviz-frontend/src/utils/settings/settings-schemas';
import { Mesh } from 'three';
import { useShallow } from 'zustand/react/shallow';
import SelectSetting from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/customizationbar/settings/setting-type/select-setting';
import { usePopupHandlerStore } from 'explorviz-frontend/src/stores/popup-handler';

interface SettingsProps {
  enterFullscreen(): void;
  setGamepadSupport(support: boolean): void;
}

export default function Settings({
  enterFullscreen,
  setGamepadSupport,
}: SettingsProps) {
  const [resetState, setResetState] = useState<boolean>(true);

  const visualizationSettings = useUserSettingsStore(
    (state) => state.visualizationSettings
  );
  const updateUserSetting = useUserSettingsStore(
    (state) => state.updateSetting
  );
  const showSuccessToastMessage = useToastHandlerStore(
    (state) => state.showSuccessToastMessage
  );
  const showErrorToastMessage = useToastHandlerStore(
    (state) => state.showErrorToastMessage
  );
  const { updateApplicationLayout } = useApplicationRendererStore(
    useShallow((state) => ({
      updateApplicationLayout: state.updateApplicationLayout,
    }))
  );
  const minimapCamera = useLocalUserStore((state) => state.minimapCamera);
  const updateMinimapSphereRadius = useMinimapStore(
    (state) => state.updateSphereRadius
  );
  const setMinimapEnabled = useMinimapStore((state) => state.setMinimapEnabled);
  const sendSyncRoomState = useMessageSenderStore(
    (state) => state.sendSyncRoomState
  );
  const serializeRoom = useRoomSerializerStore((state) => state.serializeRoom);
  const setHeatmapActive = useHeatmapConfigurationStore(
    (state) => state.setActive
  );

  const { applyDefaultSettings, applyDefaultSettingsForGroup, setColorScheme } =
    useUserSettingsStore(
      useShallow((state) => ({
        applyDefaultSettings: state.applyDefaultSettings,
        applyDefaultSettingsForGroup: state.applyDefaultSettingsForGroup,
        setColorScheme: state.setColorScheme,
      }))
    );

  const updateHighlightingInStore = useHighlightingStore(
    (state) => state.updateHighlighting
  );

  const popupHandlerState = usePopupHandlerStore(
    useShallow((state) => ({
      popupData: state.popupData,
    }))
  );

  const filteredSettingsByGroup = (() => {
    const settingGroupToSettingIds: Record<
      SettingGroup,
      VisualizationSettingId[]
    > = {
      Camera: [],
      Colors: [],
      Communication: [],
      Controls: [],
      Effects: [],
      Heatmap: [],
      Highlighting: [],
      Label: [],
      Layout: [],
      Minimap: [],
      Popups: [],
      'Virtual Reality': [],
      Debugging: [],
    };

    let settingId: keyof VisualizationSettings;
    // eslint-disable-next-line guard-for-in, no-restricted-syntax
    for (settingId in visualizationSettings) {
      const setting = visualizationSettings[settingId];
      // Filter settings level
      if (
        setting.level <=
        (visualizationSettings.showExtendedSettings
          .value as unknown as SettingLevel)
      ) {
        settingGroupToSettingIds[setting.group].push(settingId);
      }
    }

    return settingGroupToSettingIds;
  })();

  const cleanArray = (
    targets: Array<RangeSettingSchema>,
    inverse: boolean = false,
    alreadyReversed: boolean = false
  ) => {
    if (!inverse) {
      targets.reduce((prev, now, index) => {
        if (prev.value > now.value) {
          targets[index - 1].value = now.value - 1;
          cleanArray(targets, inverse, false);
        }
        return now;
      }, targets[0]);
    } else {
      if (!alreadyReversed) targets.reverse();
      targets.reduce((prev, now, index) => {
        if (prev.value < now.value) {
          targets[index - 1].value = now.value + 1;
          cleanArray(targets, inverse, true);
        }
        return now;
      }, targets[0]);

      // Reverse order back to normal
      if (!alreadyReversed) targets.reverse();
    }
  };

  const updateRangeSetting = (name: VisualizationSettingId, value: number) => {
    const settingId = name as VisualizationSettingId;
    try {
      updateUserSetting(settingId, value);
    } catch (e: any) {
      showErrorToastMessage(e.message);
    }
    switch (settingId) {
      case 'zoom':
        updateMinimapSphereRadius();
        break;
      default:
        break;
    }
  };

  const updateSelectSetting = (
    settingId: VisualizationSettingId,
    value: unknown
  ) => {
    try {
      updateUserSetting(settingId, value);
    } catch (e: any) {
      showErrorToastMessage(e.message);
    }
  };

  const updateButtonSetting = (settingId: VisualizationSettingId) => {
    switch (settingId) {
      case 'syncRoomState':
        if (
          confirm(
            'Synchronize room state: This may lead to loading times for other users. Continue?'
          )
        ) {
          sendSyncRoomState(serializeRoom(popupHandlerState.popupData));
        }
        break;
      case 'fullscreen':
        if (enterFullscreen) {
          enterFullscreen();
        }
        break;
      case 'resetToDefaults':
        resetSettingsAndUpdate();
        showSuccessToastMessage('Settings reset');
        break;
      default:
        break;
    }
  };

  const updateFlagSetting = (
    settingId: VisualizationSettingId,
    value: boolean
  ) => {
    try {
      updateUserSetting(settingId, value);
    } catch (e: any) {
      showErrorToastMessage(e.message);
    }

    if (settingId.startsWith('layer')) {
      const layerNumber = parseInt(settingId.slice(5), 10); // Extract the layer number from settingId
      if (!isNaN(layerNumber)) {
        // Ensure it's a valid number
        if (value || value === undefined) {
          minimapCamera.layers.enable(layerNumber);
        } else {
          minimapCamera.layers.disable(layerNumber);
        }
      }
    } else {
      switch (settingId) {
        case 'enableGamepadControls':
          setGamepadSupport(value);
          break;
        case 'heatmapEnabled':
          setHeatmapActive(value);
          break;
        case 'minimap':
          setMinimapEnabled(value);
          break;
        default:
          break;
      }
    }

    const scene = useSceneRepositoryStore.getState().getScene('browser', false);
    const directionalLight = scene.getObjectByName('DirectionalLight');
    const spotLight = scene.getObjectByName('SpotLight');

    switch (settingId) {
      case 'castShadows':
        if (directionalLight) directionalLight.castShadow = value;
        if (spotLight) spotLight.castShadow = value;
        // Update shadow casting on objects
        scene.traverse((child) => {
          if (child instanceof Mesh) child.material.needsUpdate = true;
        });
        break;
      case 'enableGamepadControls':
        setGamepadSupport(value);
        break;
      default:
        break;
    }
  };

  const applyColorScheme = (colorScheme: ColorSchemeId) => {
    setColorScheme(colorScheme);
    setResetState(!resetState);
  };

  const updateVisualizationState = () => {
    updateHighlightingInStore();
    updateApplicationLayout();
  };

  const resetGroup = (groupId: string) => {
    applyDefaultSettingsForGroup(groupId);
    updateVisualizationState();
    setResetState(!resetState);
  };

  const resetSettingsAndUpdate = async () => {
    applyDefaultSettings(true);
    setResetState(!resetState);
    updateVisualizationState();
  };

  return Object.entries(filteredSettingsByGroup).map(
    ([groupId, settingIdArray]) => {
      if (settingIdArray.length === 0) {
        return <React.Fragment key={groupId}></React.Fragment>;
      }
      return (
        <React.Fragment key={groupId}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <h6 className="mt-3">
              <strong>{groupId}</strong>
            </h6>
            <ResetButton onClick={resetGroup} args={groupId} />
          </div>
          {groupId === 'Colors' && (
            <div id="colorHeader" className="mb-2">
              <ColorSchemeSelector
                colorSchemes={colorSchemes}
                applyColorScheme={applyColorScheme}
              />
            </div>
          )}
          <div className="ml-3">
            {settingIdArray.map((settingId) => {
              const setting = visualizationSettings[settingId];
              if (isFlagSetting(setting)) {
                return (
                  <FlagSetting
                    key={settingId}
                    setting={setting}
                    settingId={settingId}
                    onChange={updateFlagSetting}
                    resetState={resetState}
                  />
                );
              } else if (isRangeSetting(setting)) {
                return (
                  <RangeSetting
                    key={settingId}
                    setting={setting}
                    settingId={settingId}
                    onChange={updateRangeSetting}
                  />
                );
              } else if (isColorSetting(setting)) {
                return (
                  <ColorPicker
                    key={settingId}
                    id={settingId as ColorSettingId}
                    setting={setting}
                    resetState={resetState}
                  />
                );
              } else if (isButtonSetting(setting)) {
                return (
                  <ButtonSetting
                    key={settingId}
                    setting={setting}
                    settingId={settingId}
                    onClick={updateButtonSetting}
                  />
                );
              } else if (isSelectSetting(setting)) {
                return (
                  <SelectSetting
                    key={settingId}
                    setting={setting}
                    settingId={settingId}
                    onChange={updateSelectSetting}
                  />
                );
              }
              return null;
            })}
          </div>
        </React.Fragment>
      );
    }
  );
}

const colorSchemes: { name: string; id: ColorSchemeId }[] = [
  { name: 'Default', id: 'default' },
  { name: 'Classic (Initial)', id: 'classic' },
  { name: 'Desert City', id: 'desert' },
  { name: 'Blue', id: 'blue' },
  { name: 'Dark', id: 'dark' },
];
