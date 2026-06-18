import LinkButton from 'explorviz-frontend/src/components/link-button.tsx';
import {
  coerceMetricNumber,
  formatInteger,
  formatMetricValue,
} from 'explorviz-frontend/src/components/visualization/rendering/popups/city-popups/building-metrics-utils';
import PopupData from 'explorviz-frontend/src/components/visualization/rendering/popups/popup-data';
import { usePopupHandlerStore } from 'explorviz-frontend/src/stores/popup-handler';
import generateUuidv4 from 'explorviz-frontend/src/utils/helpers/uuid4-generator';
import { requestFileDetailedData } from 'explorviz-frontend/src/utils/landscape-http-request-util';
import { Building } from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import {
  ClazzDto,
  FileDetailedDto,
  FunctionDto,
} from 'explorviz-frontend/src/utils/landscape-schemes/file-detailed-data';
import { TypeOfAnalysis } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import { getOrderedBuildingMetricEntries } from 'explorviz-frontend/src/utils/settings/settings-schemas';
import { useEffect, useMemo } from 'react';
import { Accordion, Tab, Tabs } from 'react-bootstrap';

interface BuildingPopupProps {
  popupData: PopupData;
}

interface FlattenedClass {
  clazz: ClazzDto;
  displayName: string;
  key: string;
}

function flattenClasses(
  classes: ClazzDto[],
  prefix = '',
  keyPrefix = ''
): FlattenedClass[] {
  return classes.flatMap((clazz, index) => {
    const displayName = prefix ? `${prefix}.${clazz.name}` : clazz.name;
    const key = keyPrefix ? `${keyPrefix}-${index}` : `${index}`;
    const current: FlattenedClass = { clazz, displayName, key };
    const nested = flattenClasses(clazz.innerClasses ?? [], displayName, key);
    return [current, ...nested];
  });
}

function EntityNameTypeList({
  items,
  emptyMessage,
}: {
  items: Array<{ name: string; type: string }>;
  emptyMessage: string;
}) {
  if (items.length === 0) {
    return <p className="text-muted small mb-0">{emptyMessage}</p>;
  }

  return (
    <ul className="mb-0">
      {items.map((item) => (
        <li key={item.name}>
          <span className="entity-name">{item.name}</span>:{' '}
          <span className="entity-type">{item.type}</span>
        </li>
      ))}
    </ul>
  );
}

function StringList({
  items,
  emptyMessage,
}: {
  items: string[];
  emptyMessage: string;
}) {
  if (items.length === 0) {
    return <p className="text-muted small mb-0">{emptyMessage}</p>;
  }

  return (
    <ul className="mb-0">
      {items.map((item) => (
        <li key={item}>
          <span className="entity-name">{item}</span>
        </li>
      ))}
    </ul>
  );
}

function LoadingOrEmpty({
  detailedData,
  emptyMessage,
}: {
  detailedData: FileDetailedDto | undefined;
  emptyMessage: string;
}) {
  return (
    <div className="text-center text-muted py-3">
      {detailedData ? emptyMessage : 'Loading detailed data...'}
    </div>
  );
}

