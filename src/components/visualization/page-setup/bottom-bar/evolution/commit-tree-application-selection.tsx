import { AppNameCommitTreeMap } from 'explorviz-frontend/src/utils/evolution-schemes/evolution-data';
import { useCommitTreeStateStore } from 'explorviz-frontend/src/stores/commit-tree-state';
import Dropdown from 'react-bootstrap/Dropdown';
import { useEffect } from 'react';

export default function CommitTreeApplicationSelection({
  appNameCommitTreeMap,
  selectedAppName,
}: {
  appNameCommitTreeMap: AppNameCommitTreeMap;
  selectedAppName: string;
}) {
  useEffect(() => {
    const appNames = Array.from(appNameCommitTreeMap.keys());
    if (
      !selectedAppName ||
      (appNames.includes(selectedAppName) && appNameCommitTreeMap!.size > 0)
    ) {
      useCommitTreeStateStore
        .getState()
        .setCurrentSelectedApplicationName(
          Array.from(appNameCommitTreeMap.keys())[0]
        );
    }
  }, []);

  if (appNameCommitTreeMap!.size > 0) {
    let obj = { array: Array.from(appNameCommitTreeMap.keys()) };
    let dropdownMenu = obj.array.map((item) => (
      <Dropdown.Item
        key={item}
        onClick={() =>
          useCommitTreeStateStore
            .getState()
            .setCurrentSelectedApplicationName(item)
        }
      >
        {item}
      </Dropdown.Item>
    ));

    return (
      <div className="col-md-auto d-flex align-items-center">
        <span className="h5 p-2">Application:</span>
        <Dropdown id="application-selection">
          <Dropdown.Toggle id="dropdown-basic" variant="secondary">
            {selectedAppName || 'Applications'}
          </Dropdown.Toggle>
          <Dropdown.Menu>{dropdownMenu}</Dropdown.Menu>
        </Dropdown>
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
