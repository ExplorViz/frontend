// Copied for modification from: https://github.com/mrdoob/three.js/blob/master/examples/jsm/controls/PointerLockControls.js

// import {
//   EventDispatcher,
//   MOUSE,
//   Quaternion,
//   Spherical,
//   TOUCH,
//   Vector2,
//   Vector3,
//   Plane,
//   Ray,
//   MathUtils,
// } from 'three';

import { Euler, EventDispatcher, MOUSE, Vector3 } from 'three';

const _euler = new Euler(0, 0, 0, 'YXZ');
const _vector = new Vector3();

const _minimalZoomLimitReached = { type: 'minzoomreached' };
const _maximalZoomLimitReached = { type: 'maxzoomreached' };
const _minimalZoom = { type: 'minzoom' };
const _maximalZoom = { type: 'maxzoom' };
const _lockEvent = { type: 'lock' };
const _unlockEvent = { type: 'unlock' };

const _PI_2 = Math.PI / 2;

class PointerLockControls extends EventDispatcher {
  constructor(camera, domElement) {
    super();
    // EventDispatcher Structure

    this.object = camera;
    this.domElement = domElement;

    this.enabled = true;

    this.state = -1;

    this.keys = {};
    this.mouseButtons = { LEFT: null, MIDDLE: MOUSE.DOLLY, RIGHT: null };
    this.touches = { ONE: null, TWO: null };
    // End of EventDispatcher Structure

    this.isLocked = true;

    // Set to constrain the pitch of the camera
    // Range is 0 to Math.PI radians
    this.minPolarAngle = 0; // radians
    this.maxPolarAngle = Math.PI; // radians

    // Zooming
    //
    //
    // // How far you can dolly in and out ( PerspectiveCamera only )
    // this.minDistance = 0;
    // this.maxDistance = Infinity;

    // "target" sets the location of focus, where the object orbits around
    this.target = new Vector3();

    // const spherical = new Spherical();
    // const dollyDirection = new Vector3();
    // const offset = new Vector3();
    // // so camera.up is the orbit axis
    // const quat = new Quaternion().setFromUnitVectors(
    //   this.object.up,
    //   new Vector3(0, 1, 0)
    // );
    // const quatInverse = quat.clone().invert();

    this.pointerSpeed = 1.0;

    this.enableZoom = true;

    this.zoomSpeed = 1.8;
    this.zoomToCursor = true;
    // Reduziert den aktuellen FOV um 20%
    // Copies the max FOV from the camera and sets the min to 100
    camera.fov = camera.fov + (camera.fov / 100) * 20;
    this.minFOV = 10;
    this.maxFOV = camera.fov;
    this.scale = 1;

    //const scope = this;

    const onMouseWheel = (event) => {
      if (this.enabled === false || this.enableZoom === false) return;

      event.preventDefault();

      //this.dispatchEvent(_startEvent);

      handleMouseWheel(event);

      //scope.dispatchEvent(_endEvent);
    };
    // Helper function to clamp FOV value
    const clampFov = (fov) => {
      const minFov = this.minFOV; // Minimum FOV value, for zooming in
      const maxFov = this.maxFOV; // Maximum FOV value, for zooming out
      const target = Math.max(minFov, Math.min(maxFov, fov));
      if (target == maxFov) {
        this.dispatchEvent(_minimalZoomLimitReached);
      } else if (target == minFov) {
        this.dispatchEvent(_maximalZoomLimitReached);
      }

      return target;
    };

    const handleMouseWheel = (event) => {
      const zoomScale = getZoomScale(event.deltaY);

      // if (event.deltaY < 0) {
      //   // Zoom in
      //   dollyIn(zoomScale);
      // } else if (event.deltaY > 0) {
      //   // Zoom out
      //   dollyOut(zoomScale);
      // }

      // //orthographic camera
      // const newZoom = clampDistance(this.object.zoom * this.scale);

      // // Apply the new zoom to the camera
      // this.object.zoom = newZoom;
      if (event.deltaY > 0) {
        // Zoom out
        this.dispatchEvent(_minimalZoom);
      } else if (event.deltaY < 0) {
        // Zoom in
        this.dispatchEvent(_maximalZoom);
      }

      // Adjust the FOV for the perspective camera
      const newFov = clampFov(this.object.fov + zoomScale);

      // Apply the new FOV to the perspective camera
      this.object.fov = newFov;

      this.object.updateProjectionMatrix();

      return;

      //updateZoomParameters(event.clientX, event.clientY);
      // if (event.deltaY < 0) {
      //   dollyIn(getZoomScale(event.deltaY));
      // } else if (event.deltaY > 0) {
      //   dollyOut(getZoomScale(event.deltaY));
      // }

      // //let zoomChanged = false;
      // //const prevRadius = spherical.radius;
      // spherical.radius = clampDistance(spherical.radius * this.scale);
      // //zoomChanged = prevRadius != spherical.radius;

      // offset.setFromSpherical(spherical);

      // // rotate offset back to "camera-up-vector-is-up" space
      // offset.applyQuaternion(quatInverse);

      // this.object.position.copy(this.target).add(offset);

      // this.object.lookAt(this.target);

      // const prevRadius = offset.length();
      // const newRadius = clampDistance(prevRadius * this.scale);
      // // move the camera down the pointer ray
      // // this method avoids floating point error
      // const radiusDelta = prevRadius - newRadius;
      // this.object.position.addScaledVector(dollyDirection, radiusDelta);
      // this.object.updateMatrixWorld();
    };
    const getZoomScale = (delta) => {
      const normalizedDelta = delta * 0.01;
      return this.zoomSpeed * normalizedDelta;
    };
    // const dollyOut = (dollyScale) => {
    //   this.scale /= dollyScale;
    // };

    // const dollyIn = (dollyScale) => {
    //   this.scale *= dollyScale;
    // };
    // const clampDistance = (dist) => {
    //   return Math.max(this.minDistance, Math.min(this.maxDistance, dist));
    // };
    // event listeners
    this._onMouseMove = onMouseMove.bind(this);
    this._onMouseWheel = onMouseWheel.bind(this);
    this._onPointerlockChange = onPointerlockChange.bind(this);
    this._onPointerlockError = onPointerlockError.bind(this);
    // function updateZoomParameters(x, y) {
    //   if (!this.zoomToCursor) {
    //     return;
    //   }

    //   //let performCursorZoom:Boolean = true;

    //   const rect = this.domElement.getBoundingClientRect();
    //   const dx = x - rect.left;
    //   const dy = y - rect.top;
    //   const w = rect.width;
    //   const h = rect.height;

    //   mouse.x = (dx / w) * 2 - 1;
    //   mouse.y = -(dy / h) * 2 + 1;

    //   dollyDirection
    //     .set(mouse.x, mouse.y, 1)
    //     .unproject(scope.object)
    //     .sub(this.object.position)
    //     .normalize();
    // }

    if (this.domElement !== null) {
      this.connect();
    }
  }

