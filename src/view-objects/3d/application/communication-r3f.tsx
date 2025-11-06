// import { ThreeElements, ThreeEvent } from '@react-three/fiber';
// import { usePointerStop } from 'explorviz-frontend/src/hooks/pointer-stop';
// import useClickPreventionOnDoubleClick from 'explorviz-frontend/src/hooks/useClickPreventionOnDoubleClick';
// import { useConfigurationStore } from 'explorviz-frontend/src/stores/configuration';
// import { usePopupHandlerStore } from 'explorviz-frontend/src/stores/popup-handler';
// import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
// import { useVisibilityServiceStore } from 'explorviz-frontend/src/stores/visibility-service';
// import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
// import ClassCommunication from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/class-communication';
// import ClazzCommunicationMesh from 'explorviz-frontend/src/view-objects/3d/application/clazz-communication-mesh';
// import ClazzCommuMeshDataModel from 'explorviz-frontend/src/view-objects/3d/application/utils/clazz-communication-mesh-data-model';
// import CommunicationLayout from 'explorviz-frontend/src/view-objects/layout-models/communication-layout';
// import { useMemo, useRef } from 'react';
// import * as THREE from 'three';
// import { useShallow } from 'zustand/react/shallow';

// export default function CommunicationR3F({
//   communicationModel,
//   communicationLayout,
// }: {
//   communicationModel: ClassCommunication;
//   communicationLayout: CommunicationLayout | undefined;
// }) {
//   const {
//     arrowColor,
//     arrowOffset,
//     arrowWidth,
//     communicationColor,
//     curveHeight,
//     highlightedEntityColor,
//     enableHoverEffects,
//   } = useUserSettingsStore(
//     useShallow((state) => ({
//       arrowColor: state.visualizationSettings.communicationArrowColor.value,
//       arrowOffset: state.visualizationSettings.commArrowOffset.value,
//       arrowWidth: state.visualizationSettings.commArrowSize.value,
//       communicationColor: state.visualizationSettings.communicationColor.value,
//       highlightedEntityColor: state.colors?.highlightedEntityColor,
//       curveHeight: state.visualizationSettings.curvyCommHeight.value,
//       enableHoverEffects: state.visualizationSettings.enableHoverEffects.value,
//     }))
//   );

//   const { isHighlighted, isHovered, setHighlightedEntity, setHoveredEntity } =
//     useVisualizationStore(
//       useShallow((state) => ({
//         isHighlighted: state.highlightedEntityIds.has(communicationModel.id),
//         isHovered: state.hoveredEntityId === communicationModel.id,
//         setHighlightedEntity: state.actions.setHighlightedEntityId,
//         setHoveredEntity: state.actions.setHoveredEntityId,
//       }))
//     );

//   const { commCurveHeightDependsOnDistance } = useConfigurationStore(
//     useShallow((state) => ({
//       commCurveHeightDependsOnDistance: state.commCurveHeightDependsOnDistance,
//     }))
//   );

//   const { evoConfig } = useVisibilityServiceStore(
//     useShallow((state) => ({
//       evoConfig: state._evolutionModeRenderingConfiguration,
//     }))
//   );

//   const meshRef = useRef<ClazzCommunicationMesh | null>(null);

//   const { addPopup } = usePopupHandlerStore(
//     useShallow((state) => ({
//       addPopup: state.addPopup,
//     }))
//   );

//   const handlePointerStop = (event: ThreeEvent<PointerEvent>) => {
//     event.stopPropagation();
//     addPopup({
//       entityId: communicationModel.id,
//       position: {
//         x: event.clientX,
//         y: event.clientY,
//       },
//     });
//   };

//   const pointerStopHandlers = usePointerStop(handlePointerStop);

//   const handleOnPointerOver = (event: any) => {
//     event.stopPropagation();
//     setHoveredEntity(communicationModel.id);
//   };

//   const handleOnPointerOut = (event: any) => {
//     event.stopPropagation();
//     setHoveredEntity(null);
//   };

//   const handleClick = (/*event*/) => {
//     setHighlightedEntity(communicationModel.id, !isHighlighted);
//   };

//   const handleDoubleClick = (/*event*/) => {};

//   const [handleClickWithPrevent, handleDoubleClickWithPrevent] =
//     useClickPreventionOnDoubleClick(handleClick, handleDoubleClick);

