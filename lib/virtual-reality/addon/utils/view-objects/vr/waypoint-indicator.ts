import * as THREE from 'three';

/**
 * The width of the texture in pixel.
 */
const WIDTH = 32;

/**
 * The height of the texture in pixel.
 */
const HEIGHT = 32;

/**
 * The width and height of the sprite in meter.
 */
const SIZE = 0.03;

/**
 * The distance of waypoint indicator from the middle of the screen.
 */
const DISTANCE = 0.1;

/**
 * How far away from the center of the camera's view the target can be
 * before the arrow is hidden.
 */
const HIDE_THREASHOLD = 0.5;

export default class WaypointIndicator extends THREE.Sprite {
  target: THREE.Object3D;

  constructor({
    color,
    target,
  }: {
    color: THREE.Color;
    target: THREE.Object3D;
  }) {
    super();
    this.target = target;
    const texture = this.initSpriteTexture(color);

    // Render the arrow always on top of everything else.
    this.renderOrder = 100;
    this.material = new THREE.SpriteMaterial({
      map: texture,
      depthTest: false,
    });

    // Scale and position the indicator such that it is in front of the
    // camera.
    this.position.x = 0.1;
    this.position.z = -0.3;
    this.scale.set(SIZE, SIZE, 1.0);

    // Update the arrow position whenever the object is rendered.
    // In VR only update the position once for both eyes.
    let needsUpdate = false;
    this.onBeforeRender = (renderer, _scene, camera) => {
      needsUpdate = !needsUpdate || !renderer.xr.enabled;
      if (needsUpdate) {
        this.updateArrowPosition(camera);
      }
    };
  }

  /**
   * Draws the arrow texture.
   *
   * The sprite's texture shows a right pointing triangle in the given color.
   */
  private initSpriteTexture(color: THREE.Color): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = `#${color.getHexString()}`;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(WIDTH, HEIGHT / 2);
      ctx.lineTo(0, HEIGHT);
      ctx.arcTo(16, 16, 0, 0, 16);
      ctx.fill();
    }

    return new THREE.CanvasTexture(canvas);
  }

  /**
   * Updates the position of the arrow such that it points to the target
   * object from the current view of the given camera.
   *
   * @param camera The camera whose perspective to use.
   */
  private updateArrowPosition(camera: THREE.Camera) {
    // When the targe is not visible, the waypoint indicator is not visible either.
    // The visible flag cannot be used to hide the object because this would disable
    // `onBeforeRendered` callbacks.
    if (!this.target.visible) {
      this.material.opacity = 0.0;
      return;
    }
    this.material.opacity = 1.0;

    // Get world coordinates of target.
    let position = new THREE.Vector3();
    this.target.getWorldPosition(position);

    // Convert world coordinates of target to normalized device coordinates.
    position.project(camera);

    // When the normalized z coordinate is greater than one, the target
    // is behind the camera and the sign of the x and y coordinates is
    // inverted.
    const isBehind = position.z > 1.0;
    if (isBehind) {
      position.x = -position.x;
      position.y = -position.y;
    }
    position.z = 0;

    // Rotate the arrow.
    const angle = Math.atan2(position.y, position.x);
    this.material.rotation = angle;

    // Hide the arrow when the target is close enoght to the center of the
    // camera's view.
    if (!isBehind && position.length() < HIDE_THREASHOLD) {
      this.material.opacity = 0.0;
    }

    // Place the arrow on a circle DISTANCE units away from the center of the camera.
    position = position.clone().normalize().multiplyScalar(DISTANCE);
    this.position.x = position.x;
    this.position.y = position.y;
  }
}
