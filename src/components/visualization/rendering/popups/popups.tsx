import { usePopupHandlerStore } from 'explorviz-frontend/src/stores/popup-handler';
import { useShallow } from 'zustand/react/shallow';
import PopupCoordinator from './popup-coordinator';
import { useApplicationRendererStore } from 'explorviz-frontend/src/stores/application-renderer';
import { LandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/landscape-data';
import { useHighlightingStore } from 'explorviz-frontend/src/stores/highlighting';
import PopupData from './popup-data';
import { useAnnotationHandlerStore } from 'explorviz-frontend/src/stores/annotation-handler';
import { useAuthStore } from 'explorviz-frontend/src/stores/auth';
import CameraControls from 'explorviz-frontend/src/utils/application-rendering/camera-controls';

interface Args {
  landscapeData: LandscapeData;
  cameraControls: React.RefObject<CameraControls | null>;
}
export default function Popups({ landscapeData, cameraControls }: Args) {
  const popupData = usePopupHandlerStore(
    useShallow((state) => state.popupData)
  );

  const applicationRendererActions = useApplicationRendererStore(
    useShallow((state) => ({
      getMeshById: state.getMeshById,
      getApplicationById: state.getApplicationById,
      openParents: state.openParents,
    }))
  );
  const popupHandlerActions = usePopupHandlerStore(
    useShallow((state) => ({
      removePopup: state.removePopup,
      updatePopup: state.updatePopup,
      pinPopup: state.pinPopup,
      sharePopup: state.sharePopup,
      updateMeshReference: state.updateMeshReference,
    }))
  );
  const highlightingActions = useHighlightingStore(
    useShallow((state) => ({
      toggleHighlightById: state.toggleHighlightById,
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

  const showApplication = (appId: string) => {
    removePopup(appId);
    const applicationObject3D =
      applicationRendererActions.getApplicationById(appId);
    if (applicationObject3D) {
      cameraControls.current!.focusCameraOn(0.8, applicationObject3D);
    }
  };

  const removePopup = (entityId: string) => {
    popupHandlerActions.removePopup(entityId);

    // remove potential toggle effect
    const mesh = applicationRendererActions.getMeshById(entityId);
    if (mesh?.isHovered) {
      mesh.resetHoverEffect();
    }
  };

  const addAnnotationForPopup = (popup: PopupData) => {
    const mesh = applicationRendererActions.getMeshById(`${popup.entity.id}`);
    if (!mesh) return;

    annotationHandlerActions.addAnnotation({
      annotationId: undefined,
      mesh: mesh,
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
      openParents={applicationRendererActions.openParents}
      pinPopup={popupHandlerActions.pinPopup}
      popupData={data}
      updatePopup={popupHandlerActions.updatePopup}
      removePopup={removePopup}
      sharePopup={popupHandlerActions.sharePopup}
      showApplication={showApplication}
      structureData={landscapeData.structureLandscapeData}
      toggleHighlightById={highlightingActions.toggleHighlightById}
      updateMeshReference={popupHandlerActions.updateMeshReference}
    />
  ));
}
