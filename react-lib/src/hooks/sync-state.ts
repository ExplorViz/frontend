import React, { useEffect, useRef } from 'react';

import { ForwardedMessage } from 'react-lib/src/utils/collaboration/web-socket-messages/receivable/forwarded';
import {
  HEATMAP_UPDATE_EVENT,
  HeatmapUpdateArgs,
  HeatmapUpdateMessage,
} from 'react-lib/src/utils/collaboration/web-socket-messages/sendable/heatmap-update';
import {
  HeatmapMode,
  useHeatmapConfigurationStore,
} from 'react-lib/src/stores/heatmap/heatmap-configuration';
import { useApplicationRendererStore } from 'react-lib/src/stores/application-renderer';
import { useWebSocketStore } from 'react-lib/src/stores/collaboration/web-socket';
import eventEmitter from 'react-lib/src/utils/event-emitter';
import equal from 'fast-deep-equal';
import { useShallow } from 'zustand/react/shallow';

export default function useSyncState() {
  // MARK: Stores

  const webSocketActions = useWebSocketStore(
    useShallow((state) => ({
      send: state.send,
    }))
  );

  const heatmapState = useHeatmapConfigurationStore(
    useShallow((state) => ({
      heatmapShared: state.heatmapShared,
      currentApplication: state.currentApplication,
      selectedMetricName: state.selectedMetricName,
      selectedMode: state.selectedMode,
      heatmapActive: state.heatmapActive,
    }))
  );
  const heatmapActions = useHeatmapConfigurationStore(
    useShallow((state) => ({
      setActive: state.setActive,
      setSelectedMetricName: state.setSelectedMetricName,
      setSelectedMode: state.setSelectedMode,
      setCurrentApplication: state.setCurrentApplication,
    }))
  );

  const applicationRendererActions = useApplicationRendererStore(
    useShallow((state) => ({
      getApplicationById: state.getApplicationById,
    }))
  );

  // MARK: Refs

  const state = useRef<Map<string, any>>(new Map<string, any>());

  // MARK: Event handlers

  const send = (event: string, args: HeatmapUpdateArgs) => {
    const message = {
      event,
      ...args,
    };
    const lastMessage = state.current.get(event);

    if (!equal(message, lastMessage)) {
      webSocketActions.send(event, message);
      state.current.set(message.event, message);
    }
  };

  const onHeatmapUpdate = ({
    originalMessage: message,
  }: ForwardedMessage<HeatmapUpdateMessage>) => {
    if (!heatmapState.heatmapShared) {
      return;
    }
    state.current.set(message.event, message);
    if (message.applicationId) {
      heatmapActions.setCurrentApplication(
        applicationRendererActions.getApplicationById(message.applicationId)
      );
    } else {
      heatmapActions.setCurrentApplication(null);
    }
    heatmapActions.setSelectedMetricName(message.metric);
    heatmapActions.setSelectedMode(message.mode as HeatmapMode);
    heatmapActions.setActive(message.isActive);
  };

  // MARK: Effects

  useEffect(() => {
    eventEmitter.on(HEATMAP_UPDATE_EVENT, onHeatmapUpdate);

    if (heatmapState.currentApplication && heatmapState.heatmapShared) {
      send(HEATMAP_UPDATE_EVENT, {
        applicationId: heatmapState.currentApplication.getModelId(),
        metric: heatmapState.selectedMetricName,
        mode: heatmapState.selectedMode,
        isActive: heatmapState.heatmapActive,
      });
    }

    return () => {
      eventEmitter.off(HEATMAP_UPDATE_EVENT, onHeatmapUpdate);
    };
  });
}
