import React from 'react';

import {
  ArrowRightIcon,
  ArrowSwitchIcon,
  CodeIcon,
  CommentIcon,
} from '@primer/octicons-react';
import EditCommMesh from 'explorviz-frontend/src/components/visualization/rendering/popups/interactable-properties/edit-comm-mesh.tsx';
import EditOperationName from 'explorviz-frontend/src/components/visualization/rendering/popups/interactable-properties/edit-operation-name.tsx';
import { useLandscapeRestructureStore } from 'explorviz-frontend/src/stores/landscape-restructure';
import ComponentCommunication from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/component-communication';
import {
  Class,
  Package,
} from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';
import ClassCommunication from '../../../../../../utils/landscape-schemes/dynamic/class-communication';

interface CommunicationPopupRestructureProps {
  communication: ClassCommunication;
}

export default function CommunicationPopupRestructure({
  communication,
}: CommunicationPopupRestructureProps) {
  const restructureMode = useLandscapeRestructureStore(
    (state) => state.restructureMode
  );

  const aggregatedRequestCount = communication.totalRequests;

  const highlightEntity = (entity: Package | Class, applicationId: string) => {
    // ToDo: Migrate
    // openParents(entity, applicationId);
    // toggleHighlightById(entity.id);
    // showApplication?.(applicationId);
  };

  return (
    <table className="w-100">
      <tbody>
        {/* Aggregated Information */}
        {communication.methodCalls.length > 1 && (
          <>
            {/* Aggregated request count */}
            <tr>
              <td className="text-nowrap align-top">
                <CodeIcon verticalAlign="middle" size="small" />
              </td>
              <td className="text-right text-break pl-1">
                {communication.totalRequests}( 100% )
              </td>
            </tr>
            {/* # of unique method calls */}
            <tr>
              <td className="text-nowrap align-top">#</td>
              <td className="text-right text-break pl-1">
                {communication.methodCalls.length}
              </td>
            </tr>
            <hr />
          </>
        )}

        {communication.methodCalls.map((classCommunication, index) => {
          return (
            <React.Fragment key={index}>
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
                <EditOperationName
                  communication={
                    classCommunication as unknown as ClassCommunication
                  }
                />

                <td className="text-nowrap align-top">
                  <CommentIcon verticalAlign="middle" size="small" />
                </td>
                <td className="text-right text-break pl-1">
                  {classCommunication.callerMethodName}
                  <ArrowRightIcon
                    verticalAlign="middle"
                    size="small"
                    className="mr-1"
                  />
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
              {communication instanceof ComponentCommunication && (
                <>
                  {restructureMode && (
                    <EditCommMesh
                      classCommunication={
                        classCommunication as unknown as ClassCommunication
                      }
                    />
                  )}
                  {index <
                    (communication as ComponentCommunication)
                      .classCommunications.length -
                      1 && <hr />}
                </>
              )}
            </React.Fragment>
          );
        })}
      </tbody>
    </table>
  );
}
