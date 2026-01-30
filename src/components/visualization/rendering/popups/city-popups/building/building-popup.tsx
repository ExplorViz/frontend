import CopyButton from 'explorviz-frontend/src/components/copy-button.tsx';
import PopupData from 'explorviz-frontend/src/components/visualization/rendering/popups/popup-data';
import { useModelStore } from 'explorviz-frontend/src/stores/repos/model-repository';
import generateUuidv4 from 'explorviz-frontend/src/utils/helpers/uuid4-generator';
import {
  Building,
  Language,
} from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import { useMemo } from 'react';
import { Tab, Tabs } from 'react-bootstrap';

interface BuildingPopupProps {
  popupData: PopupData;
}

export default function BuildingPopup({ popupData }: BuildingPopupProps) {
  const building = popupData.entity as Building;
  const { getFunc } = useModelStore();

  const languageName =
    building.language !== undefined ? Language[building.language] : 'Unknown';

  const functions = useMemo(() => {
    return (building.functionIds || [])
      .map((id) => getFunc(id))
      .filter((f) => f !== undefined);
  }, [building.functionIds, getFunc]);

  const uuid = useMemo(() => generateUuidv4(), []);

  return (
    <>
      <h3 className="popover-header">
        <div className="d-flex align-items-center justify-content-center gap-2">
          <div className="text-center text-break fw-bold pl-1">
            {building.name}
          </div>
          <CopyButton text={building.name} />
        </div>
      </h3>
      <div className="popover-body">
        <Tabs
          defaultActiveKey="general"
          id={`building-popup-tabs-${uuid}`}
          className="nav-tabs justify-content-center"
        >
          <Tab eventKey="general" title="General">
            <div className="mt-3">
              <table className="w-100">
                <tbody>
                  <tr>
                    <td>Language:</td>
                    <td className="text-right text-break pl-1">
                      {languageName}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Tab>

          <Tab eventKey="functions" title="Functions">
            <div
              className="mt-3"
              style={{ maxHeight: '200px', overflowY: 'auto' }}
            >
              <table className="table table-sm table-hover mb-0">
                <thead>
                  <tr>
                    <th>Name</th>
                  </tr>
                </thead>
                <tbody>
                  {functions.length > 0 ? (
                    functions.map((f) => (
                      <tr key={f!.id}>
                        <td className="text-break">{f!.name}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="text-muted text-center">No functions</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Tab>

          <Tab eventKey="metrics" title="Metrics">
            <div
              className="mt-3"
              style={{ maxHeight: '200px', overflowY: 'auto' }}
            >
              <table className="table table-sm table-hover mb-0">
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th className="text-right">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {building.metrics &&
                  Object.keys(building.metrics).length > 0 ? (
                    Object.entries(building.metrics).map(([name, value]) => (
                      <tr key={name}>
                        <td className="text-break">{name}</td>
                        <td className="text-right">{value}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={2} className="text-muted text-center">
                        No metrics
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Tab>
        </Tabs>
      </div>
    </>
  );
}
