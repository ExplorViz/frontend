import InteractiveHeader from 'explorviz-frontend/src/components/visualization/rendering/popups/interactable-properties/interactive-header.tsx';
import { Application } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';

interface FoundationPopupRestructureProps {
  application: Application;
}

export default function FoundationPopupRestructure({
  application,
}: FoundationPopupRestructureProps) {
  return <InteractiveHeader entity={application} />;
}
