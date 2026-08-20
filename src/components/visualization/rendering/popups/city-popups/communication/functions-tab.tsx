import { requestCommunicationFunctions } from 'explorviz-frontend/src/utils/landscape-http-request-util';
import AggregatedCommunication from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/aggregated-communication';
import { CommFunction } from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/function-call';
import React, { useEffect, useState } from 'react';
import { Spinner, Table } from 'react-bootstrap';

interface FunctionsTabProps {
  communication: AggregatedCommunication;
}

export default function FunctionsTab({ communication }: FunctionsTabProps) {
  const [functions, setFunctions] = useState<CommFunction[] | null>(null);

  useEffect(() => {
    const fetchFuncData = async () => {
      try {
        setFunctions(await requestCommunicationFunctions(communication));
      } catch (error) {
        console.error(error);
        setFunctions([]);
      }
    };
    fetchFuncData();
  }, [communication]);

  return (
    <div className="mt-2">
      {!functions ? (
        <div className="text-center p-3">
          <Spinner animation="border" size="sm" />
          <span className="ml-2">Loading functions...</span>
        </div>
      ) : functions.length > 0 ? (
        <Table striped bordered hover size="sm" style={{ fontSize: '0.85rem' }}>
          <thead>
            <tr>
              <th>Function</th>
              <th className="text-center">Calls</th>
              <th className="text-center">Time (ns)</th>
            </tr>
          </thead>
          <tbody>
            {functions.map((func) => {
              const [src, tgt] = func.isForward
                ? [communication.sourceEntity, communication.targetEntity]
                : [communication.targetEntity, communication.sourceEntity];

              return (
                <React.Fragment key={func.id}>
                  {functions.length > 1 && (
                    <tr className="bg-light">
                      <td
                        colSpan={3}
                        className="font-weight-bold text-muted small"
                      >
                        {src.name} &rarr; {tgt.name}
                      </td>
                    </tr>
                  )}

                  <tr>
                    <td>
                      <div
                        className="text-truncate"
                        style={{ maxWidth: '200px' }}
                        title={func.name}
                      >
                        {func.name}
                      </div>
                    </td>
                    <td className="text-center">{func.callCount}</td>
                    <td className="text-center">{func.executionTime}</td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </Table>
      ) : (
        <div className="text-center text-muted p-3">
          No detailed function information available for this communication.
        </div>
      )}
    </div>
  );
}
