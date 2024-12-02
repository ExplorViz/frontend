import { EntityType } from 'explorviz-frontend/utils/collaboration/web-socket-messages/types/entity-type';
import BaseMenu from './base-menu';

export interface DetachableMenu extends BaseMenu {
  getDetachId(): string;
  getEntityType(): EntityType;
}

export function isDetachableMenu(menu: any): menu is DetachableMenu {
  return (
    menu !== null &&
    typeof menu === 'object' &&
    typeof menu.getDetachId === 'function' &&
    typeof menu.getEntityType === 'function'
  );
}
