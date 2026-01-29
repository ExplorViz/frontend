import { extend, ThreeElement, ThreeEvent } from '@react-three/fiber';
import { InstancedMesh2 } from '@three.ez/instanced-mesh';
import { usePointerStop } from 'explorviz-frontend/src/hooks/pointer-stop';
import useClickPreventionOnDoubleClick from 'explorviz-frontend/src/hooks/useClickPreventionOnDoubleClick';
import { useCollaborationSessionStore } from 'explorviz-frontend/src/stores/collaboration/collaboration-session';
import { useHeatmapStore } from 'explorviz-frontend/src/stores/heatmap/heatmap-store';
import { useLayoutStore } from 'explorviz-frontend/src/stores/layout-store';
import { usePopupHandlerStore } from 'explorviz-frontend/src/stores/popup-handler';
import { useEvolutionDataRepositoryStore } from 'explorviz-frontend/src/stores/repos/evolution-data-repository';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { useVisibilityServiceStore } from 'explorviz-frontend/src/stores/visibility-service';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import * as EntityManipulation from 'explorviz-frontend/src/utils/application-rendering/entity-manipulation';
import {
  getHighlightingColorForEntity,
  toggleHighlightById,
} from 'explorviz-frontend/src/utils/application-rendering/highlighting';
import calculateColorBrightness from 'explorviz-frontend/src/utils/helpers/threejs-helpers';
import {
  Application,
  Package,
  TypeOfAnalysis,
} from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import BoxLayout from 'explorviz-frontend/src/utils/layout/box-layout';
import gsap from 'gsap';
import { forwardRef, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  BoxGeometry,
  Color,
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
  packages: Package[];
  layoutMap: Map<string, BoxLayout>;
  application: Application;
}

