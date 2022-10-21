import GlimmerComponent from '@glimmer/component';
import {
  Class,
  Package,
} from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import ClazzCommuMeshDataModel from 'explorviz-frontend/view-objects/3d/application/utils/clazz-communication-mesh-data-model';
import { action } from '@ember/object';

interface Args {
  communication: ClazzCommuMeshDataModel;
  showApplication?(applicationId: string): void;
  highlightModel(entity: Package | Class, applicationId: string): void;
  openParents(entity: Class | Package, applicationId: string): void;
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
  highlightEntity(entity: Package | Class, applicationId: string) {
    this.args.openParents(entity, applicationId);
    this.args.highlightModel(entity, applicationId);
    this.args.showApplication?.(applicationId);
  }
}
