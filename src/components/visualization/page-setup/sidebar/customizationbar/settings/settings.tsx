import React, { useState } from 'react';

import ColorPicker from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/customizationbar/settings/color-picker';
import ColorSchemeSelector from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/customizationbar/settings/color-scheme-selector';
import ButtonSetting from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/customizationbar/settings/setting-type/button-setting';
import FlagSetting from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/customizationbar/settings/setting-type/flag-setting';
import RangeSetting from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/customizationbar/settings/setting-type/range-setting';
import ResetButton from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/customizationbar/settings/setting-type/reset-button';
import PopupData from 'explorviz-frontend/src/components/visualization/rendering/popups/popup-data';
import { useApplicationRendererStore } from 'explorviz-frontend/src/stores/application-renderer';
import { useLocalUserStore } from 'explorviz-frontend/src/stores/collaboration/local-user';
import { useMessageSenderStore } from 'explorviz-frontend/src/stores/collaboration/message-sender';
import { useRoomSerializerStore } from 'explorviz-frontend/src/stores/collaboration/room-serializer';
import { useConfigurationStore } from 'explorviz-frontend/src/stores/configuration';
import { useHeatmapConfigurationStore } from 'explorviz-frontend/src/stores/heatmap/heatmap-configuration';
import { useHighlightingStore } from 'explorviz-frontend/src/stores/highlighting';
import { useMinimapStore } from 'explorviz-frontend/src/stores/minimap-service';
import { useSceneRepositoryStore } from 'explorviz-frontend/src/stores/repos/scene-repository';
import { useToastHandlerStore } from 'explorviz-frontend/src/stores/toast-handler';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { ColorSchemeId } from 'explorviz-frontend/src/utils/settings/color-schemes';
import { defaultVizSettings } from 'explorviz-frontend/src/utils/settings/default-settings';
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
import SemanticZoomManager from 'explorviz-frontend/src/view-objects/3d/application/utils/semantic-zoom-manager';
import { Mesh } from 'three';
import { useShallow } from 'zustand/react/shallow';
import SelectSetting from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/customizationbar/settings/setting-type/select-setting';

interface SettingsProps {
  enterFullscreen(): void;
  popups: PopupData[];
  redrawCommunication(): void;
  resetSettings?(saveToLocalStorage: boolean): void;
  setGamepadSupport(support: boolean): void;
  showSemanticZoomClusterCenters(): void;
  updateColors(): void;
  updateHighlighting(): void;
}

