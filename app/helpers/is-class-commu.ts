import { helper } from '@ember/component/helper';
import ClassCommunication from 'explorviz-frontend/utils/landscape-schemes/dynamic/class-communication';
import ComponentCommunication from 'explorviz-frontend/utils/landscape-schemes/dynamic/component-communication';

export function isClassCommu([commu]: [
  ComponentCommunication | ClassCommunication,
]) {
  return commu instanceof ClassCommunication;
}

export default helper(isClassCommu);
