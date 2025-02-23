import React, { useEffect, useRef, useState } from 'react';

import ClassCommunication from 'react-lib/src/utils/landscape-schemes/dynamic/class-communication';
import { useLandscapeRestructureStore } from 'react-lib/src/stores/landscape-restructure';
import { CommentIcon } from '@primer/octicons-react';

interface EditOperationNameProps {
  communication: ClassCommunication;
}

export default function EditOperationName({
  communication,
}: EditOperationNameProps) {
  const restructureMode = useLandscapeRestructureStore(
    (state) => state.restructureMode
  );

  const renameOperation = useLandscapeRestructureStore(
    (state) => state.renameOperation
  );

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [operationName, setOperationName] = useState<string>(
    communication.operationName
  );
  const isSaving = useRef<boolean>(false);

  // This is to mimic the behavior of Ember runloop's next(). Unsure if this works as intended.
  const [shouldExitEditMode, setShouldExitEditMode] = useState<boolean>(false);

  const save = () => {
    if (communication.operationName !== operationName) {
      renameOperation(communication, operationName);
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
      setOperationName(communication.operationName);
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

  return (
    <>
      <td className="text-nowrap align-top">
        <CommentIcon verticalAlign="middle" size="small" className="mr-1" />
      </td>
      {restructureMode ? (
        <td className="text-right text-break pl-1">
          {isEditing ? (
            <input
              aria-label="operation-name"
              value={operationName}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleEnter();
              }}
              onBlur={handleFocusOut}
            />
          ) : (
            <div style={{ cursor: 'text' }} onClick={edit}>
              {operationName}
            </div>
          )}
        </td>
      ) : (
        <td className="text-right text-break pl-1">
          {communication.operationName}
        </td>
      )}
    </>
  );
}
