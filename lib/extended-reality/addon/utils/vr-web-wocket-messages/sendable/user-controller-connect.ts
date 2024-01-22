import {
  Controller,
  isController,
} from 'collaboration/utils/web-socket-messages/types/controller';

export const USER_CONTROLLER_CONNECT_EVENT = 'user_controller_connect';

export type UserControllerConnectMessage = {
  event: typeof USER_CONTROLLER_CONNECT_EVENT;
  controller: Controller;
};

export function isUserControllerConnectMessage(
  msg: any
): msg is UserControllerConnectMessage {
  return (
    msg !== null &&
    typeof msg === 'object' &&
    msg.event === USER_CONTROLLER_CONNECT_EVENT &&
    isController(msg.controller)
  );
}
