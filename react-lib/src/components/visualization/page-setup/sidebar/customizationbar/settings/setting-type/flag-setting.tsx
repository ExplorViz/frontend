import React, { useState, useEffect } from 'react';
import HelpTooltip from 'explorviz-frontend/src/components/help-tooltip.tsx';
import WideCheckbox from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/customizationbar/settings/setting-type/wide-checkbox.tsx';
import ResetButton from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/customizationbar/settings/setting-type/reset-button.tsx';

export default function FlagSetting({ setting, onChange, settingId, resetState }: any) {
  // ToDo: Refactor such that value points to setting's object and updates correctly with reset
  const [value, setValue]: any = useState(setting.value);
  const [singleResetState, setSingleResetState] = useState<boolean>(false);

  useEffect(() => {
    setValue(setting.value);
  }, [resetState, singleResetState]);

  const handleInput = () => {
    onChange(settingId, !value);
    setValue(!value);
  };

  const reset = () => {
    onChange(settingId);
    setSingleResetState(!singleResetState);
  }

  return (
    <div className="setting-container d-flex justify-content-between">
      <div>
        <HelpTooltip title={setting.description} />
        {setting.displayName}
      </div>
      <div className="d-flex align-self-center">
        <WideCheckbox value={value} onToggle={() => handleInput()} />
        <ResetButton onClick={() => reset()} />
      </div>
    </div>
  );
}
