import React, { useEffect, useState } from 'react';
import HelpTooltip from 'explorviz-frontend/src/components/help-tooltip.tsx';
import ResetButton from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/customizationbar/settings/setting-type/reset-button.tsx';

export default function RangeSetting({ setting, onChange, settingId, resetState }: any) {
  const [value, setValue]: any = useState(setting.value);
  const [singleResetState, setSingleResetState] = useState<boolean>(false);

  useEffect(() => {
    setValue(setting.value);
  }, [resetState, singleResetState]);

  const handleInput = (newValue: number) => {
    onChange(settingId, newValue);
    setValue(newValue);
  };

  return (
    <div className="setting-container">
      <HelpTooltip title={setting.description} />
      <label className="m-0" htmlFor={setting.name}>
        {setting.displayName}
      </label>
      <div className="range-slider--container">
        <div style={{ width: '100%' }}>
          <input
            id={setting.name}
            value={value}
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
            <span style={{ fontWeight: 'bold' }}>{value}</span>
            <span>{setting.range.max}</span>
          </div>
        </div>
        <ResetButton onClick={() => {onChange(settingId); setSingleResetState(!singleResetState);}} />
      </div>
    </div>
  );
}
