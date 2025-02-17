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
      className="btn btn-small btn-outline-dark"
      style={{ padding: '0', height: '1.5rem', width: '1.5rem' }}
      title="Resize Sidebar"
      aria-label="Resize"
      onClick={() => onClick(args)}
    >
      <SyncIcon verticalAlign="middle" size="small" fill="#777" />
    </button>
  );
}
