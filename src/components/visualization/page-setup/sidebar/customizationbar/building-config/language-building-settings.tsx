import { useModelStore } from 'explorviz-frontend/src/stores/repos/model-repository';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { Language } from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import { defaultVizSettings, GEOMETRY_OPTIONS } from 'explorviz-frontend/src/utils/settings/default-settings';
import {
  BuildingGeometryType,
  getLanguageColor,
  LANGUAGE_SETTING_CONFIG,
} from 'explorviz-frontend/src/utils/settings/language-settings';
import { SelectSetting as SelectSettingData } from 'explorviz-frontend/src/utils/settings/settings-schemas';
import { useMemo } from 'react';
import { ButtonGroup, ToggleButton } from 'react-bootstrap';
import ColorPicker from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/customizationbar/settings/color-picker';

type LanguageBuildingSettingsProps = {
  language: Language;
};

export default function LanguageBuildingSettings({
  language,
}: LanguageBuildingSettingsProps) {
  const config = LANGUAGE_SETTING_CONFIG[language];
  const visualizationSettings = useUserSettingsStore(
    (state) => state.visualizationSettings
  );
  const updateSetting = useUserSettingsStore((state) => state.updateSetting);

  const geometrySetting = visualizationSettings[
    config.geometrySettingId
  ] as SelectSettingData<string>;
  const selectedGeometry = geometrySetting.value as BuildingGeometryType;
  const color = getLanguageColor(language, visualizationSettings);

  const handleGeometryChange = (geometry: BuildingGeometryType) => {
    updateSetting(config.geometrySettingId, geometry);
  };

  return (
    <div className="building-config-language-body">
      <div className="building-config-language-preview">
        <span
          className="building-config-language-swatch"
          style={{ backgroundColor: color }}
          aria-hidden
        />
        <span className="building-config-language-preview-label">
          Preview
        </span>
      </div>
      <div className="building-config-language-controls">
        <div className="building-config-control-block">
          <span className="building-config-control-label">Color</span>
          <ColorPicker id={config.colorSettingId} label="Building color" />
        </div>
        <div className="building-config-control-block">
          <span className="building-config-control-label">Geometry</span>
          <ButtonGroup className="building-config-geometry-group">
            {GEOMETRY_OPTIONS.map((geometry) => (
              <ToggleButton
                key={geometry}
                id={`${language}-geometry-${geometry}`}
                type="radio"
                variant={
                  selectedGeometry === geometry ? 'primary' : 'outline-secondary'
                }
                name={`${language}-geometry`}
                value={geometry}
                checked={selectedGeometry === geometry}
                onChange={() => handleGeometryChange(geometry)}
                className="building-config-geometry-button"
              >
                {geometry}
              </ToggleButton>
            ))}
          </ButtonGroup>
          <button
            type="button"
            className="btn btn-link btn-sm building-config-reset-link"
            onClick={() =>
              updateSetting(
                config.geometrySettingId,
                defaultVizSettings[config.geometrySettingId].value
              )
            }
          >
            Reset geometry
          </button>
        </div>
      </div>
    </div>
  );
}

export function useLanguagesInLandscape(): Language[] {
  const allBuildings = useModelStore((state) => state.getAllBuildings);

  return useMemo(() => {
    const languages = new Set<Language>();
    for (const building of allBuildings()) {
      languages.add(building.language ?? 'LANGUAGE_UNSPECIFIED');
    }
    return Array.from(languages);
  }, [allBuildings]);
}
