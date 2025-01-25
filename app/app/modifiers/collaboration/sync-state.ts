import Modifier from 'ember-modifier';
import { registerDestructor } from '@ember/destroyable';
import { inject as service } from '@ember/service';
import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';
import debugLogger from 'ember-debug-logger';
import {
  HEATMAP_UPDATE_EVENT,
  HeatmapUpdateArgs,
  HeatmapUpdateMessage,
} from 'react-lib/src/utils/collaboration//web-socket-messages/sendable/heatmap-update';
import WebSocketService from 'explorviz-frontend/services/collaboration/web-socket';
import { ForwardedMessage } from 'react-lib/src/utils/collaboration/web-socket-messages/receivable/forwarded';
import equal from 'fast-deep-equal';
import {
  useHeatmapConfigurationStore,
  HeatmapMode,
} from 'react-lib/src/stores/heatmap/heatmap-configuration';

function cleanup(instance: SyncStateModifier) {
  instance.webSocket.off(
    HEATMAP_UPDATE_EVENT,
    instance,
    instance.onHeatmapUpdate
  );
}

export default class SyncStateModifier extends Modifier {
  @service('collaboration/web-socket')
  webSocket!: WebSocketService;

  @service('application-renderer')
  private applicationRenderer!: ApplicationRenderer;

  private state: Map<string, any> = new Map();

  constructor(owner: any, args: any) {
    super(owner, args);
    this.webSocket.on(HEATMAP_UPDATE_EVENT, this, this.onHeatmapUpdate);
    registerDestructor(this, cleanup);
  }

  modify() {
    if (
      useHeatmapConfigurationStore.getState().currentApplication &&
      useHeatmapConfigurationStore.getState().heatmapShared
    ) {
      this.send(HEATMAP_UPDATE_EVENT, {
        applicationId: useHeatmapConfigurationStore
          .getState()
          .currentApplication!.getModelId(),
        metric: useHeatmapConfigurationStore.getState().selectedMetricName,
        mode: useHeatmapConfigurationStore.getState().selectedMode,
        isActive: useHeatmapConfigurationStore.getState().heatmapActive,
      });
    }
  }

  onHeatmapUpdate({
    originalMessage: message,
  }: ForwardedMessage<HeatmapUpdateMessage>) {
    if (!useHeatmapConfigurationStore.getState().heatmapShared) {
      return;
    }
    this.state.set(message.event, message);
    if (message.applicationId) {
      useHeatmapConfigurationStore.setState({
        currentApplication: this.applicationRenderer.getApplicationById(
          message.applicationId
        ),
      });
    } else {
      useHeatmapConfigurationStore.setState({ currentApplication: null });
    }
    useHeatmapConfigurationStore.setState({
      selectedMetricName: message.metric,
    });
    useHeatmapConfigurationStore.setState({
      selectedMode: message.mode as HeatmapMode,
    });
    useHeatmapConfigurationStore.setState({ heatmapActive: message.isActive });
  }

  debug = debugLogger('SyncState');

  private send(event: string, args: HeatmapUpdateArgs) {
    const message = {
      event,
      ...args,
    };
    const lastMessage = this.state.get(event);
    // TODO order matters, should be implemented better
    // if (_.isEqual(object, other);)
    if (!equal(message, lastMessage)) {
      this.debug(`Sending${args.isActive}`);
      this.webSocket.send(event, message);
      this.state.set(message.event, message);
    }
  }
}
