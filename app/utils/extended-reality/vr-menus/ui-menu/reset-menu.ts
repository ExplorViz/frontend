import LocalUser from 'explorviz-frontend/services/collaboration/local-user';
import DetachedMenuGroupsService from 'explorviz-frontend/services/extended-reality/detached-menu-groups';
import TextItem from '../items/text-item';
import TextbuttonItem from '../items/textbutton-item';
import TitleItem from '../items/title-item';
import UiMenu, { UiMenuArgs } from '../ui-menu';
import { inject as service } from '@ember/service';
import { setOwner } from '@ember/application';
import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';
import { removeAllHighlightingFor } from 'explorviz-frontend/utils/application-rendering/highlighting';

export type ResetMenuArgs = UiMenuArgs & {
  owner: any;
  online: boolean;
  detachedMenuGroups: DetachedMenuGroupsService;
};

export default class ResetMenu extends UiMenu {
  @service('collaboration/local-user')
  localUser!: LocalUser;

  @service('application-renderer')
  private applicationRenderer!: ApplicationRenderer;

  private detachedMenuGroups: DetachedMenuGroupsService;

  constructor({ owner, online, detachedMenuGroups, ...args }: ResetMenuArgs) {
    super(args);
    setOwner(this, owner);
    this.detachedMenuGroups = detachedMenuGroups;

    const textItem = new TitleItem({
      text: 'Reset',
      position: { x: 256, y: 20 },
    });
    this.items.push(textItem);

    if (online) {
      const question = new TextItem({
        text: 'Reset state and position?',
        color: '#ffffff',
        fontSize: 28,
        position: { x: 100, y: 148 },
      });
      this.items.push(question);

      const noButton = new TextbuttonItem({
        text: 'No',
        position: { x: 100 - 20, y: 266 },
        width: 158,
        height: 50,
        fontSize: 28,
        onTriggerDown: () => this.closeMenu(),
      });
      this.items.push(noButton);
      this.thumbpadTargets.push(noButton);

      const yesButton = new TextbuttonItem({
        text: 'Yes',
        position: { x: 258 + 20, y: 266 },
        width: 158,
        height: 50,
        fontSize: 28,
        onTriggerDown: () => this.resetAll(),
      });
      this.items.push(yesButton);
      this.thumbpadTargets.push(yesButton);

      this.thumbpadAxis = 0;
    } else {
      const message = new TextItem({
        text: 'Not allowed when online.',
        color: '#ffffff',
        fontSize: 28,
        position: { x: 100, y: 148 },
      });
      this.items.push(message);
    }

    this.redrawMenu();
  }

  private resetAll() {
    this.resetLocalUser();
    this.resetApplications();
    this.resetDetachedMenus();
    this.resetLandscape();
    this.closeMenu();
  }

  private resetLocalUser() {
    this.localUser.resetPositionAndRotation();
  }

  private resetDetachedMenus() {
    this.detachedMenuGroups.removeAllDetachedMenusLocally();
  }

  private resetApplications() {
    this.applicationRenderer
      .getOpenApplications()
      .forEach((applicationObject) => {
        this.applicationRenderer.closeAllComponents(applicationObject);
        removeAllHighlightingFor(applicationObject);
      });
  }

  private resetLandscape() {
    const landscape3D =
      this.applicationRenderer.getOpenApplications()[0].parent;
    if (landscape3D) {
      landscape3D.position.set(0, 0, 0);
      landscape3D.rotation.x = Math.PI / 180;
      landscape3D.rotation.y = Math.PI / 180;
      landscape3D.rotation.z = Math.PI / 180;
    }
  }
}
