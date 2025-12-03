import { ThreeElements, ThreeEvent } from '@react-three/fiber';
import { usePointerStop } from 'explorviz-frontend/src/hooks/pointer-stop';
import useClickPreventionOnDoubleClick from 'explorviz-frontend/src/hooks/useClickPreventionOnDoubleClick';
import { useConfigurationStore } from 'explorviz-frontend/src/stores/configuration';
import { usePopupHandlerStore } from 'explorviz-frontend/src/stores/popup-handler';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { useVisibilityServiceStore } from 'explorviz-frontend/src/stores/visibility-service';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import { toggleHighlightById } from 'explorviz-frontend/src/utils/application-rendering/highlighting';
import ClassCommunication from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/class-communication';
import {
  isApplication,
  isClass,
  isPackage,
} from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import ClazzCommunicationMesh from 'explorviz-frontend/src/view-objects/3d/application/clazz-communication-mesh';
import ClazzCommuMeshDataModel from 'explorviz-frontend/src/view-objects/3d/application/utils/clazz-communication-mesh-data-model';
import BoxLayout from 'explorviz-frontend/src/view-objects/layout-models/box-layout';
import CommunicationLayout from 'explorviz-frontend/src/view-objects/layout-models/communication-layout';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useShallow } from 'zustand/react/shallow';
import { BundledCommunicationLayout } from './bundled-communication-layout';
import {
  EdgeBundlingConfig,
  HierarchicalAttractionSystem,
} from './edge-bundling-utils';
import { HAPSystemManager } from './hap-system-manager';
import { useThree } from '@react-three/fiber';

// HAP System Manager Instance
const hapSystemManager = HAPSystemManager.getInstance();

// Global layout map for fallback
let globalLayoutMap: Map<string, BoxLayout> | null = null;

export function setGlobalLayoutMap(map: Map<string, BoxLayout>) {
  globalLayoutMap = map;
}

