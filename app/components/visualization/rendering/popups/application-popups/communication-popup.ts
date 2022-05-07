import GlimmerComponent from '@glimmer/component';
import {
  Class, Package,
} from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import ClazzCommuMeshDataModel from 'explorviz-frontend/view-objects/3d/application/utils/clazz-communication-mesh-data-model';
import { action } from '@ember/object';

interface Args {
  communication: ClazzCommuMeshDataModel;
  showApplication(applicationId: string): void;
  highlightModel(entity: Package | Class): void;
  openParents(entity: Class | Package): void;
}

export default class CommunicationPopup extends GlimmerComponent<Args> {
  get application() {
    return this.args.communication.application;
  }

  get calculateAggregatedRequestCount() {
    let aggregatedReqCount = 0;

    this.args.communication.drawableClassCommus.forEach((drawableClassComm) => {
      aggregatedReqCount += drawableClassComm.totalRequests;
    });
    return aggregatedReqCount;
  }

  @action
  highlightEntity(entity: Package | Class) {
    this.args.openParents(entity);
    this.args.highlightModel(entity);
  }
}
