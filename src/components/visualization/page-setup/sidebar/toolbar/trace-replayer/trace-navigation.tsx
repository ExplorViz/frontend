import { ChevronLeftIcon, ChevronRightIcon } from '@primer/octicons-react';

import Button from 'react-bootstrap/Button';

interface TraceNavigationProps {
  currentTraceStepIndex: number;
  traceLength: number;
  selectPreviousTraceStep(): void;
  selectNextTraceStep(): void;
}

export default function TraceNavigation({
  currentTraceStepIndex,
  traceLength,
  selectPreviousTraceStep,
  selectNextTraceStep,
}: TraceNavigationProps) {
  return (
    <div className="mt-3 d-flex justify-content-between align-items-center">
      <Button
        title="One step back"
        variant="outline-secondary"
        onClick={selectPreviousTraceStep}
        disabled={currentTraceStepIndex <= 0}
      >
        <ChevronLeftIcon size="small" className="align-middle" />
      </Button>
      <div>
        Step
        <strong>{currentTraceStepIndex + 1}</strong>
        of
        {traceLength}
      </div>
      <Button
        title="One step forward"
        variant="outline-secondary"
        onClick={selectNextTraceStep}
        disabled={currentTraceStepIndex >= traceLength - 1}
      >
        <ChevronRightIcon size="small" className="align-middle" />
      </Button>
    </div>
  );
}
