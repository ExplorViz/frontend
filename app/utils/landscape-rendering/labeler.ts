import * as THREE from 'three';
import ApplicationMesh from 'explorviz-frontend/view-objects/3d/landscape/application-mesh';
import PlaneLabelMesh from 'explorviz-frontend/view-objects/3d/landscape/plane-label-mesh';
import NodeMesh from 'explorviz-frontend/view-objects/3d/landscape/node-mesh';

export default class Labeler {
  nodeLabelCache: Map<string, PlaneLabelMesh> = new Map();

  appLabelCache: Map<string, PlaneLabelMesh> = new Map();

  labelOffset = 0.001;

  /**
   * Creates a label and adds it at a calculated position to the given node mesh
   *
   * @param nodeMesh The mesh which shall be labeled
   * @param text Desired text
   * @param font Desired font of the text
   * @param color Desired color of the text
   */
  addNodeTextLabel(
    nodeMesh: NodeMesh,
    text: string,
    font: THREE.Font,
    color: THREE.Color,
    fontSize = 0.22,
    yOffset = 0.2
  ) {
    const labelMesh = Labeler.getLabel(
      this.nodeLabelCache,
      font,
      text,
      fontSize,
      color
    );

    nodeMesh.geometry.computeBoundingBox();
    const bboxParent = nodeMesh.geometry.boundingBox!;

    labelMesh.geometry.computeBoundingBox();
    const labelBoundingBox = labelMesh.geometry.boundingBox!;

    const labelMeshLength =
      Math.abs(labelBoundingBox.max.x) - Math.abs(labelBoundingBox.min.x);

    // Add label centered at top of node mesh label
    labelMesh.position.x = -(labelMeshLength / 2.0);
    labelMesh.position.y = bboxParent.min.y + yOffset;
    labelMesh.position.z = bboxParent.max.z + this.labelOffset;

    nodeMesh.add(labelMesh);
  }

  /**
   * Creates a label and adds it at a calculated position to the given application mesh
   *
   * @param applicationMesh The mesh which shall be labeled
   * @param text Desired text
   * @param font Desired font of the text
   * @param color Desired color of the text
   */
  addApplicationTextLabel(
    applicationMesh: ApplicationMesh,
    text: string,
    font: THREE.Font,
    color: THREE.Color,
    fontSize = 0.25,
    xOffset = 0.1
  ) {
    const labelMesh = Labeler.getLabel(
      this.appLabelCache,
      font,
      text,
      fontSize,
      color
    );

    applicationMesh.geometry.computeBoundingBox();
    const bboxParent = applicationMesh.geometry.boundingBox!;

    labelMesh.geometry.computeBoundingBox();
    const labelBoundingBox = labelMesh.geometry.boundingBox!;

    const labelHeight =
      Math.abs(labelBoundingBox.max.y) - Math.abs(labelBoundingBox.min.y);

    // Position label at left side of parent mesh: Leave space for app logo
    labelMesh.position.x = bboxParent.min.x + xOffset;
    labelMesh.position.y = -(labelHeight / 2.0);
    labelMesh.position.z = bboxParent.max.z + this.labelOffset;

    applicationMesh.add(labelMesh);
  }

  /**
   * Dispose all meshes and remove references
   */
  clearCache() {
    this.nodeLabelCache.forEach((label) => {
      label.disposeRecursively();
    });
    this.nodeLabelCache.clear();

    this.appLabelCache.forEach((label) => {
      label.disposeRecursively();
    });
    this.appLabelCache.clear();
  }

  /**
   * Calculates position of application logo and uses imageloader
   * to add the logo to the application mesh
   *
   * @param applicationMesh Mesh of application which shall be labeled
   * @param imageLoader Creates or returns cached image
   */
  addApplicationLogo(
    applicationMesh: ApplicationMesh,
    imageLoader: any,
    width = 0.4,
    height = 0.4
  ) {
    const application = applicationMesh.dataModel;

    applicationMesh.geometry.computeBoundingBox();

    const appBBox = applicationMesh.geometry.boundingBox!;

    const logoPos = new THREE.Vector3();

    const RIGHT_PADDING = width * 0.7;

    // Position at the very right of application mesh
    logoPos.x = appBBox.max.x - RIGHT_PADDING;
    logoPos.z = appBBox.max.z + this.labelOffset;

    const texturePartialPath = application.language.toLowerCase();

    // Create and add image to application mesh
    imageLoader.createPicture(
      logoPos,
      width,
      height,
      texturePartialPath,
      applicationMesh
    );
  }

  /**
   * Either returns a cached label or creates a new label with the given parameters
   *
   * @param labelCache Used to search for existing and matching label meshes
   * @param font Font of the text
   * @param text Text for label
   * @param size Size of text
   * @param color Color of text
   */
  static getLabel(
    labelCache: Map<string, PlaneLabelMesh>,
    font: THREE.Font,
    text: string,
    size: number,
    color: THREE.Color
  ) {
    let labelMesh: PlaneLabelMesh;

    const maybeLabel = labelCache.get(text);

    // Label with matching text and text size exists
    if (maybeLabel && maybeLabel.fontSize === size) {
      // Color also matches and label mesh is not in use => Use cached label
      if (
        maybeLabel.defaultColor.getHexString() === color.getHexString() &&
        !maybeLabel.parent
      ) {
        labelMesh = maybeLabel;
        // Only text and text size fit => Re-use text geometry
      } else {
        labelMesh = new PlaneLabelMesh(
          font,
          text,
          size,
          color,
          maybeLabel.geometry
        );
      }
      // No matching label mesh is cached => Create new label and cache it
    } else {
      labelMesh = new PlaneLabelMesh(font, text, size, color);
      labelCache.set(text, labelMesh);
    }

    return labelMesh;
  }
}