// eslint-disable-next-line
const CityDistricts = forwardRef<InstancedMesh2, Args>(
  ({ packages, layoutMap, application }, ref) => {
    const geometry = useRef<BoxGeometry>(new BoxGeometry());
    const material = useRef<MeshLambertMaterial>(new MeshLambertMaterial());

    const instanceIdToComponentId = useMemo(
      () => new Map<number, string>(),
      []
    );
    const componentIdToInstanceId = useMemo(
      () => new Map<string, number>(),
      []
    );
    const componentIdToPackage = useMemo(() => new Map<string, Package>(), []);

    const meshRef = useRef<InstancedMesh2 | null>(null);

    const {
      closedComponentIds,
      hiddenComponentIds,
      highlightedEntityIds,
      hoveredEntityId,
      removedComponentIds,
      setHoveredEntity,
    } = useVisualizationStore(
      useShallow((state) => ({
        closedComponentIds: state.closedDistrictIds,
        hiddenComponentIds: state.hiddenDistrictIds,
        highlightedEntityIds: state.highlightedEntityIds,
        hoveredEntityId: state.hoveredEntityId,
        removedComponentIds: state.removedDistrictIds,
        setHoveredEntity: state.actions.setHoveredEntityId,
      }))
    );

    const {
      castShadows,
      closedDistrictHeight,
      districtRootLevelColor,
      districtDeepestLevelColor,
      enableAnimations,
      enableHoverEffects,
      highlightedEntityColor,
      openedDistrictHeight,
      addedDistrictColor,
      removedDistrictColor,
      unchangedDistrictColor,
      animationDuration,
      entityOpacity,
    } = useUserSettingsStore(
      useShallow((state) => ({
        castShadows: state.visualizationSettings.castShadows.value,
        highlightedEntityColor:
          state.visualizationSettings.highlightedEntityColor.value,
        districtRootLevelColor:
          state.visualizationSettings.districtRootLevelColor.value,
        districtDeepestLevelColor:
          state.visualizationSettings.districtDeepestLevelColor.value,
        closedDistrictHeight:
          state.visualizationSettings.closedDistrictHeight.value,
        openedDistrictHeight:
          state.visualizationSettings.openedDistrictHeight.value,
        enableAnimations: state.visualizationSettings.enableAnimations.value,
        enableHoverEffects:
          state.visualizationSettings.enableHoverEffects.value,
        addedDistrictColor:
          state.visualizationSettings.addedDistrictColor.value,
        removedDistrictColor:
          state.visualizationSettings.removedDistrictColor.value,
        unchangedDistrictColor:
          state.visualizationSettings.unchangedDistrictColor.value,
        animationDuration: state.visualizationSettings.animationDuration.value,
        entityOpacity: state.visualizationSettings.entityOpacity.value,
      }))
    );

    const isOnline = useCollaborationSessionStore.getState().isOnline();

    const { heatmapActive, selectedClassMetric } = useHeatmapStore(
      useShallow((state) => ({
        heatmapActive: state.isActive(),
        selectedClassMetric: state.getSelectedClassMetric(),
      }))
    );

    const commitComparison = useEvolutionDataRepositoryStore
      .getState()
      .getCommitComparisonByAppName(application.name);

    const { evoConfig } = useVisibilityServiceStore(
      useShallow((state) => ({
        evoConfig: state._evolutionModeRenderingConfiguration,
      }))
    );

    const { addPopup } = usePopupHandlerStore(
      useShallow((state) => ({
        addPopup: state.addPopup,
      }))
    );

    const sceneLayers = useVisualizationStore((state) => state.sceneLayers);

    const computeColor = useCallback(
      (componentId: string) => {
        const component = componentIdToPackage.get(componentId);
        if (!component) return new Color('white');

        if (heatmapActive) {
          return new Color('white');
        }

        if (
          evoConfig.renderOnlyDifferences &&
          commitComparison &&
          component.fqn
        ) {
          if (commitComparison.addedPackages.includes(component.fqn)) {
            return new Color(addedDistrictColor);
          } else if (commitComparison.deletedPackages.includes(component.fqn)) {
            return new Color(removedDistrictColor);
          } else {
            return new Color(unchangedDistrictColor);
          }
        }

        if (component.originOfData === TypeOfAnalysis.Editing) {
          return new Color(addedDistrictColor);
        }

        const isHovered = hoveredEntityId === componentId;
        const isHighlighted = highlightedEntityIds.has(componentId);

        const layout = layoutMap.get(componentId);
        if (!layout) return new Color('white');

        let baseColor: Color;
        if (isHighlighted) {
          baseColor = getHighlightingColorForEntity(componentId);
        } else {
          // Calculate gradient color based on level
          const rootLevel = 1;
          const deepestLevel = useLayoutStore.getState().maxDistrictDepth ?? 20;
          if (rootLevel === deepestLevel) {
            // All components are at the same level, use top level color
            baseColor = new Color(districtRootLevelColor);
          } else {
            // Interpolate between top and deepest level colors
            const alpha =
              (layout.level - rootLevel) / (deepestLevel - rootLevel); // 0.0 to 1.0
            const rootLevelColor = new Color(districtRootLevelColor);
            const deepestLevelColor = new Color(districtDeepestLevelColor);
            baseColor = rootLevelColor.clone().lerp(deepestLevelColor, alpha);
          }
        }

        if (enableHoverEffects && isHovered) {
          return calculateColorBrightness(baseColor, 1.1);
        } else {
          return baseColor;
        }
      },
      [
        addedDistrictColor,
        removedDistrictColor,
        unchangedDistrictColor,
        districtRootLevelColor,
        districtDeepestLevelColor,
        enableHoverEffects,
        hoveredEntityId,
        highlightedEntityIds,
        heatmapActive,
        layoutMap,
        evoConfig.renderOnlyDifferences,
        commitComparison,
        componentIdToPackage,
      ]
    );

    const computeInstances = useCallback(() => {
      // Early return
      if (ref === null || typeof ref === 'function') {
        return;
      }
      if (!meshRef.current) return;
      meshRef.current.clearInstances();
      instanceIdToComponentId.clear();
      componentIdToInstanceId.clear();
      componentIdToPackage.clear();

      const mesh = meshRef.current.addInstances(
        packages.length,
        (obj, index) => {
          const component = packages[index];
          if (!component) {
            return;
          }

          const layout = layoutMap.get(component.id);
          if (!layout) {
            return;
          }

          instanceIdToComponentId.set(obj.id, component.id);
          componentIdToInstanceId.set(component.id, obj.id);
          componentIdToPackage.set(component.id, component);

          const isOpen = !closedComponentIds.has(component.id);
          const isVisible =
            !hiddenComponentIds.has(component.id) &&
            !removedComponentIds.has(component.id);

          const closedPosition = layout.center.clone();
          // Y-Position of layout is center of opened component
          closedPosition.y = layout.positionY + closedDistrictHeight / 2;

          if (isOpen) {
            obj.position.set(layout.center.x, layout.center.y, layout.center.z);
          } else {
            obj.position.set(
              closedPosition.x,
              closedPosition.y,
              closedPosition.z
            );
          }

          obj.scale.set(
            layout.width,
            isOpen ? openedDistrictHeight : closedDistrictHeight,
            layout.depth
          );
          obj.visible = isVisible;
          obj.color = computeColor(component.id);
          obj.updateMatrix();
        }
      );
      mesh.computeBVH();
    }, [
      ref,
      packages,
      layoutMap,
      closedComponentIds,
      hiddenComponentIds,
      removedComponentIds,
      closedDistrictHeight,
      openedDistrictHeight,
      computeColor,
      componentIdToPackage,
      componentIdToInstanceId,
      instanceIdToComponentId,
    ]);

    const animateComponentChange = useCallback(() => {
      const currentMeshRef = meshRef.current;
      if (!currentMeshRef) return;

      instanceIdToComponentId.forEach((componentId, instanceId) => {
        const tempMatrix = new Matrix4();
        const pos = new Vector3();
        const quat = new Quaternion();
        const scale = new Vector3();

        const isOpen = !closedComponentIds.has(componentId);

        // target values based on layout / component state
        const layout = layoutMap.get(componentId);
        if (!layout) return;

        const targetPositionX = layout.center.x;
        const targetPositionY = isOpen
          ? layout.center.y
          : layout.positionY + closedDistrictHeight / 2;
        const targetPositionZ = layout.center.z;
        const targetWidth = layout.width;
        const targetDepth = layout.depth;
        const targetHeight = isOpen
          ? openedDistrictHeight
          : closedDistrictHeight;

        try {
          currentMeshRef.getMatrixAt(instanceId, tempMatrix);
        } catch (err) {
          console.error('Failed to get matrix at', instanceId, err);
          return;
        }
        tempMatrix.decompose(pos, quat, scale);

        // skip animation if nothing changed for the component instance
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

        // current values for animation
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
          // animate to target
          width: targetWidth,
          height: targetHeight,
          depth: targetDepth,
          positionX: targetPositionX,
          positionY: targetPositionY,
          positionZ: targetPositionZ,
          onUpdate: () => {
            // update local pos/scale, compose matrix and write back
            scale.x = values.width;
            scale.y = values.height;
            scale.z = values.depth;
            pos.x = values.positionX;
            pos.y = values.positionY;
            pos.z = values.positionZ;
            tempMatrix.compose(pos, quat, scale);
            // use captured currentMeshRef to avoid stale ref issues
            currentMeshRef.setMatrixAt(instanceId, tempMatrix);
          },
        });
      });
    }, [
      closedComponentIds,
      layoutMap,
      closedDistrictHeight,
      openedDistrictHeight,
      animationDuration,
      instanceIdToComponentId,
    ]);

    useEffect(() => {
      if (ref === null || typeof ref === 'function' || !meshRef.current) {
        return;
      }

      if (
        componentIdToInstanceId.size > 0 &&
        componentIdToInstanceId.size === packages.length &&
        enableAnimations
      ) {
        animateComponentChange();
      } else {
        computeInstances();
      }
    }, [
      packages.length,
      enableAnimations,
      animateComponentChange,
      computeInstances,
      ref,
      componentIdToInstanceId.size,
    ]);

    useEffect(() => {
      if (ref === null || typeof ref === 'function' || !meshRef.current) {
        return;
      }
      componentIdToInstanceId.forEach((instanceId, componentId) => {
        meshRef.current?.setVisibilityAt(
          instanceId,
          !hiddenComponentIds.has(componentId) &&
            !removedComponentIds.has(componentId)
        );
      });
    }, [hiddenComponentIds, removedComponentIds, ref, componentIdToInstanceId]);

    useEffect(() => {
      if (ref === null || typeof ref === 'function') {
        return;
      }
      if (!meshRef.current) return;

      // only compute the bvh on mount
      meshRef.current.computeBVH();
    }, [ref]);

    useEffect(() => {
      material.current.transparent = entityOpacity < 1.0;
      material.current.opacity = entityOpacity;
      material.current.needsUpdate = true;
    }, [entityOpacity, material]);

    useEffect(() => {
      if (ref === null || typeof ref === 'function' || !meshRef.current) {
        return;
      }
      componentIdToInstanceId.forEach((instanceId, componentId) => {
        meshRef.current?.setColorAt(instanceId, computeColor(componentId));
      });
    }, [
      highlightedEntityIds,
      highlightedEntityColor,
      isOnline,
      hoveredEntityId,
      heatmapActive,
      selectedClassMetric,
      districtRootLevelColor,
      districtDeepestLevelColor,
      componentIdToInstanceId,
      computeColor,
      ref,
    ]);

    const handleClick = (e: ThreeEvent<MouseEvent>) => {
      if (ref === null || typeof ref === 'function') {
        return;
      }
      if (!meshRef.current) return;
      const { instanceId } = e;
      if (instanceId === undefined) return;
      e.stopPropagation();
      const componentId = instanceIdToComponentId.get(instanceId);
      if (!componentId) return;
      // Toggle highlighting
      toggleHighlightById(componentId);
    };

    const handleDoubleClick = (e: ThreeEvent<MouseEvent>) => {
      if (ref === null || typeof ref === 'function') {
        return;
      }
      if (!meshRef.current) {
        return;
      }
      const { instanceId } = e;

      if (instanceId === undefined) {
        return;
      }
      e.stopPropagation();
      const componentId = instanceIdToComponentId.get(instanceId);
      if (!componentId) {
        return;
      }

      // Toggle open/close state
      if (closedComponentIds.has(componentId)) {
        EntityManipulation.openComponent(componentId);
      } else {
        EntityManipulation.closeComponent(componentId);
      }
    };

    const handleOnPointerOver = (e: ThreeEvent<MouseEvent>) => {
      if (ref === null || typeof ref === 'function') {
        return;
      }
      if (!meshRef.current) return;
      const { instanceId } = e;
      if (instanceId === undefined) return;
      e.stopPropagation();

      const componentId = instanceIdToComponentId.get(instanceId);
      if (!componentId) return;

      setHoveredEntity(componentId);
    };

    const handleOnPointerOut = (event: ThreeEvent<MouseEvent>) => {
      event.stopPropagation();
      setHoveredEntity(null);
    };

    const handlePointerStop = (e: ThreeEvent<PointerEvent>) => {
      if (ref === null || typeof ref === 'function') {
        return;
      }
      if (!meshRef.current) return;
      const { instanceId } = e;
      if (instanceId === undefined) return;
      e.stopPropagation();

      const componentId = instanceIdToComponentId.get(instanceId);
      if (!componentId) return;
      const component = componentIdToPackage.get(componentId);
      addPopup({
        entityId: componentId,
        entity: component,
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
        layers={sceneLayers.District}
        ref={meshRef}
        name={'Districts of ' + application.name}
        castShadow={castShadows}
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

export default CityDistricts;
