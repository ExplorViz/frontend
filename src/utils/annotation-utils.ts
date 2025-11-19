import { useAnnotationHandlerStore } from 'explorviz-frontend/src/stores/annotation-handler';

/**
 * Checks if an entity is annotated
 * @param entityId - The ID of the entity to check
 * @returns true if the entity has an annotation, false otherwise
 */
export function isEntityAnnotated(entityId: string): boolean {
  const annotationData = useAnnotationHandlerStore.getState().annotationData;
  const minimizedAnnotations =
    useAnnotationHandlerStore.getState().minimizedAnnotations;

  // Check if entity has an annotation in active annotations
  const hasActiveAnnotation = annotationData.some(
    (annotation) => annotation.entityId === entityId
  );

  // Check if entity has an annotation in minimized annotations
  const hasMinimizedAnnotation = minimizedAnnotations.some(
    (annotation) => annotation.entityId === entityId
  );

  return hasActiveAnnotation || hasMinimizedAnnotation;
}

/**
 * Gets the display name for an entity, appending an annotation icon if it's annotated
 * @param entityName - The original name of the entity
 * @param entityId - The ID of the entity to check for annotations
 * @returns The display name with annotation icon if applicable
 */
export function getEntityDisplayName(
  entityName: string,
  entityId: string
): string {
  if (isEntityAnnotated(entityId)) {
    return `${entityName} ${getAnnotationIcon()}`;
  }
  return entityName;
}

/**
 * Gets the annotation icon character for display in labels
 * @returns The annotation icon character
 */
export function getAnnotationIcon(): string {
  return '📝'; // Note/memo emoji
}

/**
 * Gets the display name for an entity with proper truncation handling for annotated entities
 * @param entityName - The original name of the entity
 * @param entityId - The ID of the entity to check for annotations
 * @param maxLength - The maximum length for the display name
 * @returns The display name with annotation icon, properly truncated if needed
 */
export function getTruncatedDisplayName(
  entityName: string,
  entityId: string,
  maxLength: number
): string {
  const isAnnotated = isEntityAnnotated(entityId);
  const icon = isAnnotated ? getAnnotationIcon() : '';
  const displayName = getEntityDisplayName(entityName, entityId);

  if (displayName.length <= maxLength) {
    return displayName;
  }

  // If annotated, preserve the icon even when truncating
  if (isAnnotated) {
    const truncatedName = entityName.substring(0, maxLength) + '...';
    return `${truncatedName} ${icon}`;
  }

  return entityName.substring(0, maxLength) + '...';
}
