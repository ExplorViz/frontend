export const COMPONENT_UPDATE_EVENT = 'component_update';

export type ComponentUpdateMessage = {
  event: typeof COMPONENT_UPDATE_EVENT;
  componentIds: string[];
  areOpened: boolean;
};

export function isComponentUpdateMessage(
  msg: any
): msg is ComponentUpdateMessage {
  return (
    msg !== null &&
    typeof msg === 'object' &&
    msg.event === COMPONENT_UPDATE_EVENT &&
    Array.isArray(msg.componentIds) &&
    typeof msg.areOpened === 'boolean'
  );
}
