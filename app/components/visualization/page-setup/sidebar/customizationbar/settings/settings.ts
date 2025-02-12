import Component from '@glimmer/component';
import UserSettings from 'explorviz-frontend/services/user-settings';
import ToastHandlerService from 'explorviz-frontend/services/toast-handler';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { ColorSchemeId } from 'explorviz-frontend/utils/settings/color-schemes';
import {
  VisualizationSettingId,
  VisualizationSettings,
  SettingGroup,
  RangeSetting,
  SettingLevel,
} from 'explorviz-frontend/utils/settings/settings-schemas';
import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';
import HighlightingService from 'explorviz-frontend/services/highlighting-service';
import LocalUser from 'explorviz-frontend/services/collaboration/local-user';
import MessageSender from 'explorviz-frontend/services/collaboration/message-sender';
import RoomSerializer from 'explorviz-frontend/services/collaboration/room-serializer';
import PopupData from '../../../../rendering/popups/popup-data';
import SemanticZoomManager from 'explorviz-frontend/view-objects/3d/application/utils/semantic-zoom-manager';
import Configuration from 'explorviz-frontend/services/configuration';
import MinimapService from 'explorviz-frontend/services/minimap-service';
import SceneRepository from 'explorviz-frontend/services/repos/scene-repository';
import { Mesh } from 'three';
import HeatmapConfiguration from 'explorviz-frontend/services/heatmap/heatmap-configuration';
import { defaultVizSettings } from 'explorviz-frontend/utils/settings/default-settings';

interface Args {
  enterFullscreen(): void;
  popups: PopupData[];
  redrawCommunication(): void;
  resetSettings?(saveToLocalStorage: boolean): void;
  setGamepadSupport(support: boolean): void;
  showSemanticZoomClusterCenters(): void;
  updateColors(): void;
  updateHighlighting(): void;
}

export default class Settings extends Component<Args> {
  @service('application-renderer')
  private applicationRenderer!: ApplicationRenderer;

  @service('highlighting-service')
  private highlightingService!: HighlightingService;

  @service('collaboration/local-user')
  private localUser!: LocalUser;

  @service('heatmap/heatmap-configuration')
  private heatmapConf!: HeatmapConfiguration;

  @service('collaboration/message-sender')
  private sender!: MessageSender;

  @service('collaboration/room-serializer')
  private roomSerializer!: RoomSerializer;

  @service('repos/scene-repository')
  sceneRepo!: SceneRepository;

  @service('toast-handler')
  private toastHandlerService!: ToastHandlerService;

  @service('configuration')
  configuration!: Configuration;

  @service('user-settings')
  private userSettings!: UserSettings;

  @service('minimap-service')
  private minimapService!: MinimapService;

  colorSchemes: { name: string; id: ColorSchemeId }[] = [
    { name: 'Default', id: 'default' },
    { name: 'Classic (Initial)', id: 'classic' },
    { name: 'Blue', id: 'blue' },
    { name: 'Dark', id: 'dark' },
  ];

  get filteredSettingsByGroup() {
    const { visualizationSettings } = this.userSettings;

    const settingGroupToSettingIds: Record<
      SettingGroup,
      VisualizationSettingId[]
    > = {
      Annotations: [],
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
      // Filter Settings level
      if (
        setting.level <=
        (visualizationSettings.showExtendedSettings
          .value as unknown as SettingLevel)
      ) {
        settingGroupToSettingIds[setting.group].push(settingId);
      }
    }

    return settingGroupToSettingIds;
  }

  cleanArray(
    targets: Array<RangeSetting>,
    inverse: boolean = false,
    alreadyReversed: boolean = false
  ) {
    if (!inverse) {
      targets.reduce((prev, now, index) => {
        if (prev.value > now.value) {
          targets[index - 1].value = now.value - 1;
          this.cleanArray(targets, inverse, false);
        }
        return now;
      }, targets[0]);
    } else {
      if (!alreadyReversed) targets.reverse();
      targets.reduce((prev, now, index) => {
        if (prev.value < now.value) {
          targets[index - 1].value = now.value + 1;
          this.cleanArray(targets, inverse, true);
        }
        return now;
      }, targets[0]);

      // Reverse order back to normal
      if (!alreadyReversed) targets.reverse();
    }
  }

