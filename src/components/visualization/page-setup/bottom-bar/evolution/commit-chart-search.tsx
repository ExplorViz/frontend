import {
  CommitSearchResult,
  searchCommitsInRepository,
} from 'explorviz-frontend/src/utils/evolution-data-helpers';
import {
  Commit,
  CommitTree,
} from 'explorviz-frontend/src/utils/evolution-schemes/evolution-data';
import { useMemo, useState } from 'react';
import Select from 'react-select';

interface CommitChartSearchProps {
  commitTree: CommitTree;
  onSelectCommit(commit: Commit): void;
}

function isBlank(value: string) {
  return /^\s*$/.test(value);
}

function formatCommitSearchLabel(result: CommitSearchResult): string {
  const details = [
    result.branchName,
    result.commitDate,
    result.tags?.length ? result.tags.join(', ') : undefined,
  ].filter(Boolean);
  return details.length > 0
    ? `${result.commitId} (${details.join(' · ')})`
    : result.commitId;
}

export default function CommitChartSearch({
  commitTree,
  onSelectCommit,
}: CommitChartSearchProps) {
  const [searchString, setSearchString] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  const searchResults = useMemo(
    () =>
      isBlank(searchString)
        ? []
        : searchCommitsInRepository(commitTree, searchString),
    [commitTree, searchString]
  );

  const formatOptionLabel = (result: CommitSearchResult) => {
    const label = formatCommitSearchLabel(result);

    if (!searchString.trim()) {
      return label;
    }

    const parts = label.split(new RegExp(`(${searchString.trim()})`, 'gi'));

    return parts.map((part, index) =>
      part.toLowerCase() === searchString.trim().toLowerCase() ? (
        <strong key={index}>{part}</strong>
      ) : (
        part
      )
    );
  };

  const handleInputChange = (value: string) => {
    setSearchString(value);
    setMenuOpen(!isBlank(value));
  };

  const handleSelect = (result: CommitSearchResult | null) => {
    if (!result) {
      return;
    }

    onSelectCommit({
      commitId: result.commitId,
      branchName: result.branchName,
    });
    setSearchString('');
    setMenuOpen(false);
  };

  return (
    <label className="commit-metrics-chart-control commit-metrics-chart-search">
      <span className="commit-metrics-chart-control-label">Search</span>
      <div className="commit-metrics-chart-search-input">
        <Select<CommitSearchResult>
          aria-label="Search commits"
          classNamePrefix="commit-metrics-chart-search"
          inputValue={searchString}
          value={null}
          options={searchResults}
          getOptionLabel={formatCommitSearchLabel}
          getOptionValue={(result) => `${result.branchName}:${result.commitId}`}
          formatOptionLabel={formatOptionLabel}
          onChange={handleSelect}
          onInputChange={handleInputChange}
          onMenuOpen={() => {
            if (!isBlank(searchString)) {
              setMenuOpen(true);
            }
          }}
          onMenuClose={() => setMenuOpen(false)}
          menuIsOpen={menuOpen && searchResults.length > 0}
          placeholder="Search by commit hash or tag..."
          noOptionsMessage={() =>
            isBlank(searchString) ? 'Type a commit hash or tag' : 'No matches'
          }
          isClearable={false}
          controlShouldRenderValue={false}
          blurInputOnSelect={false}
        />
      </div>
    </label>
  );
}
