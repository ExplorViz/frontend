import { useCallback, useRef } from 'react';
import { useRenderingServiceStore } from './rendering-service';
import { LandscapeData } from '../utils/landscape-schemes/landscape-data';
import { useShallow } from 'zustand/react/shallow';
import {
  insertApplicationToLandscape,
  insertClassesToLandscape,
  removeComponentFromLandscape,
} from '../utils/landscape-structure-helpers';

export function useEditingService() {
  const [landscapeData, setLandscapeData] = useRenderingServiceStore(
    useShallow((state) => [state._landscapeData, state.setLandscapeData])
  );
  const history = useRef<LandscapeData[]>([]);

  const addApplication = useCallback(
    (name: string, classes: string[]) => {
      if (!landscapeData) return;
      history.current.push(structuredClone(landscapeData));

      const [structureLandscapeData, id] = insertApplicationToLandscape(
        landscapeData.structureLandscapeData,
        name,
        classes
      );
      setLandscapeData({
        dynamicLandscapeData: landscapeData.dynamicLandscapeData,
        structureLandscapeData,
      });

      return id;
    },
    [landscapeData, setLandscapeData]
  );

  const addClasses = useCallback(
    (id: string, classes: string[]) => {
      if (!landscapeData) return;
      history.current.push(structuredClone(landscapeData));

      setLandscapeData({
        dynamicLandscapeData: landscapeData.dynamicLandscapeData,
        structureLandscapeData: insertClassesToLandscape(
          landscapeData.structureLandscapeData,
          id,
          classes
        ),
      });
    },
    [landscapeData, setLandscapeData]
  );

  const removeComponent = useCallback(
    (id: string) => {
      if (!landscapeData) return;
      history.current.push(structuredClone(landscapeData));

      setLandscapeData({
        dynamicLandscapeData: landscapeData.dynamicLandscapeData,
        structureLandscapeData: removeComponentFromLandscape(
          landscapeData.structureLandscapeData,
          id
        ),
      });
    },
    [landscapeData, setLandscapeData]
  );

  return { addApplication, addClasses, removeComponent };
}
