export const RESTRUCTURE_MODE_UPDATE_EVENT = 'restructure_mode_update';
export const RESTRUCTURE_UPDATE_EVENT = 'restructure_update';
export const RESTRUCTURE_CREATE_OR_DELETE_EVENT = 'restructure_create_delete';
export const RESTRUCTURE_DUPLICATE_APP = 'restructure_duplicate_app';
export const RESTRUCTURE_COPY_AND_PASTE_PACKAGE_EVENT =
  'restructure_copy_paste_package';
export const RESTRUCTURE_COPY_AND_PASTE_CLASS_EVENT =
  'restructure_copy_paste_class';
export const RESTRUCTURE_UNDO_COPY_AND_PASTE_PACKAGE_EVENT =
  'restructure_undo_copy_paste_package';
export const RESTRUCTURE_UNDO_COPY_AND_PASTE_CLASS_EVENT =
  'restructure_undo_copy_paste_class';
export const RESTRUCTURE_CUT_AND_INSERT_EVENT = 'restructure_cut_insert';
export const RESTRUCTURE_COMMUNICATION_EVENT = 'restructure_communication';
export const RESTRUCTURE_DELETE_COMMUNICATION_EVENT =
  'restructure_delete_communication';
export const RESTRUCTURE_RENAME_OPERATION_EVENT =
  'restructure_rename_operation';
export const RESTRUCTURE_RESTORE_APP_EVENT = 'restructure_restore_app';
export const RESTRUCTURE_RESTORE_PACKAGE_EVENT = 'restructure_restore_pckg';
export const RESTRUCTURE_RESTORE_CLASS_EVENT = 'restructure_restore_class';

export type RestructureModeUpdateMessage = {
  event: typeof RESTRUCTURE_MODE_UPDATE_EVENT;
};

export type RestructureUpdateMessage = {
  event: typeof RESTRUCTURE_UPDATE_EVENT;
  entityType: string;
  entityId: string;
  newName: string;
  appId: string | null;
  undo: boolean;
};

export type RestructureCreateOrDeleteMessage = {
  event: typeof RESTRUCTURE_CREATE_OR_DELETE_EVENT;
  action: string;
  entityType: string;
  name: string | null;
  language: string | null;
  entityId: string | null;
  undo: boolean;
};

export type RestructureDuplicateAppMessage = {
  event: typeof RESTRUCTURE_DUPLICATE_APP;
  appId: string;
};

export type RestructureCopyAndPastePackageMessage = {
  event: typeof RESTRUCTURE_COPY_AND_PASTE_PACKAGE_EVENT;
  destinationEntity: string;
  destinationId: string;
  clippedEntityId: string;
};

export type RestructureCopyAndPasteClassMessage = {
  event: typeof RESTRUCTURE_COPY_AND_PASTE_CLASS_EVENT;
  destinationId: string;
  clippedEntityId: string;
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

export type RestructureDeleteCommunicationMessage = {
  event: typeof RESTRUCTURE_DELETE_COMMUNICATION_EVENT;
  undo: boolean;
  commId: string;
};

export type RestructureRenameOperationMessage = {
  event: typeof RESTRUCTURE_RENAME_OPERATION_EVENT;
  commId: string;
  newName: string;
  undo: boolean;
};

export type RestructureRestoreAppMessage = {
  event: typeof RESTRUCTURE_RESTORE_APP_EVENT;
  appId: string;
  undoCutOperation: boolean;
};

export type RestructureRestorePackageMessage = {
  event: typeof RESTRUCTURE_RESTORE_PACKAGE_EVENT;
  pckgId: string;
  undoCutOperation: boolean;
};

export type RestructureRestoreClassMessage = {
  event: typeof RESTRUCTURE_RESTORE_CLASS_EVENT;
  appId: string;
  clazzId: string;
  undoCutOperation: boolean;
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
