import React from 'react';

import InteractiveHeader from 'react-lib/src/components/visualization/rendering/popups/interactable-properties/interactive-header.tsx';
import { Application } from 'react-lib/src/utils/landscape-schemes/structure-data';

interface FoundationPopupRestructureProps {
  application: Application;
}

export default function FoundationPopupRestructure({
  application,
}: FoundationPopupRestructureProps) {
  return <InteractiveHeader entity={application} />;
}