//   const computeCurveHeight = () => {
//     let baseCurveHeight = 20;
//     if (communicationLayout && commCurveHeightDependsOnDistance) {
//       const classDistance = Math.hypot(
//         communicationLayout.endX - communicationLayout.startX,
//         communicationLayout.endZ - communicationLayout.startZ
//       );
//       baseCurveHeight = classDistance * 0.5;
//     }

//     return baseCurveHeight * curveHeight;
//   };

//   const constructorArgs = useMemo<
//     ThreeElements['clazzCommunicationMesh']['args']
//   >(() => {
//     const dataModel = new ClazzCommuMeshDataModel(
//       communicationModel,
//       communicationModel.id
//     );
//     return [dataModel];
//   }, []);

//   // Check if component should be displayed
//   if (!evoConfig.renderDynamic) {
//     return null;
//   }

//   return (
//     <clazzCommunicationMesh
//       {...pointerStopHandlers}
//       onPointerOver={handleOnPointerOver}
//       onPointerOut={handleOnPointerOut}
//       onClick={handleClickWithPrevent}
//       onDoubleClick={handleDoubleClickWithPrevent}
//       args={constructorArgs}
//       arrowColor={new THREE.Color(arrowColor)}
//       arrowOffset={arrowOffset}
//       layout={communicationLayout}
//       arrowWidth={arrowWidth}
//       curveHeight={computeCurveHeight()}
//       defaultColor={communicationColor}
//       highlighted={isHighlighted}
//       highlightingColor={highlightedEntityColor}
//       isHovered={enableHoverEffects && isHovered}
//       ref={meshRef}
//     ></clazzCommunicationMesh>
//   );
// }

import { ThreeElements, ThreeEvent } from '@react-three/fiber';
import { usePointerStop } from 'explorviz-frontend/src/hooks/pointer-stop';
import useClickPreventionOnDoubleClick from 'explorviz-frontend/src/hooks/useClickPreventionOnDoubleClick';
import { useConfigurationStore } from 'explorviz-frontend/src/stores/configuration';
import { usePopupHandlerStore } from 'explorviz-frontend/src/stores/popup-handler';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { useVisibilityServiceStore } from 'explorviz-frontend/src/stores/visibility-service';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import ClassCommunication from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/class-communication';
import ClazzCommunicationMesh from 'explorviz-frontend/src/view-objects/3d/application/clazz-communication-mesh';
import ClazzCommuMeshDataModel from 'explorviz-frontend/src/view-objects/3d/application/utils/clazz-communication-mesh-data-model';
import CommunicationLayout from 'explorviz-frontend/src/view-objects/layout-models/communication-layout';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useShallow } from 'zustand/react/shallow';
import { BundledCommunicationLayout } from './bundled-communication-layout';
import { EdgeBundlingConfig } from './edge-bundling-utils';

