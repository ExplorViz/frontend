import { useCommitTreeStateStore } from 'explorviz-frontend/src/stores/commit-tree-state';
import { getCommitAuthorOptionsFromCommitTree } from 'explorviz-frontend/src/utils/evolution-data-helpers';
import {
  CommitTree,
  hasActiveAuthorFilter,
} from 'explorviz-frontend/src/utils/evolution-schemes/evolution-data';
import { useEffect, useMemo, useState } from 'react';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';

function setsEqual(left: Set<string>, right: Set<string>): boolean {
  if (left.size !== right.size) {
    return false;
  }

  for (const value of left) {
    if (!right.has(value)) {
      return false;
    }
  }

  return true;
}

function buildAuthorKeysFromSelection(
  selectedAuthorKeys: Set<string>,
  availableAuthorKeys: string[]
): string[] | undefined {
  const allSelected =
    availableAuthorKeys.length > 0 &&
    availableAuthorKeys.every((authorKey) => selectedAuthorKeys.has(authorKey));

  if (allSelected) {
    return undefined;
  }

  return [...selectedAuthorKeys];
}

type CommitChartAuthorFiltersProps = {
  expanded: boolean;
  commitTree: CommitTree | undefined;
  onAuthorFilterApplied: () => void;
};

export default function CommitChartAuthorFilters({
  expanded,
  commitTree,
  onAuthorFilterApplied,
}: CommitChartAuthorFiltersProps) {
  const appliedFilters = useCommitTreeStateStore(
    (state) => state._commitTreeFilters
  );
  const setCommitTreeFilters = useCommitTreeStateStore(
    (state) => state.setCommitTreeFilters
  );

  const availableAuthors = useMemo(
    () => getCommitAuthorOptionsFromCommitTree(commitTree),
    [commitTree]
  );
  const availableAuthorKeys = useMemo(
    () => availableAuthors.map((author) => author.authorKey),
    [availableAuthors]
  );
  const availableAuthorKeysSignature = availableAuthorKeys.join('|');

  const [draftSelectedAuthorKeys, setDraftSelectedAuthorKeys] = useState<
    Set<string>
  >(new Set());
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    if (availableAuthorKeys.length === 0) {
      setDraftSelectedAuthorKeys(new Set());
      return;
    }

    if (appliedFilters.authorKeys === undefined) {
      setDraftSelectedAuthorKeys(new Set(availableAuthorKeys));
      return;
    }

    setDraftSelectedAuthorKeys(
      new Set(
        appliedFilters.authorKeys.filter((authorKey) =>
          availableAuthorKeys.includes(authorKey)
        )
      )
    );
  }, [appliedFilters.authorKeys, availableAuthorKeysSignature]);

  const appliedAuthorKeys = appliedFilters.authorKeys;
  const appliedSelectedAuthorKeys = useMemo(() => {
    if (availableAuthorKeys.length === 0) {
      return new Set<string>();
    }

    if (appliedAuthorKeys === undefined) {
      return new Set(availableAuthorKeys);
    }

    return new Set(appliedAuthorKeys);
  }, [appliedAuthorKeys, availableAuthorKeysSignature]);

  const draftAuthorKeys = buildAuthorKeysFromSelection(
    draftSelectedAuthorKeys,
    availableAuthorKeys
  );

  const hasDraftChanges = !setsEqual(
    draftSelectedAuthorKeys,
    appliedSelectedAuthorKeys
  );
  const hasActiveAuthorFilterApplied = hasActiveAuthorFilter(appliedFilters);

  const applyAuthorFilter = async (authorKeys: string[] | undefined) => {
    setIsApplying(true);
    try {
      const nextFilters = { ...appliedFilters };
      if (authorKeys === undefined) {
        delete nextFilters.authorKeys;
      } else {
        nextFilters.authorKeys = authorKeys;
      }

      setCommitTreeFilters(nextFilters);
      onAuthorFilterApplied();
    } finally {
      setIsApplying(false);
    }
  };

  const handleApply = async () => {
    await applyAuthorFilter(draftAuthorKeys);
  };

  const handleReset = async () => {
    setDraftSelectedAuthorKeys(new Set(availableAuthorKeys));
    await applyAuthorFilter(undefined);
  };

  const toggleAuthor = (authorKey: string) => {
    setDraftSelectedAuthorKeys((currentKeys) => {
      const nextKeys = new Set(currentKeys);
      if (nextKeys.has(authorKey)) {
        nextKeys.delete(authorKey);
      } else {
        nextKeys.add(authorKey);
      }
      return nextKeys;
    });
  };

  const selectAllAuthors = () => {
    setDraftSelectedAuthorKeys(new Set(availableAuthorKeys));
  };

  const deselectAllAuthors = () => {
    setDraftSelectedAuthorKeys(new Set());
  };

  if (!expanded || availableAuthors.length === 0) {
    return null;
  }

  return (
    <div
      id="commit-chart-author-row"
      className="commit-metrics-chart-author-filter-panel"
    >
      <div className="commit-metrics-chart-author-filter-row">
        <div className="commit-metrics-chart-author-toolbar">
          <div className="commit-metrics-chart-author-actions">
            <Button
              type="button"
              size="sm"
              variant="outline-secondary"
              onClick={selectAllAuthors}
              disabled={
                draftSelectedAuthorKeys.size === availableAuthors.length
              }
            >
              Select All
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline-secondary"
              onClick={deselectAllAuthors}
              disabled={draftSelectedAuthorKeys.size === 0}
            >
              Deselect All
            </Button>
          </div>
          <Button
            variant={hasDraftChanges ? 'primary' : 'outline-secondary'}
            size="sm"
            className="commit-metrics-chart-refocus-button"
            onClick={() => void handleApply()}
            disabled={isApplying || !hasDraftChanges}
            title="Apply author filter to the commit chart"
          >
            Apply
          </Button>
          {hasActiveAuthorFilterApplied && (
            <Button
              variant="outline-secondary"
              size="sm"
              className="commit-metrics-chart-refocus-button"
              onClick={() => void handleReset()}
              disabled={isApplying}
              title="Clear author filter"
            >
              Reset
            </Button>
          )}
        </div>
        <div className="commit-metrics-chart-author-list">
          {availableAuthors.map((author) => (
            <Form.Check
              key={author.authorKey}
              type="checkbox"
              id={`commit-chart-author-${author.authorKey}`}
              checked={draftSelectedAuthorKeys.has(author.authorKey)}
              onChange={() => toggleAuthor(author.authorKey)}
              label={
                <span className="commit-metrics-chart-author-row">
                  <span className="commit-metrics-chart-author-name">
                    {author.label}
                  </span>
                  <span className="commit-metrics-chart-author-count">
                    {author.commitCount.toLocaleString('en-US')}
                  </span>
                </span>
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}
