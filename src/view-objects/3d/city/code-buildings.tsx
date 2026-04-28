import { extend, ThreeElement, ThreeEvent } from '@react-three/fiber';
import { InstancedMesh2 } from '@three.ez/instanced-mesh';
import useClickPreventionOnDoubleClick from 'explorviz-frontend/src/hooks/useClickPreventionOnDoubleClick';
import { useCommitTreeStateStore } from 'explorviz-frontend/src/stores/commit-tree-state';
import { useHeatmapStore } from 'explorviz-frontend/src/stores/heatmap/heatmap-store';
import { useImmersiveViewStore } from 'explorviz-frontend/src/stores/immersive-view-store';
import { useLayoutStore } from 'explorviz-frontend/src/stores/layout-store';
import { usePopupHandlerStore } from 'explorviz-frontend/src/stores/popup-handler';
import { useModelStore } from 'explorviz-frontend/src/stores/repos/model-repository';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { useVisibilityServiceStore } from 'explorviz-frontend/src/stores/visibility-service';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import { getHighlightingColorForEntity } from 'explorviz-frontend/src/utils/city-rendering/highlighting';
import { getMetricValues } from 'explorviz-frontend/src/utils/heatmap/building-heatmap-helper';
import { getSimpleHeatmapColor } from 'explorviz-frontend/src/utils/heatmap/simple-heatmap';
import calculateColorBrightness from 'explorviz-frontend/src/utils/helpers/threejs-helpers';
import { requestFileDetailedData } from 'explorviz-frontend/src/utils/landscape-http-request-util';
import {
  type Building,
  type City,
  type Language,
} from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import { TypeOfAnalysis } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import {
  MetricKey,
  metricMappingMultipliers,
} from 'explorviz-frontend/src/utils/settings/default-settings';
import gsap from 'gsap';
import { useCallback, useEffect, useMemo, useRef } from 'react';
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

export type BuildingGeometryType = 'Box' | 'Cone' | 'Sphere' | 'Cylinder';

/**
 * Helper to get the geometry type for a language based on settings.
 */
function getGeometryForLanguage(
  lang: Language,
  settings: {
    languageGeometryJava: BuildingGeometryType;
    languageGeometryCpp: BuildingGeometryType;
    languageGeometryPython: BuildingGeometryType;
    languageGeometryTypeScript: BuildingGeometryType;
    languageGeometryOther: BuildingGeometryType;
  }
): BuildingGeometryType {
  switch (lang) {
    case 'JAVA':
      return settings.languageGeometryJava;
    case 'CPP':
      return settings.languageGeometryCpp;
    case 'PYTHON':
      return settings.languageGeometryPython;
    case 'TYPESCRIPT':
    case 'JAVASCRIPT':
      return settings.languageGeometryTypeScript;
    case 'PLAINTEXT':
    case 'LANGUAGE_UNSPECIFIED':
    default:
      return settings.languageGeometryOther;
  }
}

/**
 * Groups building IDs by their geometry type.
 */
