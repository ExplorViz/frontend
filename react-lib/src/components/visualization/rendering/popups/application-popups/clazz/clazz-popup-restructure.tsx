import React from 'react';

import InteractiveHeader from 'react-lib/src/components/visualization/rendering/popups/interactable-properties/interactive-header.tsx';
import { Class } from 'react-lib/src/utils/landscape-schemes/structure-data';

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
