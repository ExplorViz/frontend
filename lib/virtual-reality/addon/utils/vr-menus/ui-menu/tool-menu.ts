import THREE from 'three';
import TextTexture from 'virtual-reality/utils/vr-helpers/text-texture';
import VRControllerButtonBinding from '../../vr-controller/vr-controller-button-binding';
import VRControllerThumbpadBinding, { VRControllerThumbpadHorizontalDirection } from '../../vr-controller/vr-controller-thumbpad-binding';
import { BaseMenuArgs } from '../base-menu';
import InteractiveMenu from '../interactive-menu';
import { SIZE_RESOLUTION_FACTOR } from '../ui-menu';

type ToolArgs = {
  label: string;
  icon: string;
  action: () => void;
};

type Tool = {
  object: THREE.Object3D;
  action: () => void;
  toggleSelect: (isSelected: boolean) => void;
  toggleHover: (isHovered: boolean) => void;
};

const FOREGROUND_COLOR = new THREE.Color(0xffffff);
const SELECTED_FOREGROUND_COLOR = new THREE.Color(0xffc338);
const BACKGROUND_COLOR = new THREE.Color(0x444444);
const ICON_COLOR = FOREGROUND_COLOR;
const SELECTED_ICON_COLOR = SELECTED_FOREGROUND_COLOR;

const OPACITY = 0.5;
const SELECTED_OPACITY = 0.8;

const LABEL_PADDING = 80;
const LABEL_OFFSET = 0.025;
const LABEL_FONT_SIZE = 80;
const LABEL_FONT_FAMILY = 'arial';

const TOOL_CIRCLE_RADIUS = 0.07;
const TOOL_CIRCLE_SEGMENTS = 48;
const TOOL_X_OFFSET = 0.02;

const TOOL_ICON_RADIUS = 0.05;

const TOOL_SCALE = 1.0;
const TOOL_HOVERED_SCALE = 1.1;

const SELECT_ANIMATION_DURATION = 0.2;

const THUMBPAD_THRESHOLD = 0.5;

export default class ToolMenu extends InteractiveMenu {
  private tools: Tool[];

  private currentSelectAnimation: THREE.AnimationAction | null;

  private defaultToolIndex: number = 0;

  private selectedTool: Tool | null = null;

  private hoveredTool: Tool | null = null;

  constructor(args: BaseMenuArgs) {
    super(args);
    this.tools = [];
    this.currentSelectAnimation = null;

    this.addTool({
      label: 'Zoom',
      icon: 'search',
      action: () => this.menuGroup?.replaceMenu(this.menuFactory.buildZoomMenu()),
    });
    this.addDefaultTool({
      label: 'Options',
      icon: 'gear',
      action: () => this.menuGroup?.replaceMenu(this.menuFactory.buildMainMenu()),
    });
    this.addTool({
      label: 'Heatmap',
      icon: 'flame',
      action: () => this.menuGroup?.replaceMenu(this.menuFactory.buildHeatmapMenu()),
    });
    // this.addTool({
    //   label: 'Ping',
    //   icon: 'north-star',
    //   action: () => this.menuGroup?.replaceMenu(this.menuFactory.buildPingMenu()),
    // });

    this.selectTool(this.defaultToolIndex, { enableAnimation: false });
  }

  // #region TOOL CONSTRUCTION

  private addDefaultTool(args: ToolArgs) {
    this.addTool(args);
    this.defaultToolIndex = this.tools.length - 1;
  }

