import React from 'react';
import { AppNameCommitTreeMap } from 'react-lib/src/utils/evolution-schemes/evolution-data';
import { useCommitTreeStateStore } from 'react-lib/src/stores/commit-tree-state';

export default function CommitTreeApplicationSelection({
  appNameCommitTreeMap,
  selectedAppName,
}: {
  appNameCommitTreeMap: AppNameCommitTreeMap;
  selectedAppName: string;
}) {
  // console.log(appNameCommitTreeMap!.size)
  if (appNameCommitTreeMap!.size > 0) {
    const selAppName = selectedAppName
      ? selectedAppName != undefined
      : 'Applications';
    let obj = { array: Array.from(appNameCommitTreeMap.keys()) };
    let dropdownMenu = obj.array.map((item) => (
      <div
        className="dropdown-item pointer-cursor"
        onClick={() =>
          useCommitTreeStateStore
            .getState()
            .setCurrentSelectedApplicationName(item)
        }
      >
        {item}
      </div>
    ));

    return (
      <div className="col-md-auto">
        <div
          id="application-selection"
          className="dropdown"
          style={{ zIndex: 500 }}
        >
          <button
            className="btn btn-outline-dark dropdown-toggle"
            type="button"
            data-toggle="dropdown"
            aria-haspopup="true"
            aria-expanded="false"
          >
            {selAppName}
          </button>

          <div className="dropdown-menu">{dropdownMenu}</div>
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
