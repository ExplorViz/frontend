import ColorPicker from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/customizationbar/settings/color-picker';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { ModelType } from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import {
  BuildingGeometryType,
  GEOMETRY_OPTIONS,
} from 'explorviz-frontend/src/utils/settings/settings-schemas';
import { ButtonGroup, ToggleButton } from 'react-bootstrap';

interface ModelTypeBuildingSettingsProps {
  type: ModelType;
}

export default function ModelTypeBuildingSettings({
  type,
}: ModelTypeBuildingSettingsProps) {
  const buildingColor = useUserSettingsStore(
    (state) => state.visualizationSettings.buildingColor
  );
  const modelTypeColorOverrides = useUserSettingsStore(
    (state) => state.visualizationSettings.modelTypeColorOverrides
  );
  const modelTypeGeometryOverrides = useUserSettingsStore(
    (state) => state.visualizationSettings.modelTypeGeometryOverrides
  );
  const updateSetting = useUserSettingsStore((state) => state.updateSetting);

  const selectedColor =
    modelTypeColorOverrides.value[type] ?? buildingColor.value;
  const selectedGeometry = modelTypeGeometryOverrides.value[type];

  const handleColorChange = (newColor: string) => {
    updateSetting('modelTypeColorOverrides', {
      ...modelTypeColorOverrides.value,
      [type]: newColor,
    });
  };

  const handleGeometryChange = (newGeometry: BuildingGeometryType) => {
    updateSetting('modelTypeGeometryOverrides', {
      ...modelTypeGeometryOverrides.value,
      [type]: newGeometry,
    });
  };

  const handleResetGeometry = () => {
    const { [type]: _, ...without } = modelTypeGeometryOverrides.value;
    updateSetting('modelTypeGeometryOverrides', without);
  };

  return (
    <div className="building-config-language-body">
      <div className="building-config-language-preview">
        <span
          className="building-config-language-swatch"
          style={{ backgroundColor: selectedColor }}
          aria-hidden
        />
        <span className="building-config-language-preview-label">Preview</span>
      </div>
      <div className="building-config-language-controls">
        <div className="building-config-control-block">
          <span className="building-config-control-label">Color</span>
          <ColorPicker
            label="Building color"
            initialValue={selectedColor}
            onChange={handleColorChange}
          />
        </div>
        <div className="building-config-control-block">
          <span className="building-config-control-label">Geometry</span>
          <ButtonGroup className="building-config-geometry-group">
            {GEOMETRY_OPTIONS.map((geometry) => (
              <ToggleButton
                key={geometry}
                id={`${type}-geometry-${geometry}`}
                type="radio"
                variant={
                  selectedGeometry === geometry
                    ? 'primary'
                    : 'outline-secondary'
                }
                name={`${type}-geometry`}
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
            onClick={handleResetGeometry}
          >
            Reset geometry
          </button>
        </div>
      </div>
    </div>
  );
}
