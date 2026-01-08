import { KebabHorizontalIcon } from '@primer/octicons-react';
import { useCommitTreeStateStore } from 'explorviz-frontend/src/stores/commit-tree-state';
import { AppNameCommitTreeMap } from 'explorviz-frontend/src/utils/evolution-schemes/evolution-data';
import { useEffect, useRef, useState } from 'react';
import Button from 'react-bootstrap/Button';
import Dropdown from 'react-bootstrap/Dropdown';

export default function CommitTreeApplicationSelection({
  appNameCommitTreeMap,
  selectedAppName,
}: {
  appNameCommitTreeMap: AppNameCommitTreeMap;
  selectedAppName: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonsContainerRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState<number>(Infinity);
  const [showMoreDropdown, setShowMoreDropdown] = useState<boolean>(false);

  useEffect(() => {
    const appNames = Array.from(appNameCommitTreeMap.keys());

    if (appNames.length === 0) {
      return;
    }

    if (!selectedAppName || !appNames.includes(selectedAppName)) {
      useCommitTreeStateStore
        .getState()
        .setCurrentSelectedApplicationName(appNames[0]);
    }
  }, [appNameCommitTreeMap, selectedAppName]);

  useEffect(() => {
    // Reset to show all buttons initially when appNameCommitTreeMap changes
    setVisibleCount(Infinity);

    const calculateVisibleCount = () => {
      if (
        !containerRef.current ||
        !buttonsContainerRef.current ||
        appNameCommitTreeMap.size === 0
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
        '.application-label'
      ) as HTMLElement;
      const labelWidth = labelElement?.offsetWidth || 0;
      const moreButtonWidth = 50; // Approximate width of the "..." button
      const buttonGap = 8; // Gap between buttons (from gap-2 class)

      let availableWidth =
        containerWidth - labelWidth - moreButtonWidth - buttonGap - 16; // 16px for padding
      const appNames = Array.from(appNameCommitTreeMap.keys());

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

      for (const appName of appNames) {
        // Measure with primary variant to ensure we account for maximum width
        const tempButton = document.createElement('button');
        tempButton.className = 'btn btn-sm btn-primary';
        tempButton.textContent = appName;
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

      // Always show at least one button if there are applications
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
  }, [appNameCommitTreeMap]); // Removed selectedAppName from dependencies

  if (appNameCommitTreeMap!.size > 0) {
    const appNames = Array.from(appNameCommitTreeMap.keys());
    const count = visibleCount === Infinity ? appNames.length : visibleCount;
    const visibleApps = appNames.slice(0, count);
    const hiddenApps = appNames.slice(count);

    const dropdownMenu = hiddenApps.map((item) => (
      <Dropdown.Item
        key={item}
        onClick={() => {
          useCommitTreeStateStore
            .getState()
            .setCurrentSelectedApplicationName(item);
          setShowMoreDropdown(false);
        }}
      >
        {item}
      </Dropdown.Item>
    ));

    return (
      <div
        ref={containerRef}
        className="col-md-auto d-flex align-items-center application-selection-container"
      >
        <span className="h5 p-2 application-label">Application:</span>
        <div
          ref={buttonsContainerRef}
          className="d-flex align-items-center gap-2 application-buttons-container"
        >
          {visibleApps.map((appName) => (
            <Button
              key={appName}
              variant={
                selectedAppName === appName ? 'primary' : 'outline-secondary'
              }
              size="sm"
              onClick={() =>
                useCommitTreeStateStore
                  .getState()
                  .setCurrentSelectedApplicationName(appName)
              }
            >
              {appName}
            </Button>
          ))}
          {hiddenApps.length > 0 && (
            <Dropdown
              show={showMoreDropdown}
              onToggle={(isOpen) => setShowMoreDropdown(isOpen)}
            >
              <Dropdown.Toggle
                variant="outline-secondary"
                size="sm"
                id="more-applications-dropdown"
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
