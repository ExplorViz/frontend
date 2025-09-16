import HelpTooltip from 'explorviz-frontend/src/components/help-tooltip.tsx';
import ResetButton from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/customizationbar/settings/setting-type/reset-button.tsx';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { defaultVizSettings } from 'explorviz-frontend/src/utils/settings/default-settings';
import {
  RangeSetting as RangeSettingSchema,
  VisualizationSettingId,
} from 'explorviz-frontend/src/utils/settings/settings-schemas';

export default function RangeSetting({
  onChange,
  settingId,
}: {
  onChange: (settingId: VisualizationSettingId, value: number) => void;
  settingId: VisualizationSettingId;
}) {
  const setting = useUserSettingsStore.getState().visualizationSettings[
    settingId
  ]! as RangeSettingSchema;

  const handleInput = (newValue: number) => {
    onChange(settingId, newValue);
  };

  return (
    <div className="setting-container">
      <HelpTooltip title={setting.description} />
      <label className="m-0" htmlFor={setting.displayName}>
        {setting.displayName}
      </label>
      <div className="range-slider--container">
        <div style={{ width: '100%' }}>
          <input
            id={setting.displayName}
            value={setting.value}
            min={setting.range.min}
            max={setting.range.max}
            type="range"
            step={setting.range.step}
            className="form-control mr-2"
            style={{ height: '1rem' }}
            onChange={(event) => handleInput(Number(event.target.value))}
          />
          <div className="range-slider--values">
            <span>{setting.range.min}</span>
            <input
              style={{ fontWeight: 'bold', textAlign: 'center', width: '5rem' }}
              type="number"
              value={setting.value}
              onChange={(event) => handleInput(Number(event.target.value))}
            />
            <span>{setting.range.max}</span>
          </div>
        </div>
        <ResetButton
          onClick={() => {
            const defaultValue = defaultVizSettings[settingId].value;
            if (typeof defaultValue === 'number') {
              handleInput(defaultValue);
            }
          }}
        />
      </div>
    </div>
  );
}
