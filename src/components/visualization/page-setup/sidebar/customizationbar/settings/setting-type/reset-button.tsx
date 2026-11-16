import { SyncIcon } from '@primer/octicons-react';

export default function ResetButton({
  onClick,
  args,
  label = 'Reset to default',
}: {
  onClick: (args: any) => void;
  args?: unknown | undefined;
  label?: string;
}) {
  return (
    <button
      type="button"
      className="setting-icon-button"
      title={label}
      aria-label={label}
      onClick={() => onClick(args)}
    >
      <SyncIcon size={14} />
    </button>
  );
}
