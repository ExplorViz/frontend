import HelpTooltip from 'explorviz-frontend/src/components/help-tooltip.tsx';

/** A setting's name with its description behind an info icon. */
export default function SettingLabel({
  name,
  description,
  htmlFor,
}: {
  name: string;
  description?: string;
  htmlFor?: string;
}) {
  return (
    <div className="setting-label">
      {htmlFor ? <label htmlFor={htmlFor}>{name}</label> : <span>{name}</span>}
      {description && <HelpTooltip title={description} />}
    </div>
  );
}
