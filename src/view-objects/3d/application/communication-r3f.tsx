import { ThreeElements, ThreeEvent, useThree } from '@react-three/fiber';
import { usePointerStop } from 'explorviz-frontend/src/hooks/pointer-stop';
import useClickPreventionOnDoubleClick from 'explorviz-frontend/src/hooks/useClickPreventionOnDoubleClick';
import { usePopupHandlerStore } from 'explorviz-frontend/src/stores/popup-handler';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { useVisibilityServiceStore } from 'explorviz-frontend/src/stores/visibility-service';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import ApplicationData from 'explorviz-frontend/src/utils/application-data';
import {
  calculateLineThickness,
  computeCommunicationLayout,
} from 'explorviz-frontend/src/utils/application-rendering/communication-layouter';
import { toggleHighlightById } from 'explorviz-frontend/src/utils/application-rendering/highlighting';
import ClassCommunication from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/class-communication';
import {
  isApplication,
  isClass,
  isPackage,
} from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import BoxLayout from 'explorviz-frontend/src/utils/layout/box-layout';
import CommunicationLayout from 'explorviz-frontend/src/utils/layout/communication-layout';
import ClazzCommunicationMesh from 'explorviz-frontend/src/view-objects/3d/application/clazz-communication-mesh';
import ClazzCommuMeshDataModel from 'explorviz-frontend/src/view-objects/3d/application/utils/clazz-communication-mesh-data-model';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useShallow } from 'zustand/react/shallow';
import { BundledCommunicationLayout } from './bundled-communication-layout';
import {
  EdgeBundlingConfig,
  HierarchicalAttractionSystem,
} from './edge-bundling-utils';
import { HAPSystemManager } from './hap-system-manager';
import interAppBundlingService from './interapp-bundling-service';

// HAP System Manager Instance
const hapSystemManager = HAPSystemManager.getInstance();

// Global layout map for fallback
let globalLayoutMap: Map<string, BoxLayout> | null = null;

export function setGlobalLayoutMap(map: Map<string, BoxLayout>) {
  globalLayoutMap = map;
}

