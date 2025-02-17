import React from 'react';
import HelpTooltip from 'react-lib/src/components/help-tooltip.tsx';

export default function ButtonSetting({ setting, onClick, settingId }: any) {
  return (
    <div className="setting-container d-flex justify-content-between">
      <div>
        <HelpTooltip title={setting.description} />
        {setting.displayName}
      </div>
      <div className="d-flex align-self-center">
        <button
          type="button"
          className={`btn btn-${setting.type} setting-button`}
          title={setting.description}
          onClick={() => onClick(settingId)}
        >
          {setting.buttonText}
        </button>
      </div>
    </div>
  );
}
