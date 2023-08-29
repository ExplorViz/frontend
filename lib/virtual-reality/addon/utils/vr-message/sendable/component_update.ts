export const COMPONENT_UPDATE_EVENT = 'component_update';

export type ComponentUpdateMessage = {
  event: typeof COMPONENT_UPDATE_EVENT;
  isFoundation: boolean;
  isOpened: boolean;
  appId: string;
  componentId: string;
  forwardFlag?: boolean;
};

export function isComponentUpdateMessage(
  msg: any
): msg is ComponentUpdateMessage {
  return (
    msg !== null &&
    typeof msg === 'object' &&
    msg.event === COMPONENT_UPDATE_EVENT &&
    typeof msg.isFoundation === 'boolean' &&
    typeof msg.isOpened === 'boolean' &&
    typeof msg.appId === 'string' &&
    typeof msg.componentId === 'string'
  );
}