  private addTool({ label, icon, action }: ToolArgs) {
    const group = new THREE.Group();
    this.add(group);
    group.position.x = this.tools.length * (TOOL_X_OFFSET + 2 * TOOL_CIRCLE_RADIUS);

    const backgroundMesh = this.buildBackgroundMesh();
    group.add(backgroundMesh);

    const iconMesh = this.buildIconMesh(icon);
    iconMesh.position.z = 0.00001;
    group.add(iconMesh);

    const labelMeshes = this.buildLabelMeshes(label);
    labelMeshes.foreground.position.z = 0.00001;

    const labelGroup = new THREE.Group();
    labelGroup.add(...Object.values(labelMeshes));
    labelGroup.position.y = -(LABEL_OFFSET + TOOL_CIRCLE_RADIUS);
    labelGroup.visible = false;
    group.add(labelGroup);

    const tool = {
      object: group,
      action,
      toggleHover: (isHovered: boolean) => {
        group.scale.setScalar(isHovered ? TOOL_HOVERED_SCALE : TOOL_SCALE);
        labelGroup.visible = isHovered || this.selectedTool === tool;
      },
      toggleSelect: (isSelected: boolean) => {
        backgroundMesh.material.opacity = isSelected
          ? SELECTED_OPACITY
          : OPACITY;
        iconMesh.material.opacity = isSelected ? SELECTED_OPACITY : OPACITY;
        iconMesh.material.color = isSelected ? SELECTED_ICON_COLOR : ICON_COLOR;
        labelMeshes.foreground.material.color = isSelected
          ? SELECTED_FOREGROUND_COLOR
          : FOREGROUND_COLOR;
        labelGroup.visible = isSelected;
      },
    };
    this.tools.push(tool);
  }

  private buildBackgroundMesh() {
    const geometry = new THREE.CircleGeometry(
      TOOL_CIRCLE_RADIUS,
      TOOL_CIRCLE_SEGMENTS,
    );
    const material = new THREE.MeshBasicMaterial({
      color: BACKGROUND_COLOR,
      side: THREE.DoubleSide,
      opacity: OPACITY,
      transparent: true,
    });
    return new THREE.Mesh(geometry, material);
  }

