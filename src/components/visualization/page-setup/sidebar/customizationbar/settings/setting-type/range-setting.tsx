import ResetButton from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/customizationbar/settings/setting-type/reset-button.tsx';
import SettingLabel from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/customizationbar/settings/setting-type/setting-label';
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
  const setting = useUserSettingsStore.getState().visualizationSettings[settingId]! as RangeSettingSchema;
  const defaultValue = defaultVizSettings[settingId].value;
  const { min, max, step } = setting.range;
  const fill = max > min ? ((setting.value - min) / (max - min)) * 100 : 0;

  const handleInput = (newValue: number) => {
    onChange(settingId, newValue);
  };

  return (
    <div className="setting-row stacked">
      <div className="setting-row-head">
        <SettingLabel name={setting.displayName} description={setting.description} htmlFor={setting.displayName} />
        <div className="setting-control">
          {typeof defaultValue === 'number' && setting.value !== defaultValue && (
            <ResetButton onClick={() => handleInput(defaultValue)} />
          )}
          <input
            className="setting-number"
            type="number"
            aria-label={`${setting.displayName} value`}
            min={min}
            max={max}
            step={step}
            value={Number(setting.value.toFixed(2))}
            onChange={(event) => handleInput(Number(event.target.value))}
          />
        </div>
      </div>
      <input
        id={setting.displayName}
        className="setting-range"
        type="range"
        min={min}
        max={max}
        step={step}
        value={setting.value.toFixed(2)}
        style={{ ['--fill' as string]: `${Math.min(100, Math.max(0, fill))}%` }}
        onChange={(event) => handleInput(Number(event.target.value))}
      />
      <div className="setting-range-bounds" aria-hidden>
        <span>{min.toFixed(2)}</span>
        <span>{max.toFixed(2)}</span>
      </div>
    </div>
  );
}
