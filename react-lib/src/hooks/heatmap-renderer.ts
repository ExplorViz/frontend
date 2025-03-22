import React, { useEffect, useRef } from 'react';

import { Class } from 'react-lib/src/utils/landscape-schemes/structure-data';
import { Metric } from 'react-lib/src/utils/metric-schemes/metric-data';
import ApplicationObject3D from 'react-lib/src/view-objects/3d/application/application-object-3d';
import ClazzMesh from 'react-lib/src/view-objects/3d/application/clazz-mesh';
import FoundationMesh from 'react-lib/src/view-objects/3d/application/foundation-mesh';
import applySimpleHeatOnFoundation, {
  addHeatmapHelperLine,
  computeHeatMapViewPos,
  removeHeatmapHelperLines,
} from 'react-lib/src/utils/heatmap/heatmap-helper';
import simpleHeatmap from 'react-lib/src/utils/heatmap/simple-heatmap';
import { useHeatmapConfigurationStore } from 'react-lib/src/stores/heatmap/heatmap-configuration';
import * as THREE from 'three';
import { useShallow } from 'zustand/react/shallow';

export default function useHeatmapRenderer(
  camera: THREE.Camera,
  scene: THREE.Scene
) {
  // MARK: Stores

  const heatmapState = useHeatmapConfigurationStore(
    useShallow((state) => ({
      currentApplication: state.currentApplication,
      selectedMetricName: state.selectedMetricName,
      selectedMode: state.selectedMode,
      heatmapRadius: state.heatmapRadius,
      blurRadius: state.blurRadius,
      useHelperLines: state.useHelperLines,
      largestValue: state.largestValue,
    }))
  );
  const heatmapActions = useHeatmapConfigurationStore(
    useShallow((state) => ({
      getSelectedMetric: state.getSelectedMetric,
      getSimpleHeatGradient: state.getSimpleHeatGradient,
    }))
  );

  // MARK: Refs

  const lastSelectedApplication = useRef<
    ApplicationObject3D | undefined | null
  >(undefined);

  // MARK: Event handlers

  const removeHeatmap = (targetApplication: ApplicationObject3D) => {
    targetApplication.setOpacity(1);
    removeHeatmapHelperLines(targetApplication);

    const { foundationMesh } = targetApplication;

    if (foundationMesh && foundationMesh instanceof FoundationMesh) {
      foundationMesh.setDefaultMaterial();
    }
  };

  /**
   * Sets all objects within the scene of type SpotLight to desired visibility
   *
   * @param isVisible Determines whether a spotlight is visible or not
   */
  const setSpotLightVisibilityInScene = (isVisible = true) => {
    scene?.children.forEach((child) => {
      if (child instanceof THREE.DirectionalLight) {
        child.visible = isVisible;
      }
    });
  };

  const applyHeatmap = async (
    targetApplication: ApplicationObject3D,
    selectedMetric: Metric
  ) => {
    targetApplication.setComponentMeshOpacity(0.1);
    targetApplication.setCommunicationOpacity(0.1);

    const { foundationMesh } = targetApplication;

    if (!(foundationMesh instanceof FoundationMesh)) {
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = foundationMesh.width;
    canvas.height = foundationMesh.depth;
    const simpleHeatMap = simpleHeatmap(
      selectedMetric.max,
      canvas,
      heatmapActions.getSimpleHeatGradient(),
      heatmapState.heatmapRadius,
      heatmapState.blurRadius
    );

    const foundationWorldPosition = new THREE.Vector3();

    foundationMesh.getWorldPosition(foundationWorldPosition);

    removeHeatmapHelperLines(targetApplication);

    const boxMeshes = targetApplication.getBoxMeshes();

    boxMeshes.forEach((boxMesh) => {
      if (boxMesh instanceof ClazzMesh) {
        heatmapClazzUpdate(
          targetApplication,
          boxMesh.dataModel,
          foundationMesh,
          simpleHeatMap,
          selectedMetric
        );
      }
    });

    simpleHeatMap.draw(0.0);
    applySimpleHeatOnFoundation(foundationMesh, canvas);
  };

  const heatmapClazzUpdate = (
    targetApplication: ApplicationObject3D,
    clazz: Class,
    foundationMesh: FoundationMesh,
    simpleHeatMap: any,
    selectedMetric: Metric
  ) => {
    // Calculate center point of the clazz floor. This is used for computing the corresponding
    // face on the foundation box.
    const clazzMesh = targetApplication.getBoxMeshByModelId(clazz.id) as
      | ClazzMesh
      | undefined;

    if (!clazzMesh) {
      return;
    }

    const heatmapValues = selectedMetric.values;
    const heatmapValue = heatmapValues.get(clazz.id);

    if (!heatmapValue) return;

    const raycaster = new THREE.Raycaster();
    const selectedMode = heatmapState.selectedMode;

    const clazzPos = clazzMesh.position.clone();
    const viewPos = computeHeatMapViewPos(foundationMesh, camera);

    clazzPos.y -= clazzMesh.height / 2;

    targetApplication.localToWorld(clazzPos);

    // The vector from the viewPos to the clazz floor center point
    const rayVector = clazzPos.clone().sub(viewPos);

    // Following the ray vector from the floor center get the intersection with the foundation.
    raycaster.set(clazzPos, rayVector.normalize());

    const firstIntersection = raycaster.intersectObject(
      foundationMesh,
      false
    )[0];

    const worldIntersectionPoint = firstIntersection.point.clone();
    targetApplication.worldToLocal(worldIntersectionPoint);

    if (heatmapState.useHelperLines) {
      addHeatmapHelperLine(targetApplication, clazzPos, worldIntersectionPoint);
    }

    // Compute color only for the first intersection point for consistency if one was found.
    if (firstIntersection && firstIntersection.uv) {
      const xPos = firstIntersection.uv.x * foundationMesh.width;
      const zPos = (1 - firstIntersection.uv.y) * foundationMesh.depth;
      if (selectedMode === 'aggregatedHeatmap') {
        simpleHeatMap.add([xPos, zPos, heatmapValues.get(clazz.id)]);
      } else {
        simpleHeatMap.add([
          xPos,
          zPos,
          heatmapValue + heatmapState.largestValue / 2,
        ]);
      }
    }
  };

  // MARK: Effects

  useEffect(() => {
    const selectedMetric = heatmapActions.getSelectedMetric();
    setSpotLightVisibilityInScene(selectedMetric === undefined);

    if (
      lastSelectedApplication.current &&
      (lastSelectedApplication.current !== heatmapState.currentApplication ||
        !selectedMetric)
    ) {
      removeHeatmap(lastSelectedApplication.current);
      lastSelectedApplication.current = undefined;
    }

    if (heatmapState.currentApplication && selectedMetric) {
      lastSelectedApplication.current = heatmapState.currentApplication;
      applyHeatmap(heatmapState.currentApplication, selectedMetric);
    }
  });
}