export default function Settings({
  enterFullscreen,
  popups,
  redrawCommunication,
  resetSettings,
  setGamepadSupport,
  showSemanticZoomClusterCenters,
  updateColors,
  updateHighlighting,
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
  const {
    closeAllComponentsOfAllApplications,
    openAllComponentsOfAllApplications,
    updateApplicationLayout,
  } = useApplicationRendererStore(
    useShallow((state) => ({
      closeAllComponentsOfAllApplications:
        state.closeAllComponentsOfAllApplications,
      openAllComponentsOfAllApplications:
        state.openAllComponentsOfAllApplications,
      updateApplicationLayout: state.updateApplicationLayout,
    }))
  );
  const updateLabels = useApplicationRendererStore(
    (state) => state.updateLabels
  );
  const addCommunicationForAllApplications = useApplicationRendererStore(
    (state) => state.addCommunicationForAllApplications
  );
  const defaultCamera = useLocalUserStore((state) => state.defaultCamera);
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
  const setSemanticZoomEnabled = useConfigurationStore(
    (state) => state.setSemanticZoomEnabled
  );

  const {
    applyDefaultSettingsForGroup,
    setColorScheme,
    updateUserSettingsColors,
  } = useUserSettingsStore(
    useShallow((state) => ({
      applyDefaultSettingsForGroup: state.applyDefaultSettingsForGroup,
      setColorScheme: state.setColorScheme,
      updateUserSettingsColors: state.updateColors,
    }))
  );

  const updateHighlightingInStore = useHighlightingStore(
    (state) => state.updateHighlighting
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
      Layout: [],
      Minimap: [],
      Popups: [],
      'Semantic Zoom': [],
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

  const semanticZoomPreSetSetter = (targetPreset: number, valueArray: any) => {
    if (targetPreset == 1) {
      valueArray[0].value = 5;
      valueArray[1].value = 30;
      valueArray[2].value = 40;
      valueArray[3].value = 50;
      valueArray[4].value = 60;
    } else if (targetPreset == 2) {
      valueArray[0].value = 10;
      valueArray[1].value = 40;
      valueArray[2].value = 50;
      valueArray[3].value = 60;
      valueArray[4].value = 70;
    } else if (targetPreset == 3) {
      valueArray[0].value = 20;
      valueArray[1].value = 50;
      valueArray[2].value = 60;
      valueArray[3].value = 70;
      valueArray[4].value = 80;
    } else if (targetPreset == 4) {
      valueArray[0].value = 40;
      valueArray[1].value = 60;
      valueArray[2].value = 70;
      valueArray[3].value = 80;
      valueArray[4].value = 90;
    } else if (targetPreset == 5) {
      valueArray[0].value = 65;
      valueArray[1].value = 80;
      valueArray[2].value = 85;
      valueArray[3].value = 90;
      valueArray[4].value = 95;
    } else if (targetPreset == 6) {
      valueArray[0].value = 75;
      valueArray[1].value = 80;
      valueArray[2].value = 85;
      valueArray[3].value = 90;
      valueArray[4].value = 95;
    }
    // Update all the values and save them to the storage
    for (let index = 0; index < valueArray.length; index++) {
      const targetValue = valueArray[index].value;
      updateUserSetting(
        ('distanceLevel' + (index + 1).toString()) as VisualizationSettingId,
        targetValue
      );
    }
  };

  const updateRangeSetting = (name: VisualizationSettingId, value: number) => {
    const pre_input: string | number | boolean = defaultVizSettings[name].value;
    const settingId = name as VisualizationSettingId;
    try {
      updateUserSetting(settingId, value);
    } catch (e: any) {
      showErrorToastMessage(e.message);
    }
    const semZoomLevels = [
      visualizationSettings.distanceLevel1,
      visualizationSettings.distanceLevel2,
      visualizationSettings.distanceLevel3,
      visualizationSettings.distanceLevel4,
      visualizationSettings.distanceLevel5,
    ];
    switch (settingId) {
      case 'applicationDistance':
      case 'applicationAspectRatio':
      case 'classFootprint':
      case 'classMargin':
      case 'appLabelMargin':
      case 'appMargin':
      case 'packageLabelMargin':
      case 'packageMargin':
      case 'openedComponentHeight':
      case 'closedComponentHeight':
        updateApplicationLayout();
        break;
      case 'classLabelFontSize':
      case 'classLabelLength':
      case 'classLabelOffset':
      case 'classLabelOrientation':
        updateLabels();
        break;
      case 'transparencyIntensity':
        if (updateHighlighting) {
          updateHighlighting();
        }
        break;
      case 'commThickness':
      case 'commArrowSize':
      case 'commArrowOffset':
      case 'curvyCommHeight':
        if (redrawCommunication && updateHighlighting) {
          redrawCommunication();
          updateHighlighting();
        }
        break;
      case 'cameraNear':
        defaultCamera.near = value;
        defaultCamera.updateProjectionMatrix();
        break;
      case 'cameraFar':
        defaultCamera.far = value;
        defaultCamera.updateProjectionMatrix();
        break;
      case 'cameraFov':
        defaultCamera.fov = value;
        defaultCamera.updateProjectionMatrix();
        break;
      case 'distancePreSet':
        semanticZoomPreSetSetter(value!, semZoomLevels);
        updateUserSetting('usePredefinedSet', true);
        SemanticZoomManager.instance.createZoomLevelMapDependingOnMeshTypes(
          defaultCamera
        );
        SemanticZoomManager.instance.triggerLevelDecision2(undefined);
        break;
      case 'distanceLevel1':
      case 'distanceLevel2':
      case 'distanceLevel3':
      case 'distanceLevel4':
      case 'distanceLevel5':
        if (pre_input != undefined && value != undefined) {
          cleanArray(semZoomLevels, (pre_input as number) < value, false);
          updateUserSetting('usePredefinedSet', false);
        }
        SemanticZoomManager.instance.createZoomLevelMapDependingOnMeshTypes(
          defaultCamera
        );

        SemanticZoomManager.instance.triggerLevelDecision2(undefined);
        break;
      case 'clusterBasedOnMembers':
        SemanticZoomManager.instance.cluster(
          visualizationSettings.clusterBasedOnMembers.value
        );
        SemanticZoomManager.instance.triggerLevelDecision2(undefined);
        break;
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
    switch (settingId) {
      case 'applicationLayoutAlgorithm':
      case 'packageLayoutAlgorithm':
        updateApplicationLayout();
        break;
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
          sendSyncRoomState(serializeRoom(popups));
        }
        break;
      case 'showSemanticZoomCenterPoints':
        showSemanticZoomClusterCenters();
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

    const valueArray = [
      visualizationSettings.distanceLevel1,
      visualizationSettings.distanceLevel2,
      visualizationSettings.distanceLevel3,
      visualizationSettings.distanceLevel4,
      visualizationSettings.distanceLevel5,
    ];
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
        case 'applyHighlightingOnHover':
          if (updateHighlighting) {
            updateHighlighting();
          }
          break;
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
      case 'applyHighlightingOnHover':
        if (updateHighlighting) {
          updateHighlighting();
        }
        break;
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
      case 'semanticZoomState':
        if (!SemanticZoomManager.instance.isEnabled && value) {
          SemanticZoomManager.instance.activate();
        } else if (SemanticZoomManager.instance.isEnabled && !value) {
          SemanticZoomManager.instance.deactivate();
        }
        setSemanticZoomEnabled(SemanticZoomManager.instance.isEnabled);
        break;
      case 'usePredefinedSet':
        // Set the value of the Slider distancePreSet to the same value again, to trigger the update routine!
        semanticZoomPreSetSetter(
          visualizationSettings.distancePreSet.value,
          valueArray
        );
        SemanticZoomManager.instance.createZoomLevelMapDependingOnMeshTypes(
          defaultCamera
        );
        SemanticZoomManager.instance.triggerLevelDecision2(undefined);
        break;
      case 'autoOpenCloseFeature':
        value
          ? closeAllComponentsOfAllApplications()
          : openAllComponentsOfAllApplications();
        SemanticZoomManager.instance.toggleAutoOpenClose(value);
        SemanticZoomManager.instance.triggerLevelDecision2(undefined);
        break;
      case 'useKMeansInsteadOfMeanShift':
        SemanticZoomManager.instance.cluster(
          visualizationSettings.clusterBasedOnMembers.value
        );
        SemanticZoomManager.instance.triggerLevelDecision2(undefined);
        break;
      default:
        break;
    }
  };

  const applyColorScheme = (colorScheme: ColorSchemeId) => {
    setColorScheme(colorScheme);
    updateColors?.();
    setResetState(!resetState);
  };

  const updateVisualizationState = () => {
    updateUserSettingsColors();
    updateHighlightingInStore();
    defaultCamera.near = visualizationSettings.cameraNear.value;
    defaultCamera.far = visualizationSettings.cameraFar.value;
    defaultCamera.fov = visualizationSettings.cameraFov.value;
    defaultCamera.updateProjectionMatrix();
    updateApplicationLayout();
    updateLabels();
    addCommunicationForAllApplications();
  };

  const resetGroup = (groupId: string) => {
    applyDefaultSettingsForGroup(groupId);
    updateVisualizationState();
    setResetState(!resetState);
  };

  const resetSettingsAndUpdate = async () => {
    if (resetSettings) {
      resetSettings(true);
      setResetState(!resetState);
      updateVisualizationState();
    }
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
                    resetState={resetState}
                  />
                );
              } else if (isColorSetting(setting)) {
                return (
                  <ColorPicker
                    key={settingId}
                    id={settingId as ColorSettingId}
                    setting={setting}
                    updateColors={updateColors}
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
                    resetState={resetState}
                  />
                );
              } else if (isSelectSetting(setting)) {
                return (
                  <SelectSetting
                    key={settingId}
                    setting={setting}
                    settingId={settingId}
                    onChange={updateSelectSetting}
                    resetState={resetState}
                  />
                );
              }
              return <React.Fragment key={settingId}></React.Fragment>;
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
  { name: 'Blue', id: 'blue' },
  { name: 'Dark', id: 'dark' },
];
