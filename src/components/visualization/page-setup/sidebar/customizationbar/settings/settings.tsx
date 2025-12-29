import React, { useRef } from 'react';

import ColorPicker from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/customizationbar/settings/color-picker';
import ColorSchemeSelector from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/customizationbar/settings/color-scheme-selector';
import SettingPresets from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/customizationbar/settings/setting-presets';
import ButtonSetting from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/customizationbar/settings/setting-type/button-setting';
import FlagSetting from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/customizationbar/settings/setting-type/flag-setting';
import RangeSetting from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/customizationbar/settings/setting-type/range-setting';
import ResetButton from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/customizationbar/settings/setting-type/reset-button';
import SelectSetting from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/customizationbar/settings/setting-type/select-setting';
import { useLocalUserStore } from 'explorviz-frontend/src/stores/collaboration/local-user';
import { useMessageSenderStore } from 'explorviz-frontend/src/stores/collaboration/message-sender';
import { useRoomSerializerStore } from 'explorviz-frontend/src/stores/collaboration/room-serializer';
import { useHeatmapConfigurationStore } from 'explorviz-frontend/src/stores/heatmap/heatmap-configuration';
import { useMinimapStore } from 'explorviz-frontend/src/stores/minimap-service';
import { usePopupHandlerStore } from 'explorviz-frontend/src/stores/popup-handler';
import { useToastHandlerStore } from 'explorviz-frontend/src/stores/toast-handler';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { deleteTraceData } from 'explorviz-frontend/src/utils/landscape-http-request-util';
import { ColorSchemeId } from 'explorviz-frontend/src/utils/settings/color-schemes';
import {
  ColorSettingId,
  isButtonSetting,
  isColorSetting,
  isFlagSetting,
  isRangeSetting,
  isSelectSetting,
  RangeSetting as RangeSettingSchema,
  SettingDependency,
  SettingGroup,
  SettingLevel,
  VisualizationSettingId,
  VisualizationSettings,
} from 'explorviz-frontend/src/utils/settings/settings-schemas';
import { useShallow } from 'zustand/react/shallow';

interface SettingsProps {
  enterFullscreen(): void;
  setGamepadSupport(support: boolean): void;
}