function FileTabContent({
  detailedData,
  uuid,
}: {
  detailedData: FileDetailedDto | undefined;
  uuid: string;
}) {
  if (!detailedData) {
    return <LoadingOrEmpty detailedData={detailedData} emptyMessage="" />;
  }

  const importNames = detailedData.importNames ?? [];
  const topLevelFunctions = detailedData.functions ?? [];
  const flattenedClasses = flattenClasses(detailedData.classes ?? []);

  return (
    <div
      className="mt-3 d-flex flex-column gap-3"
      style={{ maxHeight: '300px', overflowY: 'auto' }}
    >
      <section>
        <h6 className="mb-2">Imports</h6>
        <Accordion
          id={`building-imports-accordion-${uuid}`}
          className="evolution-accordion"
        >
          <Accordion.Item eventKey="imports">
            <Accordion.Header>
              Imports ({importNames.length})
            </Accordion.Header>
            <Accordion.Body>
              <StringList items={importNames} emptyMessage="No imports found" />
            </Accordion.Body>
          </Accordion.Item>
        </Accordion>
      </section>

      <section>
        <h6 className="mb-2">Top-Level Functions</h6>
        <Accordion
          id={`building-functions-accordion-${uuid}`}
          className="evolution-accordion"
        >
          <Accordion.Item eventKey="functions">
            <Accordion.Header>
              Top-Level Functions ({topLevelFunctions.length})
            </Accordion.Header>
            <Accordion.Body>
              {topLevelFunctions.length > 0 ? (
                <ul className="mb-0">
                  {topLevelFunctions.map((func, index) => (
                    <li key={`${func.name}-${index}`}>
                      <span className="entity-name">{func.name}</span>:{' '}
                      <span className="entity-type">{func.returnType}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted small mb-0">
                  No top-level functions found
                </p>
              )}
            </Accordion.Body>
          </Accordion.Item>
        </Accordion>
      </section>

      <section>
        <h6 className="mb-2">Classes</h6>
        {flattenedClasses.length > 0 ? (
          <Accordion
            id={`building-classes-accordion-${uuid}`}
            className="evolution-accordion"
          >
            {flattenedClasses.map(({ clazz, displayName, key }) => (
              <Accordion.Item eventKey={key} key={key}>
                <Accordion.Header>
                  <span>{displayName}</span>
                  <span className="entity-type ml-2">({clazz.type})</span>
                </Accordion.Header>
                <Accordion.Body>
                  <h6>Superclasses</h6>
                  <StringList
                    items={clazz.superclassFqns ?? []}
                    emptyMessage="No superclasses"
                  />
                  <h6 className="mt-3">Fields</h6>
                  <EntityNameTypeList
                    items={(clazz.fields ?? []).map((field) => ({
                      name: field.name,
                      type: field.type,
                    }))}
                    emptyMessage="No fields"
                  />
                  <h6 className="mt-3">Functions</h6>
                  <EntityNameTypeList
                    items={(clazz.functions ?? []).map((func: FunctionDto) => ({
                      name: func.name,
                      type: func.returnType,
                    }))}
                    emptyMessage="No functions"
                  />
                </Accordion.Body>
              </Accordion.Item>
            ))}
          </Accordion>
        ) : (
          <LoadingOrEmpty
            detailedData={detailedData}
            emptyMessage="No classes found"
          />
        )}
      </section>
    </div>
  );
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

  const isStatic =
    building.originOfData === TypeOfAnalysis.Static ||
    building.originOfData === TypeOfAnalysis.StaticAndDynamic;
  const showSourceLink = isStatic && !!building.id;
  const sourceLinkTooltip = detailedData?.fileUrl
    ? 'Open source file'
    : detailedData
      ? 'Source file unavailable'
      : 'Loading source file...';

  return (
    <>
      <h3 className="popover-header">
        <div className="d-flex align-items-center justify-content-center gap-2">
          <div className="text-center text-break fw-bold pl-1">
            {building.name}
          </div>
          {showSourceLink && (
            <LinkButton
              url={detailedData?.fileUrl}
              disabled={!detailedData?.fileUrl}
              tooltip={sourceLinkTooltip}
            />
          )}
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
                    getOrderedBuildingMetricEntries(building.metrics).map(
                      ([name, value]) => {
                        const currentValue = coerceMetricNumber(value.current);
                        const previousValue = coerceMetricNumber(
                          value.previous
                        );
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
                                    (C1:{' '}
                                    {formatMetricValue(name, value.previous)}, C2:{' '}
                                    {formatMetricValue(name, value.current)})
                                  </span>
                                </>
                              )}
                            </td>
                          </tr>
                        );
                      }
                    )}
                </tbody>
              </table>
            </div>
          </Tab>

          <Tab eventKey="file" title="File">
            <FileTabContent detailedData={detailedData} uuid={uuid} />
          </Tab>
        </Tabs>
      </div>
    </>
  );
}
