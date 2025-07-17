import { extend, ThreeElement, ThreeEvent } from '@react-three/fiber';
import { InstancedMesh2 } from '@three.ez/instanced-mesh';
import { usePointerStop } from 'explorviz-frontend/src/hooks/pointer-stop';
import useClickPreventionOnDoubleClick from 'explorviz-frontend/src/hooks/useClickPreventionOnDoubleClick';
import { usePopupHandlerStore } from 'explorviz-frontend/src/stores/popup-handler';
import { useEvolutionDataRepositoryStore } from 'explorviz-frontend/src/stores/repos/evolution-data-repository';
import { useVisibilityServiceStore } from 'explorviz-frontend/src/stores/visibility-service';
import {
  Application,
  Class,
} from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import {
  MetricKey,
  metricMappingMultipliers,
} from 'explorviz-frontend/src/utils/settings/default-settings';
import { forwardRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { BoxGeometry, MeshLambertMaterial } from 'three';
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
  appId: string;
  classes: Class[];
  layoutMap: Map<string, BoxLayout>;
  application: Application;
}

// eslint-disable-next-line
const InstancedClassR3F = forwardRef<InstancedMesh2, Args>(
  ({ classes, layoutMap, appId, application }, ref) => {
    const geometry = useMemo(() => new BoxGeometry(), []);
    const material = useMemo(() => new MeshLambertMaterial(), []);

    const instanceIdToClassId = useMemo(() => new Map<number, string>(), []);
    const classIdToInstanceId = useMemo(() => new Map<string, number>(), []);
    const classIdToClass = useMemo(() => new Map<string, Class>(), []);

    const {
      classData,
      getClassState,
      hoveredEntityId,
      setHoveredEntity,
      highlightedEntityIds,
      setHighlightedEntity,
    } = useVisualizationStore(
      useShallow((state) => ({
        classData: state.classData,
        getClassState: state.actions.getClassState,
        hoveredEntityId: state.hoveredEntity,
        setHoveredEntity: state.actions.setHoveredEntity,
        highlightedEntityIds: state.highlightedEntityIds,
        setHighlightedEntity: state.actions.setHighlightedEntity,
      }))
    );

    const getMetricForClass = useEvolutionDataRepositoryStore(
      (state) => state.getMetricForClass
    );

    const commitComparison = useEvolutionDataRepositoryStore
      .getState()
      .getCommitComparisonByAppName(application.name);

    const { evoConfig } = useVisibilityServiceStore(
      useShallow((state) => ({
        evoConfig: state._evolutionModeRenderingConfiguration,
      }))
    );

    const {
      addedClassColor,
      classColor,
      classFootprint,
      classHeightMultiplier,
      enableHoverEffects,
      heightMetric,
      highlightedEntityColor,
      modifiedClassColor,
      removedClassColor,
      unchangedClassColor,
    } = useUserSettingsStore(
      useShallow((state) => ({
        addedClassColor: state.visualizationSettings.addedClassColor.value,
        classColor: state.visualizationSettings.classColor.value,
        classFootprint: state.visualizationSettings.classFootprint.value,
        classHeightMultiplier:
          state.visualizationSettings.classHeightMultiplier.value,
        enableHoverEffects:
          state.visualizationSettings.enableHoverEffects.value,
        heightMetric: state.visualizationSettings.classHeightMetric.value,
        highlightedEntityColor: state.colors?.highlightedEntityColor,
        modifiedClassColor:
          state.visualizationSettings.modifiedClassColor.value,
        removedClassColor: state.visualizationSettings.removedClassColor.value,
        unchangedClassColor:
          state.visualizationSettings.unchangedClassColor.value,
      }))
    );

    const { addPopup } = usePopupHandlerStore(
      useShallow((state) => ({
        addPopup: state.addPopup,
      }))
    );

    const getClassHeight = (dataModel: Class) => {
      return (
        classFootprint +
        metricMappingMultipliers[heightMetric as MetricKey] *
          classHeightMultiplier *
          getMetricForClass(
            dataModel,
            application.name,
            heightMetric,
            evoConfig.renderOnlyDifferences
          )
      );
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
        ref.current?.clearInstances();
        instanceIdToClassId.clear();
        classIdToInstanceId.clear();
        classIdToClass.clear();
      };
    }, [classes, heightMetric, layoutMap]);

    const computeColor = (classId: string) => {
      const dataModel = classIdToClass.get(classId);
      if (!dataModel) {
        return new THREE.Color('red');
      }
      if (
        evoConfig.renderOnlyDifferences &&
        commitComparison &&
        dataModel.fqn
      ) {
        if (commitComparison.added.includes(dataModel.fqn)) {
          return new THREE.Color(addedClassColor);
        } else if (commitComparison.deleted.includes(dataModel.fqn)) {
          return new THREE.Color(removedClassColor);
        } else if (commitComparison.modified.includes(dataModel.fqn)) {
          return new THREE.Color(modifiedClassColor);
        } else {
          return new THREE.Color(unchangedClassColor);
        }
      }

      const isHovered = hoveredEntityId === dataModel.id;
      const isHighlighted = highlightedEntityIds.includes(dataModel.id);

      const baseColor = isHighlighted
        ? new THREE.Color(highlightedEntityColor)
        : new THREE.Color(classColor);

      if (enableHoverEffects && isHovered) {
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
        // ref.current?.setColorAt(instanceId, computeColor(classId));
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

      // getLoC(classIdToClass.get(classId)!);
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
    }, [
      highlightedEntityIds,
      hoveredEntityId,
      evoConfig.renderOnlyDifferences,
    ]);

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
        applicationId: appId,
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
