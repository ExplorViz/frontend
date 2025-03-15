import React, { useEffect } from 'react';
import { ForwardedMessage } from '../utils/collaboration/web-socket-messages/receivable/forwarded';
import {
  HEATMAP_UPDATE_EVENT,
  HeatmapUpdateArgs,
  HeatmapUpdateMessage,
} from '../utils/collaboration/web-socket-messages/sendable/heatmap-update';
import {
  HeatmapMode,
  useHeatmapConfigurationStore,
} from '../stores/heatmap/heatmap-configuration';
import { useApplicationRendererStore } from '../stores/application-renderer';
import { useWebSocketStore } from 'react-lib/src/stores/collaboration/web-socket';
import equal from 'fast-deep-equal';
import eventEmitter from '../utils/event-emitter';

export default function SyncState() {
  useEffect(() => {
    const state: Map<string, any> = new Map();

    const onHeatmapUpdate = ({
      originalMessage: message,
    }: ForwardedMessage<HeatmapUpdateMessage>) => {
      if (!useHeatmapConfigurationStore.getState().heatmapShared) {
        return;
      }
      state.set(message.event, message);
      if (message.applicationId) {
        useHeatmapConfigurationStore.setState({
          currentApplication: useApplicationRendererStore
            .getState()
            .getApplicationById(message.applicationId),
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
      useHeatmapConfigurationStore.setState({
        heatmapActive: message.isActive,
      });
    };

    const send = (event: string, args: HeatmapUpdateArgs) => {
      const message = {
        event,
        ...args,
      };
      const lastMessage = state.get(event);
      // TODO order matters, should be implemented better
      // if (_.isEqual(object, other);)
      if (!equal(message, lastMessage)) {
        useWebSocketStore.getState().send(event, message);
        state.set(message.event, message);
      }
    };

    eventEmitter.on(HEATMAP_UPDATE_EVENT, onHeatmapUpdate);

    if (
      useHeatmapConfigurationStore.getState().currentApplication &&
      useHeatmapConfigurationStore.getState().heatmapShared
    ) {
      send(HEATMAP_UPDATE_EVENT, {
        applicationId: useHeatmapConfigurationStore
          .getState()
          .currentApplication!.getModelId(),
        metric: useHeatmapConfigurationStore.getState().selectedMetricName,
        mode: useHeatmapConfigurationStore.getState().selectedMode,
        isActive: useHeatmapConfigurationStore.getState().heatmapActive,
      });
    }

    return () => {
      eventEmitter.off(HEATMAP_UPDATE_EVENT, onHeatmapUpdate);
    };
  }, []);

  return <></>;
}