export default function Settings({
  enterFullscreen,
  setGamepadSupport,
}: SettingsProps) {
  const stickyNavRef = useRef<HTMLDivElement>(null);
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

  const popupHandlerState = usePopupHandlerStore(
    useShallow((state) => ({
      popupData: state.popupData,
    }))
  );

  /**
   * Checks if a setting's dependency condition is met.
   * Returns true if the setting has no dependency or if the dependency is satisfied.
   */
  const isDependencyMet = (
    dependsOn: SettingDependency | undefined,
    allSettings: VisualizationSettings
  ): boolean => {
    if (dependsOn === undefined) {
      return true;
    }

    const dependentSetting = allSettings[dependsOn.settingId];
    const dependentValue = dependentSetting.value;

    // Check for single value equality
    if ('value' in dependsOn) {
      return dependentValue === dependsOn.value;
    }

    // Check for array of allowed values
    if ('values' in dependsOn) {
      return dependsOn.values.includes(dependentValue);
    }

    // Check for not equal condition
    if ('notEqual' in dependsOn) {
      return dependentValue !== dependsOn.notEqual;
    }

    // Check for array of not allowed values
    if ('notValues' in dependsOn) {
      return !dependsOn.notValues.includes(dependentValue);
    }

    return false;
  };

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
      'Semantic Zoom': [],
      'Virtual Reality': [],
      Misc: [],
      Debugging: [],
    };

    let settingId: keyof VisualizationSettings;

    for (settingId in visualizationSettings) {
      const setting = visualizationSettings[settingId];
      // Filter settings level
      if (
        setting.level <=
        (visualizationSettings.showExtendedSettings
          .value as unknown as SettingLevel)
      ) {
        // Check if dependency condition is met
        if (isDependencyMet(setting.dependsOn, visualizationSettings)) {
          settingGroupToSettingIds[setting.group].push(settingId);
        }
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
      case 'clearTraceData':
        if (
          confirm(
            'Clear Trace Data: This will permanently delete all trace and span data for the current landscape token (structure, traces, and timestamps). This action cannot be undone!\n\nAfter deletion, the page will reload. New data will appear once your application sends new spans. Continue?'
          )
        ) {
          deleteTraceData()
            .then(() => {
              showSuccessToastMessage(
                'Trace data cleared. Reloading page... New data will appear when spans arrive.'
              );
              // Reload the page after a short delay to allow the toast to be seen
              // This ensures the frontend fetches fresh timestamps after deletion
              setTimeout(() => {
                window.location.reload();
              }, 2000);
            })
            .catch((error) => {
              showErrorToastMessage(
                `Failed to clear trace data: ${error.message}`
              );
            });
        }
        break;
      default:
        break;
    }
  };

  const updateFlagSetting = (
    settingId: VisualizationSettingId,
    value?: boolean
  ) => {
    try {
      updateUserSetting(settingId, value);
    } catch (e: any) {
      showErrorToastMessage(e.message);
    }
    if (value === undefined) return;

    if (settingId.startsWith('layer')) {
      const layerNumber = parseInt(settingId.slice(5), 10); // Extract the layer number from settingId
      if (!isNaN(layerNumber)) {
        // Ensure it's a valid number
        if (value) {
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

    switch (settingId) {
      case 'enableGamepadControls':
        setGamepadSupport(value);
        break;
      default:
        break;
    }
  };

  const applyColorScheme = (colorScheme: ColorSchemeId) => {
    setColorScheme(colorScheme);
  };

  const resetGroup = (groupId: string) => {
    applyDefaultSettingsForGroup(groupId);
  };

  const resetSettingsAndUpdate = async () => {
    applyDefaultSettings(true);
  };

  const scrollToSection = (groupId: string) => {
    const htmlSettingGroup = document.getElementById(
      `settings-group-${groupId.toLowerCase().replace(/\s+/g, '-')}`
    );
    if (htmlSettingGroup) {
      const navHeight = stickyNavRef.current
        ? stickyNavRef.current.offsetHeight
        : 0;

      htmlSettingGroup.style.scrollMarginTop = `${navHeight}px`;

      htmlSettingGroup.scrollIntoView({
        behavior: 'smooth',
      });
    }
  };

  const groupedSettings = Object.entries(filteredSettingsByGroup).map(
    ([groupId, settingIdArray]) => {
      if (settingIdArray.length === 0) {
        return <React.Fragment key={groupId}></React.Fragment>;
      }
      const sectionId = `settings-group-${groupId.toLowerCase().replace(/\s+/g, '-')}`;
      return (
        <React.Fragment key={groupId}>
          <div
            id={sectionId}
            style={{ display: 'flex', justifyContent: 'space-between' }}
          >
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
                    settingId={settingId}
                    onChange={updateFlagSetting}
                  />
                );
              } else if (isRangeSetting(setting)) {
                return (
                  <RangeSetting
                    key={settingId}
                    settingId={settingId}
                    onChange={updateRangeSetting}
                  />
                );
              } else if (isColorSetting(setting)) {
                return (
                  <ColorPicker
                    key={settingId}
                    id={settingId as ColorSettingId}
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

  // Get available setting groups for navigation
  const availableGroups = Object.entries(filteredSettingsByGroup)
    .filter(([, settingIdArray]) => settingIdArray.length > 0)
    .map(([groupId]) => groupId);

  return (
    <>
      {/* Navigation Links */}
      {availableGroups.length > 1 && (
        <div ref={stickyNavRef} className="mb-3 quick-navigation-container">
          <h6 className="mb-2">
            <strong>Quick Navigation</strong>
          </h6>
          <div className="d-flex flex-wrap gap-1">
            {availableGroups.map((groupId) => (
              <button
                key={groupId}
                type="button"
                className="btn btn-outline-secondary btn-sm quick-navigation-button"
                onClick={() => scrollToSection(groupId)}
              >
                {groupId}
              </button>
            ))}
          </div>
        </div>
      )}
      <SettingPresets />
      {groupedSettings}
    </>
  );
}

const colorSchemes: { name: string; id: ColorSchemeId }[] = [
  { name: 'Default', id: 'default' },
  { name: 'Classic (Initial)', id: 'classic' },
  { name: 'Desert City', id: 'desert' },
  { name: 'Blue', id: 'blue' },
  { name: 'Dark', id: 'dark' },
];
