import { extend, ThreeElement, ThreeEvent } from '@react-three/fiber';
import { InstancedMesh2 } from '@three.ez/instanced-mesh';
import { usePointerStop } from 'explorviz-frontend/src/hooks/pointer-stop';
import useClickPreventionOnDoubleClick from 'explorviz-frontend/src/hooks/useClickPreventionOnDoubleClick';
import { useHeatmapStore } from 'explorviz-frontend/src/stores/heatmap/heatmap-store';
import { useLayoutStore } from 'explorviz-frontend/src/stores/layout-store';
import { usePopupHandlerStore } from 'explorviz-frontend/src/stores/popup-handler';
import { useModelStore } from 'explorviz-frontend/src/stores/repos/model-repository';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { useVisibilityServiceStore } from 'explorviz-frontend/src/stores/visibility-service';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import {
  getHighlightingColorForEntity,
  toggleHighlightById,
} from 'explorviz-frontend/src/utils/city-rendering/highlighting';
import { getMetricValues } from 'explorviz-frontend/src/utils/heatmap/building-heatmap-helper';
import { getSimpleHeatmapColor } from 'explorviz-frontend/src/utils/heatmap/simple-heatmap';
import calculateColorBrightness from 'explorviz-frontend/src/utils/helpers/threejs-helpers';
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

/**
 * Groups building IDs by their language type.
 */
function groupBuildingsByLanguage(
  buildingIds: string[],
  getBuilding: (id: string) => Building | undefined
): Map<Language, string[]> {
  const groups = new Map<Language, string[]>();

  buildingIds.forEach((buildingId) => {
    const building = getBuilding(buildingId);
    if (!building) return;

    const lang = building.language ?? 'LANGUAGE_UNSPECIFIED';

    if (!groups.has(lang)) {
      groups.set(lang, []);
    }
    groups.get(lang)!.push(buildingId);
  });

  return groups;
}

interface LanguageGroupProps {
  language: Language;
  buildingIds: string[];
  city: City;
}

/**
 * Renders buildings for a single language with its own geometry.
 */
