import { Badge, Table } from 'react-bootstrap';

/**
 * A table component for displaying telemetry attributes.
 */
export default function AttributesTable({
  attributes,
}: {
  attributes: Record<string, string>;
}) {
  // Filter out ExplorViz-specific attributes
  const filteredEntries = Object.entries(attributes).filter(
    ([k]) => !k.startsWith('explorviz.')
  );

  if (filteredEntries.length === 0) {
    return <div>None</div>;
  }

  return (
    <Table striped bordered hover size="sm" className="small w-auto text-break">
      <tbody>
        {filteredEntries.map(([k, v]) => (
          <tr key={k}>
            <td>
              <Badge bg="secondary" text="light" pill>
                {k}
              </Badge>
            </td>
            <td>
              <code className="text-secondary bg-secondary-subtle px-1 rounded-1">
                {v}
              </code>
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
