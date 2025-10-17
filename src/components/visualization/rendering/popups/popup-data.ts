export interface PopupDataArgs {
  mouseX: number;
  mouseY: number;
  wasMoved: boolean;
  entityId: string;
  mesh: THREE.Mesh | undefined;
  applicationId: string;
  isPinned: boolean;
  sharedBy: string;
  menuId: string | null;
  hovered: boolean;
}

export default class PopupData {
  // @tracked
  mouseX: number;

  // @tracked
  mouseY: number;

  // @tracked
  wasMoved: boolean;

  entityId: string;

  // @tracked
  isPinned: boolean;

  // @tracked
  sharedBy: string | null;

  menuId: string | null;

  // @tracked
  hovered: boolean;

  constructor({
    mouseX,
    mouseY,
    entityId,
    wasMoved,
    isPinned,
    sharedBy,
    menuId,
    hovered,
  }: PopupDataArgs) {
    this.mouseX = mouseX;
    this.mouseY = mouseY;
    this.entityId = entityId;
    this.wasMoved = wasMoved;
    this.isPinned = isPinned;
    this.sharedBy = sharedBy;
    this.menuId = menuId;
    this.hovered = hovered;
  }
}
