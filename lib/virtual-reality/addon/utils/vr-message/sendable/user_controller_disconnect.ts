import { ControllerId, isControllerId } from '../util/controller_id';

export const USER_CONTROLLER_DISCONNECT_EVENT = 'user_controller_disconnect';

export type UserControllerDisconnectMessage = {
  event: typeof USER_CONTROLLER_DISCONNECT_EVENT;
  controllerId: ControllerId;
};

export function isUserControllerDisconnectMessage(
  msg: any,
): msg is UserControllerDisconnectMessage {
  return (
    msg !== null
    && typeof msg === 'object'
    && msg.event === USER_CONTROLLER_DISCONNECT_EVENT
    && isControllerId(msg.controllerId)
  );
}