  connect() {
    this.domElement.ownerDocument.addEventListener(
      'mousemove',
      this._onMouseMove
    );
    this.domElement.ownerDocument.addEventListener(
      'pointerlockchange',
      this._onPointerlockChange
    );
    this.domElement.ownerDocument.addEventListener(
      'pointerlockerror',
      this._onPointerlockError
    );
    this.domElement.addEventListener('wheel', this._onMouseWheel, {
      passive: false,
    });
  }

  disconnect() {
    this.domElement.ownerDocument.removeEventListener(
      'mousemove',
      this._onMouseMove
    );
    this.domElement.ownerDocument.removeEventListener(
      'pointerlockchange',
      this._onPointerlockChange
    );
    this.domElement.ownerDocument.removeEventListener(
      'pointerlockerror',
      this._onPointerlockError
    );
    this.domElement.ownerDocument.removeEventListener(
      'wheel',
      this._onMouseWheel
    );
  }

  dispose() {
    this.disconnect();
  }

  getObject() {
    console.warn(
      'THREE.PointerLockControls: getObject() has been deprecated. Use controls.object instead.'
    ); // @deprecated r169

    return this.object;
  }

  getDirection(v) {
    return v.set(0, 0, -1).applyQuaternion(this.object.quaternion);
  }

  moveForward(distance) {
    if (this.enabled === false) return;

    // move forward parallel to the xz-plane
    // assumes camera.up is y-up

    const camera = this.object;

    _vector.setFromMatrixColumn(camera.matrix, 0);

    _vector.crossVectors(camera.up, _vector);

    camera.position.addScaledVector(_vector, distance);
  }

  moveRight(distance) {
    if (this.enabled === false) return;

    const camera = this.object;

    _vector.setFromMatrixColumn(camera.matrix, 0);

    camera.position.addScaledVector(_vector, distance);
  }

  lock() {
    this.domElement.requestPointerLock();
  }

  unlock() {
    this.domElement.ownerDocument.exitPointerLock();
  }
  update(/* delta */) {}
}

// event listeners

function onMouseMove(event) {
  if (this.enabled === false || this.isLocked === false) return;

  const movementX =
    event.movementX || event.mozMovementX || event.webkitMovementX || 0;
  const movementY =
    event.movementY || event.mozMovementY || event.webkitMovementY || 0;

  const camera = this.object;
  _euler.setFromQuaternion(camera.quaternion);

  _euler.y -= movementX * 0.002 * this.pointerSpeed;
  _euler.x -= movementY * 0.002 * this.pointerSpeed;

  _euler.x = Math.max(
    _PI_2 - this.maxPolarAngle,
    Math.min(_PI_2 - this.minPolarAngle, _euler.x)
  );

  camera.quaternion.setFromEuler(_euler);

  //this.dispatchEvent(_changeEvent);
}

function onPointerlockChange() {
  if (this.domElement.ownerDocument.pointerLockElement === this.domElement) {
    this.dispatchEvent(_lockEvent);

    this.isLocked = true;
  } else {
    this.dispatchEvent(_unlockEvent);

    this.isLocked = false;
  }
}

function onPointerlockError() {
  console.error('THREE.PointerLockControls: Unable to use Pointer Lock API');
}

export { PointerLockControls };
