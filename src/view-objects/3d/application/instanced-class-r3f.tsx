import { extend, ThreeElement, ThreeEvent } from '@react-three/fiber';
import { InstancedMesh2 } from '@three.ez/instanced-mesh';
import useClickPreventionOnDoubleClick from 'explorviz-frontend/src/hooks/useClickPreventionOnDoubleClick';
import { Class } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import { forwardRef, useEffect, useMemo } from 'react';
import { BoxGeometry, Color, MeshLambertMaterial } from 'three';
import { useShallow } from 'zustand/react/shallow';
import { useUserSettingsStore } from '../../../stores/user-settings';
import { useVisualizationStore } from '../../../stores/visualization-store';
import calculateColorBrightness from '../../../utils/helpers/threejs-helpers';
import BoxLayout from '../../layout-models/box-layout';
import { usePopupHandlerStore } from 'explorviz-frontend/src/stores/popup-handler';
import { usePointerStop } from 'explorviz-frontend/src/hooks/pointer-stop';
import { SelectedClassMetric } from 'explorviz-frontend/src/utils/settings/settings-schemas';

// add InstancedMesh2 to the jsx catalog i.e use it as a jsx component
extend({ InstancedMesh2 });

declare module '@react-three/fiber' {
  interface ThreeElements {
    instancedMesh2: ThreeElement<typeof InstancedMesh2>;
  }
}

interface Args {
  classes: Class[];
  layoutMap: Map<string, BoxLayout>;
}

