import { addAnnotation } from 'explorviz-frontend/src/utils/collaboration/annotations';
import { useAuthStore } from 'explorviz-frontend/src/stores/auth';
import {
  pinPopup,
  removePopup,
  sharePopup,
  updatePopup,
  usePopups,
} from 'explorviz-frontend/src/utils/collaboration/popups';
import { LandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/landscape-data';
import { useShallow } from 'zustand/react/shallow';
import PopupCoordinator from './popup-coordinator';
import PopupData from './popup-data';

interface Args {
  landscapeData: LandscapeData;
}
export default function Popups({ landscapeData }: Args) {
  const popupData = usePopups();

  const authState = useAuthStore(
    useShallow((state) => ({
      user: state.user,
    }))
  );

  const addAnnotationForPopup = (popup: PopupData) => {
    addAnnotation({
      annotationId: undefined,
      entityId: popup.entityId,
      entity: popup.entity,
      position: { x: popup.mouseX + 400, y: popup.mouseY },
      hovered: true,
      annotationTitle: '',
      annotationText: '',
      sharedBy: '',
      owner: authState.user!.name.toString(),
      shared: false,
      inEdit: true,
      lastEditor: undefined,
      wasMoved: true,
    });
  };

  return popupData.map((data) => (
    <PopupCoordinator
      key={data.entity.id}
      addAnnotationForPopup={addAnnotationForPopup}
      pinPopup={pinPopup}
      popupData={data}
      updatePopup={updatePopup}
      removePopup={removePopup}
      sharePopup={sharePopup}
    />
  ));
}