  private buildIconMesh(icon: string) {
    const texture = new THREE.TextureLoader().load(
      `images/menu-icons/${icon}-128.png`,
    );
    const geometry = new THREE.CircleGeometry(
      TOOL_ICON_RADIUS,
      TOOL_CIRCLE_SEGMENTS,
    );
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      color: ICON_COLOR,
      opacity: OPACITY,
      transparent: true,
    });
    return new THREE.Mesh(geometry, material);
  }

  private buildLabelMeshes(label: string) {
    const texture = new TextTexture({
      text: label,
      textColor: new THREE.Color(0xffffff),
      fontSize: LABEL_FONT_SIZE,
      fontFamily: LABEL_FONT_FAMILY,
      padding: LABEL_PADDING,
    });

    const worldSizeFactor = SIZE_RESOLUTION_FACTOR / 2;
    const worldWidth = texture.image.width * worldSizeFactor;
    const worldHeight = texture.image.height * worldSizeFactor;
    const geometry = new THREE.PlaneGeometry(worldWidth, worldHeight);

    const foregroundMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      color: FOREGROUND_COLOR,
      transparent: true,
      opacity: SELECTED_OPACITY,
    });
    const backgroundMaterial = new THREE.MeshBasicMaterial({
      color: BACKGROUND_COLOR,
      transparent: true,
      opacity: SELECTED_OPACITY,
    });
    return {
      foreground: new THREE.Mesh(geometry, foregroundMaterial),
      background: new THREE.Mesh(geometry, backgroundMaterial),
    };
  }

  // #endregion TOOL CONSTRUCTION

  // #region TOOL HIGHLIGHTING

  private hoverTool(index: number) {
    this.resetHoveredTool();
    this.hoveredTool = this.tools[index];
    this.hoveredTool.toggleHover(true);
  }

  private resetHoveredTool() {
    this.hoveredTool?.toggleHover(false);
    this.hoveredTool = null;
  }

  // #endregion TOOL HIGHLIGHTING

  // #region TOOL SELECTION

  private get selectedToolIndex() {
    if (this.selectedTool) return this.tools.indexOf(this.selectedTool);
    return this.defaultToolIndex;
  }

  private async selectTool(
    index: number,
    {
      enableAnimation = true,
    }: {
      enableAnimation?: boolean;
    } = {},
  ) {
    // While an animation is playing, no other tool can be selected.
    if (this.currentSelectAnimation) return;

    // A tool can only be selected if the index is in range.
    if (index < 0 || index >= this.tools.length) return;

    // Unselect previous tool unless this is the initially selected tool.
    this.selectedTool?.toggleSelect(false);

    // Select new current tool.
    this.selectedTool = this.tools[index];
    this.selectedTool.toggleSelect(true);

    // Animate the selected tool to the center if animations are enabled.
    const targetPositionX = -this.selectedTool.object.position.x;
    if (enableAnimation) {
      this.currentSelectAnimation = this.animationMixer.clipAction(
        new THREE.AnimationClip('select-animation', SELECT_ANIMATION_DURATION, [
          new THREE.KeyframeTrack(
            '.position[x]',
            [0.0, SELECT_ANIMATION_DURATION],
            [this.position.x, targetPositionX],
          ),
        ]),
      );
      this.currentSelectAnimation.setLoop(THREE.LoopOnce, 0);
      this.currentSelectAnimation.clampWhenFinished = true;
      this.currentSelectAnimation.play();

      // Wait for animation to finish. Since the animation is clamped, it has
      // to be stopped explicitly. Clamping the animation avoids it to snap back
      // to the original value before it is set to the target value below.
      await this.waitForAnimation(this.currentSelectAnimation);
      this.currentSelectAnimation.stop();
      this.currentSelectAnimation = null;
    }

    // Apply target value when animations are not enabled or when the animation is done.
    this.position.x = targetPositionX;
  }

  private selectPreviousTool() {
    this.selectTool(this.selectedToolIndex - 1);
  }

  private selectNextTool() {
    this.selectTool(this.selectedToolIndex + 1);
  }

  // #region TOOL SELECTION

  // #region OTHER CONTROLLER INPUT

  hover(intersection: THREE.Intersection) {
    super.hover(intersection);

    // Select clicked tool or run its action if it is selected already.
    const tool = this.findToolByObject(intersection.object);
    if (tool) {
      const index = this.tools.indexOf(tool);
      this.hoverTool(index);
    }
  }

  resetHoverEffect() {
    super.resetHoverEffect();
    this.resetHoveredTool();
  }

  triggerDown(intersection: THREE.Intersection) {
    super.triggerDown(intersection);

    // Select clicked tool or run its action if it is selected already.
    const tool = this.findToolByObject(intersection.object);
    if (tool) {
      const index = this.tools.indexOf(tool);
      if (index === this.selectedToolIndex) {
        this.selectedTool?.action();
      } else {
        this.selectTool(index);
      }
    }
  }

  // #endregion OTHER CONTROLLER INPUT

  // #region CONTROLLER INPUT

  makeThumbpadBinding() {
    return new VRControllerThumbpadBinding(
      { labelLeft: 'Previous', labelRight: 'Next' },
      {
        onThumbpadTouch: (_controller, axes) => {
          switch (
          VRControllerThumbpadBinding.getHorizontalDirection(axes, {
            threshold: THUMBPAD_THRESHOLD,
          })
          ) {
            case VRControllerThumbpadHorizontalDirection.LEFT:
              this.selectPreviousTool();
              break;
            case VRControllerThumbpadHorizontalDirection.RIGHT:
              this.selectNextTool();
              break;
            default:
              break;
          }
        },
        onThumbpadDown: (_controller, axes) => {
          switch (
          VRControllerThumbpadBinding.getHorizontalDirection(axes, {
            threshold: THUMBPAD_THRESHOLD,
          })
          ) {
            case VRControllerThumbpadHorizontalDirection.NONE:
              this.closeMenu()
              break;
          }
        }
      },
    );
  }

  makeTriggerButtonBinding() {
    return new VRControllerButtonBinding('Select', {
      onButtonDown: () => this.selectedTool?.action(),
    });
  }

  makeMenuButtonBinding() {
    return new VRControllerButtonBinding('Select', {
      onButtonDown: () => this.selectedTool?.action(),
    });
  }

  // #endregion CONTROLLER INPUT

  /**
   * Finds the tool that contains the given object.
   */
  private findToolByObject(object: THREE.Object3D): Tool | null {
    for (let i = 0; i < this.tools.length; i++) {
      const tool = this.tools[i];
      let current: THREE.Object3D | null = object;
      while (current) {
        if (current === tool.object) return tool;
        current = current.parent;
      }
    }
    return null;
  }
}
