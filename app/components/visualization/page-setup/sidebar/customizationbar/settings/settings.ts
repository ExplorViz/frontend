import Component from '@glimmer/component';
import UserSettings from 'explorviz-frontend/services/user-settings';
import ToastHandlerService from 'explorviz-frontend/services/toast-handler';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { ColorSchemeId } from 'explorviz-frontend/utils/settings/color-schemes';
import {
  ApplicationSettingId,
  ApplicationSettings,
  SettingGroup,
} from 'explorviz-frontend/utils/settings/settings-schemas';
import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';
import HighlightingService from 'explorviz-frontend/services/highlighting-service';
import LocalUser from 'collaboration/services/local-user';
import MessageSender from 'collaboration/services/message-sender';
import RoomSerializer from 'collaboration/services/room-serializer';
import PopupData from '../../../../rendering/popups/popup-data';
import MinimapService from 'explorviz-frontend/services/minimap-service';
import SceneRepository from 'explorviz-frontend/services/repos/scene-repository';
import { Mesh } from 'three';

interface Args {
  enterFullscreen?(): void;
  popups: PopupData[];
  redrawCommunication?(): void;
  resetSettings?(): void;
  setGamepadSupport(support: boolean): void;
  updateColors?(): void;
  updateHighlighting?(): void;
}

export default class Settings extends Component<Args> {
  @service('application-renderer')
  private applicationRenderer!: ApplicationRenderer;

  @service('highlighting-service')
  private highlightingService!: HighlightingService;

  @service('local-user')
  private localUser!: LocalUser;

  @service('message-sender')
  private sender!: MessageSender;

  @service('room-serializer')
  private roomSerializer!: RoomSerializer;

  @service('repos/scene-repository')
  sceneRepo!: SceneRepository;

  @service('toast-handler')
  private toastHandlerService!: ToastHandlerService;

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

  get applicationSettingsSortedByGroup() {
    const { applicationSettings } = this.userSettings;

    const settingGroupToSettingIds: Record<
      SettingGroup,
      ApplicationSettingId[]
    > = {
      Camera: [],
      Minimap: [],
      Colors: [],
      Controls: [],
      Communication: [],
      Highlighting: [],
      Effects: [],
      Popups: [],
      Annotations: [],
      'Virtual Reality': [],
      Debugging: [],
    };

    let settingId: keyof ApplicationSettings;
    // eslint-disable-next-line guard-for-in, no-restricted-syntax
    for (settingId in applicationSettings) {
      const setting = applicationSettings[settingId];
      settingGroupToSettingIds[setting.group].push(settingId);
    }

    let settingGroupId: SettingGroup;
    // eslint-disable-next-line guard-for-in, no-restricted-syntax
    for (settingGroupId in settingGroupToSettingIds) {
      const settingArray = settingGroupToSettingIds[settingGroupId];
      settingArray.sort(
        (settingId1, settingId2) =>
          applicationSettings[settingId1].orderNumber -
          applicationSettings[settingId2].orderNumber
      );
    }

    return settingGroupToSettingIds;
  }

  @action
  updateRangeSetting(name: ApplicationSettingId, event?: Event) {
    const input = event?.target
      ? (event.target as HTMLInputElement).valueAsNumber
      : undefined;
    const settingId = name as ApplicationSettingId;
    try {
      this.userSettings.updateApplicationSetting(settingId, input);
    } catch (e) {
      this.toastHandlerService.showErrorToastMessage(e.message);
    }

    switch (settingId) {
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
          this.userSettings.applicationSettings.cameraNear.value;
        this.localUser.defaultCamera.updateProjectionMatrix();
        break;
      case 'cameraFar':
        this.localUser.defaultCamera.far =
          this.userSettings.applicationSettings.cameraFar.value;
        this.localUser.defaultCamera.updateProjectionMatrix();
        break;
      case 'cameraFov':
        this.localUser.defaultCamera.fov =
          this.userSettings.applicationSettings.cameraFov.value;
        this.localUser.defaultCamera.updateProjectionMatrix();
        break;
      case 'zoom':
        this.minimapService.updateSphereRadius();
        break;
      default:
        break;
    }
  }

  @action
  updateButtonSetting(settingId: ApplicationSettingId) {
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
  updateFlagSetting(name: ApplicationSettingId, value: boolean) {
    const settingId = name;
    const settingString = settingId as string;
    try {
      this.userSettings.updateApplicationSetting(settingId, value);
    } catch (e) {
      this.toastHandlerService.showErrorToastMessage(e.message);
    }
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
      default:
        break;
    }
  }

  @action
  updateColorSetting(name: ApplicationSettingId, value: string) {
    const settingId = name as ApplicationSettingId;
    try {
      this.userSettings.updateApplicationSetting(settingId, value);
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
  resetSettings() {
    if (this.args.resetSettings) {
      this.args.resetSettings();
      this.args.updateColors?.();
      this.applicationRenderer.addCommunicationForAllApplications();
      this.highlightingService.updateHighlighting();
      this.localUser.defaultCamera.fov =
        this.userSettings.applicationSettings.cameraFov.value;
      this.localUser.defaultCamera.updateProjectionMatrix();
    }
  }
}
