import { extend, ThreeElement, ThreeEvent } from '@react-three/fiber';
import { InstancedMesh2 } from '@three.ez/instanced-mesh';
import useClickPreventionOnDoubleClick from 'explorviz-frontend/src/hooks/useClickPreventionOnDoubleClick';
import { useCommitTreeStateStore } from 'explorviz-frontend/src/stores/commit-tree-state';
import {
  HeatmapValueMapping,
  useHeatmapStore,
} from 'explorviz-frontend/src/stores/heatmap/heatmap-store';
import {
  buildFallbackImmersiveInfo,
  useImmersiveViewStore,
} from 'explorviz-frontend/src/stores/immersive-view-store';
import { useLayoutStore } from 'explorviz-frontend/src/stores/layout-store';
import { usePopupHandlerStore } from 'explorviz-frontend/src/stores/popup-handler';
import { useModelStore } from 'explorviz-frontend/src/stores/repos/model-repository';
import { useToastHandlerStore } from 'explorviz-frontend/src/stores/toast-handler';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { useVisibilityServiceStore } from 'explorviz-frontend/src/stores/visibility-service';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import { isBuildingVisible } from 'explorviz-frontend/src/utils/city-rendering/building-visibility';
import { getHighlightingColorForEntity } from 'explorviz-frontend/src/utils/city-rendering/highlighting';
import { getImmersiveTargetWorldPosition } from 'explorviz-frontend/src/utils/city-rendering/immersive-target-position';
import { emitContextMenuFromWorld } from 'explorviz-frontend/src/utils/context-menu-bridge';
import { getSourceReferenceCommitHash } from 'explorviz-frontend/src/utils/evolution-data-helpers';
import { getMetricValues } from 'explorviz-frontend/src/utils/heatmap/building-heatmap-helper';
import { getSimpleHeatmapColor } from 'explorviz-frontend/src/utils/heatmap/simple-heatmap';
import calculateColorBrightness from 'explorviz-frontend/src/utils/helpers/threejs-helpers';
import { requestFileDetailedData } from 'explorviz-frontend/src/utils/landscape-http-request-util';
import {
  type Building,
  type City,
} from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import { TypeOfAnalysis } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import { computeMappedBuildingHeight } from 'explorviz-frontend/src/utils/settings/building-metrics';
import {
  BuildingGeometryType,
  getLanguageColor as getLanguageBuildingColor,
  getLanguageGeometry,
  normalizeLanguage,
} from 'explorviz-frontend/src/utils/settings/language-settings';
import { VisualizationSettings } from 'explorviz-frontend/src/utils/settings/settings-schemas';
import gsap from 'gsap';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  Matrix4,
  MeshLambertMaterial,
  Quaternion,
  SphereGeometry,
  Vector3,
} from 'three';
import { useShallow } from 'zustand/react/shallow';

// add InstancedMesh2 to the jsx catalog i.e use it as a jsx component
extend({ InstancedMesh2 });

declare module '@react-three/fiber' {
  interface ThreeElements {
    instancedMesh2: ThreeElement<typeof InstancedMesh2>;
  }
}

export type { BuildingGeometryType } from 'explorviz-frontend/src/utils/settings/language-settings';

/**
 * Groups building IDs by their geometry type.
 */
function groupBuildingsByGeometry(
  buildingIds: string[],
  getBuilding: (id: string) => Building | undefined,
  settings: VisualizationSettings
): Map<BuildingGeometryType, string[]> {
  const groups = new Map<BuildingGeometryType, string[]>();

  buildingIds.forEach((buildingId) => {
    const building = getBuilding(buildingId);
    if (!building) return;

    const lang = normalizeLanguage(building.language);
    const geometryType = getLanguageGeometry(lang, settings);

    if (!groups.has(geometryType)) {
      groups.set(geometryType, []);
    }
    groups.get(geometryType)!.push(buildingId);
  });

  return groups;
}

const buildingMaterial = new MeshLambertMaterial();

function createBuildingGeometry(geometryType: BuildingGeometryType) {
  // Round primitives default to radius 1 (diameter 2); use 0.5 to match BoxGeometry's 1×1 footprint.
  switch (geometryType) {
    case 'Cone':
      return new ConeGeometry(0.5, 1);
    case 'Sphere':
      return new SphereGeometry(0.5);
    case 'Cylinder':
      return new CylinderGeometry(0.5, 0.5, 1);
    case 'Box':
    default:
      return new BoxGeometry();
  }
}

