export const ANNOTATION_UPDATED_RESPONSE_EVENT = 'annotation_updated_response';

export type AnnotationUpdatedResponse = {
  updated: boolean;
};

export function isAnnotationUpdatedResponse(
  msg: any
): msg is AnnotationUpdatedResponse {
  return (
    msg !== null && typeof msg === 'object' && typeof msg.updated === 'boolean'
  );
}
