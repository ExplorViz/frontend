import { Container, Text } from '@react-three/uikit';

import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import {
  isSettingDependencyMet,
  SettingGroup,
  SettingLevel,
  VisualizationSettingId,
  VisualizationSettings,
} from '../../settings/settings-schemas';

import SubsettingsMenu from './subsettings-menu';

export default function SettingsMenu() {
  const visualizationSettings = useUserSettingsStore((state) => state.visualizationSettings);

  const filteredSettingsByGroup = (() => {
    const settingGroupToSettingIds: Record<SettingGroup, VisualizationSettingId[]> = {
      Camera: [],
      Colors: [],
      Communication: [],
      Controls: [],
      Debugging: [],
      Effects: [],
      Heatmap: [],
      Highlighting: [],
      Layout: [],
      Label: [],
      Magnifier: [],
      Minimap: [],
      Popups: [],
      'Semantic Zoom': [],
      'Virtual Reality': [],
    };

    let settingId: keyof VisualizationSettings;

    for (settingId in visualizationSettings) {
      const setting = visualizationSettings[settingId];
      if (setting.level <= (visualizationSettings.showExtendedSettings.value as unknown as SettingLevel)) {
        if (isSettingDependencyMet(setting.dependsOn, visualizationSettings)) {
          const groupSettings = settingGroupToSettingIds[setting.group];
          if (!groupSettings) {
            continue;
          }
          groupSettings.push(settingId);
        }
      }
    }

    return settingGroupToSettingIds;
  })();

  return Object.entries(filteredSettingsByGroup).map(([groupId, settingIdArray]) => {
    return (
      <Container key={groupId} flexDirection="column">
        <Text>{groupId}</Text>
        {settingIdArray.length > 0 &&
          settingIdArray.map((settingId) => {
            return <SubsettingsMenu key={settingId} settingId={settingId} />;
          })}
      </Container>
    );
  });
}
