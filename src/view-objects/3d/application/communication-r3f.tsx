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
import { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useShallow } from 'zustand/react/shallow';
import { BundledCommunicationLayout } from './bundled-communication-layout';
import { EdgeBundlingConfig} from './edge-bundling-utils';
import { HAPSystemManager } from './hap-system-manager';
import { toggleHighlightById } from 'explorviz-frontend/src/utils/application-rendering/highlighting';
import { isApplication, isPackage, isClass } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import BoxLayout from 'explorviz-frontend/src/view-objects/layout-models/box-layout';

// HAP System Manager Instance
const hapSystemManager = HAPSystemManager.getInstance();

// Global layout map for fallback
let globalLayoutMap: Map<string, BoxLayout> | null = null;

export function setGlobalLayoutMap(map: Map<string, BoxLayout>) {
  globalLayoutMap = map;
  console.log('Global layout map set with', map?.size, 'entries');
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
        use3DHAPAlgorithm: vizSettings.use3DHAPAlgorithm?.value ?? true,
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
      const levelBasedMultiplier = 1.0 + (maxLevel * 0.3);
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
    if (isClass(element)) return 2;       // HIGHEST level - farthest from geometry
    if (isPackage(element)) return 1;     // Middle level
    if (isApplication(element)) return 0; // LOWEST level - closest to geometry
    return 0;
  };

  // Use effective layout map from prop or global
  const effectiveLayoutMap = layoutMap || globalLayoutMap;

  // HAP position calculation
  const getExactHAPPosition = (element: any, layout: BoxLayout): THREE.Vector3 => {
    const center = layout.center.clone();
    const level = getLevel(element);
    
    // Placed at the center of each geometric object at different levels of elevation
    const elevation = level * 10; // 10 units per level for clear separation
    
    return new THREE.Vector3(center.x, center.y + elevation, center.z);
  };

  // Helper functions for position calculation
  const getFallbackPosition = (element: any): THREE.Vector3 => {
    const level = getLevel(element);
    
    if (isApplication(element)) {
      return new THREE.Vector3(
        (Math.random() - 0.5) * 100,
        0 + (level * 10),  // Application (Level 0) = 0
        (Math.random() - 0.5) * 100
      );
    }
    else if (isPackage(element) && element.parent) {
      const parentPos = getPosition(element.parent);
      return new THREE.Vector3(
        parentPos.x + (Math.random() - 0.5) * 30,
        0 + (level * 10),  // Package (Level 1) = 10
        parentPos.z + (Math.random() - 0.5) * 30
      );
    }
    else if (isClass(element) && element.parent) {
      const parentPos = getPosition(element.parent);
      return new THREE.Vector3(
        parentPos.x + (Math.random() - 0.5) * 10,
        0 + (level * 10),  // Class (Level 2) = 20
        parentPos.z + (Math.random() - 0.5) * 10
      );
    }
    
    return new THREE.Vector3(0, 0, 0);
  };

  const getPosition = (element: any): THREE.Vector3 => {
    // Get layout from layoutmap - using exact HAP position
    if (effectiveLayoutMap && effectiveLayoutMap.has(element.id)) {
      const layout = effectiveLayoutMap.get(element.id);
      if (layout && layout.center) {
        return getExactHAPPosition(element, layout);
      }
    }
    
    // Fallback for elements without layout
    console.warn('No layout found for element in layoutMap:', element.name, element.id);
    return getFallbackPosition(element);
  };

  // Initialize HAP system for the application
  useEffect(() => {
    if (applicationElement && enableEdgeBundling && use3DHAPAlgorithm) {
      console.log('=== INITIALIZING HAP SYSTEM ===');

      const getChildren = (element: any): any[] => {
        if (isPackage(element)) {
          return [...element.subPackages, ...element.classes];
        }
        if (isApplication(element)) {
          return element.packages;
        }
        if (isClass(element)) {
          return [];
        }
        return [];
      };

      try {
        hapSystemManager.buildApplicationHAPTree(
          applicationElement.id,
          applicationElement,
          getChildren,
          getPosition,
          getLevel
        );
        
        console.log('HAP system successfully initialized for application:', applicationElement.id);
        
        // Debug: Show all created HAP nodes
        const allHAPNodes = Array.from((hapSystemManager as any).elementToHAP?.entries() || []);
        console.log('Created HAP nodes:', allHAPNodes.map(([id, node]: [string, any]) => ({
          id,
          level: node.level,
          position: node.position
        })));
        
      } catch (error) {
        console.error('Error initializing HAP system:', error);
      }
    }
  }, [applicationElement, enableEdgeBundling, use3DHAPAlgorithm]);

  // Get HAP nodes for this specific communication
  const hapNodes = useMemo(() => {
    if (!enableEdgeBundling || !use3DHAPAlgorithm || !applicationElement) {
      console.log('HAP nodes lookup skipped - conditions not met:', {
        enableEdgeBundling,
        use3DHAPAlgorithm,
        hasApplicationElement: !!applicationElement
      });
      return null;
    }

    const sourceClassId = communicationModel.sourceClass?.id;
    const targetClassId = communicationModel.targetClass?.id;

    if (!sourceClassId || !targetClassId) {
      console.warn('Missing class IDs for HAP lookup');
      return null;
    }

    console.log('Looking up HAP nodes for communication:', {
      sourceClassId,
      targetClassId,
      sourceClassName: communicationModel.sourceClass?.name,
      targetClassName: communicationModel.targetClass?.name
    });

    const originHAP = hapSystemManager.getHAPNode(sourceClassId);
    const destinationHAP = hapSystemManager.getHAPNode(targetClassId);
    
    console.log('HAP lookup results:', {
      sourceClassId,
      targetClassId,
      originHAPFound: !!originHAP,
      destinationHAPFound: !!destinationHAP,
      originHAP: originHAP ? { level: originHAP.level, position: originHAP.position } : null,
      destinationHAP: destinationHAP ? { level: destinationHAP.level, position: destinationHAP.position } : null
    });
    
    if (originHAP && destinationHAP) {
      console.log('HAP nodes found successfully');
      return { originHAP, destinationHAP };
    }
    
    console.log('HAP nodes not found');
    return null;
  }, [communicationModel.sourceClass, communicationModel.targetClass, enableEdgeBundling, use3DHAPAlgorithm, applicationElement]);

  // Create appropriate layout based on algorithm selection
  const finalLayout = useMemo(() => {
    if (!communicationLayout) return undefined;

    // When edge bundling disabled: standard ExplorViz algorithm
    if (!enableEdgeBundling) {
      // Convert back to normal layout if needed
      if (communicationLayout instanceof BundledCommunicationLayout) {
        const normalLayout = new CommunicationLayout(communicationModel);
        normalLayout.startPoint = communicationLayout.startPoint;
        normalLayout.endPoint = communicationLayout.endPoint;
        normalLayout.lineThickness = communicationLayout.lineThickness;
        return normalLayout;
      }
      return communicationLayout;
    }

    // When edge bundling enabled: 
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

    if (use3DHAPAlgorithm) {
      // Use 3d-HAP algorithm
      const hapSystem = hapSystemManager.getHAPSystem(applicationElement?.id || 'default');
      
      if (communicationLayout instanceof BundledCommunicationLayout) {
        // Update existing bundled layout with HAP system
        if (hapSystem && hapNodes) {
          const bundledLayout = communicationLayout as unknown as BundledCommunicationLayout;
          bundledLayout.setHAPNodes(hapNodes.originHAP, hapNodes.destinationHAP);
          bundledLayout.setBeta(beta);
        }
        return communicationLayout;
      }

      // Convert to BundledLayout with HAP
      const bundledLayout = new BundledCommunicationLayout(
        communicationModel,
        startPoint,
        endPoint,
        communicationLayout.lineThickness,
        edgeBundlingConfig,
        hapSystem || undefined
      );

      // Initialize with HAP nodes if available
      if (hapSystem && hapNodes) {
        bundledLayout.setHAPNodes(hapNodes.originHAP, hapNodes.destinationHAP);
        bundledLayout.setBeta(beta);
      }

      return bundledLayout;
    } else {
      // FALLBACK: Use existing Edge Bundling Algorithm
      if (communicationLayout instanceof BundledCommunicationLayout) {
        return communicationLayout;
      }

      // Convert to BundledLayout without HAP
      return new BundledCommunicationLayout(
        communicationModel,
        startPoint,
        endPoint,
        communicationLayout.lineThickness,
        edgeBundlingConfig
      );
    }
  }, [
    communicationLayout,
    communicationModel,
    edgeBundlingConfig,
    enableEdgeBundling,
    use3DHAPAlgorithm,
    hapNodes,
    beta,
    applicationElement
  ]);

  // Initialize HAP system on the mesh when it's created
  useEffect(() => {
    if (meshRef.current && enableEdgeBundling && use3DHAPAlgorithm && hapNodes) {
      const hapSystem = hapSystemManager.getHAPSystem(applicationElement?.id || 'default');
      if (hapSystem) {
        console.log('Initializing HAP system on mesh:', {
          origin: hapNodes.originHAP?.element?.id,
          destination: hapNodes.destinationHAP?.element?.id,
          beta: beta
        });
        
        meshRef.current.initializeHAPSystem(
          hapSystem,
          hapNodes.originHAP,
          hapNodes.destinationHAP
        );
        meshRef.current.beta = beta;
        meshRef.current.use3DHAPAlgorithm = true;
        meshRef.current.enableEdgeBundling = true;
      } else {
        console.warn('HAP system not available for mesh initialization');
      }
    } else if (meshRef.current) {
      // Ensure 3D-HAP is disabled when not needed
      meshRef.current.use3DHAPAlgorithm = false;
      meshRef.current.enableEdgeBundling = enableEdgeBundling;
      
      if (!enableEdgeBundling) {
        meshRef.current.clearHAPSystem();
      }
    }
  }, [meshRef.current, enableEdgeBundling, use3DHAPAlgorithm, hapNodes, applicationElement, beta]);

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
          ? communicationModel.sourceClass.id + '_' + communicationModel.targetClass.id
          : null
      }
      bundlingConfig={edgeBundlingConfig}
      // 3D-HAP props
      beta={beta}
      use3DHAPAlgorithm={use3DHAPAlgorithm}
    ></clazzCommunicationMesh>
  );
}