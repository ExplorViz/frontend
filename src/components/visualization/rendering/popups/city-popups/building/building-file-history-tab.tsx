import { GitMergeIcon } from '@primer/octicons-react';
import { useCommitTreeStateStore } from 'explorviz-frontend/src/stores/commit-tree-state';
import { useToastHandlerStore } from 'explorviz-frontend/src/stores/toast-handler';
import { FileHistory } from 'explorviz-frontend/src/utils/landscape-http-request-util';
import { Badge, OverlayTrigger, Tooltip } from 'react-bootstrap';

const ACTION_STYLES: Record<
  string,
  { letter: string; label: string; backgroundColor: string }
> = {
  ADDED: { letter: 'A', label: 'Added', backgroundColor: 'var(--bs-success)' },
  MODIFIED: {
    letter: 'M',
    label: 'Modified',
    backgroundColor: 'var(--bs-warning)',
  },
  DELETED: {
    letter: 'D',
    label: 'Deleted',
    backgroundColor: 'var(--bs-danger)',
  },
  RENAMED: { letter: 'R', label: 'Renamed', backgroundColor: 'var(--bs-info)' },
};

function getActionStyle(action: string) {
  return (
    ACTION_STYLES[action] ?? {
      letter: action.slice(0, 1).toUpperCase(),
      label: action,
      backgroundColor: 'var(--bs-secondary)',
    }
  );
}

function getAuthorInitials(authorName: string | null | undefined): string {
  if (authorName == null || authorName.trim() === '') {
    return '?';
  }
  const parts = authorName.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return authorName.trim().slice(0, 2).toUpperCase();
}

function formatDate(timestampMs: number): string {
  return new Date(timestampMs).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function actionTooltip(entry: FileHistory): string {
  const style = getActionStyle(entry.action);
  if (entry.action === 'RENAMED' && entry.renamedFrom) {
    return `${style.label} (from ${entry.renamedFrom})`;
  }
  return style.label;
}

function FileHistoryActionBadge({ entry }: { entry: FileHistory }) {
  const { letter, backgroundColor } = getActionStyle(entry.action);

  return (
    <OverlayTrigger
      placement="top"
      overlay={<Tooltip>{actionTooltip(entry)}</Tooltip>}
    >
      <Badge
        bg=""
        pill
        className="align-middle"
        style={{
          backgroundColor,
          color: `contrast-color(${backgroundColor})`,
          minWidth: '1.5rem',
        }}
      >
        <samp>{letter}</samp>
      </Badge>
    </OverlayTrigger>
  );
}

function CopyableCommitHash({ commitHash }: { commitHash: string }) {
  const showSuccessToastMessage = useToastHandlerStore(
    (state) => state.showSuccessToastMessage
  );

  const onCopy = () => {
    navigator.clipboard.writeText(commitHash);
    showSuccessToastMessage('Commit hash copied to clipboard');
  };

  return (
    <OverlayTrigger placement="top" overlay={<Tooltip>{commitHash}</Tooltip>}>
      <button
        type="button"
        className="btn btn-link btn-sm p-0 border-0 align-baseline text-decoration-none"
        onClick={onCopy}
      >
        <samp>{commitHash.slice(0, 5)}</samp>
      </button>
    </OverlayTrigger>
  );
}

interface BuildingFileHistoryTabProps {
  history: FileHistory[] | undefined;
  historySpansSeveralPaths: boolean;
}

export default function BuildingFileHistoryTab({
  history,
  historySpansSeveralPaths,
}: BuildingFileHistoryTabProps) {
  const selectedCommits = useCommitTreeStateStore(
    (state) => state._selectedCommits
  );
  const currentSelectedRepositoryName = useCommitTreeStateStore(
    (state) => state._currentSelectedRepositoryName
  );
  const commitsForRepo =
    selectedCommits.get(currentSelectedRepositoryName) ?? [];
  const selectedCommitHashes = new Set(
    commitsForRepo.map((commit) => commit.commitId)
  );

  const historyNewestFirst = history
    ? [...history].sort((a, b) => b.date - a.date)
    : undefined;

  if (history === undefined) {
    return <div className="text-center text-muted py-3">Loading history…</div>;
  }

  if (history.length === 0) {
    return (
      <div className="text-center text-muted py-3">No changes recorded</div>
    );
  }

  return (
    <table className="table table-sm mb-0 file-history-table">
      {(historyNewestFirst ?? []).map((entry) => {
        const rowKey = entry.commitHash + entry.action + (entry.path ?? '');
        const isSelected = selectedCommitHashes.has(entry.commitHash);

        return (
          <tbody
            key={rowKey}
            className={isSelected ? 'file-history-entry--selected' : undefined}
            aria-selected={isSelected}
          >
            <tr>
              <td className="align-middle text-nowrap">
                <FileHistoryActionBadge entry={entry} />
              </td>
              <td className="align-middle text-nowrap">
                <span className="d-inline-flex align-items-center gap-1">
                  <CopyableCommitHash commitHash={entry.commitHash} />
                  {entry.mergeCommit && (
                    <OverlayTrigger
                      placement="top"
                      overlay={<Tooltip>Merge commit</Tooltip>}
                    >
                      <span
                        className="text-muted d-inline-flex"
                        aria-label="Merge commit"
                      >
                        <GitMergeIcon size={12} verticalAlign="middle" />
                      </span>
                    </OverlayTrigger>
                  )}
                </span>
              </td>
              <td className="align-middle text-nowrap">
                <OverlayTrigger
                  placement="top"
                  overlay={
                    <Tooltip>
                      {entry.authorName?.trim() || 'Unknown author'}
                    </Tooltip>
                  }
                >
                  <span className="text-muted small">
                    <samp>{getAuthorInitials(entry.authorName)}</samp>
                  </span>
                </OverlayTrigger>
              </td>
              <td className="align-middle text-nowrap text-end">
                {entry.date ? (
                  <span className="text-muted small">
                    {formatDate(entry.date)}
                  </span>
                ) : (
                  <span className="text-muted small">-</span>
                )}
              </td>
            </tr>
            {historySpansSeveralPaths && entry.path && (
              <tr>
                <td
                  colSpan={4}
                  className="pt-0 pb-2 border-0 small text-muted text-break"
                >
                  {entry.path}
                </td>
              </tr>
            )}
          </tbody>
        );
      })}
    </table>
  );
}
