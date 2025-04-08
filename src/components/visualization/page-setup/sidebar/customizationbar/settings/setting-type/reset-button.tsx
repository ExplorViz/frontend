import React from 'react';
import { SyncIcon } from '@primer/octicons-react';

export default function ResetButton({
  onClick,
  args,
}: {
  onClick: (args: any) => void;
  args?: unknown | undefined;
}) {
  return (
    <button
      type="button"
      className="btn btn-small btn-light setting-reset-button"
      title="Reset to default"
      aria-label="Reset to default"
      onClick={() => onClick(args)}
    >
      <SyncIcon verticalAlign="middle" size="small" fill="#777" />
    </button>
  );
}
