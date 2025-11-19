import { useAnnotationHandlerStore } from 'explorviz-frontend/src/stores/annotation-handler';
import { useAuthStore } from 'explorviz-frontend/src/stores/auth';
import { usePopupHandlerStore } from 'explorviz-frontend/src/stores/popup-handler';
import { LandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/landscape-data';
import { useShallow } from 'zustand/react/shallow';
import PopupCoordinator from './popup-coordinator';
import PopupData from './popup-data';

interface Args {
  landscapeData: LandscapeData;
}
export default function Popups({ landscapeData }: Args) {
  const popupData = usePopupHandlerStore(
    useShallow((state) => state.popupData)
  );

  const popupHandlerActions = usePopupHandlerStore(
    useShallow((state) => ({
      removePopup: state.removePopup,
      updatePopup: state.updatePopup,
      pinPopup: state.pinPopup,
      sharePopup: state.sharePopup,
    }))
  );
  const authState = useAuthStore(
    useShallow((state) => ({
      user: state.user,
    }))
  );

  const annotationHandlerActions = useAnnotationHandlerStore(
    useShallow((state) => ({
      addAnnotation: state.addAnnotation,
    }))
  );

  const removePopup = (entityId: string) => {
    popupHandlerActions.removePopup(entityId);
  };

  const addAnnotationForPopup = (popup: PopupData) => {
    annotationHandlerActions.addAnnotation({
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
      pinPopup={popupHandlerActions.pinPopup}
      popupData={data}
      updatePopup={popupHandlerActions.updatePopup}
      removePopup={removePopup}
      sharePopup={popupHandlerActions.sharePopup}
      structureData={landscapeData.structureLandscapeData}
    />
  ));
}
