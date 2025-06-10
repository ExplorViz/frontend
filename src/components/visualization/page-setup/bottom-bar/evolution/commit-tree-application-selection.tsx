import { AppNameCommitTreeMap } from 'explorviz-frontend/src/utils/evolution-schemes/evolution-data';
import { useCommitTreeStateStore } from 'explorviz-frontend/src/stores/commit-tree-state';
import Dropdown from 'react-bootstrap/Dropdown';

export default function CommitTreeApplicationSelection({
  appNameCommitTreeMap,
  selectedAppName,
}: {
  appNameCommitTreeMap: AppNameCommitTreeMap;
  selectedAppName: string;
}) {
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
      <div className="col-md-auto">
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
