import React from 'react';

import {
  ArrowRightIcon,
  ArrowSwitchIcon,
  CodeIcon,
  CommentIcon,
} from '@primer/octicons-react';
import ClassCommunication from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/class-communication';
import ComponentCommunication from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/component-communication';
import { pingByModelId } from 'explorviz-frontend/src/view-objects/3d/application/animated-ping-r3f';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';

interface CommunicationPopupRuntimeProps {
  communication: ClassCommunication;
}

export default function CommunicationPopupRuntime({
  communication,
}: CommunicationPopupRuntimeProps) {
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
            <React.Fragment key={classCommunication.id}>
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
                        pingByModelId(classCommunication.sourceClass.id);
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
                        pingByModelId(classCommunication.targetClass.id)
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
                      communication.totalRequests) *
                      100
                  )}
                  %
                </td>
              </tr>
              {communication instanceof ComponentCommunication &&
                index < communication.classCommunications.length - 1 && <hr />}
            </React.Fragment>
          );
        })}
      </tbody>
    </table>
  );
}
