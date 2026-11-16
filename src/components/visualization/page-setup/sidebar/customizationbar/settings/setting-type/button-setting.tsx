import SettingLabel from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/customizationbar/settings/setting-type/setting-label';

export default function ButtonSetting({ setting, onClick, settingId }: any) {
  return (
    <div className="setting-row">
      <SettingLabel name={setting.displayName} description={setting.description} />
      <div className="setting-control">
        <button
          type="button"
          className={`setting-action ${setting.type}`}
          title={setting.description}
          onClick={() => onClick(settingId)}
        >
          {setting.buttonText}
        </button>
      </div>
    </div>
  );
}