const LanguageGroup: React.FC<LanguageGroupProps> = ({
  language,
  buildingIds,
  city,
}) => {
  const meshRef = useRef<InstancedMesh2>(null);
  const material = useRef<MeshLambertMaterial>(new MeshLambertMaterial());

  const instanceIdToBuildingId = useRef(new Map<number, string>()).current;
  const buildingIdToInstanceId = useRef(new Map<string, number>()).current;

  const previousGeometryType = useRef<string | null>(null);

  const layoutMap = useLayoutStore.getState().getBuildingLayouts();

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
    languageGeometryJava,
    languageGeometryCpp,
    languageGeometryPython,
    languageGeometryTypeScript,
    languageGeometryOther,
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
      javaBuildingColor: state.visualizationSettings.javaBuildingColor?.value,
      cppBuildingColor: state.visualizationSettings.cppBuildingColor?.value,
      pythonBuildingColor:
        state.visualizationSettings.pythonBuildingColor?.value,
      typescriptBuildingColor:
        state.visualizationSettings.typescriptBuildingColor?.value,
      otherBuildingColor: state.visualizationSettings.otherBuildingColor?.value,
    }))
  );

  // Compute geometry type based on language setting
  const selectedGeometryType = useMemo(() => {
    switch (language) {
      case 'JAVA':
        return languageGeometryJava;
      case 'CPP':
        return languageGeometryCpp;
      case 'PYTHON':
        return languageGeometryPython;
      case 'TYPESCRIPT':
        return languageGeometryTypeScript;
      case 'JAVASCRIPT':
        return languageGeometryTypeScript;
      case 'PLAINTEXT':
      case 'LANGUAGE_UNSPECIFIED':
      default:
        return languageGeometryOther;
    }
  }, [
    language,
    languageGeometryJava,
    languageGeometryCpp,
    languageGeometryPython,
    languageGeometryTypeScript,
    languageGeometryOther,
  ]);

  // Compute color based on language setting
  const selectedLanguageColor = useMemo(() => {
    switch (language) {
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
  }, [
    language,
    javaBuildingColor,
    cppBuildingColor,
    pythonBuildingColor,
    typescriptBuildingColor,
    otherBuildingColor,
  ]);

  const geometry = useMemo(() => {
    switch (selectedGeometryType) {
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
  }, [selectedGeometryType]);

  const { heatmapActive, selectedBuildingMetric } = useHeatmapStore(
    useShallow((state) => ({
      heatmapActive: state.isActive(),
      selectedBuildingMetric: state.getSelectedBuildingMetric(),
    }))
  );

  const { addPopup } = usePopupHandlerStore(
    useShallow((state) => ({
      addPopup: state.addPopup,
    }))
  );

  const sceneLayers = useVisualizationStore((state) => state.sceneLayers);

  const getBuildingHeight = useCallback(
    (building: Building) => {
      const getMetricValue = (building: Building, metricKey: string): number => {
        if (metricKey === 'Function Count') {
          return building.functionIds?.length || 0;
        }
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
      const building = useModelStore.getState().getBuilding(buildingId);
      if (!building) {
        return new THREE.Color('red');
      }
      if (heatmapActive) {
        const metricValues = getMetricValues(building, selectedBuildingMetric!);
        return new THREE.Color(
          getSimpleHeatmapColor(metricValues.current, metricValues.max)
        );
      }

      if (evoConfig.renderOnlyDifferences && building.commitComparison) {
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

      let baseColor = isHighlighted
        ? getHighlightingColorForEntity(building.id)
        : new THREE.Color(selectedLanguageColor);

      if (enableHoverEffects && isHovered) {
        baseColor = calculateColorBrightness(baseColor, 1.1);
      }

      return baseColor;
    },
    [
      heatmapActive,
      selectedBuildingMetric,
      evoConfig.renderOnlyDifferences,
      addedBuildingColor,
      removedBuildingColor,
      modifiedBuildingColor,
      unchangedBuildingColor,
      hoveredEntityId,
      highlightedEntityIds,
      selectedLanguageColor,
      enableHoverEffects,
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
        if (evoConfig.renderOnlyDifferences) {
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
    getBuildingHeight,
    computeColor,
    instanceIdToBuildingId,
    buildingIdToInstanceId,
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

    const geometryChanged =
      previousGeometryType.current !== null &&
      previousGeometryType.current !== selectedGeometryType;

    if (geometryChanged || meshRef.current.geometry !== geometry) {
      meshRef.current.geometry = geometry;
    }

    if (
      !geometryChanged &&
      buildingIdToInstanceId.size > 0 &&
      buildingIds.length === buildingIdToInstanceId.size &&
      buildingIds.every((id) => buildingIdToInstanceId.has(id)) &&
      enableAnimations
    ) {
      animateMeshInstanceChanges();
    } else {
      computeMeshInstances();
    }

    previousGeometryType.current = selectedGeometryType;
  }, [
    meshRef,
    buildingIds,
    enableAnimations,
    selectedGeometryType,
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

    // Toggle highlighting
    toggleHighlightById(buildingId);
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

  const handleDoubleClick = (/*event: any*/) => {};

  const handlePointerStop = (e: ThreeEvent<PointerEvent>) => {
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

  const pointerStopHandlers = usePointerStop(handlePointerStop);

  const [handleClickWithPrevent, handleDoubleClickWithPrevent] =
    useClickPreventionOnDoubleClick(handleClick, handleDoubleClick);

  return (
    <instancedMesh2
      layers={sceneLayers.Building}
      ref={meshRef}
      name={`Buildings-${language}-${city.name}`}
      args={[geometry, material.current]}
      onClick={handleClickWithPrevent}
      {...(enableHoverEffects && {
        onPointerOver: handleOnPointerOver,
        onPointerOut: handleOnPointerOut,
      })}
      onDoubleClick={handleDoubleClickWithPrevent}
      {...pointerStopHandlers}
      frustumCulled={false}
    ></instancedMesh2>
  );
};

interface CodeBuildingsArgs {
  buildingIds: string[];
  city: City;
}

/**
 * Groups buildings by language and renders a LanguageGroup for each language.
 */
const CodeBuildings: React.FC<CodeBuildingsArgs> = ({ buildingIds, city }) => {
  const getBuilding = useModelStore.getState().getBuilding;
  const hiddenLanguages = useVisualizationStore(
    (state) => state.hiddenLanguages
  );

  const buildingsByLanguage = useMemo(
    () => groupBuildingsByLanguage(buildingIds, getBuilding),
    [buildingIds, getBuilding]
  );

  // Filter the hidden langiages out
  const filteredBuildingsByLanguage = useMemo(() => {
    return Array.from(buildingsByLanguage.entries()).filter(
      ([lang, _]) => !hiddenLanguages.has(lang)
    );
  }, [buildingsByLanguage, hiddenLanguages]);

  if (buildingIds.length === 0) {
    return null;
  }

  return (
    <>
      {filteredBuildingsByLanguage.map(([lang, langBuildingIds]) => (
        <LanguageGroup
          key={`${city.id}-${lang}`}
          language={lang}
          buildingIds={langBuildingIds}
          city={city}
        />
      ))}
    </>
  );
};

export default CodeBuildings;
