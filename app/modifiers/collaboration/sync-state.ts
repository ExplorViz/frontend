import Modifier from 'ember-modifier';
import { registerDestructor } from '@ember/destroyable';
import { inject as service } from '@ember/service';
import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';
import HeatmapConfiguration, {
  HeatmapMode,
} from 'explorviz-frontend/services/heatmap/heatmap-configuration';
import debugLogger from 'ember-debug-logger';
import {
  HEATMAP_UPDATE_EVENT,
  HeatmapUpdateArgs,
  HeatmapUpdateMessage,
} from 'explorviz-frontend/utils/collaboration//web-socket-messages/sendable/heatmap-update';
import WebSocketService from 'explorviz-frontend/services/collaboration/web-socket';
import { ForwardedMessage } from 'explorviz-frontend/utils/collaboration/web-socket-messages/receivable/forwarded';
import equal from 'fast-deep-equal';

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

  @service('heatmap/heatmap-configuration')
  private heatmapConf!: HeatmapConfiguration;

  @service('application-renderer')
  private applicationRenderer!: ApplicationRenderer;

  private state: Map<string, any> = new Map();

  constructor(owner: any, args: any) {
    super(owner, args);
    this.webSocket.on(HEATMAP_UPDATE_EVENT, this, this.onHeatmapUpdate);
    registerDestructor(this, cleanup);
  }

  modify() {
    if (this.heatmapConf.currentApplication && this.heatmapConf.heatmapShared) {
      this.send(HEATMAP_UPDATE_EVENT, {
        applicationId: this.heatmapConf.currentApplication.getModelId(),
        metric: this.heatmapConf.selectedMetricName,
        mode: this.heatmapConf.selectedMode,
        isActive: this.heatmapConf.heatmapActive,
      });
    }
  }

  onHeatmapUpdate({
    originalMessage: message,
  }: ForwardedMessage<HeatmapUpdateMessage>) {
    if (!this.heatmapConf.heatmapShared) {
      return;
    }
    this.state.set(message.event, message);
    if (message.applicationId) {
      this.heatmapConf.currentApplication =
        this.applicationRenderer.getApplicationById(message.applicationId);
    } else {
      this.heatmapConf.currentApplication = null;
    }
    this.heatmapConf.selectedMetricName = message.metric;
    this.heatmapConf.selectedMode = message.mode as HeatmapMode;
    this.heatmapConf.heatmapActive = message.isActive;
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
