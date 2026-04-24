import React from 'react';

import AggregatedCommunication from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/aggregated-communication';

interface CommunicationPopupRestructureProps {
  communication: AggregatedCommunication;
}

export default function CommunicationPopupRestructure({
  communication,
}: CommunicationPopupRestructureProps) {
  return (
    <table className="w-100">
      <tbody>
        <tr>
          <td className="text-nowrap align-top">Source:</td>
          <td className="text-right text-break pl-1">{communication.sourceEntity.name}</td>
        </tr>
        <tr>
          <td className="text-nowrap align-top">Target:</td>
          <td className="text-right text-break pl-1">{communication.targetEntity.name}</td>
        </tr>
      </tbody>
    </table>
  );
}
