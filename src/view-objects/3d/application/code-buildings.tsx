import { extend, ThreeElement, ThreeEvent } from '@react-three/fiber';
import { InstancedMesh2 } from '@three.ez/instanced-mesh';
import { usePointerStop } from 'explorviz-frontend/src/hooks/pointer-stop';
import useClickPreventionOnDoubleClick from 'explorviz-frontend/src/hooks/useClickPreventionOnDoubleClick';
import { useHeatmapStore } from 'explorviz-frontend/src/stores/heatmap/heatmap-store';
import { useLayoutStore } from 'explorviz-frontend/src/stores/layout-store';
import { usePopupHandlerStore } from 'explorviz-frontend/src/stores/popup-handler';
import { useEvolutionDataRepositoryStore } from 'explorviz-frontend/src/stores/repos/evolution-data-repository';
import { useModelStore } from 'explorviz-frontend/src/stores/repos/model-repository';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { useVisibilityServiceStore } from 'explorviz-frontend/src/stores/visibility-service';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import {
  getHighlightingColorForEntity,
  toggleHighlightById,
} from 'explorviz-frontend/src/utils/application-rendering/highlighting';
import { getMetricValues } from 'explorviz-frontend/src/utils/heatmap/class-heatmap-helper';
import { getSimpleHeatmapColor } from 'explorviz-frontend/src/utils/heatmap/simple-heatmap';
import calculateColorBrightness from 'explorviz-frontend/src/utils/helpers/threejs-helpers';
import { City } from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import {
  Class,
  TypeOfAnalysis,
} from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import {
  MetricKey,
  metricMappingMultipliers,
} from 'explorviz-frontend/src/utils/settings/default-settings';
import gsap from 'gsap';
import { forwardRef, useEffect, useRef } from 'react';
import * as THREE from 'three';
import {
  BoxGeometry,
  Matrix4,
  MeshLambertMaterial,
  Quaternion,
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

interface Args {
  buildingIds: string[];
  city: City;
}

// eslint-disable-next-line
const CodeBuildings = forwardRef<InstancedMesh2, Args>(
  ({ buildingIds, city }, meshRef) => {
    const geometry = useRef<BoxGeometry>(new BoxGeometry());
    const material = useRef<MeshLambertMaterial>(new MeshLambertMaterial());

    const instanceIdToBuildingId = new Map<number, string>();
    const buildingIdToInstanceId = new Map<string, number>();
    const buildingIdToClass = new Map<string, Class>();

    const layoutMap = useLayoutStore.getState().getBuildingLayouts();

    const {
      hiddenBuildingIds,
      removedDistrictIds,
      hoveredEntityId,
      setHoveredEntity,
      highlightedEntityIds,
    } = useVisualizationStore(
      useShallow((state) => ({
        hiddenBuildingIds: state.hiddenClassIds,
        removedDistrictIds: state.removedDistrictIds,
        hoveredEntityId: state.hoveredEntityId,
        setHoveredEntity: state.actions.setHoveredEntityId,
        highlightedEntityIds: state.highlightedEntityIds,
      }))
    );

    const getMetricForBuilding = useEvolutionDataRepositoryStore(
      (state) => state.getMetricForClass
    );

    const commitComparison = useEvolutionDataRepositoryStore
      .getState()
      .getCommitComparisonByAppName(city.name);

    const { evoConfig } = useVisibilityServiceStore(
      useShallow((state) => ({
        evoConfig: state._evolutionModeRenderingConfiguration,
      }))
    );

    const {
      addedBuildingColor,
      buildingColor,
      buildingFootprint,
      buildingHeightMultiplier,
      enableHoverEffects,
      heightMetric,
      highlightedEntityColor,
      modifiedBuildingColor,
      removedBuildingColor,
      unchangedBuildingColor,
      enableAnimations,
      animationDuration,
      entityOpacity,
    } = useUserSettingsStore(
      useShallow((state) => ({
        addedBuildingColor: state.visualizationSettings.addedClassColor.value,
        buildingColor: state.visualizationSettings.classColor.value,
        buildingFootprint: state.visualizationSettings.classFootprint.value,
        buildingHeightMultiplier:
          state.visualizationSettings.classHeightMultiplier.value,
        enableHoverEffects:
          state.visualizationSettings.enableHoverEffects.value,
        heightMetric: state.visualizationSettings.classHeightMetric.value,
        highlightedEntityColor: state.colors?.highlightedEntityColor,
        modifiedBuildingColor:
          state.visualizationSettings.modifiedClassColor.value,
        removedBuildingColor:
          state.visualizationSettings.removedClassColor.value,
        unchangedBuildingColor:
          state.visualizationSettings.unchangedClassColor.value,
        enableAnimations: state.visualizationSettings.enableAnimations.value,
        animationDuration: state.visualizationSettings.animationDuration.value,
        entityOpacity: state.visualizationSettings.entityOpacity.value,
      }))
    );

    const { heatmapActive, selectedBuildingMetric, selectedHeatmapGradient } =
      useHeatmapStore(
        useShallow((state) => ({
          heatmapActive: state.isActive(),
          selectedBuildingMetric: state.getSelectedClassMetric(),
          selectedHeatmapGradient: state.getSelectedGradient(),
        }))
      );

    const { addPopup } = usePopupHandlerStore(
      useShallow((state) => ({
        addPopup: state.addPopup,
      }))
    );

    const sceneLayers = useVisualizationStore((state) => state.sceneLayers);

    const getBuildingHeight = (dataModel: Class) => {
      return (
        buildingFootprint +
        metricMappingMultipliers[heightMetric as MetricKey] *
          buildingHeightMultiplier *
          getMetricForBuilding(
            dataModel,
            city.name,
            heightMetric,
            evoConfig.renderOnlyDifferences
          )
      );
    };

    // Compute mesh instances or animate changes
    useEffect(() => {
      if (
        meshRef === null ||
        typeof meshRef === 'function' ||
        !meshRef.current
      ) {
        return;
      }

      if (
        buildingIdToInstanceId.size > 0 &&
        buildingIdToClass.size === buildingIds.length &&
        enableAnimations
      ) {
        animateMeshInstanceChanges();
      } else {
        computeMeshInstances();
      }
    }, [[], buildingIds, layoutMap, heightMetric]);

    // React on changes of color
    useEffect(() => {
      if (
        meshRef === null ||
        typeof meshRef === 'function' ||
        !meshRef.current
      ) {
        return;
      }
      buildingIdToInstanceId.forEach((instanceId, buildingId) => {
        meshRef.current?.setColorAt(instanceId, computeColor(buildingId));
      });
    }, [buildingColor, highlightedEntityColor]);

    const computeColor = (buildingId: string) => {
      const dataModel = buildingIdToClass.get(buildingId);
      if (!dataModel) {
        return new THREE.Color('red');
      }
      if (heatmapActive) {
        const metricValues = getMetricValues(
          dataModel,
          selectedBuildingMetric!
        );
        return new THREE.Color(
          getSimpleHeatmapColor(metricValues.current, metricValues.max)
        );
      }
      if (
        evoConfig.renderOnlyDifferences &&
        commitComparison &&
        dataModel.fqn
      ) {
        if (commitComparison.added.includes(dataModel.fqn)) {
          return new THREE.Color(addedBuildingColor);
        } else if (commitComparison.deleted.includes(dataModel.fqn)) {
          return new THREE.Color(removedBuildingColor);
        } else if (commitComparison.modified.includes(dataModel.fqn)) {
          return new THREE.Color(modifiedBuildingColor);
        } else {
          return new THREE.Color(unchangedBuildingColor);
        }
      }

      if (dataModel.originOfData === TypeOfAnalysis.Editing) {
        return new THREE.Color(addedBuildingColor);
      }

      const isHovered = hoveredEntityId === dataModel.id;
      const isHighlighted = highlightedEntityIds.has(dataModel.id);

      const baseColor = isHighlighted
        ? getHighlightingColorForEntity(dataModel.id)
        : new THREE.Color(buildingColor);

      if (enableHoverEffects && isHovered) {
        return calculateColorBrightness(baseColor, 1.1);
      } else {
        return baseColor;
      }
    };

    // React on changes of building visibility
    useEffect(() => {
      if (meshRef === null || typeof meshRef === 'function') {
        return;
      }
      if (!meshRef.current) return;

      // Update the visibility of the instances based on classData
      instanceIdToBuildingId.forEach((buildingId, instanceId) => {
        // Set visibility based on classData
        meshRef.current?.setVisibilityAt(
          instanceId,
          !hiddenBuildingIds.has(buildingId) &&
            !removedDistrictIds.has(buildingId)
        );
      });
    }, [hiddenBuildingIds, removedDistrictIds]);

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

    useEffect(() => {
      if (
        meshRef === null ||
        typeof meshRef === 'function' ||
        !meshRef.current
      ) {
        return;
      }

      buildingIdToInstanceId.forEach((instanceId, classId) => {
        meshRef.current?.setColorAt(instanceId, computeColor(classId));
      });
    }, [
      highlightedEntityIds,
      hoveredEntityId,
      evoConfig.renderOnlyDifferences,
      selectedBuildingMetric,
      selectedHeatmapGradient,
      heatmapActive,
    ]);

    useEffect(() => {
      material.current.transparent = entityOpacity < 1.0;
      material.current.opacity = entityOpacity;
      material.current.needsUpdate = true;
    }, [entityOpacity, material]);

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
      const classModel = buildingIdToClass.get(buildingId);
      addPopup({
        entityId: buildingId,
        entity: classModel,
        position: {
          x: e.clientX,
          y: e.clientY,
        },
      });
    };

    const pointerStopHandlers = usePointerStop(handlePointerStop);

    const [handleClickWithPrevent, handleDoubleClickWithPrevent] =
      useClickPreventionOnDoubleClick(handleClick, handleDoubleClick);

    const computeMeshInstances = () => {
      if (
        meshRef === null ||
        typeof meshRef === 'function' ||
        !meshRef.current
      ) {
        return;
      }

      meshRef.current.clearInstances();
      instanceIdToBuildingId.clear();
      buildingIdToInstanceId.clear();
      buildingIdToClass.clear();

      let i = 0;
      meshRef.current.addInstances(buildingIds.length, (obj) => {
        const classData = useModelStore.getState().getClass(buildingIds[i]);
        if (!classData) {
          return;
        }
        instanceIdToBuildingId.set(obj.id, classData.id);
        buildingIdToInstanceId.set(classData.id, obj.id);
        buildingIdToClass.set(classData.id, classData);
        const layout = layoutMap.get(classData.id);
        if (!layout) {
          return;
        }
        obj.position.set(
          layout.center.x,
          layout.position.y + getBuildingHeight(classData) / 2,
          layout.center.z
        );
        obj.visible =
          !hiddenBuildingIds.has(classData.id) &&
          !removedDistrictIds.has(classData.id);
        obj.scale.set(layout.width, getBuildingHeight(classData), layout.depth);
        obj.color = computeColor(classData.id);
        obj.updateMatrix();
        i++;
      });
      meshRef.current.computeBVH();
    };

    const animateMeshInstanceChanges = () => {
      if (
        meshRef === null ||
        typeof meshRef === 'function' ||
        !meshRef.current
      ) {
        return;
      }
      const mesh = meshRef.current;

      buildingIdToInstanceId.forEach((instanceId, buildingId) => {
        const tempMatrix = new Matrix4();
        const pos = new Vector3();
        const quat = new Quaternion();
        const scale = new Vector3();

        const classModel = buildingIdToClass.get(buildingId);
        const layout = layoutMap.get(buildingId);
        if (!classModel || !layout) return;

        const targetHeight = getBuildingHeight(classModel);
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
            if (!meshRef) return;
            mesh.setMatrixAt(instanceId, tempMatrix);
          },
        });
      });
    };

    return (
      <instancedMesh2
        layers={sceneLayers.Building}
        ref={meshRef}
        name={'Buildings of ' + city.name}
        args={[geometry.current, material.current]}
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
  }
);

export default CodeBuildings;
