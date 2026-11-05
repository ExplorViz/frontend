import { createContext } from 'react';
import { SimpleClass } from '../../utils/landscape-structure-helpers';

export interface EditingContextData {
  canGoBack: boolean;
  canGoForward: boolean;
  addApplication: (name: string, classes: SimpleClass[]) => string | undefined;
  addClasses: (id: string, classes: SimpleClass[]) => void;
  removeComponent: (id: string) => void;
  goBack: () => void;
  goForward: () => void;
  reset: () => void;
}

export const EditingContext = createContext<EditingContextData>({
  canGoBack: false,
  canGoForward: false,
  addApplication: () => undefined,
  addClasses: () => {},
  removeComponent: () => {},
  goBack: () => {},
  goForward: () => {},
  reset: () => {},
});
EditingContext.displayName = 'EditingContext';