function groupBuildingsByGeometry(
  buildingIds: string[],
  getBuilding: (id: string) => Building | undefined,
  settings: {
    languageGeometryJava: BuildingGeometryType;
    languageGeometryCpp: BuildingGeometryType;
    languageGeometryPython: BuildingGeometryType;
    languageGeometryTypeScript: BuildingGeometryType;
    languageGeometryOther: BuildingGeometryType;
  }
): Map<BuildingGeometryType, string[]> {
  const groups = new Map<BuildingGeometryType, string[]>();

  buildingIds.forEach((buildingId) => {
    const building = getBuilding(buildingId);
    if (!building) return;

    const lang = building.language ?? 'LANGUAGE_UNSPECIFIED';
    const geometryType = getGeometryForLanguage(lang, settings);

    if (!groups.has(geometryType)) {
      groups.set(geometryType, []);
    }
    groups.get(geometryType)!.push(buildingId);
  });

  return groups;
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
  const material = useRef<MeshLambertMaterial>(new MeshLambertMaterial());

  const instanceIdToBuildingId = useRef(new Map<number, string>()).current;
  const buildingIdToInstanceId = useRef(new Map<string, number>()).current;

  const layoutMap = useLayoutStore.getState().getBuildingLayouts();

  const buildings = useModelStore((state) => state.buildings);

  const {
    hiddenBuildingIds,
    removedDistrictIds,
    hoveredEntityId,
    setHoveredEntity,
    highlightedEntityIds,
  } = useVisualizationStore(
    useShallow((state) => ({
      hiddenBuildingIds: state.hiddenBuildingIds,
      removedDistrictIds: state.removedDistrictIds,
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
    enableHoverEffects,
    heightMetric,
    highlightedEntityColor,
    enableAnimations,
    animationDuration,
    addedBuildingColor,
    modifiedBuildingColor,
    removedBuildingColor,
    unchangedBuildingColor,
    javaBuildingColor,
    cppBuildingColor,
    pythonBuildingColor,
    typescriptBuildingColor,
    otherBuildingColor,
  } = useUserSettingsStore(
    useShallow((state) => ({
      buildingFootprint: state.visualizationSettings.buildingFootprint.value,
      buildingHeightMultiplier:
        state.visualizationSettings.buildingHeightMultiplier.value,
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
      javaBuildingColor: state.visualizationSettings.javaBuildingColor?.value,
      cppBuildingColor: state.visualizationSettings.cppBuildingColor?.value,
      pythonBuildingColor:
        state.visualizationSettings.pythonBuildingColor?.value,
      typescriptBuildingColor:
        state.visualizationSettings.typescriptBuildingColor?.value,
      otherBuildingColor: state.visualizationSettings.otherBuildingColor?.value,
    }))
  );

  const getLanguageColor = useCallback(
    (lang: Language) => {
      switch (lang) {
        case 'JAVA':
          return javaBuildingColor;
        case 'CPP':
          return cppBuildingColor;
        case 'PYTHON':
          return pythonBuildingColor;
        case 'TYPESCRIPT':
        case 'JAVASCRIPT':
          return typescriptBuildingColor;
        case 'PLAINTEXT':
        case 'LANGUAGE_UNSPECIFIED':
        default:
          return otherBuildingColor;
      }
    },
    [
      javaBuildingColor,
      cppBuildingColor,
      pythonBuildingColor,
      typescriptBuildingColor,
      otherBuildingColor,
    ]
  );

  const geometry = useMemo(() => {
    switch (geometryType) {
      case 'Cone':
        return new ConeGeometry();
      case 'Sphere':
        return new SphereGeometry();
      case 'Cylinder':
        return new CylinderGeometry();
      case 'Box':
      default:
        return new BoxGeometry();
    }
  }, [geometryType]);

  const { heatmapActive, selectedBuildingMetric, selectedGradient } =
    useHeatmapStore(
      useShallow((state) => ({
        heatmapActive: state.isActive(),
        selectedBuildingMetric: state.getSelectedBuildingMetric(),
        selectedGradient: state.selectedGradient,
      }))
    );

  const { addPopup, updatePopup, popups } = usePopupHandlerStore(
    useShallow((state) => ({
      addPopup: state.addPopup,
      updatePopup: state.updatePopup,
      popups: state.popups,
    }))
  );

  const enterImmersive = useImmersiveViewStore((state) => state.enterImmersive);

  const sceneLayers = useVisualizationStore((state) => state.sceneLayers);

  const getBuildingHeight = useCallback(
    (building: Building) => {
      const getMetricValue = (
        building: Building,
        metricKey: string
      ): number => {
        const metric = building.metrics?.[metricKey];
        return metric?.current || 0;
      };

      const metricValue = getMetricValue(building, heightMetric);

      return (
        buildingFootprint +
        metricMappingMultipliers[heightMetric as MetricKey] *
          buildingHeightMultiplier *
          metricValue
      );
    },
    [buildingFootprint, buildingHeightMultiplier, heightMetric]
  );

  const computeColor = useCallback(
    (buildingId: string) => {
      const building = buildings[buildingId];
      if (!building) {
        return new THREE.Color('red');
      }
      if (heatmapActive) {
        const metricValues = getMetricValues(building, selectedBuildingMetric!);
        return new THREE.Color(
          getSimpleHeatmapColor(metricValues.current, metricValues.max)
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

      const lang = building.language ?? 'LANGUAGE_UNSPECIFIED';

      let baseColor = isHighlighted
        ? getHighlightingColorForEntity(building.id)
        : new THREE.Color(getLanguageColor(lang));

      if (enableHoverEffects && isHovered) {
        baseColor = calculateColorBrightness(baseColor, 1.1);
      }

      return baseColor;
    },
    [
      heatmapActive,
      selectedBuildingMetric,
      selectedGradient,
      evoConfig.renderOnlyDifferences,
      isDiffMode,
      addedBuildingColor,
      removedBuildingColor,
      modifiedBuildingColor,
      unchangedBuildingColor,
      hoveredEntityId,
      highlightedEntityIds,
      getLanguageColor,
      enableHoverEffects,
      buildings,
    ]
  );

  const computeMeshInstances = useCallback(() => {
    if (meshRef === null || typeof meshRef === 'function' || !meshRef.current) {
      return;
    }

    meshRef.current.clearInstances();
    instanceIdToBuildingId.clear();
    buildingIdToInstanceId.clear();

    let i = 0;
    meshRef.current.addInstances(buildingIds.length, (obj) => {
      const building = useModelStore.getState().getBuilding(buildingIds[i]);
      if (!building) {
        return;
      }
      instanceIdToBuildingId.set(obj.id, building.id);
      buildingIdToInstanceId.set(building.id, obj.id);
      const layout = layoutMap.get(building.id);
      if (!layout) {
        return;
      }
      obj.position.set(
        layout.center.x,
        layout.position.y + getBuildingHeight(building) / 2,
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
        !hiddenBuildingIds.has(building.id) &&
        !removedDistrictIds.has(building.id) &&
        visibleDueToEvo;

      obj.scale.set(layout.width, getBuildingHeight(building), layout.depth);
      obj.color = computeColor(building.id);
      obj.updateMatrix();
      i++;
    });
    meshRef.current.computeBVH();
  }, [
    meshRef,
    buildingIds,
    layoutMap,
    hiddenBuildingIds,
    removedDistrictIds,
    evoConfig,
    isDiffMode,
    getBuildingHeight,
    computeColor,
    instanceIdToBuildingId,
    buildingIdToInstanceId,
    buildings,
  ]);

  const animateMeshInstanceChanges = useCallback(() => {
    if (meshRef === null || typeof meshRef === 'function' || !meshRef.current) {
      return;
    }
    const mesh = meshRef.current;

    buildingIdToInstanceId.forEach((instanceId, buildingId) => {
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
  }, [
    meshRef,
    buildingIdToInstanceId,
    layoutMap,
    getBuildingHeight,
    animationDuration,
  ]);

  // Compute mesh instances or animate changes
  useEffect(() => {
    if (meshRef === null || typeof meshRef === 'function' || !meshRef.current) {
      return;
    }

    if (meshRef.current.geometry !== geometry) {
      meshRef.current.geometry = geometry;
    }

    if (
      buildingIdToInstanceId.size > 0 &&
      buildingIds.length === buildingIdToInstanceId.size &&
      buildingIds.every((id) => buildingIdToInstanceId.has(id)) &&
      enableAnimations
    ) {
      animateMeshInstanceChanges();
    } else {
      computeMeshInstances();
    }
  }, [
    meshRef,
    buildingIds,
    enableAnimations,
    geometry,
    animateMeshInstanceChanges,
    computeMeshInstances,
    buildingIdToInstanceId,
  ]);

  // React on changes of color
  useEffect(() => {
    if (meshRef === null || typeof meshRef === 'function' || !meshRef.current) {
      return;
    }
    buildingIdToInstanceId.forEach((instanceId, buildingId) => {
      meshRef.current?.setColorAt(instanceId, computeColor(buildingId));
    });
  }, [
    meshRef,
    javaBuildingColor,
    cppBuildingColor,
    pythonBuildingColor,
    typescriptBuildingColor,
    otherBuildingColor,
    highlightedEntityColor,
    buildingIdToInstanceId,
    computeColor,
  ]);

  // React on changes of building visibility
  useEffect(() => {
    if (meshRef === null || typeof meshRef === 'function') {
      return;
    }
    if (!meshRef.current) return;

    // Update the visibility of the instances based
    instanceIdToBuildingId.forEach((buildingId, instanceId) => {
      // Set visibility based on hidden buildings
      meshRef.current?.setVisibilityAt(
        instanceId,
        !hiddenBuildingIds.has(buildingId) &&
          !removedDistrictIds.has(buildingId)
      );
    });
  }, [meshRef, instanceIdToBuildingId, hiddenBuildingIds, removedDistrictIds]);

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (meshRef === null || typeof meshRef === 'function') {
      return;
    }
    if (!meshRef.current) return;
    const { instanceId } = e;
    if (instanceId === undefined) return;
    e.stopPropagation();

    const buildingId = instanceIdToBuildingId.get(instanceId);
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

    const buildingId = instanceIdToBuildingId.get(instanceId);
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

    const buildingId = instanceIdToBuildingId.get(instanceId);
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

    const buildingId = instanceIdToBuildingId.get(instanceId);
    if (!buildingId) return;

    const building = useModelStore.getState().getBuilding(buildingId);
    if (!building) return;

    const targetPos = new THREE.Vector3();
    const tempMatrix = new THREE.Matrix4();
    meshRef.current.getMatrixAt(instanceId, tempMatrix);
    targetPos.setFromMatrixPosition(tempMatrix);

    // Check if we have data in an existing popup
    const existingPopup = popups.find((p) => p.entityId === buildingId);

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
      requestFileDetailedData(buildingId)
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
          enterImmersive(buildingId, targetPos);
        });
    } else {
      enterImmersive(buildingId, targetPos);
    }
  };

  const [handleClickWithPrevent, handleDoubleClickWithPrevent] =
    useClickPreventionOnDoubleClick(handleClick, handleDoubleClick);

  return (
    <instancedMesh2
      layers={sceneLayers.Building}
      ref={meshRef}
      name={`Buildings-${geometryType}-${city.name}`}
      args={[geometry, material.current]}
      onClick={handleClickWithPrevent}
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
  const hiddenLanguages = useVisualizationStore(
    (state) => state.hiddenLanguages
  );

  const {
    languageGeometryJava,
    languageGeometryCpp,
    languageGeometryPython,
    languageGeometryTypeScript,
    languageGeometryOther,
  } = useUserSettingsStore(
    useShallow((state) => ({
      languageGeometryJava:
        state.visualizationSettings.languageGeometryJava?.value,
      languageGeometryCpp:
        state.visualizationSettings.languageGeometryCpp?.value,
      languageGeometryPython:
        state.visualizationSettings.languageGeometryPython?.value,
      languageGeometryTypeScript:
        state.visualizationSettings.languageGeometryTypeScript?.value,
      languageGeometryOther:
        state.visualizationSettings.languageGeometryOther?.value,
    }))
  );

  const geometrySettings = useMemo(
    () => ({
      languageGeometryJava,
      languageGeometryCpp,
      languageGeometryPython,
      languageGeometryTypeScript,
      languageGeometryOther,
    }),
    [
      languageGeometryJava,
      languageGeometryCpp,
      languageGeometryPython,
      languageGeometryTypeScript,
      languageGeometryOther,
    ]
  );

  const visibleBuildingIds = useMemo(() => {
    return buildingIds.filter((id) => {
      const lang = getBuilding(id)?.language ?? 'LANGUAGE_UNSPECIFIED';
      return !hiddenLanguages.has(lang);
    });
  }, [buildingIds, getBuilding, hiddenLanguages]);

  const buildingsByGeometry = useMemo(
    () =>
      groupBuildingsByGeometry(
        visibleBuildingIds,
        getBuilding,
        geometrySettings
      ),
    [visibleBuildingIds, getBuilding, geometrySettings]
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
