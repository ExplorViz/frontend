import { ThreeEvent } from "@react-three/fiber";
import { usePointerStop } from "explorviz-frontend/src/hooks/pointer-stop";
import useClickPreventionOnDoubleClick from "explorviz-frontend/src/hooks/useClickPreventionOnDoubleClick";
import { useConfigurationStore } from "explorviz-frontend/src/stores/configuration";
import { usePopupHandlerStore } from "explorviz-frontend/src/stores/popup-handler";
import { useUserSettingsStore } from "explorviz-frontend/src/stores/user-settings";
import { useVisibilityServiceStore } from "explorviz-frontend/src/stores/visibility-service";
import { useVisualizationStore } from "explorviz-frontend/src/stores/visualization-store";
import ClassCommunication from "explorviz-frontend/src/utils/landscape-schemes/dynamic/class-communication";
import BundledCommunicationMesh from "explorviz-frontend/src/view-objects/3d/application/bundled-communication-mesh";
import CommunicationLayout from "explorviz-frontend/src/view-objects/layout-models/communication-layout";
import * as THREE from "three";
import { useRef, useMemo } from "react";
import { useShallow } from "zustand/react/shallow";

export default function BundledCommunicationR3F({
  communicationModel,
  communicationLayout,
}: {
  communicationModel: ClassCommunication;
  communicationLayout: CommunicationLayout | undefined;
}) {
  const {
    communicationColor,
    highlightedEntityColor,
    enableHoverEffects,
    bundlingBeta, 
  } = useUserSettingsStore(
    useShallow((state) => ({
      communicationColor: state.visualizationSettings.communicationColor.value,
      highlightedEntityColor: state.colors?.highlightedEntityColor,
      enableHoverEffects: state.visualizationSettings.enableHoverEffects.value,
      bundlingBeta: state.visualizationSettings.bundlingBeta?.value ?? 0.5, // default
    }))
  );

  const { isHighlighted, isHovered, setHighlightedEntity, setHoveredEntity } =
    useVisualizationStore(
      useShallow((state) => ({
        isHighlighted: state.highlightedEntityIds.has(communicationModel.id),
        isHovered: state.hoveredEntityId === communicationModel.id,
        setHighlightedEntity: state.actions.setHighlightedEntityId,
        setHoveredEntity: state.actions.setHoveredEntityId,
      }))
    );

  const { evoConfig } = useVisibilityServiceStore(
    useShallow((state) => ({
      evoConfig: state._evolutionModeRenderingConfiguration,
    }))
  );

  const meshRef = useRef<any>(null);
  const { addPopup } = usePopupHandlerStore(
    useShallow((state) => ({
      addPopup: state.addPopup,
    }))
  );

  const handlePointerStop = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    addPopup({
      entityId: communicationModel.id,
      position: { x: event.clientX, y: event.clientY },
    });
  };
  const pointerStopHandlers = usePointerStop(handlePointerStop);

  const handleOnPointerOver = (event: any) => {
    event.stopPropagation();
    setHoveredEntity(communicationModel.id);
  };

  const handleOnPointerOut = (event: any) => {
    event.stopPropagation();
    setHoveredEntity(null);
  };

  const handleClick = () => {
    setHighlightedEntity(communicationModel.id, !isHighlighted);
  };
  const handleDoubleClick = () => {};

  const [handleClickWithPrevent, handleDoubleClickWithPrevent] =
    useClickPreventionOnDoubleClick(handleClick, handleDoubleClick);

  // Nicht anzeigen, falls keine dynamischen Kanten aktiv sind
  if (!evoConfig.renderDynamic) return null;

  // DataModel wird hier nur aus Kompatibilitätsgründen erzeugt (wird nicht benutzt)
  const constructorArgs = useMemo(() => {
    return [new THREE.Vector3()]; // dummy, nicht nötig für BundledCommunicationMesh
  }, []);

  return (
    <BundledCommunicationMesh
      {...pointerStopHandlers}
      onPointerOver={handleOnPointerOver}
      onPointerOut={handleOnPointerOut}
      onClick={handleClickWithPrevent}
      onDoubleClick={handleDoubleClickWithPrevent}
      args={constructorArgs}
      communicationModel={communicationModel}
      communicationLayout={communicationLayout}
      color={isHighlighted ? highlightedEntityColor : communicationColor}
      bundlingBeta={bundlingBeta}
      isHovered={enableHoverEffects && isHovered}
      ref={meshRef}
    />
  );
}



