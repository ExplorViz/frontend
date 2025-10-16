import { VisualizationSettings } from 'explorviz-frontend/src/utils/settings/settings-schemas';

export const SHARE_SETTINGS_EVENT = 'share_settings';

export type ShareSettingsMessage = {
  event: typeof SHARE_SETTINGS_EVENT;
  settings: VisualizationSettings;
};

export function isShareSettingsUpdateMessage(
  msg: any
): msg is ShareSettingsMessage {
  return (
    msg !== null &&
    typeof msg === 'object' &&
    msg.event === SHARE_SETTINGS_EVENT &&
    typeof msg.settings === 'object'
  );
}
