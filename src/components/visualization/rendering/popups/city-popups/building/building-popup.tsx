import CopyButton from 'explorviz-frontend/src/components/copy-button.tsx';
import PopupData from 'explorviz-frontend/src/components/visualization/rendering/popups/popup-data';
import generateUuidv4 from 'explorviz-frontend/src/utils/helpers/uuid4-generator';
import { Building } from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import { useMemo } from 'react';
import { Tab, Tabs } from 'react-bootstrap';

interface BuildingPopupProps {
  popupData: PopupData;
}

export default function BuildingPopup({ popupData }: BuildingPopupProps) {
  const building = popupData.entity as Building;

  const languageName = building.language ?? 'LANGUAGE_UNSPECIFIED';

  const uuid = useMemo(() => generateUuidv4(), []);

  const hasPrevious = Object.values(building.metrics ?? {}).some(
    (metric) => metric.previous !== undefined
  );

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
                    {hasPrevious && <th className="text-right">Previous</th>}
                  </tr>
                </thead>
                <tbody>
                  {building.metrics &&
                  Object.keys(building.metrics).length > 0 ? (
                    Object.entries(building.metrics).map(([name, value]) => (
                      <tr key={name}>
                        <td className="text-break">{name}</td>
                        <td className="text-right">{value.current}</td>
                        {hasPrevious && (
                          <td className="text-right">
                            {value.previous ?? '-'}
                          </td>
                        )}
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

