import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { AppearanceOverrideGroupKey } from 'explorviz-frontend/src/utils/settings/settings-schemas';
import { Accordion } from 'react-bootstrap';
import ColorPicker from '../../settings/color-picker';

interface DistrictModelConfigProps {
  overrideGroupKey: AppearanceOverrideGroupKey;
  values: readonly string[];
  formatValueLabel?(value: string): string | undefined;
}

export default function DistrictModelConfig({
  overrideGroupKey,
  values,
  formatValueLabel,
}: DistrictModelConfigProps) {
  const districtColorOverrides = useUserSettingsStore(
    (state) => state.visualizationSettings.districtColorOverrides
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
                color={districtColorOverrides.value[overrideGroupKey][value]}
              />
              <span className="building-config-language-name">
                {formatValueLabel?.(value) ?? value}
              </span>
            </span>
          </Accordion.Header>
          <Accordion.Body>
            <DistrictModelConfigItem
              overrideGroupKey={overrideGroupKey}
              value={value}
            />
          </Accordion.Body>
        </Accordion.Item>
      ))}
    </Accordion>
  );
}

interface DistrictModelConfigItemProps {
  overrideGroupKey: AppearanceOverrideGroupKey;
  value: string;
}

function DistrictModelConfigItem({
  overrideGroupKey,
  value,
}: DistrictModelConfigItemProps) {
  const districtColorOverrides = useUserSettingsStore(
    (state) => state.visualizationSettings.districtColorOverrides
  );
  const updateSetting = useUserSettingsStore((state) => state.updateSetting);

  const selectedColor = districtColorOverrides.value[overrideGroupKey][value];

  const handleResetColor = () => {
    updateSetting('districtColorOverrides', {
      ...districtColorOverrides.value,
      [overrideGroupKey]: {
        ...districtColorOverrides.value[overrideGroupKey],
        [value]: undefined,
      },
    });
  };

  const handleChangeColor = (newColor: string | null) => {
    if (newColor === null) {
      handleResetColor();
      return;
    }

    updateSetting('districtColorOverrides', {
      ...districtColorOverrides.value,
      [overrideGroupKey]: {
        ...districtColorOverrides.value[overrideGroupKey],
        [value]: newColor,
      },
    });
  };

  return (
    <div className="building-config-language-controls">
      <div className="building-config-control-block">
        <span className="building-config-control-label">Color</span>
        <ColorPicker
          label="District color"
          initialValue={null}
          value={selectedColor}
          onChange={handleChangeColor}
        />
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
