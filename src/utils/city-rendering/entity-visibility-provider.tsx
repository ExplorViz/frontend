import {
  EntityVisibilityContext,
  useEntityVisibilityContext,
} from 'explorviz-frontend/src/utils/city-rendering/entity-visibility';
import { createContext, useContext, type ReactNode } from 'react';

const EntityVisibilityReactContext =
  createContext<EntityVisibilityContext | null>(null);

export function EntityVisibilityProvider({
  children,
}: {
  children: ReactNode;
}) {
  const context = useEntityVisibilityContext();
  return (
    <EntityVisibilityReactContext.Provider value={context}>
      {children}
    </EntityVisibilityReactContext.Provider>
  );
}

export function useSharedEntityVisibilityContext(): EntityVisibilityContext {
  const context = useContext(EntityVisibilityReactContext);
  if (!context) {
    throw new Error(
      'useSharedEntityVisibilityContext must be used within EntityVisibilityProvider'
    );
  }
  return context;
}
