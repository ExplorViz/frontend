import { extend, ThreeElement, ThreeEvent } from '@react-three/fiber';
import { InstancedMesh2 } from '@three.ez/instanced-mesh';
import { usePointerStop } from 'explorviz-frontend/src/hooks/pointer-stop';
import useClickPreventionOnDoubleClick from 'explorviz-frontend/src/hooks/useClickPreventionOnDoubleClick';
import { useHeatmapStore } from 'explorviz-frontend/src/stores/heatmap/heatmap-store';
import { usePopupHandlerStore } from 'explorviz-frontend/src/stores/popup-handler';
import { useEvolutionDataRepositoryStore } from 'explorviz-frontend/src/stores/repos/evolution-data-repository';
import { useVisibilityServiceStore } from 'explorviz-frontend/src/stores/visibility-service';
import { getMetricValues } from 'explorviz-frontend/src/utils/heatmap/class-heatmap-helper';
import { getSimpleHeatmapColor } from 'explorviz-frontend/src/utils/heatmap/simple-heatmap';
import {
  Application,
  Class,
  TypeOfAnalysis,
} from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import {
  MetricKey,
  metricMappingMultipliers,
} from 'explorviz-frontend/src/utils/settings/default-settings';
import gsap from 'gsap';
import { forwardRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import {
  BoxGeometry,
  Matrix4,
  MeshLambertMaterial,
  Quaternion,
  Vector3,
} from 'three';
import { useShallow } from 'zustand/react/shallow';
import { useUserSettingsStore } from '../../../stores/user-settings';
import { useVisualizationStore } from '../../../stores/visualization-store';
import calculateColorBrightness from '../../../utils/helpers/threejs-helpers';
import BoxLayout from '../../layout-models/box-layout';
import { toggleHighlightById } from 'explorviz-frontend/src/utils/application-rendering/highlighting';

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
const CodeBuildings = forwardRef<InstancedMesh2, Args>(
  ({ classes, layoutMap, appId, application }, meshRef) => {
    const geometry = useMemo(() => new BoxGeometry(), []);
    const material = useMemo(() => new MeshLambertMaterial(), []);

    const instanceIdToClassId = useMemo(() => new Map<number, string>(), []);
    const classIdToInstanceId = useMemo(() => new Map<string, number>(), []);
    const classIdToClass = useMemo(() => new Map<string, Class>(), []);

    const {
      hiddenClassIds,
      removedComponentIds,
      hoveredEntityId,
      setHoveredEntity,
      highlightedEntityIds,
    } = useVisualizationStore(
      useShallow((state) => ({
        hiddenClassIds: state.hiddenClassIds,
        removedComponentIds: state.removedComponentIds,
        hoveredEntityId: state.hoveredEntityId,
        setHoveredEntity: state.actions.setHoveredEntityId,
        highlightedEntityIds: state.highlightedEntityIds,
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
      enableAnimations,
      animationDuration,
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
        enableAnimations: state.visualizationSettings.enableAnimations.value,
        animationDuration: state.visualizationSettings.animationDuration.value,
      }))
    );

    const { heatmapActive, selectedClassMetric, selectedHeatmapGradient } =
      useHeatmapStore(
        useShallow((state) => ({
          heatmapActive: state.isActive(),
          selectedClassMetric: state.getSelectedClassMetric(),
          selectedHeatmapGradient: state.getSelectedGradient(),
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
        classIdToInstanceId.size > 0 &&
        classIdToClass.size === classes.length &&
        enableAnimations
      ) {
        animateMeshInstanceChanges();
      } else {
        computeMeshInstances();
      }
    }, [[], classes, layoutMap, heightMetric]);

    // React on changes of color
    useEffect(() => {
      if (
        meshRef === null ||
        typeof meshRef === 'function' ||
        !meshRef.current
      ) {
        return;
      }
      classIdToInstanceId.forEach((instanceId, classId) => {
        meshRef.current?.setColorAt(instanceId, computeColor(classId));
      });
    }, [classColor, highlightedEntityColor]);

    const computeColor = (classId: string) => {
      const dataModel = classIdToClass.get(classId);
      if (!dataModel) {
        return new THREE.Color('red');
      }
      if (heatmapActive) {
        const metricValues = getMetricValues(dataModel, selectedClassMetric!);
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
          return new THREE.Color(addedClassColor);
        } else if (commitComparison.deleted.includes(dataModel.fqn)) {
          return new THREE.Color(removedClassColor);
        } else if (commitComparison.modified.includes(dataModel.fqn)) {
          return new THREE.Color(modifiedClassColor);
        } else {
          return new THREE.Color(unchangedClassColor);
        }
      }

      if (dataModel.originOfData === TypeOfAnalysis.Editing) {
        return new THREE.Color(addedClassColor);
      }

      const isHovered = hoveredEntityId === dataModel.id;
      const isHighlighted = highlightedEntityIds.has(dataModel.id);

      const baseColor = isHighlighted
        ? new THREE.Color(highlightedEntityColor)
        : new THREE.Color(classColor);

      if (enableHoverEffects && isHovered) {
        return calculateColorBrightness(baseColor, 1.1);
      } else {
        return baseColor;
      }
    };

    // React on changes of class visibility
    useEffect(() => {
      if (meshRef === null || typeof meshRef === 'function') {
        return;
      }
      if (!meshRef.current) return;

      // Update the visibility of the instances based on classData
      instanceIdToClassId.forEach((classId, instanceId) => {
        // Set visibility based on classData
        meshRef.current?.setVisibilityAt(
          instanceId,
          !hiddenClassIds.has(classId) && !removedComponentIds.has(classId)
        );
      });
    }, [hiddenClassIds, removedComponentIds]);

    const handleClick = (e: ThreeEvent<MouseEvent>) => {
      if (meshRef === null || typeof meshRef === 'function') {
        return;
      }
      if (!meshRef.current) return;
      const { instanceId } = e;
      if (instanceId === undefined) return;
      e.stopPropagation();
      const classId = instanceIdToClassId.get(instanceId);
      if (!classId) return;

      // getLoC(classIdToClass.get(classId)!);
      // Toggle highlighting
      toggleHighlightById(classId);

      // const classInfo = classData[classId];
      // updateClassState(classId, { isHighlighted: !classInfo?.isHighlighted });
    };

    useEffect(() => {
      if (
        meshRef === null ||
        typeof meshRef === 'function' ||
        !meshRef.current
      ) {
        return;
      }

      classIdToInstanceId.forEach((instanceId, classId) => {
        meshRef.current?.setColorAt(instanceId, computeColor(classId));
      });
    }, [
      highlightedEntityIds,
      hoveredEntityId,
      evoConfig.renderOnlyDifferences,
      selectedClassMetric,
      selectedHeatmapGradient,
      heatmapActive,
    ]);

    const handleOnPointerOver = (e: ThreeEvent<MouseEvent>) => {
      if (meshRef === null || typeof meshRef === 'function') {
        return;
      }
      if (!meshRef.current) return;
      const { instanceId } = e;
      if (instanceId === undefined) return;
      e.stopPropagation();

      const classId = instanceIdToClassId.get(instanceId);
      if (!classId) return;

      setHoveredEntity(classId);
    };

    const handleOnPointerOut = (e: ThreeEvent<MouseEvent>) => {
      if (meshRef === null || typeof meshRef === 'function') {
        return;
      }
      if (!meshRef.current) return;
      const { instanceId } = e;
      if (instanceId === undefined) return;
      e.stopPropagation();

      const classId = instanceIdToClassId.get(instanceId);
      if (!classId) return;
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

      const classId = instanceIdToClassId.get(instanceId);
      if (!classId) return;
      const classModel = classIdToClass.get(classId);
      addPopup({
        entityId: classId,
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

      let i = 0;
      meshRef.current.addInstances(classes.length, (obj) => {
        instanceIdToClassId.set(obj.id, classes[i].id);
        classIdToInstanceId.set(classes[i].id, obj.id);
        classIdToClass.set(classes[i].id, classes[i]);
        const layout = layoutMap.get(classes[i].id);
        if (!layout) {
          console.log(`No layout found for component with id ${classes[i].id}`);
          return;
        }
        obj.position.set(
          layout.position.x,
          layout.position.y -
            layout.height / 2 +
            getClassHeight(classes[i]) / 2,
          layout.position.z
        );
        obj.visible =
          !hiddenClassIds.has(classes[i].id) &&
          !removedComponentIds.has(classes[i].id);
        obj.scale.set(layout.width, getClassHeight(classes[i]), layout.depth);
        obj.color = computeColor(classes[i].id);
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

      classIdToInstanceId.forEach((instanceId, classId) => {
        const tempMatrix = new Matrix4();
        const pos = new Vector3();
        const quat = new Quaternion();
        const scale = new Vector3();

        const classModel = classIdToClass.get(classId);
        const layout = layoutMap.get(classId);
        if (!classModel || !layout) return;

        const targetHeight = getClassHeight(classModel);
        const targetPositionX = layout.position.x;
        const targetPositionY =
          layout.position.y - layout.height / 2 + targetHeight / 2;
        const targetPositionZ = layout.position.z;
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
        ref={meshRef}
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

export default CodeBuildings;
