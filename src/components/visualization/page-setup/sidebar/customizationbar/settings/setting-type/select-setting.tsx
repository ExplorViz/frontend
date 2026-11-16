import ResetButton from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/customizationbar/settings/setting-type/reset-button.tsx';
import SettingLabel from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/customizationbar/settings/setting-type/setting-label';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { defaultVizSettings } from 'explorviz-frontend/src/utils/settings/default-settings';
import {
  SelectSetting as SelectSettingData,
  VisualizationSettingId,
} from 'explorviz-frontend/src/utils/settings/settings-schemas';

export default function SelectSetting({
  onChange,
  settingId,
  formatOptionLabel,
}: {
  onChange: (settingId: VisualizationSettingId, value: unknown) => void;
  settingId: VisualizationSettingId;
  formatOptionLabel?: (option: unknown) => string;
}) {
  const setting = useUserSettingsStore((state) => state.visualizationSettings[settingId]) as SelectSettingData<unknown>;
  const options = (defaultVizSettings[settingId] as SelectSettingData<unknown>).options;
  const defaultValue = defaultVizSettings[settingId].value;
  const selectId = `setting-${settingId}`;

  const getOptionLabel = (option: unknown) => formatOptionLabel?.(option) ?? String(option);

  return (
    <div className="setting-row">
      <SettingLabel name={setting.displayName} description={setting.description} htmlFor={selectId} />
      <div className="setting-control">
        {setting.value !== defaultValue && <ResetButton onClick={() => onChange(settingId, defaultValue)} />}
        <select
          id={selectId}
          className="setting-select"
          value={options.indexOf(setting.value)}
          onChange={(event) => onChange(settingId, options[Number(event.target.value)])}
        >
          {options.map((option, index) => (
            <option key={String(option)} value={index}>
              {getOptionLabel(option)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
