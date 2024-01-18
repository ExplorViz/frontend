import Component from '@glimmer/component';
import UserSettings from 'explorviz-frontend/services/user-settings';
import AlertifyHandler from 'explorviz-frontend/utils/alertify-handler';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import Configuration from 'explorviz-frontend/services/configuration';
import { ColorSchemeId } from 'explorviz-frontend/utils/settings/color-schemes';
import {
  ApplicationSettingId,
  ApplicationSettings,
  SettingGroup,
} from 'explorviz-frontend/utils/settings/settings-schemas';
import CollaborationSession from 'collaborative-mode/services/collaboration-session';
import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';
import HighlightingService from 'explorviz-frontend/services/highlighting-service';
import { RenderMode } from 'explorviz-frontend/controllers/visualization';

interface Args {
  updateHighlighting?(): void;
  updateColors?(): void;
  redrawCommunication?(): void;
  resetSettings?(): void;
  enterFullscreen?(): void;
}

export default class Settings extends Component<Args> {
  @service('application-renderer')
  applicationRenderer!: ApplicationRenderer;

  @service('highlighting-service')
  highlightingService!: HighlightingService;

  @service('user-settings')
  userSettings!: UserSettings;

  @service('configuration')
  configuration!: Configuration;

  @service('collaboration-session')
  private collaborationSession!: CollaborationSession;

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
      Rendering: [],
      'Hover Effects': [],
      Colors: [],
      Communication: [],
      Highlighting: [],
      Popup: [],
      Camera: [],
      'Extended Reality': [],
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
      AlertifyHandler.showAlertifyError(e.message);
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
      default:
        break;
    }
  }

  @action
  updateButtonSetting(settingId: ApplicationSettingId) {
    switch (settingId) {
      case 'fullscreen':
        if (this.args.enterFullscreen) {
          this.args.enterFullscreen();
        }
        break;
      case 'resetToDefaults':
        this.resetSettings();
        break;
      default:
        break;
    }
  }

  @action
  updateFlagSetting(name: ApplicationSettingId, value: boolean) {
    const settingId = name as ApplicationSettingId;
    try {
      if (
        this.collaborationSession.connectionStatus === 'online' &&
        settingId === 'keepHighlightingOnOpenOrClose'
      ) {
        AlertifyHandler.showAlertifyWarning(
          'Switching Mode Not Allowed In Collaboration Session'
        );
        return;
      }
      this.userSettings.updateApplicationSetting(settingId, value);
    } catch (e) {
      AlertifyHandler.showAlertifyError(e.message);
    }

    


    switch (settingId) {
      case 'applyHighlightingOnHover':
        if (this.args.updateHighlighting) {
          this.args.updateHighlighting();
        }
        break;
      case 'staticStructure':
          if (
            !this.userSettings.applicationSettings.dynamicStructure.value && !value
          ) {
            AlertifyHandler.showAlertifyWarning(
              'One structure to render required!'
            );
            this.userSettings.updateApplicationSetting(settingId, !value);
          }else {
            if(value) {
              // turned on
              this.applicationRenderer.renderSettingChanged(RenderMode.STATIC_DYNAMIC);
            } else {
              // turned off
              this.applicationRenderer.renderSettingChanged(RenderMode.DYNAMIC_ONLY);
            }
          }
        break;
      case 'dynamicStructure':
          if (
            !this.userSettings.applicationSettings.staticStructure.value && !value
          ) {
            AlertifyHandler.showAlertifyWarning(
              'One structure to render required!'
            );
            this.userSettings.updateApplicationSetting(settingId, !value);
          } else {
            if(value) {
              // turned on
              this.applicationRenderer.renderSettingChanged(RenderMode.STATIC_DYNAMIC);
            }else {
              //turned off
              this.applicationRenderer.renderSettingChanged(RenderMode.STATIC_ONLY);
            }
          }
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
      AlertifyHandler.showAlertifyError(e.message);
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
    }
  }

  @action
  didInsert(div: any, params: any[]) {
    console.log("DID INSERT ", params[0]);
  }
}
