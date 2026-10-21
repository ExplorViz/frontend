import { AlertIcon } from '@primer/octicons-react';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import {
  AppearanceOverrideGroupKey,
  CITY_GEOMETRY_OPTIONS,
  CityGeometryType,
} from 'explorviz-frontend/src/utils/settings/settings-schemas';
import {
  Accordion,
  Alert,
  ToggleButton,
  ToggleButtonGroup,
} from 'react-bootstrap';
import ColorPicker from '../../settings/color-picker';

interface CityModelConfigProps {
  overrideGroupKey: AppearanceOverrideGroupKey;
  values: readonly string[];
  formatValueLabel?(value: string): string | undefined;
}

export default function CityModelConfig({
  overrideGroupKey,
  values,
  formatValueLabel,
}: CityModelConfigProps) {
  const cityColorOverrides = useUserSettingsStore(
    (state) => state.visualizationSettings.cityColorOverrides
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
                color={cityColorOverrides.value[overrideGroupKey][value]}
              />
              <span className="building-config-language-name">
                {formatValueLabel?.(value) ?? value}
              </span>
            </span>
          </Accordion.Header>
          <Accordion.Body>
            <CityModelConfigItem
              overrideGroupKey={overrideGroupKey}
              value={value}
            />
          </Accordion.Body>
        </Accordion.Item>
      ))}
    </Accordion>
  );
}

interface CityModelConfigItemProps {
  overrideGroupKey: AppearanceOverrideGroupKey;
  value: string;
}

function CityModelConfigItem({
  overrideGroupKey,
  value,
}: CityModelConfigItemProps) {
  const cityColorOverrides = useUserSettingsStore(
    (state) => state.visualizationSettings.cityColorOverrides
  );
  const cityGeometryOverrides = useUserSettingsStore(
    (state) => state.visualizationSettings.cityGeometryOverrides
  );
  const updateSetting = useUserSettingsStore((state) => state.updateSetting);

  const selectedColor = cityColorOverrides.value[overrideGroupKey][value];
  const selectedGeometry = cityGeometryOverrides.value[overrideGroupKey][value];

  const handleResetColor = () => {
    updateSetting('cityColorOverrides', {
      ...cityColorOverrides.value,
      [overrideGroupKey]: {
        ...cityColorOverrides.value[overrideGroupKey],
        [value]: undefined,
      },
    });
  };

  const handleChangeColor = (newColor: string | null) => {
    if (newColor === null) {
      handleResetColor();
      return;
    }

    updateSetting('cityColorOverrides', {
      ...cityColorOverrides.value,
      [overrideGroupKey]: {
        ...cityColorOverrides.value[overrideGroupKey],
        [value]: newColor,
      },
    });
  };

  const handleChangeGeometry = (newGeometry: CityGeometryType) => {
    updateSetting('cityGeometryOverrides', {
      ...cityGeometryOverrides.value,
      [overrideGroupKey]: {
        ...cityGeometryOverrides.value[overrideGroupKey],
        [value]: newGeometry,
      },
    });
  };

  const handleResetGeometry = () => {
    const { [value]: _, ...without } =
      cityGeometryOverrides.value[overrideGroupKey];
    updateSetting('cityGeometryOverrides', {
      ...cityGeometryOverrides.value,
      [overrideGroupKey]: without,
    });
  };

  return (
    <div className="building-config-language-controls">
      <div className="building-config-control-block">
        <span className="building-config-control-label">Color</span>
        <ColorPicker
          label="City color"
          initialValue={null}
          value={selectedColor}
          onChange={handleChangeColor}
        />
      </div>

      <div className="building-config-control-block">
        <span className="building-config-control-label">Geometry</span>
        <Alert variant="warning" className="mb-1">
          <div className="inline">
            <AlertIcon /> <b>Note</b>
            <div className="d-block">
              Geometry overrides are only applied to empty cities since internal
              city layouting requires a box geometry.
            </div>
          </div>
        </Alert>
        <ToggleButtonGroup
          name={`geometry-${value}`}
          type="radio"
          value={selectedGeometry}
          className="building-config-geometry-group"
        >
          {CITY_GEOMETRY_OPTIONS.map((geometry) => (
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
