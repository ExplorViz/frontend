import { extend, ThreeElement, ThreeEvent } from '@react-three/fiber';
import { InstancedMesh2 } from '@three.ez/instanced-mesh';
import { usePointerStop } from 'explorviz-frontend/src/hooks/pointer-stop';
import useClickPreventionOnDoubleClick from 'explorviz-frontend/src/hooks/useClickPreventionOnDoubleClick';
import { useCollaborationSessionStore } from 'explorviz-frontend/src/stores/collaboration/collaboration-session';
import { useHeatmapStore } from 'explorviz-frontend/src/stores/heatmap/heatmap-store';
import { useHighlightingStore } from 'explorviz-frontend/src/stores/highlighting';
import { usePopupHandlerStore } from 'explorviz-frontend/src/stores/popup-handler';
import { useEvolutionDataRepositoryStore } from 'explorviz-frontend/src/stores/repos/evolution-data-repository';
import { useModelStore } from 'explorviz-frontend/src/stores/repos/model-repository';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { useVisibilityServiceStore } from 'explorviz-frontend/src/stores/visibility-service';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import * as EntityManipulation from 'explorviz-frontend/src/utils/application-rendering/entity-manipulation';
import { toggleHighlightById } from 'explorviz-frontend/src/utils/application-rendering/highlighting';
import calculateColorBrightness from 'explorviz-frontend/src/utils/helpers/threejs-helpers';
import {
  Application,
  Package,
  TypeOfAnalysis,
} from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import BoxLayout from 'explorviz-frontend/src/view-objects/layout-models/box-layout';
import gsap from 'gsap';
import { forwardRef, useEffect, useMemo, useRef } from 'react';
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
    const geometry = useMemo(() => new BoxGeometry(), []);

    const material = useMemo(() => new MeshLambertMaterial(), []);

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
        closedComponentIds: state.closedComponentIds,
        hiddenComponentIds: state.hiddenComponentIds,
        highlightedEntityIds: state.highlightedEntityIds,
        hoveredEntityId: state.hoveredEntityId,
        removedComponentIds: state.removedComponentIds,
        setHoveredEntity: state.actions.setHoveredEntityId,
      }))
    );

    const {
      castShadows,
      closedComponentHeight,
      componentEvenColor,
      componentOddColor,
      enableAnimations,
      enableHoverEffects,
      highlightedEntityColor,
      openedComponentHeight,
      addedComponentColor,
      removedComponentColor,
      unChangedComponentColor,
      animationDuration,
    } = useUserSettingsStore(
      useShallow((state) => ({
        castShadows: state.visualizationSettings.castShadows.value,
        highlightedEntityColor:
          state.visualizationSettings.highlightedEntityColor.value,
        componentEvenColor:
          state.visualizationSettings.componentEvenColor.value,
        componentOddColor: state.visualizationSettings.componentOddColor.value,
        closedComponentHeight:
          state.visualizationSettings.closedComponentHeight.value,
        openedComponentHeight:
          state.visualizationSettings.openedComponentHeight.value,
        enableAnimations: state.visualizationSettings.enableAnimations.value,
        enableHoverEffects:
          state.visualizationSettings.enableHoverEffects.value,
        addedComponentColor:
          state.visualizationSettings.addedComponentColor.value,
        removedComponentColor:
          state.visualizationSettings.removedComponentColor.value,
        unChangedComponentColor:
          state.visualizationSettings.unchangedComponentColor.value,
        animationDuration: state.visualizationSettings.animationDuration.value,
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

    const computeInstances = () => {
      // Early return
      if (ref === null || typeof ref === 'function') {
        return;
      }
      if (!meshRef.current) return;
      meshRef.current?.clearInstances();
      instanceIdToComponentId.clear();
      componentIdToInstanceId.clear();
      componentIdToPackage.clear();

      const mesh = meshRef.current.addInstances(
        packages.length,
        (obj, index) => {
          const i = index;
          if (!packages[i]) {
            console.log(`No package found at index ${i}`);
            return;
          }
          const layout = layoutMap.get(packages[i].id);
          if (!layout) {
            console.log(
              `No layout found for component with id ${packages[i].id}`
            );
            return;
          }
          instanceIdToComponentId.set(obj.id, packages[i].id);
          componentIdToInstanceId.set(packages[i].id, obj.id);
          componentIdToPackage.set(packages[i].id, packages[i]);
          const isOpen = !closedComponentIds.has(packages[i].id);
          const isVisible =
            !hiddenComponentIds.has(packages[i].id) &&
            !removedComponentIds.has(packages[i].id);
          const closedPosition = layout.position.clone();
          // Y-Position of layout is center of opened component
          closedPosition.y =
            layout.positionY +
            (closedComponentHeight - openedComponentHeight) / 2;
          if (isOpen) {
            obj.position.set(
              layout!.position.x,
              layout!.position.y,
              layout!.position.z
            );
          } else {
            obj.position.set(
              closedPosition.x,
              closedPosition.y,
              closedPosition.z
            );
          }
          obj.scale.set(
            layout!.width,
            isOpen ? openedComponentHeight : closedComponentHeight,
            layout!.depth
          );
          obj.visible = isVisible;
          obj.color = computeColor(packages[i].id);
          obj.updateMatrix();
        }
      );
      mesh.computeBVH();
    };

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
    }, [[], closedComponentIds, layoutMap, packages]);

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
    }, [hiddenComponentIds, removedComponentIds]);

    useEffect(() => {
      if (ref === null || typeof ref === 'function') {
        return;
      }
      if (!meshRef.current) return;

      // only compute the bvh on mount
      meshRef.current.computeBVH();
    }, []);

    const computeColor = (componentId: string) => {
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
        if (commitComparison.addedPackageFqns.includes(component.fqn)) {
          return new Color(addedComponentColor);
        } else if (
          commitComparison.deletedPackageFqns.includes(component.fqn)
        ) {
          return new Color(removedComponentColor);
        } else {
          return new Color(unChangedComponentColor);
        }
      }

      if (component.originOfData === TypeOfAnalysis.Editing) {
        return new Color(addedComponentColor);
      }

      const isHovered = hoveredEntityId === componentId;
      const isHighlighted = highlightedEntityIds.has(componentId);

      const layout = layoutMap.get(componentId);
      if (!layout) return new Color('white');

      const baseColor = isHighlighted
        ? useHighlightingStore.getState().highlightingColor()
        : new Color(
            layout.level % 2 === 0 ? componentEvenColor : componentOddColor
          );

      if (enableHoverEffects && isHovered) {
        return calculateColorBrightness(baseColor, 1.1);
      } else {
        return baseColor;
      }
    };

    const handleClick = (e: ThreeEvent<MouseEvent>) => {
      console.log(useModelStore.getState().applications);

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
      componentEvenColor,
      componentOddColor,
    ]);

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

    const animateComponentChange = () => {
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

        const targetPositionX = layout.position.x;
        const targetPositionY = isOpen
          ? layout.positionY
          : layout.positionY +
            (closedComponentHeight - openedComponentHeight) / 2;
        const targetPositionZ = layout.position.z;
        const targetWidth = layout.width;
        const targetDepth = layout.depth;
        const targetHeight = isOpen
          ? openedComponentHeight
          : closedComponentHeight;

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
    };

    return (
      <instancedMesh2
        ref={meshRef}
        castShadow={castShadows}
        args={[geometry, material]}
        onClick={handleClickWithPrevent}
        onPointerOver={handleOnPointerOver}
        onPointerOut={handleOnPointerOut}
        onDoubleClick={handleDoubleClickWithPrevent}
        {...pointerStopHandlers}
        frustumCulled={false}
      ></instancedMesh2>
    );
  }
);

export default CityDistricts;
