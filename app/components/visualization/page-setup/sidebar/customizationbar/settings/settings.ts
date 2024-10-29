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
import Configuration from 'explorviz-frontend/services/configuration';

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

  @service('configuration')
  configuration!: Configuration;

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
      case 'distancePreSet':
        if (input == 1) {
          valueArray[0].value = 5;
          valueArray[1].value = 30;
          valueArray[2].value = 40;
          valueArray[3].value = 50;
          valueArray[4].value = 60;
        } else if (input == 2) {
          valueArray[0].value = 10;
          valueArray[1].value = 40;
          valueArray[2].value = 50;
          valueArray[3].value = 60;
          valueArray[4].value = 70;
        } else if (input == 3) {
          valueArray[0].value = 20;
          valueArray[1].value = 50;
          valueArray[2].value = 60;
          valueArray[3].value = 70;
          valueArray[4].value = 80;
        } else if (input == 4) {
          valueArray[0].value = 40;
          valueArray[1].value = 60;
          valueArray[2].value = 70;
          valueArray[3].value = 80;
          valueArray[4].value = 90;
        } else if (input == 5) {
          valueArray[0].value = 65;
          valueArray[1].value = 80;
          valueArray[2].value = 85;
          valueArray[3].value = 90;
          valueArray[4].value = 95;
        } else if (input == 6) {
          valueArray[0].value = 75;
          valueArray[1].value = 80;
          valueArray[2].value = 85;
          valueArray[3].value = 90;
          valueArray[4].value = 95;
        }
        // Update all the values and save them to the storage
        for (let index = 0; index < valueArray.length; index++) {
          const targetValue = valueArray[index].value;
          this.userSettings.updateApplicationSetting(
            ('distanceLevel' + (index + 1).toString()) as ApplicationSettingId,
            targetValue
          );
        }
        this.userSettings.updateApplicationSetting(
          'usePredefinedSet' as ApplicationSettingId,
          true
        );
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
          // Set `distancePreSet` to Custom Settings
          this.userSettings.updateApplicationSetting(
            'distancePreSet' as ApplicationSettingId,
            0
          );
        }
        // cleanArray resorts the user settings such that the condtion of increasing is satisfied.
        //this.cleanArray(valueArray, false);
        SemanticZoomManager.instance.createZoomLevelMapDependingOnMeshTypes(
          this.localUser.defaultCamera
        );
        this.userSettings.updateApplicationSetting(
          'usePredefinedSet' as ApplicationSettingId,
          false
        );
        //console.log(this.userSettings.applicationSettings.distanceLevel1.value);
        SemanticZoomManager.instance.triggerLevelDecision2(undefined);
        break;
      case 'clusterBasedOnMembers':
        SemanticZoomManager.instance.cluster(
          this.userSettings.applicationSettings.clusterBasedOnMembers.value
        );
        // SemanticZoomManager.instance.clusterManager?.setNumberOfClusters(
        //   this.userSettings.applicationSettings.clusterBasedOnMembers.value
        // );
        SemanticZoomManager.instance.triggerLevelDecision2(undefined);
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
      case 'semanticZoomState':
        if (SemanticZoomManager.instance.isEnabled == false && value == true) {
          SemanticZoomManager.instance.activate();
          //this.userSettings.updateApplicationSetting('semanticZoomState', true);
        } else if (
          SemanticZoomManager.instance.isEnabled == true &&
          value == false
        ) {
          //this.userSettings.updateApplicationSetting('semanticZoomState', false);
          SemanticZoomManager.instance.deactivate();
        }
        this.configuration.semanticZoomManagerState =
          SemanticZoomManager.instance.isEnabled;
        break;
      case 'autoOpenCloseFeature':
        SemanticZoomManager.instance.toggleAutoOpenClose(value);
        SemanticZoomManager.instance.triggerLevelDecision2(undefined);
        break;
      case 'useKmeansInsteadOfMeanShift':
        SemanticZoomManager.instance.cluster(
          this.userSettings.applicationSettings.clusterBasedOnMembers.value
        );
        SemanticZoomManager.instance.triggerLevelDecision2(undefined);
        break;
      // case 'useOrthographicCamera':
      //   break;
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
