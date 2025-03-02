import React from 'react';

import InteractiveHeader from 'react-lib/src/components/visualization/rendering/popups/interactable-properties/interactive-header.tsx';
import { Package } from 'react-lib/src/utils/landscape-schemes/structure-data';

interface ComponentPopupRestructureProps {
  component: Package;
}

export default function ComponentPopupRestructure({
  component,
}: ComponentPopupRestructureProps) {
  return <InteractiveHeader entity={component} />;
}