export default function CommunicationR3F({
  communicationModel,
  applicationElement,
  layoutMap,
  applicationModels,
}: {
  communicationModel: ClassCommunication;
  applicationElement?: any;
  layoutMap?: Map<string, BoxLayout>;
  applicationModels?: ApplicationData[];
}) {
  const {
    arrowColor,
    arrowOffset,
    arrowWidth,
    communicationColor,
    curveHeight,
    commThickness,
    highlightedEntityColor,
    enableHoverEffects,

    // Edge Bundling settings
    enableEdgeBundling,
    bundleStrength,
    compatibilityThreshold,
    bundlingIterations,
    bundlingStepSize,

    // 3D-HAP specific settings
    showHAPTree,
    beta,
    use3DHAPAlgorithm,
    commCurveHeightDependsOnDistance,
    scatterRadius,
    edgeBundlingStreamline,
    leafPackagesOnly,
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
        commThickness: vizSettings.commThickness.value,
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
        commCurveHeightDependsOnDistance:
          vizSettings.commCurveHeightDependsOnDistance?.value ?? true,
        showHAPTree: vizSettings.showHAPTree?.value ?? false,
        scatterRadius: state.visualizationSettings.scatterRadius?.value ?? 0.5,
        edgeBundlingStreamline:
          vizSettings.edgeBundlingStreamline?.value ?? true,
        leafPackagesOnly: vizSettings.leafPackagesOnly?.value ?? false,
      };
    })
  );

  const { isHighlighted, isHovered, setHoveredEntity, closedComponentIds } =
    useVisualizationStore(
      useShallow((state) => ({
        isHighlighted: state.highlightedEntityIds.has(communicationModel.id),
        isHovered: state.hoveredEntityId === communicationModel.id,
        setHoveredEntity: state.actions.setHoveredEntityId,
        closedComponentIds: state.closedComponentIds,
      }))
    );

  const sceneLayers = useVisualizationStore((state) => state.sceneLayers);

  // Compute communication layout internally
  // This ensures the layout is recomputed when components in the hierarchy are opened/closed
  const communicationLayout = useMemo(() => {
    if (applicationModels && layoutMap) {
      return computeCommunicationLayout(
        communicationModel,
        applicationModels,
        layoutMap
      );
    }
    return undefined;
    // closedComponentIds is intentionally included as a dependency even though it's not directly used
    // It triggers recomputation when components are opened/closed, which affects findFirstOpen() inside computeCommunicationLayout
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [communicationModel, applicationModels, layoutMap, closedComponentIds]);

  const { scene } = useThree();

  const [streamlineHash, setStreamlineHash] = useState('');

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
  const getHapLevel = useCallback((element: any): number => {
    if (isClass(element)) return 0; // LOWEST level - closest to geometry
    if (isPackage(element)) return 1; // Middle level
    if (isApplication(element)) return 2; // HIGHEST level - farthest from geometry
    return 0;
  }, []);

  // Use effective layout map from prop or global
  const effectiveLayoutMap = layoutMap || globalLayoutMap;

  const getExactHAPPosition = useCallback(
    (element: any, layout: BoxLayout): THREE.Vector3 => {
      const level = getHapLevel(element);

      let elevation = 0;
      switch (level) {
        case 0:
          elevation = 15; // Class
          break;
        case 1: // Package
          elevation = 30;
          break;
        case 2: // Application
          elevation = 50;
          break;
      }

      // For application-level HAP trees (used for intra-app communications),
      // use relative coordinates (matching computeCommunicationLayout behavior)

      if (isApplication(element)) {
        // For applications: use position + (width/2, 0, depth/2) as center
        return new THREE.Vector3(
          layout.position.x + layout.width / 2,
          layout.position.y + elevation,
          layout.position.z + layout.depth / 2
        );
      }

      // For classes/packages in application HAP trees: use relative coordinates
      // This matches how computeCommunicationLayout works for intra-app communications
      // (line 118-119: start = sourceClassLayout.center, end = targetClassLayout.center)
      const buildingCenter = layout.center.clone();
      return new THREE.Vector3(
        buildingCenter.x,
        buildingCenter.y + elevation,
        buildingCenter.z
      );
    },
    [getHapLevel]
  );

  const getPosition = useCallback(
    (element: any): THREE.Vector3 => {
      if (!effectiveLayoutMap || !effectiveLayoutMap.has(element.id)) {
        throw new Error(
          `NO LAYOUT for ${element.type} "${element.name || element.id}"`
        );
      }

      const layout = effectiveLayoutMap.get(element.id)!;
      return getExactHAPPosition(element, layout);
    },
    [effectiveLayoutMap, getExactHAPPosition]
  );

  // Helper functions for position calculation
  const getFallbackPosition = useCallback(
    (element: any): THREE.Vector3 => {
      const level = getHapLevel(element);

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
    },
    [getHapLevel, getPosition]
  );

  // Detect if this is an inter-app communication
  const isInterAppCommunication =
    communicationModel.sourceApp.id !== communicationModel.targetApp.id;

  const [updateTrigger, setUpdateTrigger] = useState(0);

  useEffect(() => {
    if (!isInterAppCommunication || !enableEdgeBundling) return;

    const unsubscribe = interAppBundlingService.subscribe(() => {
      if (Math.random() < 0.33) {
        setUpdateTrigger((prev) => prev + 1);
      }
    });

    return unsubscribe;
  }, [isInterAppCommunication, enableEdgeBundling]);

  // Force bundling service onyl for inter-app
  const interAppBundler = useMemo(() => {
    if (!enableEdgeBundling || !isInterAppCommunication) return null;
    return interAppBundlingService.getBundler();
  }, [enableEdgeBundling, isInterAppCommunication]);

  // Add edge to service
  useEffect(() => {
    if (!interAppBundler || !communicationLayout || !isInterAppCommunication)
      return;

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

    interAppBundlingService.addInterAppEdge(
      communicationModel.id,
      startPoint,
      endPoint,
      communicationModel.sourceApp.id,
      communicationModel.targetApp.id
    );

    return () => {
      interAppBundlingService.getBundler().removeEdge(communicationModel.id);
    };
  }, [
    interAppBundler,
    communicationLayout,
    isInterAppCommunication,
    communicationModel.id,
  ]);

  // Subscribe for updates
  const [forceUpdate, setForceUpdate] = useState(0);

  useEffect(() => {
    if (!isInterAppCommunication || !enableEdgeBundling) return;

    const unsubscribe = interAppBundlingService.subscribe(() => {
      setForceUpdate((prev) => prev + 1);
    });

    return unsubscribe;
  }, [isInterAppCommunication, enableEdgeBundling]);

  const hapSystem = useMemo<HierarchicalAttractionSystem | null>(() => {
    if (!applicationElement || !enableEdgeBundling) return null;

    // Use landscape HAP system for inter-app communications
    if (isInterAppCommunication) {
      const landscapeSystem = hapSystemManager.getHAPSystem('LANDSCAPE');
      return landscapeSystem || null;
    }

    // Use application-level HAP system for intra-app communications
    let system = hapSystemManager.getHAPSystem(applicationElement.id);
    if (!system) {
      const getChildrenLocal = (el: any) => {
        if (isPackage(el)) return [...el.subPackages, ...el.classes];
        if (isApplication(el)) return el.packages;
        return [];
      };

      hapSystemManager.buildApplicationHAPTree(
        applicationElement.id,
        applicationElement,
        getChildrenLocal,
        getPosition,
        getHapLevel
      );

      // Get HAPSystem
      system = hapSystemManager.getHAPSystem(applicationElement.id);
    }

    return system || null;
  }, [
    applicationElement?.id,
    enableEdgeBundling,
    effectiveLayoutMap,
    getPosition,
    getHapLevel,
    isInterAppCommunication,
  ]);

  // Memoize helper functions to prevent recreating on each render
  const getChildren = useCallback((element: any): any[] => {
    if (isPackage(element)) return [...element.subPackages, ...element.classes];
    if (isApplication(element)) return element.packages;
    return [];
  }, []);

  const getCorrectedPosition = useCallback(
    (element: any): THREE.Vector3 => {
      if (effectiveLayoutMap && effectiveLayoutMap.has(element.id)) {
        const layout = effectiveLayoutMap.get(element.id)!;
        const hapLevel = getHapLevel(element);

        const elevationY = hapLevel * 15; // Class=0, Package=15, Application=30

        // Following the pattern from layout-helper.ts:getLandscapePositionOfModel
        // but without landscapeScalar since we're rendering inside the scaled landscape group

        if (isApplication(element)) {
          // For applications: use position + (width/2, 0, depth/2) as center
          return new THREE.Vector3(
            layout.position.x + layout.width / 2,
            layout.position.y + elevationY,
            layout.position.z + layout.depth / 2
          );
        }

        // For classes/packages: need to add application position offset
        if (
          applicationElement &&
          effectiveLayoutMap.has(applicationElement.id)
        ) {
          const appLayout = effectiveLayoutMap.get(applicationElement.id)!;
          const appPosition = appLayout.position.clone();
          const modelCenter = layout.center.clone();

          return new THREE.Vector3(
            appPosition.x + modelCenter.x,
            modelCenter.y + elevationY,
            appPosition.z + modelCenter.z
          );
        }

        // Fallback: use layout center as-is
        return new THREE.Vector3(
          layout.center.x,
          layout.center.y + elevationY,
          layout.center.z
        );
      }
      return getFallbackPosition(element);
    },
    [effectiveLayoutMap, getHapLevel, getFallbackPosition, applicationElement]
  );

  // Initialize HAP system for the application
  useEffect(() => {
    if (applicationElement && enableEdgeBundling) {
      hapSystemManager.clearHAPSystem(applicationElement.id);

      hapSystemManager.buildApplicationHAPTree(
        applicationElement.id,
        applicationElement,
        getChildren,
        getCorrectedPosition,
        getHapLevel,
        leafPackagesOnly
      );
    }
  }, [
    applicationElement?.id,
    enableEdgeBundling,
    getChildren,
    getCorrectedPosition,
    getHapLevel,
    leafPackagesOnly,
  ]);

  const hapNodes = useMemo(() => {
    if (!hapSystem) return null;

    const originHAP = hapSystemManager.getHAPNode(
      communicationModel.sourceClass?.id
    );
    const destinationHAP = hapSystemManager.getHAPNode(
      communicationModel.targetClass?.id
    );

    if (!originHAP || !destinationHAP) {
      // Debug: Log missing HAP nodes for troubleshooting
      if (use3DHAPAlgorithm && enableEdgeBundling) {
        console.warn(
          `[HAP] Missing HAP nodes for communication ${communicationModel.id}:`,
          {
            sourceClass: communicationModel.sourceClass?.id,
            targetClass: communicationModel.targetClass?.id,
            originHAP: !!originHAP,
            destinationHAP: !!destinationHAP,
            isInterApp: isInterAppCommunication,
            hapSystemType: isInterAppCommunication
              ? 'LANDSCAPE'
              : applicationElement?.id,
          }
        );
      }
      return null;
    }

    return { originHAP, destinationHAP };
  }, [
    hapSystem,
    communicationModel.sourceClass?.id,
    communicationModel.targetClass?.id,
    use3DHAPAlgorithm,
    enableEdgeBundling,
    isInterAppCommunication,
    applicationElement?.id,
    communicationModel.id,
  ]);

  const computedCurveHeight = useMemo(() => {
    let baseCurveHeight = 50;
    if (communicationLayout && commCurveHeightDependsOnDistance) {
      const classDistance = Math.hypot(
        communicationLayout.endX - communicationLayout.startX,
        communicationLayout.endZ - communicationLayout.startZ
      );
      baseCurveHeight = classDistance * 0.1;
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
  }, [
    communicationLayout,
    commCurveHeightDependsOnDistance,
    enableEdgeBundling,
    use3DHAPAlgorithm,
    hapNodes,
    curveHeight,
  ]);

  const lastValuesRef = useRef({
    beta: 0.8,
    use3DHAPAlgorithm: false,
    enableEdgeBundling: false,
    layoutHash: '',
    hapNodesHash: '',
    scatterRadius: 0.5,
    edgeBundlingStreamline: true,
    leafPackagesOnly: false,
    curveHeight: 0,
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

    // Only enable 3D-HAP if we have valid HAP nodes
    meshRef.current.use3DHAPAlgorithm = use3DHAPAlgorithm && !!hapNodes;

    if (enableEdgeBundling && use3DHAPAlgorithm && hapNodes) {
      const systemId = isInterAppCommunication
        ? 'LANDSCAPE'
        : applicationElement?.id || 'default';
      const hapSystem = hapSystemManager.getHAPSystem(systemId);
      if (hapSystem) {
        meshRef.current.initializeHAPSystem(
          hapSystem,
          hapNodes.originHAP,
          hapNodes.destinationHAP
        );
      }
    } else if (meshRef.current.use3DHAPAlgorithm === false) {
      // Clear HAP system if disabled or nodes not found
      meshRef.current.clearHAPSystem();
    }

    // Force re-render
    if (meshRef.current.render) meshRef.current.render();
  }, [
    use3DHAPAlgorithm,
    enableEdgeBundling,
    hapNodes,
    isInterAppCommunication,
  ]);

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

    // Recalculate line thickness based on current commThickness setting
    const updatedLineThickness = calculateLineThickness(
      communicationModel,
      commThickness
    );

    if (!enableEdgeBundling) {
      // Edge-Bundling off -> Original layout
      if (communicationLayout instanceof BundledCommunicationLayout) {
        const normalLayout = new CommunicationLayout(communicationModel);
        normalLayout.startPoint = communicationLayout.startPoint;
        normalLayout.endPoint = communicationLayout.endPoint;
        normalLayout.lineThickness = updatedLineThickness;
        return normalLayout;
      }
      // Always create a new copy to ensure new object reference
      const updatedLayout = communicationLayout.copy();
      updatedLayout.lineThickness = updatedLineThickness;
      return updatedLayout;
    }

    if (isInterAppCommunication && enableEdgeBundling) {
      const bundler = interAppBundlingService.getBundler();

      let bundledLayout: BundledCommunicationLayout;
      if (communicationLayout instanceof BundledCommunicationLayout) {
        bundledLayout = communicationLayout.copy();
        bundledLayout.lineThickness = updatedLineThickness;
      } else {
        bundledLayout = new BundledCommunicationLayout(
          communicationModel,
          startPoint,
          endPoint,
          updatedLineThickness,
          edgeBundlingConfig
        );
      }

      // Hole control points of force bundler
      if (interAppBundler) {
        const controlPoints = interAppBundler.getEdgeControlPoints(
          communicationModel.id
        );

        if (controlPoints && controlPoints.length > 0) {
          bundledLayout.updateControlPoints(controlPoints);
        } else {
          // Fallback for new edges
          const midPoint = new THREE.Vector3()
            .addVectors(startPoint, endPoint)
            .multiplyScalar(0.5);
          midPoint.y += startPoint.distanceTo(endPoint) * 0.15;

          bundledLayout.updateControlPoints([midPoint]);
        }
      }
      const controlPoints = bundler.getEdgeControlPoints(communicationModel.id);

      if (controlPoints && controlPoints.length > 0) {
        bundledLayout.updateControlPoints(controlPoints);
      } else {
        // Fallback for new edges
        const midPoint = new THREE.Vector3()
          .addVectors(startPoint, endPoint)
          .multiplyScalar(0.5);
        midPoint.y += startPoint.distanceTo(endPoint) * 0.15;
        bundledLayout.updateControlPoints([midPoint]);
      }

      return bundledLayout;
    }

    let bundledLayout: BundledCommunicationLayout;

    if (communicationLayout instanceof BundledCommunicationLayout) {
      // Always create a new copy to ensure new object reference
      bundledLayout = communicationLayout.copy();
      bundledLayout.lineThickness = updatedLineThickness;
    } else {
      bundledLayout = new BundledCommunicationLayout(
        communicationModel,
        startPoint,
        endPoint,
        updatedLineThickness,
        edgeBundlingConfig
      );
    }

    if (use3DHAPAlgorithm && hapNodes && !isInterAppCommunication) {
      const systemId = applicationElement?.id || 'default';
      const hapSystem = hapSystemManager.getHAPSystem(systemId);
      if (hapSystem) {
        bundledLayout.setHAPNodes(hapNodes.originHAP, hapNodes.destinationHAP);
        bundledLayout.setBeta(beta);
        bundledLayout.setScatterRadius(scatterRadius);
        bundledLayout.setStreamline(edgeBundlingStreamline);
        bundledLayout.setLeafPackagesOnly(leafPackagesOnly);
      }
    }

    return bundledLayout;
  }, [
    communicationLayout,
    communicationModel,
    commThickness,
    edgeBundlingConfig,
    enableEdgeBundling,
    use3DHAPAlgorithm,
    hapNodes,
    beta,
    applicationElement,
    scatterRadius,
    edgeBundlingStreamline,
    leafPackagesOnly,
    hapNodes,
    forceUpdate,
    updateTrigger,
    isInterAppCommunication,
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
      scatterRadius,
      edgeBundlingStreamline,
      leafPackagesOnly,
      curveHeight,
    };

    const lastValues = lastValuesRef.current;

    const hasChanged =
      Math.abs(currentValues.beta - lastValues.beta) > 0.001 ||
      Math.abs(currentValues.scatterRadius - lastValues.scatterRadius) >
        0.001 ||
      Math.abs(currentValues.curveHeight - lastValues.curveHeight) > 0.001 ||
      currentValues.use3DHAPAlgorithm !== lastValues.use3DHAPAlgorithm ||
      currentValues.enableEdgeBundling !== lastValues.enableEdgeBundling ||
      currentValues.layoutHash !== lastValues.layoutHash ||
      currentValues.edgeBundlingStreamline !==
        lastValues.edgeBundlingStreamline ||
      currentValues.leafPackagesOnly !== lastValues.leafPackagesOnly ||
      currentValues.hapNodesHash !== lastValues.hapNodesHash;

    if (!hasChanged) {
      return;
    }

    // Only do necessary updates
    meshRef.current.layout = finalLayout as any;
    meshRef.current.enableEdgeBundling = enableEdgeBundling;
    meshRef.current.use3DHAPAlgorithm = use3DHAPAlgorithm;
    meshRef.current.beta = beta;
    meshRef.current.scatterRadius = scatterRadius;
    meshRef.current.leafPackagesOnly = leafPackagesOnly;
    meshRef.current.curveHeight = curveHeight;

    if (enableEdgeBundling && use3DHAPAlgorithm && hapNodes && hapSystem) {
      meshRef.current.initializeHAPSystem(
        hapSystem,
        hapNodes.originHAP,
        hapNodes.destinationHAP,
        edgeBundlingStreamline
      );
    }
    ClazzCommunicationMesh.clearSharedGeometries();
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
    scatterRadius,
    edgeBundlingStreamline,
    leafPackagesOnly,
    computedCurveHeight,
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
          getHapLevel
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
    meshRef.current.curveHeight = computedCurveHeight;
    meshRef.current.scatterRadius = scatterRadius;
    meshRef.current.streamline = edgeBundlingStreamline;
    meshRef.current.leafPackagesOnly = leafPackagesOnly;

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
    computedCurveHeight,
    scatterRadius,
  ]);

  // Initialize HAP system on the mesh when it's created
  useEffect(() => {
    if (
      meshRef.current &&
      enableEdgeBundling &&
      use3DHAPAlgorithm &&
      hapNodes
    ) {
      const systemId = isInterAppCommunication
        ? 'LANDSCAPE'
        : applicationElement?.id || 'default';
      const hapSystem = hapSystemManager.getHAPSystem(systemId);
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

  useEffect(() => {
    // Only visualize application-level HAP trees for intra-app communications
    // Landscape-level HAP tree is visualized by LandscapeHAPVisualizer for inter-app communications
    if (!applicationElement?.id || !showHAPTree || isInterAppCommunication) {
      // Clean up application-specific HAP visualization if disabled
      if (applicationElement?.id && !showHAPTree) {
        const landscapeGroup = scene.children.find(
          (child) => child.type === 'Group' && child.scale.x < 1
        );
        if (landscapeGroup) {
          const groupName = `HAP_GROUP_${applicationElement.id}`;
          const hapGroup = landscapeGroup.children.find(
            (child: any) => child.name === groupName
          ) as THREE.Group;

          if (hapGroup) {
            landscapeGroup.remove(hapGroup);
            // Dispose of HAP group children
            for (let i = hapGroup.children.length - 1; i >= 0; i--) {
              const child = hapGroup.children[i];
              if (child instanceof THREE.Line && child.geometry) {
                child.geometry.dispose();
              } else if (child instanceof THREE.InstancedMesh) {
                child.dispose();
              }
            }
          }
        }
      }
      return;
    }

    // Visualize application-level HAP tree for intra-app communications
    hapSystemManager.visualizeHAPs(
      applicationElement.id,
      scene,
      effectiveLayoutMap || undefined
    );
  }, [
    applicationElement?.id,
    scene,
    showHAPTree,
    isInterAppCommunication,
    effectiveLayoutMap,
  ]);

  useEffect(() => {
    if (!enableEdgeBundling || !use3DHAPAlgorithm) return;

    const newStreamlineHash = `${edgeBundlingStreamline}_${beta}_${scatterRadius}`;

    if (newStreamlineHash !== streamlineHash) {
      if (meshRef.current) {
        if (meshRef.current.geometry) {
          meshRef.current.releaseSharedGeometry(meshRef.current.geometry);
        }
        meshRef.current.streamline = edgeBundlingStreamline;
        meshRef.current._needsRender = true;
        meshRef.current.requestRender();
      }

      setStreamlineHash(newStreamlineHash);
    }
  }, [
    edgeBundlingStreamline,
    beta,
    scatterRadius,
    enableEdgeBundling,
    use3DHAPAlgorithm,
  ]);

  useEffect(() => {
    const handleRebuildHAPTree = (event: CustomEvent) => {
      const { leafPackagesOnly } = event.detail;

      if (applicationElement && enableEdgeBundling) {
        hapSystemManager.rebuildHAPTreeWithLeafSetting(
          applicationElement.id,
          applicationElement,
          (element: any) => {
            if (isPackage(element))
              return [...element.subPackages, ...element.classes];
            if (isApplication(element)) return element.packages;
            return [];
          },
          getPosition,
          getHapLevel,
          leafPackagesOnly
        );

        // Only visualize application HAP tree if it's not an inter-app communication
        if (showHAPTree && !isInterAppCommunication) {
          hapSystemManager.visualizeHAPs(
            applicationElement.id,
            scene,
            effectiveLayoutMap || undefined
          );
        }

        ClazzCommunicationMesh.clearSharedGeometries();
      }
    };

    window.addEventListener(
      'rebuildHAPTree',
      handleRebuildHAPTree as EventListener
    );

    return () => {
      window.removeEventListener(
        'rebuildHAPTree',
        handleRebuildHAPTree as EventListener
      );
    };
  }, [
    applicationElement?.id,
    enableEdgeBundling,
    showHAPTree,
    scene,
    isInterAppCommunication,
  ]);

  useEffect(() => {
    // Only build application-level HAP trees for intra-app communications
    // Inter-app communications use the landscape HAP system
    if (enableEdgeBundling && applicationElement && !isInterAppCommunication) {
      ClazzCommunicationMesh.clearSharedGeometries();

      hapSystemManager.clearHAPSystem(applicationElement.id);

      const getChildrenLocal = (element: any): any[] => {
        if (isPackage(element))
          return [...element.subPackages, ...element.classes];
        if (isApplication(element)) return element.packages;
        return [];
      };

      hapSystemManager.buildApplicationHAPTree(
        applicationElement.id,
        applicationElement,
        getChildrenLocal,
        getPosition,
        getHapLevel,
        leafPackagesOnly
      );
    }
  }, [
    enableEdgeBundling,
    applicationElement?.id,
    leafPackagesOnly,
    getPosition,
    getHapLevel,
    isInterAppCommunication,
  ]);

  useEffect(() => {
    if (meshRef.current && hapNodes && hapSystem) {
      meshRef.current.initializeHAPSystem(
        hapSystem,
        hapNodes.originHAP,
        hapNodes.destinationHAP,
        edgeBundlingStreamline
      );

      // Force 3D-HAP algorithm
      meshRef.current.use3DHAPAlgorithm = true;
      meshRef.current.enableEdgeBundling = true;
    }
  }, [hapNodes, hapSystem, edgeBundlingStreamline]);
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

  // Skip rendering recursive communications when edge bundling is active
  if (
    enableEdgeBundling &&
    communicationLayout?.startPoint.equals(communicationLayout.endPoint)
  ) {
    return null;
  }

  return (
    <clazzCommunicationMesh
      layers={sceneLayers.Communication}
      key={`${enableEdgeBundling}-${use3DHAPAlgorithm}`}
      {...pointerStopHandlers}
      {...(enableHoverEffects && {
        onPointerOver: handleOnPointerOver,
        onPointerOut: handleOnPointerOut,
      })}
      onClick={handleClickWithPrevent}
      onDoubleClick={handleDoubleClickWithPrevent}
      name={
        'Communication between ' +
        communicationModel.sourceClass.name +
        ' and ' +
        communicationModel.targetClass.name
      }
      args={constructorArgs}
      arrowColor={new THREE.Color(arrowColor)}
      arrowOffset={arrowOffset}
      layout={finalLayout}
      arrowWidth={arrowWidth}
      curveHeight={computedCurveHeight}
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
      scatterRadius={scatterRadius}
    ></clazzCommunicationMesh>
  );
}
