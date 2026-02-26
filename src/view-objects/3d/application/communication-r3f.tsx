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
import globalBundlingService from './global-bundling-service';

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
    edgeBundlingAlgorithm,
    classLayoutAlgorithm,
    enableEdgeColoring,

    // 3D-HAP specific settings
    showHAPTree,
    beta,
    commCurveHeightDependsOnDistance,
    scatterRadius,
    edgeBundlingStreamline,
    leafPackagesOnly,
    hapClassElevation,
    hapPackageElevation,
    hapApplicationElevation,
    hapUseRelativeElevation,
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

        classLayoutAlgorithm:
          state.visualizationSettings.classLayoutAlgorithm.value,
        enableEdgeColoring: vizSettings.enableEdgeColoring?.value ?? true,

        // 3D-HAP settings with safe fallbacks
        beta: vizSettings.beta?.value ?? 0.8,
        commCurveHeightDependsOnDistance:
          vizSettings.commCurveHeightDependsOnDistance?.value ?? true,
        showHAPTree: vizSettings.showHAPTree?.value ?? false,
        scatterRadius: state.visualizationSettings.scatterRadius?.value ?? 0.5,
        edgeBundlingStreamline:
          vizSettings.edgeBundlingStreamline?.value ?? true,
        leafPackagesOnly: vizSettings.leafPackagesOnly?.value ?? false,
        hapClassElevation: vizSettings.hapClassElevation?.value ?? 15,
        hapPackageElevation: vizSettings.hapPackageElevation?.value ?? 30,
        hapApplicationElevation:
          vizSettings.hapApplicationElevation?.value ?? 50,
        hapUseRelativeElevation:
          vizSettings.hapUseRelativeElevation?.value ?? true,
        edgeBundlingAlgorithm: vizSettings.edgeBundlingAlgorithm.value,
      };
    })
  );

  const isEdgeBundlingNone = edgeBundlingAlgorithm === 'None';
  const is3DHAPAlgorithm = edgeBundlingAlgorithm === '3D-HAP';
  const isForceDirectedAlgorithm = edgeBundlingAlgorithm === 'Force-directed';
  const enableEdgeBundling = !isEdgeBundlingNone;
  const use3DHAPAlgorithm = is3DHAPAlgorithm;

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

      // Elevation based of settings
      let elevation = 0;
      switch (level) {
        case 0: // Class
          elevation = hapClassElevation;
          break;
        case 1: // Package
          elevation = hapPackageElevation;
          break;
        case 2: // Application
          elevation = hapApplicationElevation;
          break;
      }

      // Option: Relative vs Absolute Elevation
      const baseY = hapUseRelativeElevation ? layout.position.y : 0;

      if (isApplication(element)) {
        return new THREE.Vector3(
          layout.position.x + layout.width / 2,
          baseY + elevation,
          layout.position.z + layout.depth / 2
        );
      }

      const buildingCenter = layout.center.clone();
      return new THREE.Vector3(
        buildingCenter.x,
        buildingCenter.y + elevation,
        buildingCenter.z
      );
    },
    [
      getHapLevel,
      hapClassElevation,
      hapPackageElevation,
      hapApplicationElevation,
      hapUseRelativeElevation,
    ]
  );

  // Detect if this is an inter-app communication
  const isInterAppCommunication =
    communicationModel.sourceApp.id !== communicationModel.targetApp.id;

  const [updateTrigger, setUpdateTrigger] = useState(0);

  const shouldUsePackageCentroids = useMemo(() => {
    return (
      use3DHAPAlgorithm && enableEdgeBundling && classLayoutAlgorithm !== 'None'
    );
  }, [classLayoutAlgorithm, use3DHAPAlgorithm, enableEdgeBundling]);

  // Memoize helper functions to prevent recreating on each render
  const getChildren = useCallback((element: any): any[] => {
    if (isPackage(element)) return [...element.subPackages, ...element.classes];
    if (isApplication(element)) return element.packages;
    return [];
  }, []);

  const packageCentroidsCache = useRef<Map<string, THREE.Vector3>>(new Map());

  const getPosition = useCallback(
    (element: any): THREE.Vector3 => {
      if (!element || typeof element !== 'object') {
        return new THREE.Vector3(0, 0, 0);
      }

      const currentLayoutAlgorithm = classLayoutAlgorithm;

      // 1. APPLICATION
      if (isApplication(element)) {
        if (!effectiveLayoutMap?.has(element.id)) {
          return new THREE.Vector3(0, hapApplicationElevation, 0);
        }
        const layout = effectiveLayoutMap.get(element.id)!;
        return getExactHAPPosition(element, layout);
      }

      // 2. PACKAGE
      if (isPackage(element)) {
        // CIRCLE LAYOUT: Package Centroids
        if (currentLayoutAlgorithm === 'circle') {
          if (packageCentroidsCache.current.has(element.id)) {
            return packageCentroidsCache.current.get(element.id)!.clone();
          }

          const children = getChildren(element);
          const allClasses: any[] = [];

          const collectClasses = (el: any) => {
            if (isClass(el)) allClasses.push(el);
            else if (isPackage(el)) getChildren(el).forEach(collectClasses);
          };

          children.forEach(collectClasses);

          if (allClasses.length > 0) {
            let total = new THREE.Vector3(0, 0, 0);
            let count = 0;

            allClasses.forEach((cls) => {
              if (effectiveLayoutMap?.has(cls.id)) {
                const layout = effectiveLayoutMap.get(cls.id)!;
                const pos = getExactHAPPosition(cls, layout);
                total.add(pos);
                count++;
              }
            });

            if (count > 0) {
              const centroid = total.divideScalar(count);
              centroid.y = hapPackageElevation;

              packageCentroidsCache.current.set(element.id, centroid.clone());

              return centroid;
            }
          }
          // Fallback
          return new THREE.Vector3(
            (Math.random() - 0.5) * 100,
            hapPackageElevation,
            (Math.random() - 0.5) * 100
          );
        }

        if (effectiveLayoutMap?.has(element.id)) {
          const layout = effectiveLayoutMap.get(element.id)!;
          return getExactHAPPosition(element, layout);
        }

        // Fallback
        return new THREE.Vector3(0, hapPackageElevation, 0);
      }

      // 3. CLASS
      if (isClass(element)) {
        if (!effectiveLayoutMap?.has(element.id)) {
          return new THREE.Vector3(0, hapClassElevation, 0);
        }
        const layout = effectiveLayoutMap.get(element.id)!;
        return getExactHAPPosition(element, layout);
      }

      return new THREE.Vector3(0, 0, 0);
    },
    [
      effectiveLayoutMap,
      getExactHAPPosition,
      getChildren,
      classLayoutAlgorithm,
      hapClassElevation,
      hapPackageElevation,
      hapApplicationElevation,
    ]
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

  // Subscribe for updates
  const [forceUpdate, setForceUpdate] = useState(0);

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

  useEffect(() => {
    if (use3DHAPAlgorithm && classLayoutAlgorithm) {
      packageCentroidsCache.current.clear();
      ClazzCommunicationMesh.clearSharedGeometries();

      if (meshRef.current) {
        meshRef.current.clearHAPSystem();
        meshRef.current.geometry = new THREE.BufferGeometry();
        meshRef.current._needsRender = true;
        meshRef.current.requestRender();
      }

      const timer = setTimeout(() => {
        setForceUpdate((prev) => prev + 1);
      }, 200);

      return () => clearTimeout(timer);
    }
  }, [classLayoutAlgorithm, use3DHAPAlgorithm]);

  const getCorrectedPosition = useCallback(
    (element: any): THREE.Vector3 => {
      const isCircleLayout = classLayoutAlgorithm === 'circle';

      if (effectiveLayoutMap && effectiveLayoutMap.has(element.id)) {
        const layout = effectiveLayoutMap.get(element.id)!;
        const hapLevel = getHapLevel(element);

        const elevationY = hapLevel * 15;

        if (isApplication(element)) {
          return new THREE.Vector3(
            layout.position.x + layout.width / 2,
            layout.position.y + elevationY,
            layout.position.z + layout.depth / 2
          );
        }

        if (isCircleLayout && isPackage(element)) {
          if (element.parent && effectiveLayoutMap.has(element.parent.id)) {
            const parentLayout = effectiveLayoutMap.get(element.parent.id)!;
            const parentPosition = parentLayout.position.clone();

            return new THREE.Vector3(
              parentPosition.x,
              parentPosition.y + elevationY,
              parentPosition.z
            );
          }
        }

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
        return getExactHAPPosition(element, layout);
      }

      return getFallbackPosition(element);
    },
    [
      effectiveLayoutMap,
      getHapLevel,
      getFallbackPosition,
      applicationElement,
      classLayoutAlgorithm,
      getExactHAPPosition,
    ]
  );

  const hapNodes = useMemo(() => {
    if (!hapSystem) return null;

    const originHAP = hapSystemManager.getHAPNode(
      communicationModel.sourceClass?.id
    );
    const destinationHAP = hapSystemManager.getHAPNode(
      communicationModel.targetClass?.id
    );

    if (!originHAP || !destinationHAP) {
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
    classLayoutAlgorithm,
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

  const calculatePackageCentroids = useCallback(() => {
    if (!shouldUsePackageCentroids || !applicationElement) {
      packageCentroidsCache.current.clear();

      return;
    }

    const newCache = new Map<string, THREE.Vector3>();

    const calculateForPackage = (pkg: any): THREE.Vector3 => {
      if (newCache.has(pkg.id)) {
        return newCache.get(pkg.id)!.clone();
      }

      const children = getChildren(pkg);
      let totalX = 0;
      let totalY = 0;
      let totalZ = 0;
      let validCount = 0;

      const directClasses = children.filter(isClass);
      directClasses.forEach((cls) => {
        if (effectiveLayoutMap?.has(cls.id)) {
          const layout = effectiveLayoutMap.get(cls.id)!;
          const pos = getExactHAPPosition(cls, layout);
          totalX += pos.x;
          totalY += pos.y;
          totalZ += pos.z;
          validCount++;
        }
      });

      const subPackages = children.filter(isPackage);
      subPackages.forEach((subPkg) => {
        const subPos = calculateForPackage(subPkg);
        if (subPos.lengthSq() > 0) {
          totalX += subPos.x;
          totalY += subPos.y;
          totalZ += subPos.z;
          validCount++;
        }
      });

      let centroid: THREE.Vector3;
      if (validCount > 0) {
        centroid = new THREE.Vector3(
          totalX / validCount,
          totalY / validCount + 25,
          totalZ / validCount
        );
      } else {
        const hash = (pkg.name || pkg.id)
          .split('')
          .reduce((acc: number, char: string) => {
            return char.charCodeAt(0) + ((acc << 5) - acc);
          }, 0);

        const angle = (hash % 360) * (Math.PI / 180);
        const radius = 50 + (hash % 30);
        centroid = new THREE.Vector3(
          Math.cos(angle) * radius,
          40,
          Math.sin(angle) * radius
        );
      }

      newCache.set(pkg.id, centroid.clone());
      return centroid;
    };

    const appPackages = getChildren(applicationElement).filter(isPackage);
    appPackages.forEach((pkg) => calculateForPackage(pkg));

    packageCentroidsCache.current = newCache;
  }, [
    applicationElement,
    shouldUsePackageCentroids,
    classLayoutAlgorithm,
    effectiveLayoutMap,
    getChildren,
    getExactHAPPosition,
  ]);

  useEffect(() => {
    calculatePackageCentroids();
  }, [calculatePackageCentroids]);

  useEffect(() => {
    if (!applicationElement) return;

    if (shouldUsePackageCentroids) {
      calculatePackageCentroids();
    } else {
      packageCentroidsCache.current.clear();
    }
  }, [
    classLayoutAlgorithm,
    shouldUsePackageCentroids,
    applicationElement,
    calculatePackageCentroids,
  ]);

  useEffect(() => {
    if (applicationElement && enableEdgeBundling && use3DHAPAlgorithm) {
      const isCircle = classLayoutAlgorithm === 'circle';
      packageCentroidsCache.current.clear();
      hapSystemManager.clearHAPSystem(applicationElement.id);
      const getPackageCentroid = isCircle
        ? (pkg: any): THREE.Vector3 => {
            if (packageCentroidsCache.current.has(pkg.id)) {
              return packageCentroidsCache.current.get(pkg.id)!.clone();
            }
            const children = getChildren(pkg);
            const allClasses: any[] = [];

            const collectClasses = (el: any) => {
              if (isClass(el)) allClasses.push(el);
              else if (isPackage(el)) getChildren(el).forEach(collectClasses);
            };

            children.forEach(collectClasses);

            if (allClasses.length > 0) {
              let total = new THREE.Vector3(0, 0, 0);
              let count = 0;

              allClasses.forEach((cls) => {
                if (effectiveLayoutMap?.has(cls.id)) {
                  const layout = effectiveLayoutMap.get(cls.id)!;
                  const pos = getExactHAPPosition(cls, layout);
                  total.add(pos);
                  count++;
                }
              });

              if (count > 0) {
                const centroid = total.divideScalar(count);
                centroid.y += 25;
                return centroid;
              }
            }

            return new THREE.Vector3(0, 40, 0);
          }
        : undefined;

      hapSystemManager.buildApplicationHAPTree(
        applicationElement.id,
        applicationElement,
        getChildren,
        getCorrectedPosition,
        getHapLevel,
        leafPackagesOnly,
        isCircle,
        getPackageCentroid
      );
      ClazzCommunicationMesh.clearSharedGeometries();
    }
  }, [
    applicationElement?.id,
    enableEdgeBundling,
    use3DHAPAlgorithm,
    getChildren,
    getCorrectedPosition,
    getHapLevel,
    leafPackagesOnly,
    classLayoutAlgorithm,
    packageCentroidsCache,
    effectiveLayoutMap,
    getExactHAPPosition,
  ]);

  useEffect(() => {
    const handleLayoutChange = (event: CustomEvent) => {
      const { layoutAlgorithm } = event.detail;

      if (applicationElement?.id) {
        hapSystemManager.clearHAPSystem(applicationElement.id);
      }

      packageCentroidsCache.current.clear();

      if (meshRef.current) {
        meshRef.current.clearHAPSystem();
      }

      setForceUpdate((prev) => prev + 1);

      ClazzCommunicationMesh.clearSharedGeometries();
    };

    window.addEventListener(
      'hapLayoutChanged',
      handleLayoutChange as EventListener
    );

    return () => {
      window.removeEventListener(
        'hapLayoutChanged',
        handleLayoutChange as EventListener
      );
    };
  }, [applicationElement?.id]);

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

    const updatedLineThickness = calculateLineThickness(
      communicationModel,
      commThickness
    );

    if (isEdgeBundlingNone) {
      if (communicationLayout instanceof BundledCommunicationLayout) {
        const normalLayout = new CommunicationLayout(communicationModel);
        normalLayout.startPoint = communicationLayout.startPoint;
        normalLayout.endPoint = communicationLayout.endPoint;
        normalLayout.lineThickness = updatedLineThickness;
        return normalLayout;
      }
      const updatedLayout = communicationLayout.copy();
      updatedLayout.lineThickness = updatedLineThickness;
      return updatedLayout;
    }
    const isInterApp =
      communicationModel.sourceApp.id !== communicationModel.targetApp.id;

    const shouldUse3DHAPForThisEdge = is3DHAPAlgorithm && !isInterApp;
    let shouldUseForceDirectedForThisEdge =
      isForceDirectedAlgorithm || (is3DHAPAlgorithm && isInterApp);

    let bundledLayout: BundledCommunicationLayout;

    if (communicationLayout instanceof BundledCommunicationLayout) {
      bundledLayout = communicationLayout.copy();
      bundledLayout.lineThickness = updatedLineThickness;
    } else {
      bundledLayout = new BundledCommunicationLayout(
        communicationModel,
        startPoint,
        endPoint,
        updatedLineThickness
      );
    }

    if (shouldUse3DHAPForThisEdge) {
      if (hapNodes) {
        const systemId = applicationElement?.id || 'default';
        const hapSystem = hapSystemManager.getHAPSystem(systemId);

        if (hapSystem) {
          const currentOriginHAP = hapSystemManager.getHAPNode(
            communicationModel.sourceClass?.id
          );
          const currentDestinationHAP = hapSystemManager.getHAPNode(
            communicationModel.targetClass?.id
          );

          if (currentOriginHAP && currentDestinationHAP) {
            bundledLayout.setHAPNodes(currentOriginHAP, currentDestinationHAP);
            bundledLayout.setBeta(beta);
            bundledLayout.setScatterRadius(scatterRadius);
            bundledLayout.setStreamline(edgeBundlingStreamline);
            bundledLayout.setLeafPackagesOnly(leafPackagesOnly);
            bundledLayout.setUseForceDirected(false);
          } else {
            // Fallback
            shouldUseForceDirectedForThisEdge = true;
          }
        }
      } else {
        // Fallback
        shouldUseForceDirectedForThisEdge = true;
      }
    }

    if (shouldUseForceDirectedForThisEdge) {
      bundledLayout.setUseForceDirected(true);

      const isCircleLayout = classLayoutAlgorithm === 'circle';
      const type = isInterApp ? 'inter-app' : 'intra-app';

      globalBundlingService.addEdge(
        communicationModel.id,
        startPoint,
        endPoint,
        {
          type,
          app1Id: communicationModel.sourceApp.id,
          app2Id: communicationModel.targetApp.id,
          sourceId: communicationModel.sourceClass?.id,
          targetId: communicationModel.targetClass?.id,
          use3DHAP: false,
          isCircleLayout: isCircleLayout,
        }
      );

      const controlPoints = globalBundlingService
        .getBundler()
        .getEdgeControlPoints(communicationModel.id);

      if (controlPoints && controlPoints.length > 0) {
        bundledLayout.updateControlPoints(controlPoints);
      } else {
        const midPoint = new THREE.Vector3()
          .addVectors(startPoint, endPoint)
          .multiplyScalar(0.5);
        midPoint.y += startPoint.distanceTo(endPoint) * 0.15;
        bundledLayout.updateControlPoints([midPoint]);
      }
    }

    return bundledLayout;
  }, [
    communicationLayout,
    communicationModel,
    commThickness,
    isEdgeBundlingNone,
    is3DHAPAlgorithm,
    isForceDirectedAlgorithm,
    hapNodes,
    beta,
    scatterRadius,
    edgeBundlingStreamline,
    leafPackagesOnly,
    forceUpdate,
    classLayoutAlgorithm,
    applicationElement?.id,
    globalBundlingService,
  ]);

  const bundlingStartedRef = useRef(false);

  useEffect(() => {
    if (!isForceDirectedAlgorithm) {
      bundlingStartedRef.current = false;
      globalBundlingService.stopCalculation();
      return;
    }

    if (bundlingStartedRef.current) return;

    if (globalBundlingService.edgeCount() === 0) {
      requestAnimationFrame(() => {
        if (isForceDirectedAlgorithm) {
          globalBundlingService.startCalculation();
        }
      });
      return;
    }

    bundlingStartedRef.current = true;
    globalBundlingService.startCalculation();
  }, [isForceDirectedAlgorithm]);

  useEffect(() => {
    if (!enableEdgeBundling) return;

    const unsubscribe = globalBundlingService.subscribe(() => {
      setForceUpdate((prev) => prev + 1);
    });

    return unsubscribe;
  }, [enableEdgeBundling]);

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

  const lastElevationRef = useRef({
    class: hapClassElevation,
    package: hapPackageElevation,
    app: hapApplicationElevation,
    relative: hapUseRelativeElevation,
  });

  useEffect(() => {
    const currentSettings = {
      class: hapClassElevation,
      package: hapPackageElevation,
      app: hapApplicationElevation,
      relative: hapUseRelativeElevation,
    };

    const lastSettings = lastElevationRef.current;

    const hasChanged =
      Math.abs(currentSettings.class - lastSettings.class) > 0.1 ||
      Math.abs(currentSettings.package - lastSettings.package) > 0.1 ||
      Math.abs(currentSettings.app - lastSettings.app) > 0.1 ||
      currentSettings.relative !== lastSettings.relative;

    if (hasChanged && enableEdgeBundling && use3DHAPAlgorithm) {
      if (applicationElement?.id) {
        const isCircle = classLayoutAlgorithm === 'circle';

        packageCentroidsCache.current.clear();

        hapSystemManager.clearHAPSystem(applicationElement.id);

        const getPackageCentroid = isCircle
          ? (pkg: any): THREE.Vector3 => {
              if (packageCentroidsCache.current.has(pkg.id)) {
                return packageCentroidsCache.current.get(pkg.id)!.clone();
              }
              const children = getChildren(pkg);
              const allClasses: any[] = [];

              const collectClasses = (el: any) => {
                if (isClass(el)) allClasses.push(el);
                else if (isPackage(el)) getChildren(el).forEach(collectClasses);
              };

              children.forEach(collectClasses);

              if (allClasses.length > 0) {
                let total = new THREE.Vector3(0, 0, 0);
                let count = 0;

                allClasses.forEach((cls) => {
                  if (effectiveLayoutMap?.has(cls.id)) {
                    const layout = effectiveLayoutMap.get(cls.id)!;
                    const pos = getExactHAPPosition(cls, layout);
                    total.add(pos);
                    count++;
                  }
                });

                if (count > 0) {
                  const centroid = total.divideScalar(count);
                  centroid.y += 25;
                  return centroid;
                }
              }

              return new THREE.Vector3(0, 40, 0);
            }
          : undefined;

        hapSystemManager.buildApplicationHAPTree(
          applicationElement.id,
          applicationElement,
          getChildren,
          getCorrectedPosition,
          getHapLevel,
          leafPackagesOnly,
          isCircle,
          getPackageCentroid
        );
      }

      ClazzCommunicationMesh.clearSharedGeometries();

      setForceUpdate((prev) => prev + 1);

      lastElevationRef.current = currentSettings;
    }
  }, [
    hapClassElevation,
    hapPackageElevation,
    hapApplicationElevation,
    hapUseRelativeElevation,
    enableEdgeBundling,
    use3DHAPAlgorithm,
    applicationElement?.id,
    classLayoutAlgorithm,
  ]);

  useEffect(() => {
    if (!meshRef.current) return;

    meshRef.current.setHAPElevationSettings?.({
      class: hapClassElevation,
      package: hapPackageElevation,
      application: hapApplicationElevation,
      useRelative: hapUseRelativeElevation,
    });
  }, [
    hapClassElevation,
    hapPackageElevation,
    hapApplicationElevation,
    hapUseRelativeElevation,
    meshRef.current,
  ]);
  useEffect(() => {
    if (!applicationElement?.id || !enableEdgeBundling || !use3DHAPAlgorithm) {
      return;
    }

    const getPackageCentroid = shouldUsePackageCentroids
      ? (pkg: any): THREE.Vector3 => {
          if (packageCentroidsCache.current.has(pkg.id)) {
            return packageCentroidsCache.current.get(pkg.id)!.clone();
          }

          const children = getChildren(pkg);
          const allClasses: any[] = [];

          const collectClasses = (el: any) => {
            if (isClass(el)) allClasses.push(el);
            else if (isPackage(el)) getChildren(el).forEach(collectClasses);
          };

          children.forEach(collectClasses);

          if (allClasses.length > 0) {
            let total = new THREE.Vector3(0, 0, 0);
            let count = 0;

            allClasses.forEach((cls) => {
              if (effectiveLayoutMap?.has(cls.id)) {
                const layout = effectiveLayoutMap.get(cls.id)!;
                const pos = getExactHAPPosition(cls, layout);
                total.add(pos);
                count++;
              }
            });

            if (count > 0) {
              const centroid = total.divideScalar(count);
              centroid.y += 25;

              packageCentroidsCache.current.set(pkg.id, centroid.clone());
              return centroid;
            }
          }

          return new THREE.Vector3(0, 40, 0);
        }
      : undefined;

    const positionsUpdated = hapSystemManager.updateHAPTreeElevations(
      applicationElement.id,
      getPosition,
      getPackageCentroid
    );

    if (positionsUpdated) {
      const originHAP = hapSystemManager.getHAPNode(
        communicationModel.sourceClass?.id
      );
      const destinationHAP = hapSystemManager.getHAPNode(
        communicationModel.targetClass?.id
      );

      if (originHAP && destinationHAP) {
        if (meshRef.current) {
          const systemId = applicationElement.id;
          const hapSystem = hapSystemManager.getHAPSystem(systemId);

          if (hapSystem) {
            meshRef.current.clearHAPSystem();

            meshRef.current.initializeHAPSystem(
              hapSystem,
              originHAP,
              destinationHAP,
              edgeBundlingStreamline
            );

            meshRef.current.beta = beta;
            meshRef.current.scatterRadius = scatterRadius;
            meshRef.current.streamline = edgeBundlingStreamline;
            meshRef.current.leafPackagesOnly = leafPackagesOnly;
            meshRef.current.hapClassElevation = hapClassElevation;
            meshRef.current.hapPackageElevation = hapPackageElevation;
            meshRef.current.hapApplicationElevation = hapApplicationElevation;
            meshRef.current.hapUseRelativeElevation = hapUseRelativeElevation;

            meshRef.current._needsRender = true;
            meshRef.current.requestRender();
          }
        }

        setForceUpdate((prev) => {
          const newValue = prev + 1;

          return newValue;
        });
      }

      ClazzCommunicationMesh.clearSharedGeometries();

      if (showHAPTree && !isInterAppCommunication) {
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

        setTimeout(() => {
          hapSystemManager.visualizeHAPs(
            applicationElement.id,
            scene,
            effectiveLayoutMap || undefined
          );
        }, 50);
      }
    }
  }, [
    hapClassElevation,
    hapPackageElevation,
    hapApplicationElevation,
    hapUseRelativeElevation,
    classLayoutAlgorithm,
    getPosition,
    getExactHAPPosition,
    applicationElement?.id,
    enableEdgeBundling,
    use3DHAPAlgorithm,
    showHAPTree,
    scene,
    effectiveLayoutMap,
    isInterAppCommunication,
    beta,
    scatterRadius,
    edgeBundlingStreamline,
    leafPackagesOnly,
    calculatePackageCentroids,
    getChildren,
    shouldUsePackageCentroids,
  ]);

  useEffect(() => {
    const handleHAPTreeUpdated = (event: CustomEvent) => {
      const { applicationId, updateCount } = event.detail;

      if (applicationId !== applicationElement?.id) return;

      if (meshRef.current) {
        const originHAP = hapSystemManager.getHAPNode(
          communicationModel.sourceClass?.id
        );
        const destinationHAP = hapSystemManager.getHAPNode(
          communicationModel.targetClass?.id
        );

        if (originHAP && destinationHAP) {
          const hapSystem = hapSystemManager.getHAPSystem(applicationId);
          if (hapSystem) {
            meshRef.current.initializeHAPSystem(
              hapSystem,
              originHAP,
              destinationHAP,
              edgeBundlingStreamline
            );

            meshRef.current._needsRender = true;
            meshRef.current.requestRender();
          }
        }
      }

      setForceUpdate((prev) => prev + 1);

      ClazzCommunicationMesh.clearSharedGeometries();
    };

    const forceVisualizationUpdate = (event: CustomEvent) => {
      const { applicationId } = event.detail;

      if (applicationId !== applicationElement?.id) return;

      setForceUpdate((prev) => prev + 1);

      if (meshRef.current) {
        meshRef.current._needsRender = true;
        meshRef.current.requestRender();
      }
    };

    window.addEventListener(
      'hapTreeUpdated',
      handleHAPTreeUpdated as EventListener
    );
    window.addEventListener(
      'forceHAPVisualizationUpdate',
      forceVisualizationUpdate as EventListener
    );

    return () => {
      window.removeEventListener(
        'hapTreeUpdated',
        handleHAPTreeUpdated as EventListener
      );
      window.removeEventListener(
        'forceHAPVisualizationUpdate',
        forceVisualizationUpdate as EventListener
      );
    };
  }, [
    applicationElement?.id,
    communicationModel.sourceClass?.id,
    communicationModel.targetClass?.id,
    edgeBundlingStreamline,
  ]);

  useEffect(() => {
    const handleLayoutAlgorithmChange = (event: CustomEvent) => {
      const { layoutAlgorithm } = event.detail;

      packageCentroidsCache.current.clear();
      ClazzCommunicationMesh.clearSharedGeometries();
      ClazzCommunicationMesh.clearHoverCache();

      if (applicationElement?.id) {
        hapSystemManager.clearHAPSystem(applicationElement.id);

        const getPackageCentroid =
          layoutAlgorithm === 'circle'
            ? (pkg: any): THREE.Vector3 => {
                const children = getChildren(pkg);
                const allClasses: any[] = [];

                const collectClasses = (el: any) => {
                  if (isClass(el)) allClasses.push(el);
                  else if (isPackage(el))
                    getChildren(el).forEach(collectClasses);
                };

                children.forEach(collectClasses);

                if (allClasses.length > 0) {
                  let total = new THREE.Vector3(0, 0, 0);
                  let count = 0;

                  allClasses.forEach((cls) => {
                    if (effectiveLayoutMap?.has(cls.id)) {
                      const layout = effectiveLayoutMap.get(cls.id)!;
                      const pos = getExactHAPPosition(cls, layout);
                      total.add(pos);
                      count++;
                    }
                  });

                  if (count > 0) {
                    const centroid = total.divideScalar(count);
                    centroid.y += hapPackageElevation;
                    return centroid;
                  }
                }

                return new THREE.Vector3(0, hapPackageElevation, 0);
              }
            : undefined;

        hapSystemManager.buildApplicationHAPTree(
          applicationElement.id,
          applicationElement,
          getChildren,
          getPosition,
          getHapLevel,
          leafPackagesOnly,
          layoutAlgorithm === 'circle',
          getPackageCentroid
        );
      }

      if (meshRef.current) {
        meshRef.current.clearHAPSystem();
        meshRef.current.geometry = new THREE.BufferGeometry();
        meshRef.current._needsRender = true;
        meshRef.current.requestRender();
      }

      setForceUpdate((prev) => prev + 1);
    };

    window.addEventListener(
      'layoutAlgorithmChanged',
      handleLayoutAlgorithmChange as EventListener
    );

    return () => {
      window.removeEventListener(
        'layoutAlgorithmChanged',
        handleLayoutAlgorithmChange as EventListener
      );
    };
  }, [
    applicationElement?.id,
    getChildren,
    getPosition,
    getHapLevel,
    leafPackagesOnly,
    getExactHAPPosition,
    hapPackageElevation,
    effectiveLayoutMap,
  ]);

  useEffect(() => {
    if (!applicationElement || !enableEdgeBundling || !use3DHAPAlgorithm) {
      return;
    }

    calculatePackageCentroids();

    hapSystemManager.rebuildHAPSystemForLayoutChange(
      applicationElement.id,
      applicationElement,
      getChildren,
      getPosition,
      getHapLevel,
      classLayoutAlgorithm,
      leafPackagesOnly
    );

    if (meshRef.current) {
      meshRef.current.releaseSharedGeometry(meshRef.current.geometry);

      const originHAP = hapSystemManager.getHAPNode(
        communicationModel.sourceClass?.id
      );
      const destinationHAP = hapSystemManager.getHAPNode(
        communicationModel.targetClass?.id
      );

      if (originHAP && destinationHAP) {
        const hapSystem = hapSystemManager.getHAPSystem(applicationElement.id);
        if (hapSystem) {
          meshRef.current.initializeHAPSystem(
            hapSystem,
            originHAP,
            destinationHAP,
            edgeBundlingStreamline
          );
        }
      }

      meshRef.current._needsRender = true;
      meshRef.current.requestRender();
    }

    ClazzCommunicationMesh.clearSharedGeometries();

    setForceUpdate((prev) => prev + 1);
  }, [classLayoutAlgorithm]);

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

  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.enableEdgeColoring = enableEdgeColoring;

      // Force re-render
      meshRef.current._needsRender = true;
      meshRef.current.requestRender();
    }
  }, [enableEdgeColoring, meshRef.current]);

  useEffect(() => {
    if (meshRef.current) {
      // 1. Clear current geometry
      if (meshRef.current.geometry) {
        meshRef.current.releaseSharedGeometry(meshRef.current.geometry);
        meshRef.current.geometry.dispose();
        meshRef.current.geometry = new THREE.BufferGeometry();
      }

      // 2. Force re-render
      meshRef.current._needsRender = true;
      meshRef.current.requestRender();

      ClazzCommunicationMesh.clearSharedGeometries();
    }

    setForceUpdate((prev) => prev + 1);
  }, [enableEdgeColoring]);

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
      enableEdgeColoring={enableEdgeColoring}
      // 3D-HAP props
      beta={beta}
      use3DHAPAlgorithm={use3DHAPAlgorithm}
      scatterRadius={scatterRadius}
    ></clazzCommunicationMesh>
  );
}
