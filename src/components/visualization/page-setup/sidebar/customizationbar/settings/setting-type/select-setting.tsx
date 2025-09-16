import HelpTooltip from 'explorviz-frontend/src/components/help-tooltip.tsx';
import ResetButton from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/customizationbar/settings/setting-type/reset-button.tsx';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { defaultVizSettings } from 'explorviz-frontend/src/utils/settings/default-settings';
import {
  SelectSetting as SelectSettingData,
  VisualizationSettingId,
} from 'explorviz-frontend/src/utils/settings/settings-schemas';
import { Dropdown, DropdownButton } from 'react-bootstrap';

export default function SelectSetting({
  onChange,
  settingId,
}: {
  onChange: (settingId: VisualizationSettingId, value: unknown) => void;
  settingId: VisualizationSettingId;
}) {
  const setting = useUserSettingsStore.getState().visualizationSettings[
    settingId
  ] as SelectSettingData<unknown>;

  const handleInput = (newValue: unknown) => {
    onChange(settingId, newValue);
  };

  return (
    <div className="setting-container mb-3">
      <HelpTooltip title={setting.description} />
      <label className="m-0" htmlFor={setting.displayName}>
        {setting.displayName}
      </label>
      <div className="d-flex justify-content-between align-items-center">
        <div>
          <DropdownButton
            id="dropdown-basic-button"
            title={setting.value as string}
            variant="primary"
          >
            {setting.options.map((option) => (
              <Dropdown.Item
                key={option as string}
                onClick={() => {
                  handleInput(option);
                }}
              >
                {option as string}
              </Dropdown.Item>
            ))}
          </DropdownButton>
        </div>
        <ResetButton
          onClick={() => {
            handleInput(defaultVizSettings[settingId].value);
          }}
        />
      </div>
    </div>
  );
}
