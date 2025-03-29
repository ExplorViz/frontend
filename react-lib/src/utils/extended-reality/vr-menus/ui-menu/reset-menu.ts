import TextItem from 'react-lib/src/utils/extended-reality/vr-menus/items/text-item';
import TextbuttonItem from 'react-lib/src/utils/extended-reality/vr-menus/items/textbutton-item';
import TitleItem from 'react-lib/src/utils/extended-reality/vr-menus/items/title-item';
import UiMenu, { UiMenuArgs } from '../ui-menu';
import { removeAllHighlightingFor } from 'react-lib/src/utils/application-rendering/highlighting';
import { useLocalUserStore } from 'react-lib/src/stores/collaboration/local-user';
import { useDetachedMenuGroupsStore } from 'react-lib/src/stores/extended-reality/detached-menu-groups';
import { useApplicationRendererStore } from 'react-lib/src/stores/application-renderer';

export type ResetMenuArgs = UiMenuArgs & {
  online: boolean;
};

export default class ResetMenu extends UiMenu {
  constructor({ online, ...args }: ResetMenuArgs) {
    super(args);

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
    useLocalUserStore.getState().resetPositionAndRotation();
  }

  private resetDetachedMenus() {
    useDetachedMenuGroupsStore.getState().removeAllDetachedMenusLocally();
  }

  private resetApplications() {
    useApplicationRendererStore
      .getState()
      .getOpenApplications()
      .forEach((applicationObject) => {
        useApplicationRendererStore
          .getState()
          .closeAllComponents(applicationObject);
        removeAllHighlightingFor(applicationObject);
      });
  }

  private resetLandscape() {
    const applicationGraph = useApplicationRendererStore
      .getState()
      .getOpenApplications()[0].parent;
    if (applicationGraph) {
      applicationGraph.position.set(0, 0, 0);
      applicationGraph.rotation.x = Math.PI / 180;
      applicationGraph.rotation.y = Math.PI / 180;
      applicationGraph.rotation.z = Math.PI / 180;
    }
  }
}
