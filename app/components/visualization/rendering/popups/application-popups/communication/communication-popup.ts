import GlimmerComponent from '@glimmer/component';
import { action } from '@ember/object';
import {
  Class,
  Package,
} from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import ClazzCommuMeshDataModel from 'explorviz-frontend/view-objects/3d/application/utils/clazz-communication-mesh-data-model';
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

  htmlIdUnique = this.uuidv4();

  @action
  onClick(event: MouseEvent) {
    if (event.shiftKey) {
      event.preventDefault();
    }
  }

  private uuidv4(): string {
    // https://stackoverflow.com/questions/105034/how-do-i-create-a-guid-uuid
    return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c: any) =>
      (
        c ^
        (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
      ).toString(16)
    );
  }
}
