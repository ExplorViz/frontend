import React from 'react';

import InteractiveHeader from 'explorviz-frontend/src/components/visualization/rendering/popups/interactable-properties/interactive-header.tsx';
import { Class } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';

interface ClazzPopupRestructureProps {
  clazz: Class;
  applicationId: string;
}

export default function ClazzPopupRestructure({
  clazz,
  applicationId,
}: ClazzPopupRestructureProps) {
  return <InteractiveHeader entity={clazz} appId={applicationId} />;
}