export default function CommunicationR3F({
  communicationModel,
  communicationLayout,
  allCommunications = [],
}: {
  communicationModel: ClassCommunication;
  communicationLayout: CommunicationLayout | undefined;
  allCommunications?: any[];
}) {
  const {
    arrowColor,
    arrowOffset,
    arrowWidth,
    communicationColor,
    curveHeight,
    highlightedEntityColor,
    enableHoverEffects,
    // Edge Bundling settings:
    enableEdgeBundling,
    bundleStrength,
    compatibilityThreshold,
    bundlingIterations,
    bundlingStepSize,
  } = useUserSettingsStore(
    useShallow((state) => ({
      arrowColor: state.visualizationSettings.communicationArrowColor.value,
      arrowOffset: state.visualizationSettings.commArrowOffset.value,
      arrowWidth: state.visualizationSettings.commArrowSize.value,
      communicationColor: state.visualizationSettings.communicationColor.value,
      highlightedEntityColor: state.colors?.highlightedEntityColor,
      curveHeight: state.visualizationSettings.curvyCommHeight.value,
      enableHoverEffects: state.visualizationSettings.enableHoverEffects.value,
      
      // Edge Bundling settings:
      enableEdgeBundling: state.visualizationSettings.enableEdgeBundling.value,
      bundleStrength: state.visualizationSettings.bundleStrength.value,
      compatibilityThreshold: state.visualizationSettings.compatibilityThreshold.value,
      bundlingIterations: state.visualizationSettings.bundlingIterations.value,
      bundlingStepSize: state.visualizationSettings.bundlingStepSize.value,
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

  const { commCurveHeightDependsOnDistance } = useConfigurationStore(
    useShallow((state) => ({
      commCurveHeightDependsOnDistance: state.commCurveHeightDependsOnDistance,
    }))
  );

  const { evoConfig } = useVisibilityServiceStore(
    useShallow((state) => ({
      evoConfig: state._evolutionModeRenderingConfiguration,
    }))
  );

  const meshRef = useRef<ClazzCommunicationMesh | null>(null);

  const { addPopup } = usePopupHandlerStore(
    useShallow((state) => ({
      addPopup: state.addPopup,
    }))
  );

  const handlePointerStop = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    addPopup({
      entityId: communicationModel.id,
      position: {
        x: event.clientX,
        y: event.clientY,
      },
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

  const handleClick = (/*event*/) => {
    setHighlightedEntity(communicationModel.id, !isHighlighted);
  };

  const handleDoubleClick = (/*event*/) => {};

  const [handleClickWithPrevent, handleDoubleClickWithPrevent] =
    useClickPreventionOnDoubleClick(handleClick, handleDoubleClick);

  const computeCurveHeight = () => {
    let baseCurveHeight = 20;
    if (communicationLayout && commCurveHeightDependsOnDistance) {
      const classDistance = Math.hypot(
        communicationLayout.endX - communicationLayout.startX,
        communicationLayout.endZ - communicationLayout.startZ
      );
      baseCurveHeight = classDistance * 0.5;
    }

    return baseCurveHeight * curveHeight;
  };

  // Edge Bundling config
  const edgeBundlingConfig = useMemo<EdgeBundlingConfig>(() => ({
    bundleStrength,
    compatibilityThreshold,
    iterations: bundlingIterations,
    stepSize: bundlingStepSize,
  }), [bundleStrength, compatibilityThreshold, bundlingIterations, bundlingStepSize]);

  // Create bundled layout
  const bundledLayout = useMemo(() => {
    if (!communicationLayout) return undefined;

    if (!enableEdgeBundling) {
    // If it is a BundledLayout already, convert back to normal layout
      if (communicationLayout instanceof BundledCommunicationLayout) {
        const normalLayout = new CommunicationLayout(communicationModel);
        normalLayout.startPoint = communicationLayout.startPoint;
        normalLayout.endPoint = communicationLayout.endPoint;
        normalLayout.lineThickness = communicationLayout.lineThickness;
        return normalLayout;
    }
    return communicationLayout;
  }
    
    if (communicationLayout instanceof BundledCommunicationLayout) {
      return communicationLayout;
    }
    
    // Convert normal layout to BundledLayout
    const startPoint = new THREE.Vector3(
      communicationLayout.startX,
      communicationLayout.startY,
      communicationLayout.startZ
    );
    const endPoint = new THREE.Vector3(
      communicationLayout.endX,
      communicationLayout.endY,
      communicationLayout.endZ
    );
    
    return new BundledCommunicationLayout(
      communicationModel,
      startPoint,
      endPoint,
      communicationLayout.lineThickness,
      edgeBundlingConfig
    );
  }, [communicationLayout, communicationModel, edgeBundlingConfig, enableEdgeBundling]);

  const constructorArgs = useMemo<
    ThreeElements['clazzCommunicationMesh']['args']
  >(() => {
    const dataModel = new ClazzCommuMeshDataModel(
      communicationModel,
      communicationModel.id
    );
    return [dataModel];
  }, [communicationModel]);

  // Check if component should be displayed
  if (!evoConfig.renderDynamic) {
    return null;
  }

  return (
    <clazzCommunicationMesh
      {...pointerStopHandlers}
      onPointerOver={handleOnPointerOver}
      onPointerOut={handleOnPointerOut}
      onClick={handleClickWithPrevent}
      onDoubleClick={handleDoubleClickWithPrevent}
      args={constructorArgs}
      arrowColor={new THREE.Color(arrowColor)}
      arrowOffset={arrowOffset}
      layout={bundledLayout}
      arrowWidth={arrowWidth}
      curveHeight={computeCurveHeight()}
      defaultColor={communicationColor}
      highlighted={isHighlighted}
      highlightingColor={highlightedEntityColor}
      isHovered={enableHoverEffects && isHovered}
      ref={meshRef}
      // Edge Bundling props
      enableEdgeBundling={enableEdgeBundling}
      bundleGroupId={communicationModel.sourceClass + '_' + communicationModel.targetClass}
      bundlingConfig={edgeBundlingConfig}
    ></clazzCommunicationMesh>
  );
}