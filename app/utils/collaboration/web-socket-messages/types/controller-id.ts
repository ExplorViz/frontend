export const CONTROLLER_1_ID = 0;
export const CONTROLLER_2_ID = 1;

export type ControllerId = typeof CONTROLLER_1_ID | typeof CONTROLLER_2_ID;

export function isControllerId(
  controllerId: any
): controllerId is ControllerId {
  return controllerId === CONTROLLER_1_ID || controllerId === CONTROLLER_2_ID;
}
