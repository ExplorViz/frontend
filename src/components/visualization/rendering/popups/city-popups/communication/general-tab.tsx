import AggregatedCommunication from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/aggregated-communication';
import { pingByModelId } from 'explorviz-frontend/src/view-objects/3d/city/animated-ping-r3f';
import { OverlayTrigger, Table, Tooltip } from 'react-bootstrap';

interface GeneralTabProps {
  communication: AggregatedCommunication;
}

export default function GeneralTab({ communication }: GeneralTabProps) {
  const metrics = Object.entries(communication.metrics).filter(
    ([key]) => key !== 'normalizedRequestCount'
  );

  return (
    <Table hover className="table table-sm mt-2 mb-0">
      <tbody>
        {/* Source entity */}
        <tr>
          <td className="fw-bold">Source</td>
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
              <a
                href="#"
                onClick={() => {
                  pingByModelId(communication.sourceEntity.id);
                }}
              >
                {communication.sourceEntity.name}
              </a>
            </OverlayTrigger>
          </td>
        </tr>

        {/* Target entity */}
        <tr>
          <td className="fw-bold">Target</td>
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
              <a
                href="#"
                onClick={() => pingByModelId(communication.targetEntity.id)}
              >
                {communication.targetEntity.name}
              </a>
            </OverlayTrigger>
          </td>
        </tr>

        {/* Communication properties */}
        <tr>
          <td className="fw-bold">Bidirectional</td>
          <td>{communication.isBidirectional ? 'Yes' : 'No'}</td>
        </tr>

        <tr>
          <td className="fw-bold">Recursive</td>
          <td>{communication.isRecursive ? 'Yes' : 'No'}</td>
        </tr>

        <tr>
          <td className="fw-bold">Aggregated from</td>
          <td>
            {communication.buildingCommunicationIds.length} building link
            {communication.buildingCommunicationIds.length > 1 ? 's' : ''}
          </td>
        </tr>

        {/* Metrics */}
        {metrics.map(([key, value]) => (
          <tr key={key}>
            <td className="fw-bold">{key}</td>
            <td className="text-right text-break pl-1">{value}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
