export const ANNOTATION_EDIT_RESPONSE_EVENT = 'annotation_edit_response';

export type AnnotationEditResponse = {
  isEditable: boolean;
};

export function isAnnotationEditResponse(
  msg: any
): msg is AnnotationEditResponse {
  return (
    msg !== null &&
    typeof msg === 'object' &&
    typeof msg.isEditable === 'boolean'
  );
}
