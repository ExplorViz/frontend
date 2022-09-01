import Component from '@glimmer/component';
import UserSettings from 'explorviz-frontend/services/user-settings';
import AlertifyHandler from 'explorviz-frontend/utils/alertify-handler';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import Configuration from 'explorviz-frontend/services/configuration';
import { ColorScheme } from 'explorviz-frontend/utils/settings/color-schemes';
import {
  ApplicationColorSettings, ApplicationSettingId, ApplicationSettings,
  LandscapeColorSettings, LandscapeSettingId, LandscapeSettings, SettingGroup,
} from 'explorviz-frontend/utils/settings/settings-schemas';

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

  colorSchemes: { name: string, id: ColorScheme }[] = [
    { name: 'Default', id: 'default' },
    { name: 'Vision Impairment', id: 'impaired' },
    { name: 'Classic (Initial)', id: 'classic' },
    { name: 'Dark', id: 'dark' },
  ];

  get applicationSettingsSortedByGroup() {
    const { applicationSettings } = this.userSettings;

    const settingGroupToSettingIds: Record<SettingGroup, ApplicationSettingId[]> = {
      'Hover Effects': [],
      Colors: [],
      Communication: [],
      Highlighting: [],
      Popup: [],
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
        (settingId1, settingId2) => applicationSettings[settingId1].orderNumber
            - applicationSettings[settingId2].orderNumber,
      );
    }

    return settingGroupToSettingIds;
  }

  get landscapeSettingsSortedByGroup() {
    const { landscapeSettings } = this.userSettings;

    const settingGroupToSettingIds: Record<SettingGroup, LandscapeSettingId[]> = {
      'Hover Effects': [],
      Colors: [],
      Communication: [],
      Highlighting: [],
      Popup: [],
      Debugging: [],
    };

    let settingId: keyof LandscapeSettings;
    // eslint-disable-next-line guard-for-in, no-restricted-syntax
    for (settingId in landscapeSettings) {
      const setting = landscapeSettings[settingId];
      settingGroupToSettingIds[setting.group].push(settingId);
    }

    let settingGroupId: SettingGroup;
    // eslint-disable-next-line guard-for-in, no-restricted-syntax
    for (settingGroupId in settingGroupToSettingIds) {
      const settingArray = settingGroupToSettingIds[settingGroupId];
      settingArray.sort(
        (settingId1, settingId2) => landscapeSettings[settingId1].orderNumber
            - landscapeSettings[settingId2].orderNumber,
      );
    }

    return settingGroupToSettingIds;
  }

  @action
  updateRangeSetting(name: ApplicationSettingId | LandscapeSettingId, event?: Event) {
    const input = event?.target ? (event.target as HTMLInputElement).valueAsNumber : undefined;

    if (this.args.isLandscapeView) {
      const settingId = name as LandscapeSettingId;
      try {
        this.userSettings.updateLandscapeSetting(settingId, input);
      } catch (e) {
        AlertifyHandler.showAlertifyError(e.message);
      }
    } else {
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
  }

  @action
  updateFlagSetting(name: ApplicationSettingId | LandscapeSettingId, value: boolean) {
    if (this.args.isLandscapeView) {
      const settingId = name as LandscapeSettingId;
      try {
        this.userSettings.updateLandscapeSetting(settingId, value);
      } catch (e) {
        AlertifyHandler.showAlertifyError(e.message);
      }
    } else {
      const settingId = name as ApplicationSettingId;
      try {
        this.userSettings.updateApplicationSetting(settingId,
          value);
      } catch (e) {
        AlertifyHandler.showAlertifyError(e.message);
      }
    }
  }

  @action
  updateColorSetting(name: ApplicationSettingId | LandscapeSettingId, value: string) {
    if (this.args.isLandscapeView) {
      const settingId = name as LandscapeSettingId;
      try {
        this.userSettings.updateLandscapeSetting(settingId, value);
      } catch (e) {
        AlertifyHandler.showAlertifyError(e.message);
      }
    } else {
      const settingId = name as ApplicationSettingId;
      try {
        this.userSettings.updateApplicationSetting(settingId, value);
      } catch (e) {
        AlertifyHandler.showAlertifyError(e.message);
      }
    }
  }

  @action
  applyColorScheme(colorScheme: ColorScheme) {
    this.userSettings.setColorScheme(colorScheme);
    this.applyColorsFromUserSettings();
  }

  applyColorsFromUserSettings() {
    const { landscapeColors, applicationColors } = this.configuration;

    let settingId: keyof LandscapeColorSettings;
    // eslint-disable-next-line guard-for-in, no-restricted-syntax
    for (settingId in landscapeColors) {
      this.configuration.landscapeColors[settingId]
        .set(this.userSettings.landscapeSettings[settingId].value);
    }

    let settingId2: keyof ApplicationColorSettings;
    // eslint-disable-next-line guard-for-in, no-restricted-syntax
    for (settingId2 in applicationColors) {
      this.configuration.applicationColors[settingId2]
        .set(this.userSettings.applicationSettings[settingId2].value);
    }

    this.args.updateColors?.();
  }

  @action
  close() {
    this.args.removeComponent('settings');
  }
}
