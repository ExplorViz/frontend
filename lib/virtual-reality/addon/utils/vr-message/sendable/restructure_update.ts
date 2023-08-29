export const RESTRUCTURE_MODE_UPDATE_EVENT = 'restructure_mode_update';
export const RESTRUCTURE_UPDATE_EVENT = 'restructure_update';
export const RESTRUCTURE_CREATE_OR_DELETE_EVENT = 'restructure_create_delete';
export const RESTRUCTURE_CUT_AND_INSERT_EVENT = 'restructure_cut_insert';
export const RESTRUCTURE_COMMUNICATION_EVENT = 'restructure_communication';

export type RestructureModeUpdateMessage = {
  event: typeof RESTRUCTURE_MODE_UPDATE_EVENT;
};

export type RestructureUpdateMessage = {
  event: typeof RESTRUCTURE_UPDATE_EVENT;
  entityType: string;
  entityId: string;
  newName: string;
  appId: string | null;
};

export type RestructureCreateOrDeleteMessage = {
  event: typeof RESTRUCTURE_CREATE_OR_DELETE_EVENT;
  action: string;
  entityType: string;
  name: string | null;
  language: string | null;
  entityId: string | null;
};

export type RestructureCutAndInsertMessage = {
  event: typeof RESTRUCTURE_CUT_AND_INSERT_EVENT;
  destinationEntity: string;
  destinationId: string;
  clippedEntity: string;
  clippedEntityId: string;
};

export type RestructureCommunicationMessage = {
  event: typeof RESTRUCTURE_COMMUNICATION_EVENT;
  sourceClassId: string;
  targetClassId: string;
  methodName: string;
};

export function isRestructureModeUpdateMessage(
  msg: any
): msg is RestructureModeUpdateMessage {
  return (
    msg !== null &&
    typeof msg === 'object' &&
    msg.event === RESTRUCTURE_MODE_UPDATE_EVENT &&
    typeof msg.entityType === 'string' &&
    typeof msg.entityId === 'string' &&
    typeof msg.newName === 'string'
  );
}
