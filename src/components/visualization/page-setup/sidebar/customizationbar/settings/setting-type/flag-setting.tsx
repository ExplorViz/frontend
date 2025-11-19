import HelpTooltip from 'explorviz-frontend/src/components/help-tooltip.tsx';
import WideCheckbox from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/customizationbar/settings/setting-type/wide-checkbox.tsx';
import ResetButton from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/customizationbar/settings/setting-type/reset-button.tsx';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { VisualizationSettingId } from 'explorviz-frontend/src/utils/settings/settings-schemas';

export default function FlagSetting({
  settingId,
  onChange,
}: {
  settingId: VisualizationSettingId;
  onChange: (id: VisualizationSettingId, value?: boolean) => void;
}) {
  const setting =
    useUserSettingsStore.getState().visualizationSettings[settingId];

  return (
    <div className="setting-container d-flex justify-content-between">
      <div>
        <HelpTooltip title={setting.description} />
        {setting.displayName}
      </div>
      <div className="d-flex align-self-center">
        <WideCheckbox
          value={setting.value}
          onToggle={() => onChange(settingId, !setting.value)}
        />
        <ResetButton onClick={() => onChange(settingId)} />
      </div>
    </div>
  );
}
