import CopyButton from 'explorviz-frontend/src/components/copy-button.tsx';
import PopupData from 'explorviz-frontend/src/components/visualization/rendering/popups/popup-data';
import { usePopupHandlerStore } from 'explorviz-frontend/src/stores/popup-handler';
import generateUuidv4 from 'explorviz-frontend/src/utils/helpers/uuid4-generator';
import { requestFileDetailedData } from 'explorviz-frontend/src/utils/landscape-http-request-util';
import { Building } from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import { TypeOfAnalysis } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import { useEffect, useMemo } from 'react';
import { Accordion, Tab, Tabs } from 'react-bootstrap';

interface BuildingPopupProps {
  popupData: PopupData;
}

const NULL_METRIC_DISPLAY = '—';

function coerceMetricNumber(value: number | null | undefined): number | null {
  if (value == null) {
    return null;
  }

  const numericValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function formatInteger(value: number | null | undefined): string {
  const numericValue = coerceMetricNumber(value);
  if (numericValue === null) {
    return NULL_METRIC_DISPLAY;
  }

  return Math.round(numericValue).toLocaleString('en-US');
}

function formatWithUpToTwoDecimals(value: number | null | undefined): string {
  const numericValue = coerceMetricNumber(value);
  if (numericValue === null) {
    return NULL_METRIC_DISPLAY;
  }

  return numericValue.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function formatSizeMetric(valueInBytes: number): string {
  const kiloBytes = 1024;
  const megaBytes = kiloBytes * 1024;

  if (Math.abs(valueInBytes) >= megaBytes) {
    return `${formatWithUpToTwoDecimals(valueInBytes / megaBytes)} MegaBytes`;
  }

  if (Math.abs(valueInBytes) >= kiloBytes) {
    return `${formatWithUpToTwoDecimals(valueInBytes / kiloBytes)} KiloBytes`;
  }

  return `${formatWithUpToTwoDecimals(valueInBytes)} Bytes`;
}

function formatMetricValue(
  name: string,
  value: number | null | undefined
): string {
  if (name.trim().toLowerCase() === 'size') {
    return formatSizeMetric(value);
  }

  return formatInteger(value);
}

export default function BuildingPopup({ popupData }: BuildingPopupProps) {
  const building = popupData.entity as Building;

  const languageName = building.language ?? 'LANGUAGE_UNSPECIFIED';

  const uuid = useMemo(() => generateUuidv4(), []);

  const updatePopup = usePopupHandlerStore((state) => state.updatePopup);

  useEffect(() => {
    const isStatic =
      building.originOfData === TypeOfAnalysis.Static ||
      building.originOfData === TypeOfAnalysis.StaticAndDynamic;

    if (popupData.fileDetailedData || !isStatic || !building.id) {
      return;
    }

    let cancelled = false;

    requestFileDetailedData(building.id)
      .then((data) => {
        if (cancelled) {
          return;
        }

        const currentPopup = usePopupHandlerStore
          .getState()
          .popupData.find((popup) => popup.entityId === popupData.entityId);

        if (currentPopup) {
          updatePopup({ ...currentPopup, fileDetailedData: data });
        }
      })
      .catch((err) => {
        console.error('Failed to fetch detailed file data:', err);
      });

    return () => {
      cancelled = true;
    };
  }, [
    building.id,
    building.originOfData,
    popupData.entityId,
    popupData.fileDetailedData,
    updatePopup,
  ]);

  const detailedData = popupData.fileDetailedData;

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
            <div
              className="mt-3"
              style={{ maxHeight: '300px', overflowY: 'auto' }}
            >
              <table className="table table-sm mb-0">
                <tbody>
                  <tr>
                    <td className="fw-bold">FQN:</td>
                    <td className="text-right text-break pl-1">
                      {building.fqn}
                    </td>
                  </tr>
                  <tr>
                    <td className="fw-bold">Language:</td>
                    <td className="text-right text-break pl-1">
                      {languageName}
                    </td>
                  </tr>
                  <tr>
                    <td className="fw-bold">Origin:</td>
                    <td className="text-right text-break pl-1">
                      {building.originOfData}
                    </td>
                  </tr>
                  {building.metrics &&
                    Object.entries(building.metrics).map(([name, value]) => {
                      const currentValue = coerceMetricNumber(value.current);
                      const previousValue = coerceMetricNumber(value.previous);
                      const hasChanged =
                        previousValue !== null &&
                        currentValue !== previousValue;
                      const diff =
                        previousValue !== null
                          ? (currentValue ?? 0) - previousValue
                          : 0;
                      const diffText =
                        diff > 0
                          ? `+${formatInteger(diff)}`
                          : `${formatInteger(diff)}`;

                      return (
                        <tr key={name}>
                          <td className="fw-bold">{name}:</td>
                          <td className="text-right">
                            {!hasChanged ? (
                              formatMetricValue(name, value.current)
                            ) : (
                              <>
                                <span
                                  className={
                                    diff < 0 ? 'text-danger' : 'text-success'
                                  }
                                >
                                  {diffText}
                                </span>
                                <span className="ml-2 small text-muted">
                                  (C1: {formatMetricValue(name, value.previous)}
                                  , C2: {formatMetricValue(name, value.current)}
                                  )
                                </span>
                              </>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </Tab>

          <Tab eventKey="classes" title="Classes">
            <div
              className="mt-3"
              style={{ maxHeight: '300px', overflowY: 'auto' }}
            >
              {detailedData && detailedData.classes.length > 0 ? (
                <Accordion
                  id={`building-classes-accordion-${uuid}`}
                  className="evolution-accordion"
                >
                  {detailedData.classes.map((clazz, index) => (
                    <Accordion.Item
                      eventKey={index.toString()}
                      key={clazz.name}
                    >
                      <Accordion.Header>
                        <span>{clazz.name}</span>
                        <span className="entity-type ml-2">({clazz.type})</span>
                      </Accordion.Header>
                      <Accordion.Body>
                        <h6>Fields</h6>
                        {(clazz.fields ?? []).length > 0 ? (
                          <ul>
                            {(clazz.fields ?? []).map((f) => (
                              <li key={f.name}>
                                <span className="entity-name">{f.name}</span>:{' '}
                                <span className="entity-type">{f.type}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-muted small">No fields</p>
                        )}
                        <h6>Functions</h6>
                        {(clazz.functions ?? []).length > 0 ? (
                          <ul>
                            {(clazz.functions ?? []).map((f) => (
                              <li key={f.name}>
                                <span className="entity-name">{f.name}</span>:{' '}
                                <span className="entity-type">
                                  {f.returnType}
                                </span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-muted small">No functions</p>
                        )}
                      </Accordion.Body>
                    </Accordion.Item>
                  ))}
                </Accordion>
              ) : (
                <div className="text-center text-muted py-3">
                  {detailedData
                    ? 'No classes found'
                    : 'Loading detailed data...'}
                </div>
              )}
            </div>
          </Tab>

          <Tab eventKey="functions" title="Functions">
            <div
              className="mt-3"
              style={{ maxHeight: '300px', overflowY: 'auto' }}
            >
              {detailedData && detailedData.functions.length > 0 ? (
                <table className="table table-sm table-hover mb-0">
                  <thead>
                    <tr>
                      <th>Function</th>
                      <th>Return Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailedData.functions.map((f) => (
                      <tr key={f.name}>
                        <td className="text-break">{f.name}</td>
                        <td>{f.returnType}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center text-muted py-3">
                  {detailedData
                    ? 'No top-level functions found'
                    : 'Loading detailed data...'}
                </div>
              )}
            </div>
          </Tab>
        </Tabs>
      </div>
    </>
  );
}
