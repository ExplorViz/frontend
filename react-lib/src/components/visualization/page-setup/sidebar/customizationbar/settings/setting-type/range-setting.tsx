import React, { useState } from 'react';
import HelpTooltip from 'react-lib/src/components/help-tooltip.tsx';
import ResetButton from 'react-lib/src/components/visualization/page-setup/sidebar/customizationbar/settings/setting-type/reset-button.tsx';

export default function RangeSetting({ setting, onChange, settingId }: any) {
  // ToDo: Refactor such that value points to setting's object and updates correctly with reset
  const [value, setValue]: any = useState(setting.value);

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
        <ResetButton onClick={() => onChange(settingId)} />
      </div>
    </div>
  );
}
