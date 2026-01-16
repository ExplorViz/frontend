import { Container, Text } from "@react-three/uikit";

import { useUserSettingsStore } from "explorviz-frontend/src/stores/user-settings";
import { SettingDependency, SettingGroup, SettingLevel, VisualizationSettingId, VisualizationSettings } from "../../settings/settings-schemas";

import SubsettingsMenu from "./subsettings-menu";

export default function SettingsMenu(){
  const visualizationSettings = useUserSettingsStore(
    (state) => state.visualizationSettings
  );
    
  /**
    * Checks if a setting's dependency condition is met.
    * Returns true if the setting has no dependency or if the dependency is satisfied.
    */
  const isDependencyMet = (
    dependsOn: SettingDependency | undefined,
    allSettings: VisualizationSettings
  ): boolean => {
    if (dependsOn === undefined) {
      return true;
    }
  
    const dependentSetting = allSettings[dependsOn.settingId];
    const dependentValue = dependentSetting.value;
  
    // Check for single value equality
    if ('value' in dependsOn) {
      return dependentValue === dependsOn.value;
    }
  
    // Check for array of allowed values
    if ('values' in dependsOn) {
      return dependsOn.values.includes(dependentValue);
    }
  
    // Check for not equal condition
    if ('notEqual' in dependsOn) {
      return dependentValue !== dependsOn.notEqual;
    }
  
    // Check for array of not allowed values
    if ('notValues' in dependsOn) {
      return !dependsOn.notValues.includes(dependentValue);
    }
  
    return false;
  };

  const filteredSettingsByGroup = (() => {
    const settingGroupToSettingIds: Record<
      SettingGroup,
      VisualizationSettingId[]
    > = {
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
      Misc: [],
      Popups: [],
      'Semantic Zoom': [],
      'Virtual Reality': [],
    };

    let settingId: keyof VisualizationSettings;

    for (settingId in visualizationSettings) {
      const setting = visualizationSettings[settingId];
      if (
        setting.level <=
        (visualizationSettings.showExtendedSettings.value as unknown as SettingLevel)
      ) {
        if (isDependencyMet(setting.dependsOn, visualizationSettings)) {
            settingGroupToSettingIds[setting.group].push(settingId);
        }
      }
    }

    return settingGroupToSettingIds;
  })();

  return (
    Object.entries(filteredSettingsByGroup).map(
      ([groupId, settingIdArray]) => {
        return (
          <Container flexDirection="column">
            <Text>{groupId}</Text>
            {settingIdArray.length > 0 && (
              settingIdArray.map((settingId) => {
                return (
                  <SubsettingsMenu settingId={settingId} />
                );
              })
            )}
          </Container>
        );
      }
    )
  );
}