import { Tab, Tabs } from 'react-bootstrap';
import ComponentOpener from '../../component-opener';
import { ToolbarOpenerProps } from '../../types';
import LogSearch from './log-search';
import SpanSearch from './span-search';

export default function TelemetrySearch() {
  return (
    <>
      <h5 className="text-center">Telemetry Search</h5>
      <p className="text-center text-muted">
        Find telemetry data related to landscape entities.
      </p>

      <Tabs defaultActiveKey="spans" className="ml-2">
        <Tab
          eventKey="spans"
          title="Spans"
          className="border border-top-0 p-3"
          tabClassName="text-dark"
        >
          <SpanSearch />
        </Tab>
        <Tab
          eventKey="metrics"
          title="Metrics"
          className="border border-top-0 p-3"
          tabClassName="text-dark"
        >
          Not implemented yet
        </Tab>
        <Tab
          eventKey="logs"
          title="Logs"
          className="border border-top-0 p-3"
          tabClassName="text-dark"
        >
          <LogSearch />
        </Tab>
      </Tabs>

      <style>
        {`
          .tab-content {
            padding: 0;
          }
        `}
      </style>
    </>
  );
}

export function TelemetrySearchOpener({
  openedComponent,
  toggleToolsSidebarComponent,
}: ToolbarOpenerProps) {
  return (
    <ComponentOpener
      openedComponent={openedComponent}
      componentTitle="Telemetry Search"
      componentId="telemetry-search"
      toggleComponent={toggleToolsSidebarComponent}
    />
  );
}
