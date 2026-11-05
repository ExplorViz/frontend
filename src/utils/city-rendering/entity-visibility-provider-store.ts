import { EntityVisibilityContext } from 'explorviz-frontend/src/utils/city-rendering/entity-visibility';
import { createContext, use } from 'react';

export const EntityVisibilityReactContext = createContext<EntityVisibilityContext | null>(null);

export function useSharedEntityVisibilityContext(): EntityVisibilityContext {
  const context = use(EntityVisibilityReactContext);
  if (!context) {
    throw new Error('useSharedEntityVisibilityContext must be used within EntityVisibilityProvider');
  }
  return context;
}