// eslint-disable-next-line
const InstancedClassR3F = forwardRef<InstancedMesh2, Args>(
  ({ classes, layoutMap }, ref) => {
    const geometry = useMemo(() => new BoxGeometry(), []);

    const material = useMemo(() => new MeshLambertMaterial(), []);

    const instanceIdToClassId = useMemo(() => new Map<number, string>(), []);
    const classIdToInstanceId = useMemo(() => new Map<string, number>(), []);
    const classIdToClass = useMemo(() => new Map<string, Class>(), []);

    const {
      classData,
      getClassState,
      updateClassState,
      hoveredEntityId,
      setHoveredEntity,
      highlightedEntityIds,
      setHighlightedEntity,
    } = useVisualizationStore(
      useShallow((state) => ({
        classData: state.classData,
        getClassState: state.actions.getClassState,
        updateClassState: state.actions.updateClassState,
        hoveredEntityId: state.hoveredEntity,
        setHoveredEntity: state.actions.setHoveredEntity,
        highlightedEntityIds: state.highlightedEntityIds,
        setHighlightedEntity: state.actions.setHighlightedEntity,
      }))
    );

    const { classColor, classFootprint, heightMetric, highlightedEntityColor } =
      useUserSettingsStore(
        useShallow((state) => ({
          classColor: state.visualizationSettings.classColor.value,
          classFootprint: state.visualizationSettings.classFootprint.value,
          highlightedEntityColor: state.colors?.highlightedEntityColor,
          showOutlines: state.visualizationSettings.showOutlines.value,
          heightMetric: state.visualizationSettings.classHeightMetric.value,
        }))
      );

    const { addPopup } = usePopupHandlerStore(
      useShallow((state) => ({
        addPopup: state.addPopup,
      }))
    );

    const getClassHeight = (dataModel: Class) => {
      let height = layoutMap.get(dataModel.id)?.height || classFootprint;
      if (heightMetric === SelectedClassMetric.Method) {
        height += classFootprint * 0.5 * dataModel.methods.length;
      }
      return height;
    };

    useEffect(() => {
      // early return
      if (
        ref === null ||
        typeof ref === 'function' ||
        !ref.current ||
        ref.current.instancesCount >= 200000
      ) {
        return;
      }

      let i = 0;
      ref.current.addInstances(classes.length, (obj) => {
        instanceIdToClassId.set(obj.id, classes[i].id);
        classIdToInstanceId.set(classes[i].id, obj.id);
        classIdToClass.set(classes[i].id, classes[i]);
        const layout = layoutMap.get(classes[i].id);
        obj.position.set(
          layout!.position.x,
          layout!.position.y -
            layout!.height / 2 +
            getClassHeight(classes[i]) / 2,
          layout!.position.z
        );
        obj.visible = getClassState(classes[i].id).isVisible;
        obj.scale.set(layout!.width, getClassHeight(classes[i]), layout!.depth);
        obj.color = computeColor(classes[i].id);
        obj.updateMatrix();
        i++;
      });
      ref.current.computeBVH();

      return () => {
        // cleanup function to remove instances if necessary
        ref.current?.clearInstances();
        instanceIdToClassId.clear();
        classIdToInstanceId.clear();
        classIdToClass.clear();
      };
    }, [classes, heightMetric, layoutMap]);

    const computeColor = (classId: string) => {
      const isHovered = hoveredEntityId === classId;
      const isHighlighted = highlightedEntityIds.includes(classId);
      const baseColor = isHighlighted
        ? new Color(highlightedEntityColor)
        : new Color(classColor);

      if (isHovered) {
        return calculateColorBrightness(baseColor, 1.1);
      } else {
        return baseColor;
      }
    };

    useEffect(() => {
      if (ref === null || typeof ref === 'function') {
        return;
      }
      if (!ref.current) return;

      // update the visibility of the instances based on classData
      instanceIdToClassId.forEach((classId, instanceId) => {
        const classInfo = getClassState(classId);
        // Set visibility based on classData
        ref.current?.setVisibilityAt(instanceId, classInfo.isVisible);
        ref.current?.setColorAt(instanceId, computeColor(classId));
      });
    }, [classData]);

    useEffect(() => {
      if (ref === null || typeof ref === 'function') {
        return;
      }
      if (!ref.current) return;

      // only compute the bvh on mount
      ref.current.computeBVH();
    }, []);

    const handleClick = (e: ThreeEvent<MouseEvent>) => {
      if (ref === null || typeof ref === 'function') {
        return;
      }
      if (!ref.current) return;
      const { instanceId } = e;
      if (instanceId === undefined) return;
      e.stopPropagation();
      const classId = instanceIdToClassId.get(instanceId);
      if (!classId) return;
      // Toggle highlighting
      setHighlightedEntity(classId, !highlightedEntityIds.includes(classId));

      // const classInfo = classData[classId];
      // updateClassState(classId, { isHighlighted: !classInfo?.isHighlighted });
    };

    useEffect(() => {
      if (ref === null || typeof ref === 'function' || !ref.current) {
        return;
      }
      classIdToInstanceId.forEach((instanceId, classId) => {
        ref.current?.setColorAt(instanceId, computeColor(classId));
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

      const classId = instanceIdToClassId.get(instanceId);
      if (!classId) return;

      setHoveredEntity(classId);
    };

    const handleOnPointerOut = (e: ThreeEvent<MouseEvent>) => {
      if (ref === null || typeof ref === 'function') {
        return;
      }
      if (!ref.current) return;
      const { instanceId } = e;
      if (instanceId === undefined) return;
      e.stopPropagation();

      const classId = instanceIdToClassId.get(instanceId);
      if (!classId) return;
      setHoveredEntity(null);
    };

    const handleDoubleClick = (/*event: any*/) => {};

    const handlePointerStop = (e: ThreeEvent<PointerEvent>) => {
      if (ref === null || typeof ref === 'function') {
        return;
      }
      if (!ref.current) return;
      const { instanceId } = e;
      if (instanceId === undefined) return;
      e.stopPropagation();

      const classId = instanceIdToClassId.get(instanceId);
      if (!classId) return;
      const clazz = classIdToClass.get(classId);
      addPopup({
        model: clazz,
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

export default InstancedClassR3F;
