import React, { useState, useEffect } from 'react';
import HelpTooltip from 'react-lib/src/components/help-tooltip.tsx';
import WideCheckbox from 'react-lib/src/components/visualization/page-setup/sidebar/customizationbar/settings/setting-type/wide-checkbox.tsx';
import ResetButton from 'react-lib/src/components/visualization/page-setup/sidebar/customizationbar/settings/setting-type/reset-button.tsx';

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

  return (
    <div className="setting-container d-flex justify-content-between">
      <div>
        <HelpTooltip title={setting.description} />
        {setting.displayName}
      </div>
      <div className="d-flex align-self-center">
        <WideCheckbox value={value} onToggle={() => handleInput()} />
        <ResetButton onClick={() => {onChange(settingId); setSingleResetState(!singleResetState);}} />
      </div>
    </div>
  );
}
