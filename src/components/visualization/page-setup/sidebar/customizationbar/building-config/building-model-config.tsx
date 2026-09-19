import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import {
  AppearanceOverrideGroupKey,
  BUILDING_GEOMETRY_OPTIONS,
  BuildingGeometryType,
} from 'explorviz-frontend/src/utils/settings/settings-schemas';
import { Accordion, ToggleButton, ToggleButtonGroup } from 'react-bootstrap';
import ColorPicker from '../settings/color-picker';

interface BuildingModelConfigProps {
  overrideGroupKey: AppearanceOverrideGroupKey;
  values: readonly string[];
  formatValueLabel?(value: string): string | undefined;
}

export default function BuildingModelConfig({
  overrideGroupKey,
  values,
  formatValueLabel,
}: BuildingModelConfigProps) {
  const buildingColorOverrides = useUserSettingsStore(
    (state) => state.visualizationSettings.buildingColorOverrides
  );

  return (
    <Accordion className="building-config-language-accordion">
      {values.map((value) => (
        <Accordion.Item
          eventKey={value}
          key={value}
          className="building-config-language-item"
        >
          <Accordion.Header>
            <span className="building-config-language-header">
              <ColorIndicator
                color={buildingColorOverrides.value[overrideGroupKey][value]}
              />
              <span className="building-config-language-name">
                {formatValueLabel?.(value) ?? value}
              </span>
            </span>
          </Accordion.Header>
          <Accordion.Body>
            <BuildingModelConfigItem
              overrideGroupKey={overrideGroupKey}
              value={value}
            />
          </Accordion.Body>
        </Accordion.Item>
      ))}
    </Accordion>
  );
}

interface BuildingModelConfigItemProps {
  overrideGroupKey: AppearanceOverrideGroupKey;
  value: string;
}

function BuildingModelConfigItem({
  overrideGroupKey,
  value,
}: BuildingModelConfigItemProps) {
  const buildingColorOverrides = useUserSettingsStore(
    (state) => state.visualizationSettings.buildingColorOverrides
  );
  const buildingGeometryOverrides = useUserSettingsStore(
    (state) => state.visualizationSettings.buildingGeometryOverrides
  );
  const updateSetting = useUserSettingsStore((state) => state.updateSetting);

  const selectedColor = buildingColorOverrides.value[overrideGroupKey][value];
  const selectedGeometry =
    buildingGeometryOverrides.value[overrideGroupKey][value];

  const handleResetColor = () => {
    updateSetting('buildingColorOverrides', {
      ...buildingColorOverrides.value,
      [overrideGroupKey]: {
        ...buildingColorOverrides.value[overrideGroupKey],
        [value]: undefined,
      },
    });
  };

  const handleChangeColor = (newColor: string | null) => {
    if (newColor === null) {
      handleResetColor();
      return;
    }

    updateSetting('buildingColorOverrides', {
      ...buildingColorOverrides.value,
      [overrideGroupKey]: {
        ...buildingColorOverrides.value[overrideGroupKey],
        [value]: newColor,
      },
    });
  };

  const handleChangeGeometry = (newGeometry: BuildingGeometryType) => {
    updateSetting('buildingGeometryOverrides', {
      ...buildingGeometryOverrides.value,
      [overrideGroupKey]: {
        ...buildingGeometryOverrides.value[overrideGroupKey],
        [value]: newGeometry,
      },
    });
  };

  const handleResetGeometry = () => {
    const { [value]: _, ...without } =
      buildingGeometryOverrides.value[overrideGroupKey];
    updateSetting('buildingGeometryOverrides', {
      ...buildingGeometryOverrides.value,
      [overrideGroupKey]: without,
    });
  };

  return (
    <div className="building-config-language-controls">
      <div className="building-config-control-block">
        <span className="building-config-control-label">Color</span>
        <ColorPicker
          label="Building color"
          initialValue={null}
          value={selectedColor}
          onChange={handleChangeColor}
        />
      </div>
      <div className="building-config-control-block">
        <span className="building-config-control-label">Geometry</span>
        <ToggleButtonGroup
          name={`geometry-${value}`}
          type="radio"
          value={selectedGeometry}
          className="building-config-geometry-group"
        >
          {BUILDING_GEOMETRY_OPTIONS.map((geometry) => (
            <ToggleButton
              key={geometry}
              id={`${value}-${geometry}`}
              value={geometry}
              type="radio"
              variant={
                selectedGeometry === geometry ? 'primary' : 'outline-secondary'
              }
              onChange={() => handleChangeGeometry(geometry)}
              className="building-config-geometry-button"
            >
              {geometry}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        <button
          type="button"
          className="btn btn-link btn-sm building-config-reset-link"
          onClick={handleResetGeometry}
        >
          Reset geometry
        </button>
      </div>
    </div>
  );
}

function ColorIndicator({ color }: { color?: string }) {
  return (
    <>
      <div
        className={`building-config-language-swatch building-config-language-swatch--header`}
        style={{
          backgroundColor: color ?? '#ffffff',
          overflow: 'hidden',
          position: 'relative',
        }}
        aria-hidden
      >
        <div>
          <div className={!color ? 'crossed' : ''} />

          {/* Show red diagonal across box if no value is selected */}
          <style>
            {`
            .crossed::after {
              content: "";
              position: absolute;
              left: 50%;
              top: 50%;
              width: 100%;
              height: 2px;
              background: red;
              transform: translate(-50%, -50%) rotate(-45deg);
            }
          `}
          </style>
        </div>
      </div>
    </>
  );
}
