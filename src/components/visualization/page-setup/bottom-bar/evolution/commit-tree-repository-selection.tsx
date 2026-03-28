import { KebabHorizontalIcon } from '@primer/octicons-react';
import { useCommitTreeStateStore } from 'explorviz-frontend/src/stores/commit-tree-state';
import { RepoNameCommitTreeMap } from 'explorviz-frontend/src/utils/evolution-schemes/evolution-data';
import { useEffect, useRef, useState } from 'react';
import Button from 'react-bootstrap/Button';
import Dropdown from 'react-bootstrap/Dropdown';

export default function CommitTreeRepositorySelection({
  repoNameCommitTreeMap,
  selectedRepoName,
}: {
  repoNameCommitTreeMap: RepoNameCommitTreeMap;
  selectedRepoName: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonsContainerRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState<number>(Infinity);
  const [showMoreDropdown, setShowMoreDropdown] = useState<boolean>(false);

  useEffect(() => {
    const repoNames = Array.from(repoNameCommitTreeMap.keys());

    if (repoNames.length === 0) {
      return;
    }

    if (!selectedRepoName || !repoNames.includes(selectedRepoName)) {
      useCommitTreeStateStore
        .getState()
        .setCurrentSelectedRepositoryName(repoNames[0]);
    }
  }, [repoNameCommitTreeMap, selectedRepoName]);

  useEffect(() => {
    // Reset to show all buttons initially when appNameCommitTreeMap changes
    setVisibleCount(Infinity);

    const calculateVisibleCount = () => {
      if (
        !containerRef.current ||
        !buttonsContainerRef.current ||
        repoNameCommitTreeMap.size === 0
      ) {
        return;
      }

      const container = containerRef.current;
      const buttonsContainer = buttonsContainerRef.current;
      const containerWidth = container.offsetWidth;

      // If container width is 0, it's not ready yet, skip calculation
      if (containerWidth === 0) {
        return;
      }

      const labelElement = container.querySelector(
        '.repository-label'
      ) as HTMLElement;
      const labelWidth = labelElement?.offsetWidth || 0;
      const moreButtonWidth = 50; // Approximate width of the "..." button
      const buttonGap = 8; // Gap between buttons (from gap-2 class)

      let availableWidth =
        containerWidth - labelWidth - moreButtonWidth - buttonGap - 16; // 16px for padding
      const repoNames = Array.from(repoNameCommitTreeMap.keys());

      // Measure actual button widths by creating temporary buttons
      // Use primary variant to account for maximum width (selected buttons might be wider)
      const tempContainer = document.createElement('div');
      tempContainer.style.visibility = 'hidden';
      tempContainer.style.position = 'absolute';
      tempContainer.style.display = 'flex';
      tempContainer.style.gap = '8px';
      tempContainer.style.fontSize =
        window.getComputedStyle(buttonsContainer).fontSize;
      document.body.appendChild(tempContainer);

      let count = 0;
      let totalWidth = 0;

      for (const repoName of repoNames) {
        // Measure with primary variant to ensure we account for maximum width
        const tempButton = document.createElement('button');
        tempButton.className = 'btn btn-sm btn-primary';
        tempButton.textContent = repoName;
        tempContainer.appendChild(tempButton);

        // Force layout calculation
        void tempButton.offsetWidth;

        const buttonWidth = tempButton.offsetWidth;
        if (totalWidth + buttonWidth + buttonGap <= availableWidth) {
          totalWidth += buttonWidth + buttonGap;
          count++;
        } else {
          tempContainer.removeChild(tempButton);
          break;
        }
        tempContainer.removeChild(tempButton);
      }

      document.body.removeChild(tempContainer);

      // Always show at least one button if there are repositories
      setVisibleCount(Math.max(1, count));
    };

    // Use multiple delays to ensure DOM is fully ready after refresh
    let timeoutId1: NodeJS.Timeout;
    let timeoutId2: NodeJS.Timeout;

    timeoutId1 = setTimeout(() => {
      timeoutId2 = setTimeout(() => {
        calculateVisibleCount();
      }, 50);
    }, 100);

    window.addEventListener('resize', calculateVisibleCount);
    return () => {
      clearTimeout(timeoutId1);
      clearTimeout(timeoutId2);
      window.removeEventListener('resize', calculateVisibleCount);
    };
  }, [repoNameCommitTreeMap]); // Removed selectedRepoName from dependencies

  if (repoNameCommitTreeMap!.size > 0) {
    const repoNames = Array.from(repoNameCommitTreeMap.keys());
    const count = visibleCount === Infinity ? repoNames.length : visibleCount;
    const visibleRepos = repoNames.slice(0, count);
    const hiddenRepos = repoNames.slice(count);

    const dropdownMenu = hiddenRepos.map((item) => (
      <Dropdown.Item
        key={item}
        onClick={() => {
          useCommitTreeStateStore
            .getState()
            .setCurrentSelectedRepositoryName(item);
          setShowMoreDropdown(false);
        }}
      >
        {item}
      </Dropdown.Item>
    ));

    return (
      <div
        ref={containerRef}
        className="col-md-auto d-flex align-items-center repository-selection-container"
      >
        <span className="h5 p-2 repository-label">Repository:</span>
        <div
          ref={buttonsContainerRef}
          className="d-flex align-items-center gap-2 repository-buttons-container"
        >
          {visibleRepos.map((repoName) => (
            <Button
              key={repoName}
              variant={
                selectedRepoName === repoName ? 'primary' : 'outline-secondary'
              }
              size="sm"
              onClick={() =>
                useCommitTreeStateStore
                  .getState()
                  .setCurrentSelectedRepositoryName(repoName)
              }
            >
              {repoName}
            </Button>
          ))}
          {hiddenRepos.length > 0 && (
            <Dropdown
              show={showMoreDropdown}
              onToggle={(isOpen) => setShowMoreDropdown(isOpen)}
              className="commit-tree-repo-dropdown"
            >
              <Dropdown.Toggle
                variant="outline-secondary"
                size="sm"
                id="more-repositories-dropdown"
              >
                <KebabHorizontalIcon size="small" />
              </Dropdown.Toggle>
              <Dropdown.Menu>{dropdownMenu}</Dropdown.Menu>
            </Dropdown>
          )}
        </div>
      </div>
    );
  } else {
    return (
      <div className="timeline-no-timestamps-outer">
        <div className="timeline-no-timestamps-inner">
          No data on commits is available
        </div>
      </div>
    );
  }
}
