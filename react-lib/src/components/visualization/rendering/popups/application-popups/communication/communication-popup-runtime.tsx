import React from 'react';

import {
  Class,
  Package,
} from 'react-lib/src/utils/landscape-schemes/structure-data';
import ClazzCommuMeshDataModel from 'react-lib/src/view-objects/3d/application/utils/clazz-communication-mesh-data-model';
import {
  CodeIcon,
  ArrowSwitchIcon,
  ArrowRightIcon,
  CommentIcon,
} from '@primer/octicons-react';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';
import ComponentCommunication from 'react-lib/src/utils/landscape-schemes/dynamic/component-communication';

interface CommunicationPopupRuntimeProps {
  communication: ClazzCommuMeshDataModel;
  showApplication?(applicationId: string): void;
  toggleHighlightById(modelId: string): void;
  openParents(entity: Class | Package, applicationId: string): void;
}

export default function CommunicationPopupRuntime({
  communication,
  showApplication,
  toggleHighlightById,
  openParents,
}: CommunicationPopupRuntimeProps) {
  const application = communication.application;
  const aggregatedRequestCount = communication.communication.totalRequests;

  const highlightEntity = (entity: Package | Class, applicationId: string) => {
    openParents(entity, applicationId);
    toggleHighlightById(entity.id);
    showApplication?.(applicationId);
  };

  return (
    <table className="w-100">
      <tbody>
        {/* Aggregated Information */}
        {communication.communication.methodCalls.length > 1 && (
          <>
            {/* Aggregated request count */}
            <tr>
              <td className="text-nowrap align-top">
                <CodeIcon verticalAlign="middle" size="small" />
              </td>
              <td className="text-right text-break pl-1">
                {communication.communication.totalRequests}( 100% )
              </td>
            </tr>
            {/* # of unique method calls */}
            <tr>
              <td className="text-nowrap align-top">#</td>
              <td className="text-right text-break pl-1">
                {communication.communication.methodCalls.length}
              </td>
            </tr>
            <hr />
          </>
        )}

        {communication.communication.methodCalls.map(
          (classCommunication, index) => {
            return (
              <>
                {/* Relationship */}
                <tr>
                  <td className="text-nowrap align-top">
                    <ArrowSwitchIcon verticalAlign="middle" size="small" />
                  </td>
                  <td className="text-right text-break pl-1">
                    <OverlayTrigger
                      placement="top"
                      trigger={['hover', 'focus']}
                      overlay={
                        <Tooltip>
                          Application: {classCommunication.sourceApp.name}
                        </Tooltip>
                      }
                    >
                      <button
                        type="button"
                        className="buttonToLink"
                        onClick={() => {
                          highlightEntity(
                            classCommunication.sourceClass,
                            classCommunication.sourceApp.id
                          );
                        }}
                      >
                        {classCommunication.sourceClass.name}
                      </button>
                    </OverlayTrigger>

                    <ArrowRightIcon verticalAlign="middle" size="small" />

                    <OverlayTrigger
                      placement="top"
                      trigger={['hover', 'focus']}
                      overlay={
                        <Tooltip>
                          Application: {classCommunication.targetApp.name}
                        </Tooltip>
                      }
                    >
                      <button
                        type="button"
                        className="buttonToLink"
                        onClick={() =>
                          highlightEntity(
                            classCommunication.targetClass,
                            classCommunication.targetApp.id
                          )
                        }
                      >
                        {classCommunication.targetClass.name}
                      </button>
                    </OverlayTrigger>
                  </td>
                </tr>
                {/* Name */}
                <tr>
                  <td className="text-nowrap align-top">
                    <CommentIcon
                      verticalAlign="middle"
                      size="small"
                      className="mr-1"
                    />
                  </td>
                  <td className="text-right text-break pl-1">
                    {classCommunication.callerMethodName}
                    <ArrowRightIcon verticalAlign="middle" size="small" />
                    {classCommunication.operationName}
                  </td>
                </tr>

                {/* Requests */}
                <tr>
                  <td className="text-nowrap align-top">
                    <CodeIcon
                      verticalAlign="middle"
                      size="small"
                      className="mr-1"
                    />
                  </td>
                  <td className="text-right text-break pl-1">
                    {classCommunication.totalRequests}
                    {Math.round(
                      (classCommunication.totalRequests /
                        aggregatedRequestCount) *
                        100
                    )}
                    %
                  </td>
                </tr>
                {index <
                  (communication.communication as ComponentCommunication)
                    .classCommunications.length -
                    1 && <hr />}
              </>
            );
          }
        )}
      </tbody>
    </table>
  );
}
