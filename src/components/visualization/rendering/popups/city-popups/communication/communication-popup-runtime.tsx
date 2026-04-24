import React from 'react';

import {
  ArrowRightIcon,
  CodeIcon,
  SyncIcon,
  ArrowSwitchIcon,
} from '@primer/octicons-react';
import AggregatedCommunication from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/aggregated-communication';
import { pingByModelId } from 'explorviz-frontend/src/view-objects/3d/city/animated-ping-r3f';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';

interface CommunicationPopupRuntimeProps {
  communication: AggregatedCommunication;
}

export default function CommunicationPopupRuntime({
  communication,
}: CommunicationPopupRuntimeProps) {
  const metrics = Object.entries(communication.metrics).filter(
    ([key]) => key !== 'normalizedRequestCount'
  );

  return (
    <table className="w-100">
      <tbody>
        {/* Source Entity */}
        <tr>
          <td className="text-nowrap align-top">
            Source:
          </td>
          <td className="text-right text-break pl-1">
            <OverlayTrigger
              placement="top"
              trigger={['hover', 'focus']}
              overlay={
                <Tooltip>
                  App ID: {communication.sourceEntity.parentCityId}
                </Tooltip>
              }
            >
              <button
                type="button"
                className="buttonToLink"
                onClick={() => {
                  pingByModelId(communication.sourceEntity.id);
                }}
              >
                {communication.sourceEntity.name}
              </button>
            </OverlayTrigger>
          </td>
        </tr>

        {/* Target Entity */}
        <tr>
          <td className="text-nowrap align-top">
            Target:
          </td>
          <td className="text-right text-break pl-1">
            <OverlayTrigger
              placement="top"
              trigger={['hover', 'focus']}
              overlay={
                <Tooltip>
                  App ID: {communication.targetEntity.parentCityId}
                </Tooltip>
              }
            >
              <button
                type="button"
                className="buttonToLink"
                onClick={() =>
                  pingByModelId(communication.targetEntity.id)
                }
              >
                {communication.targetEntity.name}
              </button>
            </OverlayTrigger>
          </td>
        </tr>

        <tr className="border-bottom">
          <td colSpan={2} className="py-1"></td>
        </tr>

        {/* Communication Properties */}
        {communication.isBidirectional && (
          <tr>
            <td className="text-nowrap align-top">
              <ArrowSwitchIcon verticalAlign="middle" size="small" className="mr-1" />
              Direction:
            </td>
            <td className="text-right text-break pl-1">
              Bidirectional
            </td>
          </tr>
        )}

        {communication.isRecursive && (
          <tr>
            <td className="text-nowrap align-top">
              <SyncIcon verticalAlign="middle" size="small" className="mr-1" />
              Recursive:
            </td>
            <td className="text-right text-break pl-1">
              Yes
            </td>
          </tr>
        )}

        {/* Metrics */}
        {metrics.map(([key, value]) => (
          <tr key={key}>
            <td className="text-nowrap align-top">
              <CodeIcon verticalAlign="middle" size="small" className="mr-1" />
              {key}:
            </td>
            <td className="text-right text-break pl-1">
              {value}
            </td>
          </tr>
        ))}

        {/* Building Communications Count */}
        <tr>
          <td className="text-nowrap align-top">
            Aggregated from:
          </td>
          <td className="text-right text-break pl-1">
            {communication.buildingCommunicationIds.length} building-links
          </td>
        </tr>
      </tbody>
    </table>
  );
}
