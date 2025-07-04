import { extend, ThreeElement, ThreeEvent } from '@react-three/fiber';
import { InstancedMesh2 } from '@three.ez/instanced-mesh';
import useClickPreventionOnDoubleClick from 'explorviz-frontend/src/hooks/useClickPreventionOnDoubleClick';
import { Class } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import { forwardRef, useCallback, useEffect, useMemo } from 'react';
import { BoxGeometry, Color, MeshLambertMaterial } from 'three';
import { useShallow } from 'zustand/react/shallow';
import { useUserSettingsStore } from '../../../stores/user-settings';
import { useVisualizationStore } from '../../../stores/visualization-store';
import calculateColorBrightness from '../../../utils/helpers/threejs-helpers';
import BoxLayout from '../../layout-models/box-layout';

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

const InstancedClassR3F = forwardRef<InstancedMesh2, Args>(
  ({ classes, layoutMap }, ref) => {
    const geometry = useMemo(() => new BoxGeometry(), []);

    const material = useMemo(() => new MeshLambertMaterial(), []);

    const instanceIdToClassId = useMemo(() => new Map<number, string>(), []);

    const { classData, updateClassState } = useVisualizationStore(
      useShallow((state) => ({
        classData: state.classData,
        updateClassState: state.actions.updateClassState,
      }))
    );

    const {
      classColor,
      classLabelFontSize,
      classLabelLength,
      classTextColor,
      highlightedEntityColor,
      labelOffset,
      labelRotation,
      maxLabelLength,
      showOutlines,
    } = useUserSettingsStore(
      useShallow((state) => ({
        classColor: state.visualizationSettings.classColor.value,
        classLabelFontSize:
          state.visualizationSettings.classLabelFontSize.value,
        classLabelLength: state.visualizationSettings.classLabelLength.value,
        classTextColor: state.visualizationSettings.classTextColor.value,
        highlightedEntityColor: state.colors?.highlightedEntityColor,
        labelOffset: state.visualizationSettings.classLabelOffset.value,
        labelRotation: state.visualizationSettings.classLabelOrientation.value,
        maxLabelLength: state.visualizationSettings.classLabelLength.value,
        showOutlines: state.visualizationSettings.showOutlines.value,
      }))
    );

    useEffect(() => {
      // early return
      if (ref === null || typeof ref === 'function') {
        return;
      }
      if (!ref.current || ref.current.instancesCount >= 200000) return;

      let i = 0;
      // add 100 instances every frame
      ref.current.addInstances(classes.length, (obj) => {
        const layout = layoutMap.get(classes[i].id);
        obj.position.set(
          layout!.position.x,
          layout!.position.y,
          layout!.position.z
        );
        obj.scale.set(layout!.width, layout!.height, layout!.depth);
        obj.color = computeColor(classes[i]);
        instanceIdToClassId.set(obj.id, classes[i].id);
        obj.updateMatrix();
        i++;
      });
      ref.current.computeBVH();

      return () => {
        // cleanup function to remove instances if necessary
        ref.current?.clearInstances();
        instanceIdToClassId.clear();
      };
    }, [classes, layoutMap]);

    const computeColor = (classInfo: any) => {
      const baseColor = classInfo.isHighlighted
        ? new Color(highlightedEntityColor)
        : new Color(classColor);

      if (classInfo.isHovered) {
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
        const classInfo = classData[classId];
        if (classInfo) {
          // Set visibility based on classData
          ref.current?.setVisibilityAt(instanceId, classInfo.isVisible);
          const color = computeColor(classInfo);
          ref.current?.setColorAt(instanceId, color);
        }
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

    const handleClick = useCallback(
      (e: ThreeEvent<MouseEvent>) => {
        if (ref === null || typeof ref === 'function') {
          return;
        }
        if (!ref.current) return;
        const { instanceId } = e;

        if (!instanceId) return;
        e.stopPropagation();
        const classId = instanceIdToClassId.get(instanceId);
        if (!classId) return;
        const classInfo = classData[classId];
        updateClassState(classId, { isHighlighted: !classInfo?.isHighlighted });
      },
      [classData]
    );

    const handleOnPointerOver = useCallback(
      (e: ThreeEvent<MouseEvent>) => {
        if (ref === null || typeof ref === 'function') {
          return;
        }
        if (!ref.current) return;
        const { instanceId } = e;
        if (!instanceId) return;
        e.stopPropagation();

        const classId = instanceIdToClassId.get(instanceId);
        if (!classId) return;

        updateClassState(classId, { isHovered: true });
      },
      [classData]
    );

    const handleOnPointerOut = useCallback(
      (e: ThreeEvent<MouseEvent>) => {
        if (ref === null || typeof ref === 'function') {
          return;
        }
        if (!ref.current) return;
        const { instanceId } = e;
        if (!instanceId) return;
        e.stopPropagation();

        const classId = instanceIdToClassId.get(instanceId);
        if (!classId) return;

        updateClassState(classId, { isHovered: false });
      },
      [classData]
    );

    const handleDoubleClick = (/*event: any*/) => {};

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
        frustumCulled={false}
      ></instancedMesh2>
    );
  }
);

export default InstancedClassR3F;