const buildingGeometryCache = new Map<
  BuildingGeometryType,
  BoxGeometry | ConeGeometry | CylinderGeometry | SphereGeometry
>();

function getBuildingGeometry(geometryType: BuildingGeometryType) {
  const cachedGeometry = buildingGeometryCache.get(geometryType);
  if (cachedGeometry) {
    return cachedGeometry;
  }

  const geometry = createBuildingGeometry(geometryType);
  buildingGeometryCache.set(geometryType, geometry);
  return geometry;
}

interface GeometryGroupProps {
  geometryType: BuildingGeometryType;
  buildingIds: string[];
  city: City;
}

/**
 * Renders buildings for a single geometry type with its own instanced mesh.
 */
const GeometryGroup: React.FC<GeometryGroupProps> = ({
  geometryType,
  buildingIds,
  city,
}) => {
  const meshRef = useRef<InstancedMesh2>(null);
  const instanceIdToBuildingIdRef = useRef(new Map<number, string>());
  const buildingIdToInstanceIdRef = useRef(new Map<string, number>());

  const layoutMap = useLayoutStore((state) => state.buildingLayouts);
  const buildings = useModelStore((state) => state.buildings);
  const geometry = getBuildingGeometry(geometryType);

  const {
    hiddenBuildingIds,
    removedDistrictIds,
    hiddenLanguages,
    hoveredEntityId,
    setHoveredEntity,
    highlightedEntityIds,
  } = useVisualizationStore(
    useShallow((state) => ({
      hiddenBuildingIds: state.hiddenBuildingIds,
      removedDistrictIds: state.removedDistrictIds,
      hiddenLanguages: state.hiddenLanguages,
      hoveredEntityId: state.hoveredEntityId,
      setHoveredEntity: state.actions.setHoveredEntityId,
      highlightedEntityIds: state.highlightedEntityIds,
    }))
  );

  const { evoConfig } = useVisibilityServiceStore(
    useShallow((state) => ({
      evoConfig: state._evolutionModeRenderingConfiguration,
    }))
  );

  const _selectedCommits = useCommitTreeStateStore(
    (state) => state._selectedCommits
  );
  const currentSelectedRepo = useCommitTreeStateStore(
    (state) => state._currentSelectedRepositoryName
  );

  const isDiffMode =
    (_selectedCommits.get(currentSelectedRepo)?.length || 0) === 2;

  const {
    buildingFootprint,
    buildingHeightMultiplier,
    metricMapping,
    enableHoverEffects,
    heightMetric,
    highlightedEntityColor,
    enableAnimations,
    animationDuration,
    addedBuildingColor,
    modifiedBuildingColor,
    removedBuildingColor,
    unchangedBuildingColor,
    visualizationSettings,
  } = useUserSettingsStore(
    useShallow((state) => ({
      buildingFootprint: state.visualizationSettings.buildingFootprint.value,
      buildingHeightMultiplier:
        state.visualizationSettings.buildingHeightMultiplier.value,
      metricMapping: state.visualizationSettings.buildingMetricMapping.value,
      enableHoverEffects: state.visualizationSettings.enableHoverEffects.value,
      heightMetric: state.visualizationSettings.buildingHeightMetric.value,
      highlightedEntityColor: state.colors?.highlightedEntityColor,
      enableAnimations: state.visualizationSettings.enableAnimations.value,
      animationDuration: state.visualizationSettings.animationDuration.value,
      addedBuildingColor: state.visualizationSettings.addedBuildingColor.value,
      modifiedBuildingColor:
        state.visualizationSettings.modifiedBuildingColor.value,
      removedBuildingColor:
        state.visualizationSettings.removedBuildingColor.value,
      unchangedBuildingColor:
        state.visualizationSettings.unchangedBuildingColor.value,
      visualizationSettings: state.visualizationSettings,
    }))
  );

  const { heatmapActive, selectedBuildingMetric, selectedValueMapping } =
    useHeatmapStore(
      useShallow((state) => ({
        heatmapActive: state.isActive(),
        selectedBuildingMetric: state.getSelectedBuildingMetric(),
        selectedValueMapping: state.selectedValueMapping,
      }))
    );

  const { addPopup, updatePopup } = usePopupHandlerStore(
    useShallow((state) => ({
      addPopup: state.addPopup,
      updatePopup: state.updatePopup,
    }))
  );
  const popupData = usePopupHandlerStore((state) => state.popupData);

  const enterImmersive = useImmersiveViewStore((state) => state.enterImmersive);

  const sceneLayers = useVisualizationStore((state) => state.sceneLayers);

  function getBuildingHeight(building: Building) {
    return computeMappedBuildingHeight(
      building,
      heightMetric,
      metricMapping,
      buildingFootprint,
      buildingHeightMultiplier,
      buildings
    );
  }

  function computeColor(buildingId: string) {
    const building = buildings[buildingId];
    if (!building) {
      return new THREE.Color('red');
    }
    if (heatmapActive) {
      const metricValues = getMetricValues(building, selectedBuildingMetric!);
      if (metricValues.current === null) {
        return new THREE.Color('white');
      }
      return new THREE.Color(
        getSimpleHeatmapColor(
          metricValues.current,
          metricValues.max,
          undefined,
          selectedValueMapping ?? HeatmapValueMapping.LINEAR
        )
      );
    }

    if (
      (isDiffMode || evoConfig.renderOnlyDifferences) &&
      building.commitComparison
    ) {
      if (building.commitComparison === 'ADDED') {
        return new THREE.Color(addedBuildingColor);
      } else if (building.commitComparison === 'REMOVED') {
        return new THREE.Color(removedBuildingColor);
      } else if (building.commitComparison === 'MODIFIED') {
        return new THREE.Color(modifiedBuildingColor);
      } else {
        return new THREE.Color(unchangedBuildingColor);
      }
    }

    if (building.originOfData === TypeOfAnalysis.Editing) {
      return new THREE.Color(addedBuildingColor);
    }

    const isHovered = hoveredEntityId === building.id;
    const isHighlighted = highlightedEntityIds.has(building.id);

    const lang = normalizeLanguage(building.language);

    let baseColor = isHighlighted
      ? getHighlightingColorForEntity(building.id)
      : new THREE.Color(getLanguageBuildingColor(lang, visualizationSettings));

    if (enableHoverEffects && isHovered) {
      baseColor = calculateColorBrightness(baseColor, 1.1);
    }

    return baseColor;
  }

  useEffect(() => {
    if (buildingIdToInstanceIdRef.current.size === 0) {
      return;
    }
    if (meshRef === null || typeof meshRef === 'function' || !meshRef.current) {
      return;
    }

    const mesh = meshRef.current;

    buildingIdToInstanceIdRef.current.forEach((instanceId, buildingId) => {
      const tempMatrix = new Matrix4();
      const pos = new Vector3();
      const quat = new Quaternion();
      const scale = new Vector3();

      const building = useModelStore.getState().getBuilding(buildingId);
      const layout = layoutMap.get(buildingId);
      if (!building || !layout) {
        return;
      }

      const targetHeight = getBuildingHeight(building);
      const targetPositionX = layout.center.x;
      const targetPositionY = layout.position.y + targetHeight / 2;
      const targetPositionZ = layout.center.z;
      const targetWidth = layout.width;
      const targetDepth = layout.depth;

      if (enableAnimations) {
        try {
          mesh.getMatrixAt(instanceId, tempMatrix);
        } catch {
          return;
        }
        tempMatrix.decompose(pos, quat, scale);

        if (
          pos.x === targetPositionX &&
          pos.y === targetPositionY &&
          pos.z === targetPositionZ &&
          scale.x === targetWidth &&
          scale.y === targetHeight &&
          scale.z === targetDepth
        ) {
          return;
        }

        const values = {
          width: scale.x,
          depth: scale.z,
          height: scale.y,
          positionX: pos.x,
          positionY: pos.y,
          positionZ: pos.z,
        };

        gsap.to(values, {
          duration: animationDuration,
          width: targetWidth,
          height: targetHeight,
          depth: targetDepth,
          positionX: targetPositionX,
          positionY: targetPositionY,
          positionZ: targetPositionZ,
          onUpdate: () => {
            scale.x = values.width;
            scale.y = values.height;
            scale.z = values.depth;
            pos.x = values.positionX;
            pos.y = values.positionY;
            pos.z = values.positionZ;
            tempMatrix.compose(pos, quat, scale);
            if (!meshRef || typeof meshRef === 'function') return;
            mesh.setMatrixAt(instanceId, tempMatrix);
          },
        });
        return;
      }

      try {
        mesh.getMatrixAt(instanceId, tempMatrix);
      } catch {
        return;
      }
      tempMatrix.decompose(pos, quat, scale);
      scale.y = targetHeight;
      pos.y = layout.position.y + targetHeight / 2;
      tempMatrix.compose(pos, quat, scale);
      mesh.setMatrixAt(instanceId, tempMatrix);
    });
  }, [
    buildingFootprint,
    buildingHeightMultiplier,
    heightMetric,
    metricMapping,
    buildings,
    enableAnimations,
    animationDuration,
    layoutMap,
  ]);

  // Compute mesh instances or animate changes
  useEffect(() => {
    if (meshRef === null || typeof meshRef === 'function' || !meshRef.current) {
      return;
    }

    const layoutsReady =
      buildingIds.length === 0 ||
      buildingIds.every((id) => layoutMap.has(id));

    if (!layoutsReady) {
      return;
    }

    if (meshRef.current.geometry !== geometry) {
      meshRef.current.geometry = geometry;
    }

    const hasMatchingInstances =
      buildingIdToInstanceIdRef.current.size > 0 &&
      buildingIds.length === buildingIdToInstanceIdRef.current.size &&
      buildingIds.every((id) => buildingIdToInstanceIdRef.current.has(id));

    if (hasMatchingInstances && enableAnimations) {
      if (buildingIdToInstanceIdRef.current.size === 0) {
        return;
      }

      const mesh = meshRef.current;
      buildingIdToInstanceIdRef.current.forEach((instanceId, buildingId) => {
        const tempMatrix = new Matrix4();
        const pos = new Vector3();
        const quat = new Quaternion();
        const scale = new Vector3();

        const building = useModelStore.getState().getBuilding(buildingId);
        const layout = layoutMap.get(buildingId);
        if (!building || !layout) return;

        const targetHeight = getBuildingHeight(building);
        const targetPositionX = layout.center.x;
        const targetPositionY = layout.position.y + targetHeight / 2;
        const targetPositionZ = layout.center.z;
        const targetWidth = layout.width;
        const targetDepth = layout.depth;

        try {
          mesh.getMatrixAt(instanceId, tempMatrix);
        } catch {
          return;
        }
        tempMatrix.decompose(pos, quat, scale);

        if (
          pos.x === targetPositionX &&
          pos.y === targetPositionY &&
          pos.z === targetPositionZ &&
          scale.x === targetWidth &&
          scale.y === targetHeight &&
          scale.z === targetDepth
        ) {
          return;
        }

        const values = {
          width: scale.x,
          depth: scale.z,
          height: scale.y,
          positionX: pos.x,
          positionY: pos.y,
          positionZ: pos.z,
        };

        gsap.to(values, {
          duration: animationDuration,
          width: targetWidth,
          height: targetHeight,
          depth: targetDepth,
          positionX: targetPositionX,
          positionY: targetPositionY,
          positionZ: targetPositionZ,
          onUpdate: () => {
            scale.x = values.width;
            scale.y = values.height;
            scale.z = values.depth;
            pos.x = values.positionX;
            pos.y = values.positionY;
            pos.z = values.positionZ;
            tempMatrix.compose(pos, quat, scale);
            if (!meshRef || typeof meshRef === 'function') return;
            mesh.setMatrixAt(instanceId, tempMatrix);
          },
        });
      });
      return;
    }

    meshRef.current.clearInstances();
    instanceIdToBuildingIdRef.current.clear();
    buildingIdToInstanceIdRef.current.clear();

    let i = 0;
    meshRef.current.addInstances(buildingIds.length, (obj) => {
      const building = useModelStore.getState().getBuilding(buildingIds[i]);
      if (!building) {
        return;
      }
      instanceIdToBuildingIdRef.current.set(obj.id, building.id);
      buildingIdToInstanceIdRef.current.set(building.id, obj.id);
      const layout = layoutMap.get(building.id);
      if (!layout) {
        return;
      }
      const buildingHeight = getBuildingHeight(building);
      obj.position.set(
        layout.center.x,
        layout.position.y + buildingHeight / 2,
        layout.center.z
      );

      const visibleDueToEvo = (() => {
        if (isDiffMode || evoConfig.renderOnlyDifferences) {
          return !!building.commitComparison;
        }

        if (
          building.originOfData === TypeOfAnalysis.Static ||
          building.originOfData === TypeOfAnalysis.StaticAndDynamic
        ) {
          return evoConfig.renderStatic;
        }
        if (building.originOfData === TypeOfAnalysis.Dynamic) {
          return evoConfig.renderDynamic;
        }
        return true;
      })();

      obj.visible =
        isBuildingVisible({
          buildingId: building.id,
          building,
          hiddenBuildingIds,
          removedDistrictIds,
          hiddenLanguages,
        }) && visibleDueToEvo;

      obj.scale.set(layout.width, buildingHeight, layout.depth);
      obj.color = computeColor(building.id);
      obj.updateMatrix();
      i++;
    });
    meshRef.current.computeBVH();

    meshRef.current.userData.explorvizResolveBuildingId = (
      meshInstanceId: number
    ) => instanceIdToBuildingIdRef.current.get(meshInstanceId);
  }, [
    buildingIds,
    buildingFootprint,
    buildingHeightMultiplier,
    heightMetric,
    metricMapping,
    buildings,
    enableAnimations,
    animationDuration,
    geometry,
    layoutMap,
    hiddenBuildingIds,
    removedDistrictIds,
    hiddenLanguages,
    evoConfig,
    isDiffMode,
    heatmapActive,
    selectedBuildingMetric,
    selectedValueMapping,
    addedBuildingColor,
    removedBuildingColor,
    modifiedBuildingColor,
    unchangedBuildingColor,
    hoveredEntityId,
    highlightedEntityIds,
    visualizationSettings,
    enableHoverEffects,
  ]);

  // React on changes of color
  useEffect(() => {
    if (meshRef === null || typeof meshRef === 'function' || !meshRef.current) {
      return;
    }
    buildingIdToInstanceIdRef.current.forEach((instanceId, buildingId) => {
      meshRef.current?.setColorAt(instanceId, computeColor(buildingId));
    });
  }, [
    highlightedEntityColor,
    heatmapActive,
    selectedBuildingMetric,
    selectedValueMapping,
    evoConfig.renderOnlyDifferences,
    isDiffMode,
    addedBuildingColor,
    removedBuildingColor,
    modifiedBuildingColor,
    unchangedBuildingColor,
    hoveredEntityId,
    highlightedEntityIds,
    visualizationSettings,
    enableHoverEffects,
    buildings,
  ]);

  // React on changes of building visibility
  useEffect(() => {
    if (meshRef === null || typeof meshRef === 'function') {
      return;
    }
    if (!meshRef.current) return;

    // Update the visibility of the instances based
    instanceIdToBuildingIdRef.current.forEach((buildingId, instanceId) => {
      // Set visibility based on hidden buildings
      const building = useModelStore.getState().getBuilding(buildingId);
      meshRef.current?.setVisibilityAt(
        instanceId,
        isBuildingVisible({
          buildingId,
          building,
          hiddenBuildingIds,
          removedDistrictIds,
          hiddenLanguages,
        })
      );
    });
  }, [meshRef, hiddenBuildingIds, removedDistrictIds, hiddenLanguages]);

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (meshRef === null || typeof meshRef === 'function') {
      return;
    }
    if (!meshRef.current) return;
    const { instanceId } = e;
    if (instanceId === undefined) return;
    e.stopPropagation();

    const buildingId = instanceIdToBuildingIdRef.current.get(instanceId);
    if (!buildingId) return;

    const building = useModelStore.getState().getBuilding(buildingId);
    addPopup({
      entityId: buildingId,
      entity: building,
      position: {
        x: e.clientX,
        y: e.clientY,
      },
    });
  };

  const handleOnPointerOver = (e: ThreeEvent<MouseEvent>) => {
    if (meshRef === null || typeof meshRef === 'function') {
      return;
    }
    if (!meshRef.current) return;
    const { instanceId } = e;
    if (instanceId === undefined) return;
    e.stopPropagation();

    const buildingId = instanceIdToBuildingIdRef.current.get(instanceId);
    if (!buildingId) return;

    setHoveredEntity(buildingId);
  };

  const handleOnPointerOut = (e: ThreeEvent<MouseEvent>) => {
    if (meshRef === null || typeof meshRef === 'function') {
      return;
    }
    if (!meshRef.current) return;
    const { instanceId } = e;
    if (instanceId === undefined) return;
    e.stopPropagation();

    const buildingId = instanceIdToBuildingIdRef.current.get(instanceId);
    if (!buildingId) return;
    setHoveredEntity(null);
  };

  const handleDoubleClick = (e: ThreeEvent<MouseEvent>) => {
    if (meshRef === null || typeof meshRef === 'function') {
      return;
    }
    if (!meshRef.current) return;
    const { instanceId } = e;
    if (instanceId === undefined) return;
    e.stopPropagation();

    const buildingId = instanceIdToBuildingIdRef.current.get(instanceId);
    if (!buildingId) return;

    const building = useModelStore.getState().getBuilding(buildingId);
    if (!building) return;

    const mesh = meshRef.current;
    const sphereRadius =
      useUserSettingsStore.getState().visualizationSettings.sphereRadius
        ?.value ?? 0.7;
    const targetPos = getImmersiveTargetWorldPosition(
      mesh,
      instanceId,
      sphereRadius
    );
    if (!targetPos) {
      return;
    }

    // Check if we have data in an existing popup
    const existingPopup = popupData.find((p) => p.entityId === buildingId);

    if (existingPopup && existingPopup.fileDetailedData) {
      enterImmersive(
        buildingId,
        targetPos,
        undefined,
        existingPopup.fileDetailedData
      );
    } else if (
      building.originOfData === TypeOfAnalysis.Static ||
      building.originOfData === TypeOfAnalysis.StaticAndDynamic
    ) {
      requestFileDetailedData(
        buildingId,
        getSourceReferenceCommitHash(_selectedCommits, currentSelectedRepo)
      )
        .then((data) => {
          enterImmersive(buildingId, targetPos, undefined, data);
          // Also update popup if it exists
          if (existingPopup) {
            updatePopup({ ...existingPopup, fileDetailedData: data });
          }
        })
        .catch((err) => {
          console.error(
            'Failed to fetch detailed file data for immersive view:',
            err
          );
          useToastHandlerStore
            .getState()
            .showErrorToastMessage(
              err instanceof Error
                ? err.message
                : 'Could not load file details for immersive view.'
            );
          enterImmersive(
            buildingId,
            targetPos,
            buildFallbackImmersiveInfo(building)
          );
        });
    } else {
      enterImmersive(buildingId, targetPos);
    }
  };

  const handleRightClick = (e: ThreeEvent<MouseEvent>) => {
    if (meshRef === null || typeof meshRef === 'function') {
      return;
    }
    if (!meshRef.current) return;
    const { instanceId } = e;
    if (instanceId === undefined) return;
    const buildingId = instanceIdToBuildingIdRef.current.get(instanceId);
    if (!buildingId) return;
    e.stopPropagation();
    emitContextMenuFromWorld({ kind: 'building', buildingId }, e.nativeEvent);
  };

  const [
    handleClickWithPrevent,
    handleDoubleClickWithPrevent,
    handleRightClickWithPrevent,
  ] = useClickPreventionOnDoubleClick(handleClick, handleDoubleClick, {
    onRightClick: handleRightClick,
  });

  return (
    <instancedMesh2
      layers={sceneLayers.Building}
      ref={meshRef}
      name={`Buildings-${geometryType}-${city.name}`}
      args={[geometry, buildingMaterial]}
      onClick={handleClickWithPrevent}
      onContextMenu={handleRightClickWithPrevent}
      {...(enableHoverEffects && {
        onPointerOver: handleOnPointerOver,
        onPointerOut: handleOnPointerOut,
      })}
      onDoubleClick={handleDoubleClickWithPrevent}
      frustumCulled={false}
    ></instancedMesh2>
  );
};

