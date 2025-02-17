import React from 'react';
import HelpTooltip from 'react-lib/src/components/help-tooltip.tsx';

export default function RadioSetting({ setting, onChange }) {
  return (
    <>
      <HelpTooltip title={setting.description} />
      <span>{setting.displayName}:</span>
      <div style={{ marginLeft: '1.5rem' }}>
        {setting.values.map((value) => (
          <div className="form-check" key={value}>
            <input
              className="form-check-input"
              type="radio"
              name="flexRadioDefault"
              id={value}
              onChange={() => onChange(value)}
              checked={setting.value === value}
            />
            <label className="form-check-label" htmlFor={value}>
              {value}
            </label>
          </div>
        ))}
      </div>
    </>
  );
}
