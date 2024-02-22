import GlimmerComponent from '@glimmer/component';
import {
  Class,
  Package,
} from 'some-react-lib/src/utils/landscape-schemes/structure-data';
import ClazzCommuMeshDataModel from 'explorviz-frontend/view-objects/3d/application/utils/clazz-communication-mesh-data-model';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import LandscapeRestructure from 'explorviz-frontend/services/landscape-restructure';

interface Args {
  communication: ClazzCommuMeshDataModel;
  showApplication?(applicationId: string): void;
  highlightById(modelId: string): void;
  openParents(entity: Class | Package, applicationId: string): void;
}

export default class CommunicationPopup extends GlimmerComponent<Args> {
  @service('landscape-restructure')
  landscapeRestructure!: LandscapeRestructure;

  get application() {
    return this.args.communication.application;
  }

  get calculateAggregatedRequestCount() {
    return this.args.communication.communication.totalRequests;
  }

  @action
  highlightEntity(entity: Package | Class, applicationId: string) {
    this.args.openParents(entity, applicationId);
    this.args.highlightById(entity.id);
    this.args.showApplication?.(applicationId);
  }
}