interface CodeBuildingsArgs {
  buildingIds: string[];
  city: City;
}

/**
 * Groups buildings by geometry and renders a GeometryGroup for each geometry type.
 */
const CodeBuildings: React.FC<CodeBuildingsArgs> = ({ buildingIds, city }) => {
  const getBuilding = useModelStore.getState().getBuilding;
  const { hiddenBuildingIds, removedDistrictIds, hiddenLanguages } =
    useVisualizationStore(
      useShallow((state) => ({
        hiddenBuildingIds: state.hiddenBuildingIds,
        removedDistrictIds: state.removedDistrictIds,
        hiddenLanguages: state.hiddenLanguages,
      }))
    );

  const visualizationSettings = useUserSettingsStore(
    (state) => state.visualizationSettings
  );

  const visibleBuildingIds = buildingIds.filter((id) => {
    const building = getBuilding(id);
    return isBuildingVisible({
      buildingId: id,
      building,
      hiddenBuildingIds,
      removedDistrictIds,
      hiddenLanguages,
    });
  });

  const buildingsByGeometry = groupBuildingsByGeometry(
    visibleBuildingIds,
    getBuilding,
    visualizationSettings
  );

  if (buildingIds.length === 0) {
    return null;
  }

  return (
    <>
      {Array.from(buildingsByGeometry.entries()).map(
        ([geometryType, groupBuildingIds]) => (
          <GeometryGroup
            key={`${city.id}-${geometryType}`}
            geometryType={geometryType}
            buildingIds={groupBuildingIds}
            city={city}
          />
        )
      )}
    </>
  );
};

export default CodeBuildings;
