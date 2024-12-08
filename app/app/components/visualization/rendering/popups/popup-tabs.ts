import GlimmerComponent from '@glimmer/component';
import generateUuidv4 from 'explorviz-frontend/utils/helpers/uuid4-generator';

export default class PopupTabs extends GlimmerComponent {
  htmlIdUnique = generateUuidv4();
}
