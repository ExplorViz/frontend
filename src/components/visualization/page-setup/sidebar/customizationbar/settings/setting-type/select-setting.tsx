import HelpTooltip from 'explorviz-frontend/src/components/help-tooltip.tsx';
import ResetButton from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/customizationbar/settings/setting-type/reset-button.tsx';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { defaultVizSettings } from 'explorviz-frontend/src/utils/settings/default-settings';
import {
  SelectSetting as SelectSettingData,
  VisualizationSettingId,
} from 'explorviz-frontend/src/utils/settings/settings-schemas';
import { useEffect } from 'react';
import { useState } from 'react';
import { Dropdown, DropdownButton } from 'react-bootstrap';
import { useShallow } from 'zustand/react/shallow';

export default function SelectSetting({
  setting,
  onChange,
  settingId,
}: {
  setting: SelectSettingData<unknown>;
  onChange: (settingId: VisualizationSettingId, value: unknown) => void;
  settingId: VisualizationSettingId;
}) {
  const [value, setValue]: any = useState(setting.value);

  const { visualizationSettings } = useUserSettingsStore(
    useShallow((state) => ({
      visualizationSettings: state.visualizationSettings,
    }))
  );

  useEffect(() => {
    setValue(visualizationSettings[settingId].value);
  }, [visualizationSettings[settingId], settingId]);

  const handleInput = (newValue: unknown) => {
    onChange(settingId, newValue);
    setValue(newValue);
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
            title={value as string}
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