  @action
  updateRangeSetting(name: VisualizationSettingId, event?: Event) {
    const input = event?.target
      ? (event.target as HTMLInputElement).valueAsNumber
      : undefined;
    const pre_input: string | number | boolean = defaultVizSettings[name].value;
    const settingId = name as VisualizationSettingId;
    try {
      this.userSettings.updateSetting(settingId, input);
    } catch (e) {
      this.toastHandlerService.showErrorToastMessage(e.message);
    }
    const valueArray = [
      this.userSettings.visualizationSettings.distanceLevel1,
      this.userSettings.visualizationSettings.distanceLevel2,
      this.userSettings.visualizationSettings.distanceLevel3,
      this.userSettings.visualizationSettings.distanceLevel4,
      this.userSettings.visualizationSettings.distanceLevel5,
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
        this.applicationRenderer.updateApplicationLayout();
        break;
      case 'classLabelFontSize':
      case 'classLabelLength':
      case 'classLabelOffset':
      case 'classLabelOrientation':
        this.applicationRenderer.updateLabels();
        break;
      case 'transparencyIntensity':
        if (this.args.updateHighlighting) {
          this.args.updateHighlighting();
        }
        break;
      case 'commThickness':
      case 'commArrowSize':
      case 'curvyCommHeight':
        if (this.args.redrawCommunication && this.args.updateHighlighting) {
          this.args.redrawCommunication();
          this.args.updateHighlighting();
        }
        break;
      case 'cameraNear':
        this.localUser.defaultCamera.near =
          this.userSettings.visualizationSettings.cameraNear.value;
        this.localUser.defaultCamera.updateProjectionMatrix();
        break;
      case 'cameraFar':
        this.localUser.defaultCamera.far =
          this.userSettings.visualizationSettings.cameraFar.value;
        this.localUser.defaultCamera.updateProjectionMatrix();
        break;
      case 'cameraFov':
        this.localUser.defaultCamera.fov =
          this.userSettings.visualizationSettings.cameraFov.value;
        this.localUser.defaultCamera.updateProjectionMatrix();
        break;
      case 'distancePreSet':
        this.semanticZoomPreSetSetter(input!, valueArray);
        this.userSettings.updateSetting('usePredefinedSet', true);
        SemanticZoomManager.instance.createZoomLevelMapDependingOnMeshTypes(
          this.localUser.defaultCamera
        );
        SemanticZoomManager.instance.triggerLevelDecision2(undefined);
        break;
      case 'distanceLevel1':
      case 'distanceLevel2':
      case 'distanceLevel3':
      case 'distanceLevel4':
      case 'distanceLevel5':
        if (pre_input != undefined && input != undefined) {
          this.cleanArray(valueArray, (pre_input as number) < input, false);
          this.userSettings.updateSetting('usePredefinedSet', false);
        }
        SemanticZoomManager.instance.createZoomLevelMapDependingOnMeshTypes(
          this.localUser.defaultCamera
        );

        SemanticZoomManager.instance.triggerLevelDecision2(undefined);
        break;
      case 'clusterBasedOnMembers':
        SemanticZoomManager.instance.cluster(
          this.userSettings.visualizationSettings.clusterBasedOnMembers.value
        );
        SemanticZoomManager.instance.triggerLevelDecision2(undefined);
        break;
      case 'zoom':
        this.minimapService.updateSphereRadius();
        break;
      default:
        break;
    }
  }

  @action
  updateButtonSetting(settingId: VisualizationSettingId) {
    switch (settingId) {
      case 'syncRoomState':
        if (
          confirm(
            'Synchronize room state: This may lead to loading times for other users. Continue?'
          )
        ) {
          this.sender.sendSyncRoomState(
            this.roomSerializer.serializeRoom(this.args.popups)
          );
        }
        break;
      case 'showSemanticZoomCenterPoints':
        this.args.showSemanticZoomClusterCenters();
        break;
      case 'fullscreen':
        if (this.args.enterFullscreen) {
          this.args.enterFullscreen();
        }
        break;
      case 'resetToDefaults':
        this.resetSettings();
        this.toastHandlerService.showSuccessToastMessage('Settings reset');
        break;
      default:
        break;
    }
  }

