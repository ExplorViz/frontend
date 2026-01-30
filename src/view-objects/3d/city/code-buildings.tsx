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
import { getMetricValues } from 'explorviz-frontend/src/utils/heatmap/class-heatmap-helper';
import { getSimpleHeatmapColor } from 'explorviz-frontend/src/utils/heatmap/simple-heatmap';
import calculateColorBrightness from 'explorviz-frontend/src/utils/helpers/threejs-helpers';
import {
  Building,
  City,
} from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import {
  MetricKey,
  metricMappingMultipliers,
} from 'explorviz-frontend/src/utils/settings/default-settings';
import gsap from 'gsap';
import { forwardRef, useCallback, useEffect, useRef } from 'react';
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

    const instanceIdToBuildingId = useRef(new Map<number, string>()).current;
    const buildingIdToInstanceId = useRef(new Map<string, number>()).current;

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
      buildingColor,
      buildingFootprint,
      buildingHeightMultiplier,
      enableHoverEffects,
      heightMetric,
      highlightedEntityColor,
      enableAnimations,
      animationDuration,
      entityOpacity,
    } = useUserSettingsStore(
      useShallow((state) => ({
        buildingColor: state.visualizationSettings.buildingColor.value,
        buildingFootprint: state.visualizationSettings.buildingFootprint.value,
        buildingHeightMultiplier:
          state.visualizationSettings.buildingHeightMultiplier.value,
        enableHoverEffects:
          state.visualizationSettings.enableHoverEffects.value,
        heightMetric: state.visualizationSettings.buildingHeightMetric.value,
        highlightedEntityColor: state.colors?.highlightedEntityColor,
        enableAnimations: state.visualizationSettings.enableAnimations.value,
        animationDuration: state.visualizationSettings.animationDuration.value,
        entityOpacity: state.visualizationSettings.entityOpacity.value,
      }))
    );

    const { heatmapActive, selectedBuildingMetric, selectedHeatmapGradient } =
      useHeatmapStore(
        useShallow((state) => ({
          heatmapActive: state.isActive(),
          selectedBuildingMetric: state.getSelectedBuildingMetric(),
          selectedHeatmapGradient: state.getSelectedGradient(),
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
        const metricValue = building.metrics?.[heightMetric] || 0;
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
        const dataModel = useModelStore.getState().getBuilding(buildingId);
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
      },
      [
        heatmapActive,
        selectedBuildingMetric,
        hoveredEntityId,
        highlightedEntityIds,
        buildingColor,
        enableHoverEffects,
      ]
    );

    const computeMeshInstances = useCallback(() => {
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
        obj.visible =
          !hiddenBuildingIds.has(building.id) &&
          !removedDistrictIds.has(building.id);
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
      getBuildingHeight,
      computeColor,
      instanceIdToBuildingId,
      buildingIdToInstanceId,
    ]);

    const animateMeshInstanceChanges = useCallback(() => {
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
      if (
        meshRef === null ||
        typeof meshRef === 'function' ||
        !meshRef.current
      ) {
        return;
      }

      if (
        buildingIdToInstanceId.size > 0 &&
        buildingIds.length > 0 &&
        enableAnimations
      ) {
        animateMeshInstanceChanges();
      } else {
        computeMeshInstances();
      }
    }, [
      meshRef,
      buildingIds,
      buildingIdToInstanceId.size,
      enableAnimations,
      animateMeshInstanceChanges,
      computeMeshInstances,
    ]);

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
    }, [
      meshRef,
      buildingColor,
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
    }, [
      meshRef,
      instanceIdToBuildingId,
      hiddenBuildingIds,
      removedDistrictIds,
    ]);

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
