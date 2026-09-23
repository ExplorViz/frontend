import { useToastHandlerStore } from 'explorviz-frontend/src/stores/toast-handler';
import { use } from 'react';
import { Tab, Tabs } from 'react-bootstrap';
import { ToolbarContext } from '../toolbar-context';
import LogSearch from './log-search';
import SpanSearch from './span-search';

export default function TelemetrySearch() {
  const showErrorToastMessage = useToastHandlerStore(
    (state) => state.showErrorToastMessage
  );

  const toolbarContext = use(ToolbarContext);

  const selectedTab = toolbarContext.telemetrySearchState.selectedTab;

  const handleSelect = (tab: string | null) => {
    if (tab !== 'spans' && tab !== 'metrics' && tab !== 'logs') {
      showErrorToastMessage('Invalid tab selected');
      return;
    }
    toolbarContext.setTelemetrySearchTab(tab);
  };

  return (
    <>
      <h5 className="text-center">Telemetry Search</h5>
      <p className="text-center text-muted">
        Find telemetry data related to landscape entities.
      </p>

      <Tabs
        activeKey={selectedTab}
        defaultActiveKey="spans"
        onSelect={handleSelect}
        className="ml-2"
      >
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
    </>
  );
}
