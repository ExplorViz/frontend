import { inject as service } from '@ember/service';
import { task } from 'ember-concurrency';
import debugLogger from 'ember-debug-logger';
import Modifier, { NamedArgs } from 'ember-modifier';
import { Class } from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import ApplicationObject3D from 'explorviz-frontend/view-objects/3d/application/application-object-3d';
import ClazzMesh from 'explorviz-frontend/view-objects/3d/application/clazz-mesh';
import FoundationMesh from 'explorviz-frontend/view-objects/3d/application/foundation-mesh';
import LandscapeScene3D from 'explorviz-frontend/view-objects/3d/landscape/LandscapeScene3D';
import HeatmapConfiguration, {
  Metric,
} from 'heatmap/services/heatmap-configuration';
import applySimpleHeatOnFoundation, {
  addHeatmapHelperLine,
  computeHeatMapViewPos,
  removeHeatmapHelperLines,
} from 'heatmap/utils/heatmap-helper';
import simpleHeatmap from 'heatmap/utils/simple-heatmap';
import * as THREE from 'three';

interface Signature {
  Args: {
    Positional: [];
    Named: {
      readonly camera: THREE.Camera;
      readonly scene: LandscapeScene3D;
    };
  };
}

const debug = debugLogger('HeatmapRendering');

export default class HeatmapRenderer extends Modifier<Signature> {
  private scene!: LandscapeScene3D;

  private camera!: THREE.Camera;

  private lastApplicationObject3D: ApplicationObject3D | undefined | null;

  @service('heatmap-configuration')
  private heatmapConf!: HeatmapConfiguration;

  private get applicationObject3D() {
    return this.heatmapConf.currentApplication;
  }

  private get metric() {
    return this.heatmapConf.selectedMetric;
  }

  modify(_element: never, _positionalArgs: never[], { camera, scene }: NamedArgs<Signature>) {
    this.scene = scene;
    this.camera = camera;

    // Avoid unwanted reflections in heatmap mode
    this.setSpotLightVisibilityInScene(this.metric === undefined);

    if (
      this.lastApplicationObject3D &&
      (this.lastApplicationObject3D !== this.applicationObject3D ||
        !this.metric)
    ) {
      debug(`Removing heatmap:${this.lastApplicationObject3D.id}`);
      this.removeHeatmap(this.lastApplicationObject3D);
      this.lastApplicationObject3D = undefined;
    }

    if (this.applicationObject3D && this.metric) {
      this.lastApplicationObject3D = this.applicationObject3D;
      this.applyHeatmap.perform(this.applicationObject3D, this.metric);
    }
  }

  private removeHeatmap(applicationObject3D: ApplicationObject3D) {
    applicationObject3D.setOpacity(1);
    removeHeatmapHelperLines(applicationObject3D);

    const { foundationMesh } = applicationObject3D;

    if (foundationMesh && foundationMesh instanceof FoundationMesh) {
      foundationMesh.setDefaultMaterial();
    }
  }

  /**
   * Sets all objects within the scene of type SpotLight to desired visibility
   *
   * @param isVisible Determines whether a spotlight is visible or not
   */
  private setSpotLightVisibilityInScene(isVisible = true) {
    const threeScene = this.scene.threeScene;
    threeScene.children.forEach((child) => {
      if (child instanceof THREE.DirectionalLight) {
        child.visible = isVisible;
      }
    });
  }

  applyHeatmap = task(
    async (
      applicationObject3D: ApplicationObject3D,
      selectedMetric: Metric
    ) => {
      applicationObject3D.setComponentMeshOpacity(0.1);
      applicationObject3D.setCommunicationOpacity(0.1);

      const { foundationMesh } = applicationObject3D;

      if (!(foundationMesh instanceof FoundationMesh)) {
        return;
      }

      const canvas = document.createElement('canvas');
      canvas.width = foundationMesh.width;
      canvas.height = foundationMesh.depth;
      const simpleHeatMap = simpleHeatmap(
        selectedMetric.max,
        canvas,
        this.heatmapConf.getSimpleHeatGradient(),
        this.heatmapConf.heatmapRadius,
        this.heatmapConf.blurRadius
      );

      const foundationWorldPosition = new THREE.Vector3();

      foundationMesh.getWorldPosition(foundationWorldPosition);

      removeHeatmapHelperLines(applicationObject3D);

      const boxMeshes = applicationObject3D.getBoxMeshes();

      boxMeshes.forEach((boxMesh) => {
        if (boxMesh instanceof ClazzMesh) {
          this.heatmapClazzUpdate(
            applicationObject3D,
            boxMesh.dataModel,
            foundationMesh,
            simpleHeatMap,
            selectedMetric
          );
        }
      });

      simpleHeatMap.draw(0.0);
      applySimpleHeatOnFoundation(foundationMesh, canvas);

      debug('Applied heatmap');
    }
  );

  private heatmapClazzUpdate(
    applicationObject3D: ApplicationObject3D,
    clazz: Class,
    foundationMesh: FoundationMesh,
    simpleHeatMap: any,
    selectedMetric: Metric
  ) {
    // Calculate center point of the clazz floor. This is used for computing the corresponding
    // face on the foundation box.
    const clazzMesh = applicationObject3D.getBoxMeshbyModelId(clazz.id) as
      | ClazzMesh
      | undefined;

    if (!clazzMesh) {
      return;
    }

    const heatmapValues = selectedMetric.values;
    const heatmapValue = heatmapValues.get(clazz.id);

    if (!heatmapValue) return;

    const raycaster = new THREE.Raycaster();
    const { selectedMode } = this.heatmapConf;

    const clazzPos = clazzMesh.position.clone();
    const viewPos = computeHeatMapViewPos(foundationMesh, this.camera);

    clazzPos.y -= clazzMesh.height / 2;

    applicationObject3D.localToWorld(clazzPos);

    // The vector from the viewPos to the clazz floor center point
    const rayVector = clazzPos.clone().sub(viewPos);

    // Following the ray vector from the floor center get the intersection with the foundation.
    raycaster.set(clazzPos, rayVector.normalize());

    const firstIntersection = raycaster.intersectObject(
      foundationMesh,
      false
    )[0];

    const worldIntersectionPoint = firstIntersection.point.clone();
    applicationObject3D.worldToLocal(worldIntersectionPoint);

    if (this.heatmapConf.useHelperLines) {
      addHeatmapHelperLine(
        applicationObject3D,
        clazzPos,
        worldIntersectionPoint
      );
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
          heatmapValue + this.heatmapConf.largestValue / 2,
        ]);
      }
    }
  }
}
