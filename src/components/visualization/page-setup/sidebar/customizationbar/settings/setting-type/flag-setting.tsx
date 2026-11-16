import ResetButton from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/customizationbar/settings/setting-type/reset-button.tsx';
import SettingLabel from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/customizationbar/settings/setting-type/setting-label';
import WideCheckbox from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/customizationbar/settings/setting-type/wide-checkbox.tsx';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { defaultVizSettings } from 'explorviz-frontend/src/utils/settings/default-settings';
import { VisualizationSettingId } from 'explorviz-frontend/src/utils/settings/settings-schemas';

export default function FlagSetting({
  settingId,
  onChange,
}: {
  settingId: VisualizationSettingId;
  onChange: (id: VisualizationSettingId, value?: boolean) => void;
}) {
  const setting = useUserSettingsStore.getState().visualizationSettings[settingId];
  const modified = setting.value !== defaultVizSettings[settingId].value;

  return (
    <div className="setting-row">
      <SettingLabel name={setting.displayName} description={setting.description} />
      <div className="setting-control">
        {modified && <ResetButton onClick={() => onChange(settingId)} />}
        <WideCheckbox
          value={setting.value}
          label={setting.displayName}
          onToggle={() => onChange(settingId, !setting.value)}
        />
      </div>
    </div>
  );
}
