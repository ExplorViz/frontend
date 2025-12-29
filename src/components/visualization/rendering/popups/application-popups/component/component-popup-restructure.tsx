import InteractiveHeader from 'explorviz-frontend/src/components/visualization/rendering/popups/interactable-properties/interactive-header.tsx';
import { Package } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';

interface ComponentPopupRestructureProps {
  component: Package;
}

export default function ComponentPopupRestructure({
  component,
}: ComponentPopupRestructureProps) {
  return <InteractiveHeader entity={component} />;
}
