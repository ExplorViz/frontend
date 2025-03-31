import React, { useEffect, useRef, useState } from 'react';

import { useLandscapeRestructureStore } from 'explorviz-frontend/src/stores/landscape-restructure';
import {
  isApplication,
  isClass,
  isPackage,
} from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import EditMesh from './edit-mesh';

interface InteractiveHeaderProps {
  entity: any;
  appId?: string;
}

export default function InteractiveHeader({
  entity,
  appId,
}: InteractiveHeaderProps) {
  const restructureMode = useLandscapeRestructureStore(
    (state) => state.restructureMode
  );

  const renameApplication = useLandscapeRestructureStore(
    (state) => state.renameApplication
  );

  const renamePackage = useLandscapeRestructureStore(
    (state) => state.renamePackage
  );

  const renameClass = useLandscapeRestructureStore(
    (state) => state.renameClass
  );

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [name, setName] = useState<string>(entity.name);
  const isSaving = useRef<boolean>(false);

  // This is to mimic the behavior of Ember runloop's next(). Unsure if this works as intended.
  const [shouldExitEditMode, setShouldExitEditMode] = useState<boolean>(false);

  const save = () => {
    if (entity.name !== name) {
      if (isApplication(entity)) {
        renameApplication(name, entity.id);
      } else if (isPackage(entity)) {
        renamePackage(name, entity.id);
      } else if (isClass(entity)) {
        renameClass(name, entity.id, appId !== undefined ? appId : '');
      }
      setShouldExitEditMode(true);
    } else {
      setIsEditing(false);
    }
  };

  useEffect(() => {
    if (shouldExitEditMode) {
      setIsEditing(false);
      setShouldExitEditMode(false);
    }
  }, [shouldExitEditMode]);

  const edit = () => {
    if (restructureMode) {
      setIsEditing(true);
      setName(entity.name);
    }
  };

  const handleFocusOut = () => {
    if (isSaving.current) {
      isSaving.current = false;
    } else {
      save();
    }
  };

  const handleEnter = () => {
    isSaving.current = true;
    save();
  };

  return <>{restructureMode && <EditMesh entity={entity} appId={appId !== undefined ? appId : ''} />}</>;
}
