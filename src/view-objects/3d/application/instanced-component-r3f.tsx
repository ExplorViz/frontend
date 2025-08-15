import { extend, ThreeElement, ThreeEvent } from '@react-three/fiber';
import { InstancedMesh2 } from '@three.ez/instanced-mesh';
import useClickPreventionOnDoubleClick from 'explorviz-frontend/src/hooks/useClickPreventionOnDoubleClick';
import {
  Application,
  Package,
} from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import { forwardRef, useEffect, useMemo } from 'react';
import { BoxGeometry, Color, MeshLambertMaterial } from 'three';
import { useShallow } from 'zustand/react/shallow';
import { useUserSettingsStore } from '../../../stores/user-settings';
import { useVisualizationStore } from '../../../stores/visualization-store';
import calculateColorBrightness from '../../../utils/helpers/threejs-helpers';
import BoxLayout from '../../layout-models/box-layout';
import * as EntityManipulation from 'explorviz-frontend/src/utils/application-rendering/entity-manipulation';
import { useEvolutionDataRepositoryStore } from 'explorviz-frontend/src/stores/repos/evolution-data-repository';
import { useVisibilityServiceStore } from 'explorviz-frontend/src/stores/visibility-service';
import { usePopupHandlerStore } from 'explorviz-frontend/src/stores/popup-handler';
import { usePointerStop } from 'explorviz-frontend/src/hooks/pointer-stop';
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
const InstancedComponentR3F = forwardRef<InstancedMesh2, Args>(
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

    const {
      closedComponentIds,
      hiddenComponentIds,
      highlightedEntityIds,
      hoveredEntityId,
      setHighlightedEntity,
      setHoveredEntity,
    } = useVisualizationStore(
      useShallow((state) => ({
        closedComponentIds: state.closedComponentIds,
        hiddenComponentIds: state.hiddenComponentIds,
        highlightedEntityIds: state.highlightedEntityIds,
        hoveredEntityId: state.hoveredEntity,
        setHighlightedEntity: state.actions.setHighlightedEntity,
        setHoveredEntity: state.actions.setHoveredEntity,
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

    useEffect(() => {
      // early return
      if (ref === null || typeof ref === 'function') {
        return;
      }
      if (!ref.current || ref.current.instancesCount >= 200000) return;

      const mesh = ref.current.addInstances(packages.length, (obj, index) => {
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
        const isVisible = !hiddenComponentIds.has(packages[i].id);
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
      });
      mesh.computeBVH();

      return () => {
        // cleanup function to remove instances if necessary
        mesh.clearInstances();
        instanceIdToComponentId.clear();
        componentIdToInstanceId.clear();
        componentIdToPackage.clear();
      };
    }, [closedComponentIds, packages, layoutMap]);

    useEffect(() => {
      if (ref === null || typeof ref === 'function' || !ref.current) {
        return;
      }
      componentIdToInstanceId.forEach((instanceId, componentId) => {
        ref.current?.setVisibilityAt(
          instanceId,
          !hiddenComponentIds.has(componentId)
        );
      });
    }, [hiddenComponentIds]);

    useEffect(() => {
      if (ref === null || typeof ref === 'function') {
        return;
      }
      if (!ref.current) return;

      // only compute the bvh on mount
      ref.current.computeBVH();
    }, []);

    const computeColor = (componentId: string) => {
      const component = componentIdToPackage.get(componentId);
      if (!component) return new Color('white');
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

      const isHovered = hoveredEntityId === componentId;
      const isHighlighted = highlightedEntityIds.includes(componentId);

      const layout = layoutMap.get(componentId);
      if (!layout) return new Color('white');

      const baseColor = isHighlighted
        ? new Color(highlightedEntityColor)
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
      if (ref === null || typeof ref === 'function') {
        return;
      }
      if (!ref.current) return;
      const { instanceId } = e;
      if (instanceId === undefined) return;
      e.stopPropagation();
      const componentId = instanceIdToComponentId.get(instanceId);
      if (!componentId) return;
      // Toggle highlighting
      setHighlightedEntity(
        componentId,
        !highlightedEntityIds.includes(componentId)
      );
    };

    const handleDoubleClick = (e: ThreeEvent<MouseEvent>) => {
      if (ref === null || typeof ref === 'function') {
        return;
      }
      if (!ref.current) {
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
      const component = componentIdToPackage.get(componentId);
      if (!component) {
        return;
      }

      // Toggle open/close state
      if (closedComponentIds.has(componentId)) {
        EntityManipulation.openComponent(component);
      } else {
        EntityManipulation.closeComponent(component);
      }
    };

    useEffect(() => {
      if (ref === null || typeof ref === 'function' || !ref.current) {
        return;
      }
      componentIdToInstanceId.forEach((instanceId, componentId) => {
        ref.current?.setColorAt(instanceId, computeColor(componentId));
      });
    }, [highlightedEntityIds, hoveredEntityId]);

    const handleOnPointerOver = (e: ThreeEvent<MouseEvent>) => {
      if (ref === null || typeof ref === 'function') {
        return;
      }
      if (!ref.current) return;
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
      if (!ref.current) return;
      const { instanceId } = e;
      if (instanceId === undefined) return;
      e.stopPropagation();

      const componentId = instanceIdToComponentId.get(instanceId);
      if (!componentId) return;
      const component = componentIdToPackage.get(componentId);
      addPopup({
        model: component,
        applicationId: application.id,
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
        ref={ref}
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

export default InstancedComponentR3F;