  @action
  updateFlagSetting(name: VisualizationSettingId, value: boolean) {
    const settingId = name;
    const settingString = settingId as string;
    try {
      this.userSettings.updateSetting(settingId, value);
    } catch (e) {
      this.toastHandlerService.showErrorToastMessage(e.message);
    }
    const valueArray = [
      this.userSettings.visualizationSettings.distanceLevel1,
      this.userSettings.visualizationSettings.distanceLevel2,
      this.userSettings.visualizationSettings.distanceLevel3,
      this.userSettings.visualizationSettings.distanceLevel4,
      this.userSettings.visualizationSettings.distanceLevel5,
    ];
    if (settingString.startsWith('layer')) {
      const layerNumber = parseInt(settingString.slice(5), 10); // Extract the layer number from settingId
      if (!isNaN(layerNumber)) {
        // Ensure it's a valid number
        if (value || value === undefined) {
          this.localUser.minimapCamera.layers.enable(layerNumber);
        } else {
          this.localUser.minimapCamera.layers.disable(layerNumber);
        }
      }
    } else {
      switch (settingId) {
        case 'applyHighlightingOnHover':
          if (this.args.updateHighlighting) {
            this.args.updateHighlighting();
          }
          break;
        case 'enableGamepadControls':
          this.args.setGamepadSupport(value);
          break;
        case 'heatmapEnabled':
          this.heatmapConf.setActive(value);
          break;
        case 'minimap':
          this.minimapService.minimapEnabled = value;
          break;
        default:
          break;
      }
    }

    const scene = this.sceneRepo.getScene();
    const directionalLight = scene.getObjectByName('DirectionalLight');
    const spotLight = scene.getObjectByName('SpotLight');

    switch (settingId) {
      case 'applyHighlightingOnHover':
        if (this.args.updateHighlighting) {
          this.args.updateHighlighting();
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
        this.args.setGamepadSupport(value);
        break;
      case 'semanticZoomState':
        if (!SemanticZoomManager.instance.isEnabled && value) {
          SemanticZoomManager.instance.activate();
        } else if (SemanticZoomManager.instance.isEnabled && !value) {
          SemanticZoomManager.instance.deactivate();
        }
        this.configuration.semanticZoomEnabled =
          SemanticZoomManager.instance.isEnabled;
        break;
      case 'usePredefinedSet':
        // Set the value of the Slider distancePreSet to the same value again, to trigger the update routine!
        this.semanticZoomPreSetSetter(
          this.userSettings.visualizationSettings.distancePreSet.value,
          valueArray
        );
        SemanticZoomManager.instance.createZoomLevelMapDependingOnMeshTypes(
          this.localUser.defaultCamera
        );
        SemanticZoomManager.instance.triggerLevelDecision2(undefined);
        break;
      case 'autoOpenCloseFeature':
        SemanticZoomManager.instance.toggleAutoOpenClose(value);
        SemanticZoomManager.instance.triggerLevelDecision2(undefined);
        break;
      case 'useKmeansInsteadOfMeanShift':
        SemanticZoomManager.instance.cluster(
          this.userSettings.visualizationSettings.clusterBasedOnMembers.value
        );
        SemanticZoomManager.instance.triggerLevelDecision2(undefined);
        break;
      default:
        break;
    }
  }

  @action
  updateColorSetting(name: VisualizationSettingId, value: string) {
    const settingId = name as VisualizationSettingId;
    try {
      this.userSettings.updateSetting(settingId, value);
    } catch (e) {
      this.toastHandlerService.showErrorToastMessage(e.message);
    }
  }

  @action
  applyColorScheme(colorScheme: ColorSchemeId) {
    this.userSettings.setColorScheme(colorScheme);
    this.args.updateColors?.();
  }

  @action
  async resetSettings() {
    if (this.args.resetSettings) {
      this.args.resetSettings(true);
      this.args.updateColors?.();
      this.highlightingService.updateHighlighting();
      this.localUser.defaultCamera.fov =
        this.userSettings.visualizationSettings.cameraFov.value;
      this.localUser.defaultCamera.updateProjectionMatrix();
      this.applicationRenderer.updateApplicationLayout();
      this.applicationRenderer.addCommunicationForAllApplications();
    }
  }
  private semanticZoomPreSetSetter(targetPreset: number, valueArray: any) {
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
      this.userSettings.updateSetting(
        ('distanceLevel' + (index + 1).toString()) as VisualizationSettingId,
        targetValue
      );
    }
  }
}
