import Component from '@glimmer/component';
import UserSettings from 'explorviz-frontend/services/user-settings';
import ToastHandlerService from 'explorviz-frontend/services/toast-handler';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { ColorSchemeId } from 'explorviz-frontend/utils/settings/color-schemes';
import {
  ApplicationSettingId,
  ApplicationSettings,
  RangeSetting,
  SettingGroup,
} from 'explorviz-frontend/utils/settings/settings-schemas';
import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';
import HighlightingService from 'explorviz-frontend/services/highlighting-service';
import LocalUser from 'collaboration/services/local-user';
import MessageSender from 'collaboration/services/message-sender';
import RoomSerializer from 'collaboration/services/room-serializer';
import PopupData from '../../../../rendering/popups/popup-data';
import SemanticZoomManager from 'explorviz-frontend/view-objects/3d/application/utils/semantic-zoom-manager';
import { defaultApplicationSettings } from 'explorviz-frontend/utils/settings/default-settings';

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

  @service('toast-handler')
  private toastHandlerService!: ToastHandlerService;

  @service('user-settings')
  private userSettings!: UserSettings;

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
      Colors: [],
      Controls: [],
      Communication: [],
      Highlighting: [],
      Effects: [],
      Popups: [],
      'Virtual Reality': [],
      Debugging: [],
      'Semantic Zoom': [],
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

  cleanArray(
    targets: Array<RangeSetting>,
    inverse: boolean = false,
    alreadyreversed: boolean = false
  ) {
    if (inverse == false) {
      targets.reduce((prev, now, idx) => {
        if (prev.value > now.value) {
          targets[idx - 1].value = now.value - 1;
          this.cleanArray(targets, inverse, false);
        }
        //  else if (targets[idx + 1].value < now.value) {
        //   targets[idx + 1].value = now.value + 1;
        //   //this.cleanArray(targets, inverse);
        // }
        return now;
      }, targets[0]);
    } else {
      if (alreadyreversed == false) targets.reverse();
      targets.reduce((prev, now, idx) => {
        if (prev.value < now.value) {
          targets[idx - 1].value = now.value + 1;
          this.cleanArray(targets, inverse, true);
        }
        //     //else if (targets[idx + 1].value > now.value) {
        //     //   targets[idx + 1].value = now.value - 1;
        //     //   //this.cleanArray(targets, inverse);
        //     // }
        return now;
      }, targets[0]);
      // targets[0] can still be used, since the inplace reverse happens before!

      // Reverse order back to normal
      if (alreadyreversed == false) targets.reverse();
    }

    // targets.reverse().reduce((prev, now, idx) => {
    //   if (prev.value < now.value) {
    //     targets[idx + 1].value = now.value + 1;
    //     this.cleanArray(targets);
    //   }
    //   return now;
    // }, targets[0]);
  }

  @action
  updateRangeSetting(name: ApplicationSettingId, event?: Event) {
    const input = event?.target
      ? (event.target as HTMLInputElement).valueAsNumber
      : undefined;
    const pre_input: string | number | boolean =
      defaultApplicationSettings[name].value;
    const settingId = name as ApplicationSettingId;
    try {
      this.userSettings.updateApplicationSetting(settingId, input);
    } catch (e) {
      this.toastHandlerService.showErrorToastMessage(e.message);
    }
    const valueArray = [
      this.userSettings.applicationSettings.distanceLevel1,
      this.userSettings.applicationSettings.distanceLevel2,
      this.userSettings.applicationSettings.distanceLevel3,
      this.userSettings.applicationSettings.distanceLevel4,
      this.userSettings.applicationSettings.distanceLevel5,
    ];
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
      case 'cameraFov':
        this.localUser.defaultCamera.fov =
          this.userSettings.applicationSettings.cameraFov.value;
        this.localUser.defaultCamera.updateProjectionMatrix();
        break;
      case 'distanceLevel1':
      case 'distanceLevel2':
      case 'distanceLevel3':
      case 'distanceLevel4':
      case 'distanceLevel5':
        if (pre_input != undefined && input != undefined) {
          this.cleanArray(valueArray, (pre_input as number) < input, false);
        }
        // cleanArray resorts the user settings such that the condtion of increasing is satisfied.
        //this.cleanArray(valueArray, false);
        SemanticZoomManager.instance.createZoomLevelMap(
          this.localUser.defaultCamera
        );
        //console.log(this.userSettings.applicationSettings.distanceLevel1.value);
        break;
      case 'clusterBasedOnMembers':
        SemanticZoomManager.instance.cluster(
          this.userSettings.applicationSettings.clusterBasedOnMembers.value
        );
        // SemanticZoomManager.instance.clusterManager?.setNumberOfClusters(
        //   this.userSettings.applicationSettings.clusterBasedOnMembers.value
        // );
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
    const settingId = name as ApplicationSettingId;
    try {
      this.userSettings.updateApplicationSetting(settingId, value);
    } catch (e) {
      this.toastHandlerService.showErrorToastMessage(e.message);
    }

    switch (settingId) {
      case 'applyHighlightingOnHover':
        if (this.args.updateHighlighting) {
          this.args.updateHighlighting();
        }
        break;
      case 'enableGamepadControls':
        this.args.setGamepadSupport(value);
        break;
      case 'autoOpenCloseFeature':
        SemanticZoomManager.instance.toggleAutoOpenClose(value);
        break;
      default:
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
