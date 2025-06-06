import VRControllerLabelGroup from 'explorviz-frontend/src/utils/extended-reality/vr-controller/vr-controller-label-group';
import CheckboxItem from 'explorviz-frontend/src/utils/extended-reality/vr-menus/items/checkbox-item';
import TextItem from 'explorviz-frontend/src/utils/extended-reality/vr-menus/items/text-item';
import TextbuttonItem from 'explorviz-frontend/src/utils/extended-reality/vr-menus/items/textbutton-item';
import TitleItem from 'explorviz-frontend/src/utils/extended-reality/vr-menus/items/title-item';
import UiMenu, {
  UiMenuArgs,
} from 'explorviz-frontend/src/utils/extended-reality/vr-menus/ui-menu';
import { useVrMenuFactoryStore } from 'explorviz-frontend/src/stores/extended-reality/vr-menu-factory';

export type SettingsMenuArgs = UiMenuArgs & {
  labelGroups: (VRControllerLabelGroup | undefined)[];
};

export default class SettingsMenu extends UiMenu {
  constructor({ labelGroups, ...args }: SettingsMenuArgs) {
    super(args);

    const textItem = new TitleItem({
      text: 'Settings',
      position: { x: 256, y: 20 },
    });
    this.items.push(textItem);

    const cameraButton = new TextbuttonItem({
      text: 'Change Camera',
      position: { x: 100, y: 80 },
      width: 316,
      height: 50,
      fontSize: 28,
      onTriggerDown: () =>
        this.menuGroup?.openMenu(
          useVrMenuFactoryStore.getState().buildCameraMenu()
        ),
    });
    this.items.push(cameraButton);
    this.thumbpadTargets.push(cameraButton);

    const labelsText = new TextItem({
      text: 'Show Labels',
      color: '#ffffff',
      fontSize: 28,
      position: { x: 100, y: 200 },
    });
    this.items.push(labelsText);

    const labelsCheckbox = new CheckboxItem({
      position: { x: 366, y: 180 },
      width: 50,
      height: 50,
      isChecked: VRControllerLabelGroup.visibilitySetting,
      onTriggerDown: () => {
        // Toggle label visibility.
        const visible = !VRControllerLabelGroup.visibilitySetting;
        VRControllerLabelGroup.visibilitySetting = visible;
        labelsCheckbox.isChecked = visible;
        labelGroups.forEach((labelGroup) => {
          if (labelGroup) labelGroup.visible = visible;
        });
        this.redrawMenu();
      },
    });
    this.items.push(labelsCheckbox);
    this.thumbpadTargets.push(labelsCheckbox);

    this.redrawMenu();
  }
}
