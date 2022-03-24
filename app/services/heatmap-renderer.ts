import Service from '@ember/service';
import { inject as service } from '@ember/service';
import LocalUser from 'collaborative-mode/services/local-user';
import { restartableTask } from 'ember-concurrency-decorators';
import { perform } from 'ember-concurrency-ts';
import debugLogger from 'ember-debug-logger';
import AlertifyHandler from 'explorviz-frontend/utils/alertify-handler';
import { Class } from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import ApplicationObject3D from 'explorviz-frontend/view-objects/3d/application/application-object-3d';
import ClazzMesh from 'explorviz-frontend/view-objects/3d/application/clazz-mesh';
import FoundationMesh from 'explorviz-frontend/view-objects/3d/application/foundation-mesh';
import HeatmapConfiguration, { Metric } from 'heatmap/services/heatmap-configuration';
import applySimpleHeatOnFoundation, { addHeatmapHelperLine, computeHeatMapViewPos, removeHeatmapHelperLines } from 'heatmap/utils/heatmap-helper';
import { simpleHeatmap } from 'heatmap/utils/simple-heatmap';
import THREE from 'three';

export default class HeatmapRenderer extends Service.extend({
  // anything which *must* be merged to prototype here
}) {

  debug = debugLogger('HeatmapRendering');

  @service('heatmap-configuration')
  heatmapConf!: HeatmapConfiguration;

  @service('local-user')
  private localUser!: LocalUser;

  @service()
  private worker!: any;

  // TODO camera should be referenced differently
  get camera() {
    return this.localUser.camera
  }

  // normal class body definition here
  //
  renderIfActive(applicationObject3D: ApplicationObject3D) {
    if (!this.heatmapConf.heatmapActive) { return }

    perform(this.calculateHeatmapTask, applicationObject3D, () => {
      // if (!this.arMode) {
      this.applyHeatmap(applicationObject3D);
      // }
      this.heatmapConf.triggerLatestHeatmapUpdate();
    });
  }

  @restartableTask *
    calculateHeatmapTask(
      applicationObject3D: ApplicationObject3D,
      callback?: () => void,
  ) {
    this.debug('Calculate heatmap' + applicationObject3D.id)
    try {
      const workerPayload = {
        structure: applicationObject3D.dataModel,
        dynamic: applicationObject3D.traces,
      };

      const metrics: Metric[] = yield this.worker.postMessage('metrics-worker', workerPayload);

      this.heatmapConf.applicationID = applicationObject3D.dataModel.id;
      this.heatmapConf.latestClazzMetricScores = metrics;

      this.debug('Saving metrics ' + metrics)
      this.heatmapConf.saveAndCalculateMetricScores(metrics);

      this.heatmapConf.updateCurrentlyViewedMetric();

      if (callback) callback();

      this.debug('Calculated heatmap')
      AlertifyHandler.showAlertifyMessage('Calculated heatmap')
    } catch (e) {
      AlertifyHandler.showAlertifyError('Error calculating heatmap')
      this.debug(e);
    }
  }

  applyHeatmap(applicationObject3D: ApplicationObject3D) {
    if (!this.heatmapConf.latestClazzMetricScores
      || !this.heatmapConf.latestClazzMetricScores.firstObject) {
      AlertifyHandler.showAlertifyError('No metrics available.');
      return;
    }

    // Selected first metric if none is selected yet
    if (!this.heatmapConf.selectedMetric) {
      this.heatmapConf.selectedMetric = this.heatmapConf.latestClazzMetricScores.firstObject;
    }

    const { selectedMetric } = this.heatmapConf;

    applicationObject3D.setComponentMeshOpacity(0.1);
    applicationObject3D.setCommunicationOpacity(0.1);

    const foundationMesh = applicationObject3D.foundationMesh

    if (!(foundationMesh instanceof FoundationMesh)) {
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = foundationMesh.width;
    canvas.height = foundationMesh.depth;
    const simpleHeatMap = simpleHeatmap(selectedMetric.max, canvas,
      this.heatmapConf.getSimpleHeatGradient(),
      this.heatmapConf.heatmapRadius, this.heatmapConf.blurRadius);

    const foundationWorldPosition = new THREE.Vector3();

    foundationMesh.getWorldPosition(foundationWorldPosition);

    removeHeatmapHelperLines(applicationObject3D);

    const boxMeshes = applicationObject3D.getBoxMeshes();

    boxMeshes.forEach((boxMesh) => {
      if (boxMesh instanceof ClazzMesh) {
        this.heatmapClazzUpdate(applicationObject3D, boxMesh.dataModel, foundationMesh,
          simpleHeatMap);
      }
    });

    simpleHeatMap.draw(0.0);
    applySimpleHeatOnFoundation(foundationMesh, canvas);

    this.heatmapConf.currentApplication = applicationObject3D;
    this.heatmapConf.applicationID = applicationObject3D.dataModel.id;
    this.heatmapConf.heatmapActive = true;
  }

  heatmapClazzUpdate(applicationObject3D: ApplicationObject3D, clazz: Class, foundationMesh: FoundationMesh, simpleHeatMap: any) {
    // Calculate center point of the clazz floor. This is used for computing the corresponding
    // face on the foundation box.
    const clazzMesh = applicationObject3D.getBoxMeshbyModelId(clazz.id) as
      ClazzMesh | undefined;

    if (!clazzMesh || !this.heatmapConf.selectedMetric) {
      return;
    }

    const heatmapValues = this.heatmapConf.selectedMetric.values;
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

    const firstIntersection = raycaster.intersectObject(foundationMesh, false)[0];

    const worldIntersectionPoint = firstIntersection.point.clone();
    applicationObject3D.worldToLocal(worldIntersectionPoint);

    if (this.heatmapConf.useHelperLines) {
      addHeatmapHelperLine(applicationObject3D, clazzPos, worldIntersectionPoint);
    }

    // Compute color only for the first intersection point for consistency if one was found.
    if (firstIntersection && firstIntersection.uv) {
      const xPos = firstIntersection.uv.x * foundationMesh.width;
      const zPos = (1 - firstIntersection.uv.y) * foundationMesh.depth;
      if (selectedMode === 'aggregatedHeatmap') {
        simpleHeatMap.add([xPos, zPos, heatmapValues.get(clazz.id)]);
      } else {
        simpleHeatMap.add([xPos, zPos,
          heatmapValue + (this.heatmapConf.largestValue / 2)]);
      }
    }
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'heatmap-renderer': HeatmapRenderer;
  }
}
