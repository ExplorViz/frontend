export const HEATMAP_UPDATE_EVENT = 'heatmap_update';

export type HeatmapUpdateArgs = {
  isActive: boolean;
  applicationId: string | null;
  metric: string;
  mode: string;
};

export type HeatmapUpdateMessage = {
  event: typeof HEATMAP_UPDATE_EVENT;
  isActive: boolean;
  applicationId: string | null;
  metric: string;
  mode: string;
};

export function isHeatmapUpdateMessage(msg: any): msg is HeatmapUpdateMessage {
  return (
    msg !== null &&
    typeof msg === 'object' &&
    msg.event === HEATMAP_UPDATE_EVENT &&
    typeof msg.isActive === 'boolean' &&
    (typeof msg.applicationId === 'string' || msg.applicationId === null) &&
    (typeof msg.metric === 'string' || msg.metric === null) &&
    typeof msg.mode === 'string'
  );
}
