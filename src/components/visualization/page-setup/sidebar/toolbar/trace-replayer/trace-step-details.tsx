import { useState } from 'react';

import { formatNumber } from 'explorviz-frontend/src/utils/format-number';
import Button from 'react-bootstrap/Button';

type TimeUnit = 'ns' | 'ms' | 's';

interface TraceStepDetailsProps {
  readonly operationName: string;
  readonly sourceClass?: string;
  readonly targetClass: string;
  readonly sourceApplicationName?: string;
  readonly targetApplicationName: string;
  readonly spanStartTime: number;
  readonly spanEndTime: number;
  readonly start: number;
  readonly end: number;
  readonly duration: number;
}

export default function TraceStepDetails({
  operationName,
  sourceClass,
  targetClass,
  sourceApplicationName,
  targetApplicationName,
  spanStartTime,
  spanEndTime,
  duration,
}: TraceStepDetailsProps) {
  const [timeUnit, setTimeUnit] = useState<TimeUnit>('ns');
  const spanDuration = spanEndTime - spanStartTime;

  const toggleSpanDurationTimeUnit = () => {
    if (timeUnit === 'ns') {
      setTimeUnit('ms');
    } else if (timeUnit === 'ms') {
      setTimeUnit('s');
    } else if (timeUnit === 's') {
      setTimeUnit('ns');
    }
  };

  return (
    <>
      <h5 style={{ textAlign: 'center' }}>Trace Step Details</h5>
      <div className="mt-3 d-flex justify-content-between">
        <table className="table table-striped">
          <tbody>
            <tr className="d-flex">
              <th className="col-3">Operation Name</th>
              <td className="col-9 container-word-wrap">{operationName}</td>
            </tr>
            <tr className="d-flex">
              <th className="col-3">Source Class</th>
              <td className="col-9 container-word-wrap">{sourceClass}</td>
            </tr>
            <tr className="d-flex">
              <th className="col-3">Target Class</th>
              <td className="col-9 container-word-wrap">{targetClass}</td>
            </tr>
            <tr className="d-flex">
              <th className="col-3">Source Application</th>
              <td className="col-9 container-word-wrap">
                {sourceApplicationName}
              </td>
            </tr>
            <tr className="d-flex">
              <th className="col-3">Target Application</th>
              <td className="col-9 container-word-wrap">
                {targetApplicationName}
              </td>
            </tr>
            <tr className="d-flex">
              <th className="col-3">
                Duration
                <Button
                  onClick={toggleSpanDurationTimeUnit}
                  className="th-btn"
                  variant="outline-secondary"
                >
                  {timeUnit}
                </Button>
              </th>
              <td className="col-9 container-word-wrap">
                {formatNumber(duration, timeUnit)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}