export default function CommunicationR3F({
  communicationModel,
  communicationLayout,
  allCommunications = [],
  applicationElement,
  layoutMap,
}: {
  communicationModel: ClassCommunication;
  communicationLayout: CommunicationLayout | undefined;
  allCommunications?: any[];
  applicationElement?: any;
  layoutMap?: Map<string, BoxLayout>;
}) {
  const {
    arrowColor,
    arrowOffset,
    arrowWidth,
    communicationColor,
    curveHeight,
    highlightedEntityColor,
    enableHoverEffects,

    // Edge Bundling settings
    enableEdgeBundling,
    bundleStrength,
    compatibilityThreshold,
    bundlingIterations,
    bundlingStepSize,

    // 3D-HAP specific settings
    beta,
    use3DHAPAlgorithm,
  } = useUserSettingsStore(
    useShallow((state) => {
      // Safe access with fallbacks for migration
      const vizSettings = state.visualizationSettings as any;

      return {
        arrowColor: vizSettings.communicationArrowColor.value,
        arrowOffset: vizSettings.commArrowOffset.value,
        arrowWidth: vizSettings.commArrowSize.value,
        communicationColor: vizSettings.communicationColor.value,
        highlightedEntityColor: state.colors?.highlightedEntityColor,
        curveHeight: vizSettings.curvyCommHeight.value,
        enableHoverEffects: vizSettings.enableHoverEffects.value,

        // Edge Bundling settings
        enableEdgeBundling: vizSettings.enableEdgeBundling.value,
        bundleStrength: vizSettings.bundleStrength.value,
        compatibilityThreshold: vizSettings.compatibilityThreshold.value,
        bundlingIterations: vizSettings.bundlingIterations.value,
        bundlingStepSize: vizSettings.bundlingStepSize.value,

        // 3D-HAP settings with safe fallbacks
        beta: vizSettings.beta?.value ?? 0.8,
        use3DHAPAlgorithm: vizSettings.use3DHAPAlgorithm?.value ?? false,
      };
    })
  );

  const { isHighlighted, isHovered, setHoveredEntity } = useVisualizationStore(
    useShallow((state) => ({
      isHighlighted: state.highlightedEntityIds.has(communicationModel.id),
      isHovered: state.hoveredEntityId === communicationModel.id,
      setHoveredEntity: state.actions.setHoveredEntityId,
    }))
  );

  const { scene } = useThree();

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
    toggleHighlightById(communicationModel.id);
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

    // Level-based curveHeight for HAP-edges
    if (enableEdgeBundling && use3DHAPAlgorithm && hapNodes) {
      const maxLevel = Math.max(
        hapNodes.originHAP?.level || 0,
        hapNodes.destinationHAP?.level || 0
      );
      // Higher hierarchy levels = larger curveHeight
      const levelBasedMultiplier = 1.0 + maxLevel * 0.3;
      return baseCurveHeight * curveHeight * levelBasedMultiplier;
    }

    return baseCurveHeight * curveHeight;
  };

  // Edge Bundling config - only for fallback (when use3DHAPAlgorithm = false)
  const edgeBundlingConfig = useMemo<EdgeBundlingConfig>(
    () => ({
      bundleStrength,
      compatibilityThreshold,
      iterations: bundlingIterations,
      stepSize: bundlingStepSize,
    }),
    [
      bundleStrength,
      compatibilityThreshold,
      bundlingIterations,
      bundlingStepSize,
    ]
  );

  // The deeper into the hierarchy tree, the closer the 3D-HAP is to its geometric element
  const getLevel = (element: any): number => {
    if (isClass(element)) return 0; // LOWEST level - closest to geometry
    if (isPackage(element)) return 1; // Middle level
    if (isApplication(element)) return 2; // HIGHEST level - farthest from geometry
    return 0;
  };

  // Use effective layout map from prop or global
  const effectiveLayoutMap = layoutMap || globalLayoutMap;

  // HAP position calculation
  const getExactHAPPosition = (
    element: any,
    layout: BoxLayout
  ): THREE.Vector3 => {
    const buildingCenter = layout.center.clone();

    const level = getLevel(element);

    let elevation = 0;
    switch (level) {
      case 0:
        elevation = 3;
        break; // Class
      case 1:
        elevation = 18;
        break; // Package
      case 2:
        elevation = 35;
        break; // Application
    }

    return new THREE.Vector3(
      buildingCenter.x,
      buildingCenter.y + elevation,
      buildingCenter.z
    );
  };

  // Helper functions for position calculation
  const getFallbackPosition = (element: any): THREE.Vector3 => {
    const level = getLevel(element);

    if (isApplication(element)) {
      return new THREE.Vector3(
        (Math.random() - 0.5) * 5,
        0 + level * 10, // Application (Level 2) = 20
        (Math.random() - 0.5) * 5
      );
    } else if (isPackage(element) && element.parent) {
      const parentPos = getPosition(element.parent);
      return new THREE.Vector3(
        parentPos.x + (Math.random() - 0.5) * 30,
        0 + level * 10, // Package (Level 1) = 10
        parentPos.z + (Math.random() - 0.5) * 30
      );
    } else if (isClass(element) && element.parent) {
      const parentPos = getPosition(element.parent);
      return new THREE.Vector3(
        parentPos.x + (Math.random() - 0.5) * 10,
        0 + level * 10, // Class (Level 0) = 0
        parentPos.z + (Math.random() - 0.5) * 10
      );
    }

    return new THREE.Vector3(0, 0, 0);
  };

  const getPosition = (element: any): THREE.Vector3 => {
    if (!effectiveLayoutMap || !effectiveLayoutMap.has(element.id)) {
      throw new Error(
        `NO LAYOUT for ${element.type} "${element.name || element.id}"`
      );
    }

    const layout = effectiveLayoutMap.get(element.id)!;
    return getExactHAPPosition(element, layout);
  };

  const hapSystem = useMemo<HierarchicalAttractionSystem | null>(() => {
    if (!applicationElement || !enableEdgeBundling) return null;

    let system = hapSystemManager.getHAPSystem(applicationElement.id);
    if (!system) {
      const getChildren = (el: any) => {
        if (isPackage(el)) return [...el.subPackages, ...el.classes];
        if (isApplication(el)) return el.packages;
        return [];
      };

      hapSystemManager.buildApplicationHAPTree(
        applicationElement.id,
        applicationElement,
        getChildren,
        getPosition,
        getLevel
      );

      // Get HAPSystem
      system = hapSystemManager.getHAPSystem(applicationElement.id);
    }

    return system || null;
  }, [applicationElement?.id, enableEdgeBundling, effectiveLayoutMap]);

  // Initialize HAP system for the application
  useEffect(() => {
    if (applicationElement && enableEdgeBundling) {
      hapSystemManager.clearHAPSystem(applicationElement.id);

      const getChildren = (element: any): any[] => {
        if (isPackage(element))
          return [...element.subPackages, ...element.classes];
        if (isApplication(element)) return element.packages;
        return [];
      };

      const getCorrectedPosition = (element: any): THREE.Vector3 => {
        if (effectiveLayoutMap && effectiveLayoutMap.has(element.id)) {
          const layout = effectiveLayoutMap.get(element.id)!;
          const level = getLevel(element);

          const elevationY = level * 15; // Class=0, Package=15, Application=30

          return new THREE.Vector3(
            layout.center.x,
            layout.center.y + elevationY,
            layout.center.z
          );
        }
        return getFallbackPosition(element);
      };

      hapSystemManager.buildApplicationHAPTree(
        applicationElement.id,
        applicationElement,
        getChildren,
        getCorrectedPosition,
        getLevel
      );
    }
  }, [applicationElement?.id, enableEdgeBundling, effectiveLayoutMap]);

  const hapNodes = useMemo(() => {
    if (
      !hapSystem ||
      !communicationModel.sourceClass ||
      !communicationModel.targetClass
    )
      return null;
    const originHAP = hapSystemManager.getHAPNode(
      communicationModel.sourceClass.id
    );
    const destinationHAP = hapSystemManager.getHAPNode(
      communicationModel.targetClass.id
    );
    if (!originHAP || !destinationHAP) return null;
    return { originHAP, destinationHAP };
  }, [
    hapSystem,
    communicationModel.sourceClass?.id,
    communicationModel.targetClass?.id,
  ]);

  const lastValuesRef = useRef({
    beta: 0.8,
    use3DHAPAlgorithm: false,
    enableEdgeBundling: false,
    layoutHash: '',
    hapNodesHash: '',
  });

  const layoutHash = useMemo(() => {
    if (!communicationLayout) return '';
    return `${communicationLayout.startX}|${communicationLayout.startY}|${communicationLayout.startZ}|${communicationLayout.endX}|${communicationLayout.endY}|${communicationLayout.endZ}`;
  }, [communicationLayout]);

  const hapNodesHash = useMemo(() => {
    if (!hapNodes) return '';
    return `${hapNodes.originHAP?.id || ''}|${hapNodes.destinationHAP?.id || ''}`;
  }, [hapNodes]);

  useEffect(() => {
    if (!meshRef.current) return;

    meshRef.current.use3DHAPAlgorithm = use3DHAPAlgorithm;

    if (enableEdgeBundling && use3DHAPAlgorithm && hapNodes) {
      const hapSystem = hapSystemManager.getHAPSystem(
        applicationElement?.id || 'default'
      );
      if (hapSystem) {
        meshRef.current.initializeHAPSystem(
          hapSystem,
          hapNodes.originHAP,
          hapNodes.destinationHAP
        );
      }
    }

    // Force re-render
    if (meshRef.current.render) meshRef.current.render();
  }, [use3DHAPAlgorithm, enableEdgeBundling, hapNodes]);

  // Create appropriate layout based on algorithm selection
  const finalLayout = useMemo(() => {
    if (!communicationLayout) return undefined;

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

    if (!enableEdgeBundling) {
      // Edge-Bundling off -> Original layout
      if (communicationLayout instanceof BundledCommunicationLayout) {
        const normalLayout = new CommunicationLayout(communicationModel);
        normalLayout.startPoint = communicationLayout.startPoint;
        normalLayout.endPoint = communicationLayout.endPoint;
        normalLayout.lineThickness = communicationLayout.lineThickness;
        return normalLayout;
      }
      return communicationLayout;
    }

    let bundledLayout: BundledCommunicationLayout;

    if (communicationLayout instanceof BundledCommunicationLayout) {
      bundledLayout = communicationLayout;
    } else {
      bundledLayout = new BundledCommunicationLayout(
        communicationModel,
        startPoint,
        endPoint,
        communicationLayout.lineThickness,
        edgeBundlingConfig
      );
    }

    if (use3DHAPAlgorithm && hapNodes) {
      const hapSystem = hapSystemManager.getHAPSystem(
        applicationElement?.id || 'default'
      );
      if (hapSystem) {
        bundledLayout.setHAPNodes(hapNodes.originHAP, hapNodes.destinationHAP);
        bundledLayout.setBeta(beta);
      }
    }

    return bundledLayout;
  }, [
    communicationLayout,
    communicationModel,
    edgeBundlingConfig,
    enableEdgeBundling,
    use3DHAPAlgorithm,
    hapNodes,
    beta,
    applicationElement,
  ]);

  // Only update if change occured
  useEffect(() => {
    if (!meshRef.current || !finalLayout) return;

    const currentValues = {
      beta,
      use3DHAPAlgorithm,
      enableEdgeBundling,
      layoutHash,
      hapNodesHash,
    };

    const lastValues = lastValuesRef.current;

    const hasChanged =
      Math.abs(currentValues.beta - lastValues.beta) > 0.001 ||
      currentValues.use3DHAPAlgorithm !== lastValues.use3DHAPAlgorithm ||
      currentValues.enableEdgeBundling !== lastValues.enableEdgeBundling ||
      currentValues.layoutHash !== lastValues.layoutHash ||
      currentValues.hapNodesHash !== lastValues.hapNodesHash;

    if (!hasChanged) {
      return;
    }

    // Only do necessary updates
    meshRef.current.layout = finalLayout as any;
    meshRef.current.enableEdgeBundling = enableEdgeBundling;
    meshRef.current.use3DHAPAlgorithm = use3DHAPAlgorithm;
    meshRef.current.beta = beta;

    if (enableEdgeBundling && use3DHAPAlgorithm && hapNodes && hapSystem) {
      meshRef.current.initializeHAPSystem(
        hapSystem,
        hapNodes.originHAP,
        hapNodes.destinationHAP
      );
    }

    meshRef.current.requestRender();

    lastValuesRef.current = currentValues;
  }, [
    finalLayout,
    enableEdgeBundling,
    use3DHAPAlgorithm,
    hapNodes,
    hapSystem,
    beta,
    layoutHash,
    hapNodesHash,
  ]);

  const [layoutMapHash, setLayoutMapHash] = useState('');

  useEffect(() => {
    if (!layoutMap || !applicationElement) return;

    // Calculate hash of layout positions
    const positions: string[] = [];
    layoutMap.forEach((layout, id) => {
      positions.push(
        `${id}:${layout.positionX},${layout.positionY},${layout.positionZ}`
      );
    });
    const newHash = positions.sort().join('|');

    if (newHash !== layoutMapHash) {
      if (enableEdgeBundling) {
        hapSystemManager.clearHAPSystem(applicationElement.id);

        const getChildren = (element: any): any[] => {
          if (isPackage(element))
            return [...element.subPackages, ...element.classes];
          if (isApplication(element)) return element.packages;
          return [];
        };

        hapSystemManager.buildApplicationHAPTree(
          applicationElement.id,
          applicationElement,
          getChildren,
          getPosition,
          getLevel
        );
      }

      setLayoutMapHash(newHash);
    }
  }, [layoutMap, applicationElement?.id, enableEdgeBundling]);

  useEffect(() => {
    if (!meshRef.current || !finalLayout) return;

    meshRef.current.layout = finalLayout as any;
    meshRef.current.enableEdgeBundling = enableEdgeBundling;
    meshRef.current.use3DHAPAlgorithm = use3DHAPAlgorithm;
    meshRef.current.beta = beta;

    if (enableEdgeBundling && use3DHAPAlgorithm && hapNodes && hapSystem) {
      meshRef.current.initializeHAPSystem(
        hapSystem,
        hapNodes.originHAP,
        hapNodes.destinationHAP
      );
    }

    meshRef.current.render();
  }, [
    finalLayout,
    enableEdgeBundling,
    use3DHAPAlgorithm,
    hapNodes,
    hapSystem,
    beta,
  ]);

  // Initialize HAP system on the mesh when it's created
  useEffect(() => {
    if (
      meshRef.current &&
      enableEdgeBundling &&
      use3DHAPAlgorithm &&
      hapNodes
    ) {
      const hapSystem = hapSystemManager.getHAPSystem(
        applicationElement?.id || 'default'
      );
      if (hapSystem) {
        meshRef.current.initializeHAPSystem(
          hapSystem,
          hapNodes.originHAP,
          hapNodes.destinationHAP
        );
        meshRef.current.beta = beta;
        meshRef.current.use3DHAPAlgorithm = true;
        meshRef.current.enableEdgeBundling = true;
      }
    } else if (meshRef.current) {
      // Ensure 3D-HAP is disabled when not needed
      meshRef.current.use3DHAPAlgorithm = false;
      meshRef.current.enableEdgeBundling = enableEdgeBundling;

      if (!enableEdgeBundling) {
        meshRef.current.clearHAPSystem();
      }
    }
  }, [
    meshRef.current,
    enableEdgeBundling,
    use3DHAPAlgorithm,
    hapNodes,
    applicationElement,
    beta,
  ]);

  useEffect(() => {
    return () => {
      // Cleanup when component unmounts
      if (meshRef.current) {
        meshRef.current.disposeRecursively();
      }
    };
  }, []);

  // When application changes, clear the entire geometry cache
  useEffect(() => {
    if (applicationElement?.id) {
      // Clear shared geometries when switching applications
      ClazzCommunicationMesh.clearSharedGeometries();
    }
  }, [applicationElement?.id]);

  // // Visualize HAPs
  // useEffect(() => {
  //   if (applicationElement?.id) {
  //     const landscapeScalar = 0.01;
  //     hapSystemManager.visualizeHAPs(applicationElement.id, scene);
  //   }
  // }, [applicationElement?.id, scene]);

  useEffect(() => {
    if (effectiveLayoutMap) {
      effectiveLayoutMap.forEach((layout, id) => {});
    }
  }, [effectiveLayoutMap]);

  const constructorArgs = useMemo<
    ThreeElements['clazzCommunicationMesh']['args']
  >(() => {
    const dataModel = new ClazzCommuMeshDataModel(
      communicationModel,
      communicationModel.id
    );
    return [dataModel, { use3DHAPAlgorithm }];
  }, [communicationModel, use3DHAPAlgorithm]);

  // Check if component should be displayed
  if (!evoConfig.renderDynamic) {
    return null;
  }

  return (
    <clazzCommunicationMesh
      key={`${enableEdgeBundling}-${use3DHAPAlgorithm}`}
      {...pointerStopHandlers}
      onPointerOver={handleOnPointerOver}
      onPointerOut={handleOnPointerOut}
      onClick={handleClickWithPrevent}
      onDoubleClick={handleDoubleClickWithPrevent}
      args={constructorArgs}
      arrowColor={new THREE.Color(arrowColor)}
      arrowOffset={arrowOffset}
      layout={finalLayout}
      arrowWidth={arrowWidth}
      curveHeight={computeCurveHeight()}
      defaultColor={communicationColor}
      highlighted={isHighlighted}
      highlightingColor={highlightedEntityColor}
      isHovered={enableHoverEffects && isHovered}
      ref={meshRef}
      // Edge Bundling props
      enableEdgeBundling={enableEdgeBundling}
      bundleGroupId={
        enableEdgeBundling && !use3DHAPAlgorithm
          ? communicationModel.sourceClass.id +
            '_' +
            communicationModel.targetClass.id
          : null
      }
      bundlingConfig={edgeBundlingConfig}
      // 3D-HAP props
      beta={beta}
      use3DHAPAlgorithm={use3DHAPAlgorithm}
    ></clazzCommunicationMesh>
  );
}
