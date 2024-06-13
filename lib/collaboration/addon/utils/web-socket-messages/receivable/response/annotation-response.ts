export const ANNOTATION_RESPONSE_EVENT = 'annotation_response';

export type AnnotationResponse = {
  objectId: string;
};

export function isAnnotationResponse(msg: any): msg is AnnotationResponse {
  return (
    msg !== null && typeof msg === 'object' && typeof msg.objectId === 'string'
  );
}
