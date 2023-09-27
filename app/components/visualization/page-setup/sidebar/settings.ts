import Component from '@glimmer/component';
import UserSettings from 'explorviz-frontend/services/user-settings';
import AlertifyHandler from 'explorviz-frontend/utils/alertify-handler';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import Configuration from 'explorviz-frontend/services/configuration';
import { ColorScheme } from 'explorviz-frontend/utils/settings/color-schemes';
import {
  ApplicationColorSettings,
  ApplicationSettingId,
  ApplicationSettings,
  SettingGroup,
} from 'explorviz-frontend/utils/settings/settings-schemas';
import CollaborationSession from 'collaborative-mode/services/collaboration-session';

interface Args {
  isLandscapeView: boolean;
  updateHighlighting?(): void;
  updateColors?(): void;
  redrawCommunication?(): void;
  removeComponent(componentPath: string): void;
}

export default class Settings extends Component<Args> {
  @service('user-settings')
  userSettings!: UserSettings;

  @service('configuration')
  configuration!: Configuration;

  @service('collaboration-session')
  private collaborationSession!: CollaborationSession;

  colorSchemes: { name: string; id: ColorScheme }[] = [
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
      case 'commArrowSize':
        if (this.args.redrawCommunication && this.args.updateHighlighting) {
          this.args.redrawCommunication();
          this.args.updateHighlighting();
        }
        break;
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
  applyColorScheme(colorScheme: ColorScheme) {
    this.userSettings.setColorScheme(colorScheme);
    this.applyColorsFromUserSettings();
  }

  applyColorsFromUserSettings() {
    const { applicationColors } = this.configuration;

    let settingId: keyof ApplicationColorSettings;
    // eslint-disable-next-line guard-for-in, no-restricted-syntax
    for (settingId in applicationColors) {
      this.configuration.applicationColors[settingId].set(
        this.userSettings.applicationSettings[settingId].value
      );
    }

    this.args.updateColors?.();
  }

  @action
  close() {
    this.args.removeComponent('settings');
  }
}
