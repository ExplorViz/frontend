import GlimmerComponent from '@glimmer/component';
import {
  Class,
  Package,
} from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import ClazzCommuMeshDataModel from 'explorviz-frontend/view-objects/3d/application/utils/clazz-communication-mesh-data-model';
import { inject as service } from '@ember/service';
import LandscapeRestructure from 'explorviz-frontend/services/landscape-restructure';
import generateUuidv4 from 'explorviz-frontend/utils/helpers/uuid4-generator';

interface Args {
  communication: ClazzCommuMeshDataModel;
  showApplication?(applicationId: string): void;
  highlightById(modelId: string): void;
  openParents(entity: Class | Package, applicationId: string): void;
}

export default class CommunicationPopup extends GlimmerComponent<Args> {
  @service('landscape-restructure')
  landscapeRestructure!: LandscapeRestructure;

  htmlIdUnique = generateUuidv4();
}
