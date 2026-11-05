import { useEntityVisibilityContext } from 'explorviz-frontend/src/utils/city-rendering/entity-visibility';
import { type ReactNode } from 'react';

import { EntityVisibilityReactContext } from './entity-visibility-provider-store';

export function EntityVisibilityProvider({ children }: { children: ReactNode }) {
  const context = useEntityVisibilityContext();
  return <EntityVisibilityReactContext value={context}>{children}</EntityVisibilityReactContext>;
}
