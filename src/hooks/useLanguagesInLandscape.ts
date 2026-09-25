import { useModelStore } from 'explorviz-frontend/src/stores/repos/model-repository';
import { Language } from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import { normalizeLanguage } from 'explorviz-frontend/src/utils/language-utils';
import { useShallow } from 'zustand/react/shallow';

/** Returns every distinct programming language across all buildings in the current landscape. */
export default function useLanguagesInLandscape(): Language[] {
  return useModelStore(
    useShallow((state) => [
      ...new Set(
        Object.values(state.buildings).map((building) =>
          normalizeLanguage(building.language)
        )
      ),
    ])
  );
}
