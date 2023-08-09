/* eslint-disable no-case-declarations */
import Service, { inject as service } from '@ember/service';
import LocalUser from './local-user';
import CollaborationSession from './collaboration-session';
import * as THREE from 'three';

type fovDirection = {
  up: number;
  down: number;
  left: number;
  right: number;
};

export default class SynchronizationSession extends Service {
  @service('local-user')
  private localUser!: LocalUser;

  @service('collaboration-session')
  collaborationSession!: CollaborationSession;

  // Controlinstance of the connected devices
  private isMain: boolean = false;

  // The id of the connected device
  deviceId!: number;

  private tilt = 21;

  // TestUpload attribute
  numberDevices?: number;

  roomId?: string;

  readonly rotation0 = new THREE.Euler(-14.315, 24.45517, 37.73257, 'ZYX');
  readonly rotation1 = new THREE.Euler(16.31073, 27.50301, -35.22566, 'ZYX');
  readonly rotation2 = new THREE.Euler(23.7238, 50.71501, -118.98493, 'ZYX');
  readonly rotation3 = new THREE.Euler(-27.00377, 53.37216, 116.72392, 'ZYX');
  readonly rotation4 = new THREE.Euler(2.18843, 73.21593, -9.4374, 'ZYX');

  setCount(n: number) {
    this.numberDevices = n;
    console.log(this.numberDevices);
  }

  setUp(rId: string, dId: number) {
    this.roomId = rId;
    this.deviceId = dId;
    this.isMain = this.deviceId === 0;
  }

  degToRad = (degrees: number) => degrees * (Math.PI / 180);

  /*
    Roll: X
    Pitch: Y
    Yaw: Z
  */
  setUpRotation(dId: number) {
    // switch (dId) {
    //   case 1:
    //     const xRotationQuaternion0 = new THREE.Quaternion();
    //     xRotationQuaternion0.setFromAxisAngle(
    //       new THREE.Vector3(1, 0, 0),
    //       this.degToRad(-14.315)
    //     );

    //     const yRotationQuaternion0 = new THREE.Quaternion();
    //     yRotationQuaternion0.setFromAxisAngle(
    //       new THREE.Vector3(0, -1, 0),
    //       this.degToRad(24.45517)
    //     );

    //     const zRotationQuaternion0 = new THREE.Quaternion();
    //     zRotationQuaternion0.setFromAxisAngle(
    //       new THREE.Vector3(0, 0, 1),
    //       (this.degToRad(37.73257) * Math.PI) / 2
    //     );

    //     this.localUser.camera.quaternion.multiply(
    //       new THREE.Quaternion(
    //         xRotationQuaternion0.x,
    //         yRotationQuaternion0.y,
    //         zRotationQuaternion0.z
    //       )
    //     );

    //     break;

    //   case 2:
    //     const xRotationQuaternion1 = new THREE.Quaternion();
    //     xRotationQuaternion1.setFromAxisAngle(
    //       new THREE.Vector3(1, 0, 0),
    //       this.degToRad(16.31073)
    //     );

    //     const yRotationQuaternion1 = new THREE.Quaternion();
    //     yRotationQuaternion1.setFromAxisAngle(
    //       new THREE.Vector3(0, 1, 0),
    //       this.degToRad(27.50301)
    //     );

    //     const zRotationQuaternion1 = new THREE.Quaternion();
    //     zRotationQuaternion1.setFromAxisAngle(
    //       new THREE.Vector3(0, 0, 1),
    //       this.degToRad(-35.22566)
    //     );

    //     this.localUser.camera.quaternion.multiply(
    //       new THREE.Quaternion(
    //         xRotationQuaternion1.x,
    //         yRotationQuaternion1.y,
    //         zRotationQuaternion1.z
    //       )
    //     );
    //     break;

    //   case 3:
    //     const xRotationQuaternion2 = new THREE.Quaternion();
    //     xRotationQuaternion2.setFromAxisAngle(
    //       new THREE.Vector3(1, 0, 0),
    //       this.degToRad(23.7238)
    //     );

    //     const yRotationQuaternion2 = new THREE.Quaternion();
    //     yRotationQuaternion2.setFromAxisAngle(
    //       new THREE.Vector3(0, -1, 0),
    //       this.degToRad(50.71501)
    //     );

    //     const zRotationQuaternion2 = new THREE.Quaternion();
    //     zRotationQuaternion2.setFromAxisAngle(
    //       new THREE.Vector3(0, 0, 1),
    //       this.degToRad(-118.98493) * (Math.PI * 1.5)
    //     );

    //     this.localUser.camera.quaternion.multiply(
    //       new THREE.Quaternion(
    //         xRotationQuaternion2.x,
    //         yRotationQuaternion2.y,
    //         zRotationQuaternion2.z
    //       )
    //     );
    //     break;

    //   case 4:
    //     const xRotationQuaternion3 = new THREE.Quaternion();
    //     xRotationQuaternion3.setFromAxisAngle(
    //       new THREE.Vector3(1, 0, 0),
    //       this.degToRad(-27.00377)
    //     );

    //     const yRotationQuaternion3 = new THREE.Quaternion();
    //     yRotationQuaternion3.setFromAxisAngle(
    //       new THREE.Vector3(0, -1, 0),
    //       this.degToRad(53.37216)
    //     );

    //     const zRotationQuaternion3 = new THREE.Quaternion();
    //     zRotationQuaternion3.setFromAxisAngle(
    //       new THREE.Vector3(0, 0, 1),
    //       this.degToRad(116.72392) * Math.PI
    //     );

    //     this.localUser.camera.quaternion.multiply(
    //       new THREE.Quaternion(
    //         xRotationQuaternion3.x,
    //         yRotationQuaternion3.y,
    //         zRotationQuaternion3.z
    //       )
    //     );
    //     break;

    //   case 5:
    //     // const xRotationQuaternion4 = new THREE.Quaternion();
    //     // xRotationQuaternion4.setFromAxisAngle(
    //     //   new THREE.Vector3(1, 0, 0),
    //     //   this.degToRad(2.18843)
    //     // );

    //     // const yRotationQuaternion4 = new THREE.Quaternion();
    //     // yRotationQuaternion4.setFromAxisAngle(
    //     //   new THREE.Vector3(0, 1, 0),
    //     //   this.degToRad(73.21593)
    //     // );

    //     // const zRotationQuaternion4 = new THREE.Quaternion();
    //     // zRotationQuaternion4.setFromAxisAngle(
    //     //   new THREE.Vector3(0, 0, 1),
    //     //   this.degToRad(-9.4374)
    //     // );

    //     // this.localUser.camera.quaternion
    //     // .multiply(new THREE.Quaternion(xRotationQuaternion4.x, yRotationQuaternion4.y, zRotationQuaternion4.z));
    //     break;
    // }

    /*
    digital earthviewer uses x als tilt and calculates 90 - tilt°!!!!!!!!!!!!!!!!!

    Roll: X
    Pitch: Y
    Yaw: Z

    ?????
    So, for each projector, you can set its yaw rotation based on its position:
    1st Projector: 0° (or 360°)
    2nd Projector: 90°
    3rd Projector: 180°
    4th Projector: 270°
    
    
    -> #############################################Digital Earthviewer:
    
    1: Considering your first point:
Which degree is this matrix representing on Z, when multiplying it with the present rotation of the visual?
mt = new Mat4(
                    1, 0, 0, 0,
                    0, 0, 1, 0,
                    0, -1, 0, 0,
                    0, 0, 0, 1
                );
    
    This matrix represents a transformation in 3D space. To understand the rotational transformation, 
    you'll want to focus on the top-left 3x3 sub-matrix:

1,  0,  0
0,  0,  1
0, -1,  0

This is a rotation matrix. Specifically, it represents a rotation about the X-axis of 90°. 
This can be understood by observing how the standard basis vectors transform:

The first column is the image of the x-axis (1,0,0) under the transformation, which is still (1,0,0), indicating no rotation along the x-axis.

The second column is the image of the y-axis (0,1,0) under the transformation. It transforms to (0,0,1), 
which indicates that the positive y-axis has been rotated to the positive z-axis.

The third column is the image of the z-axis (0,0,1) under the transformation. It transforms to (0,-1,0), 
which indicates that the positive z-axis has been rotated to the negative y-axis.

In essence, what you are seeing is a 90° rotation around the X-axis in a right-handed coordinate system.
However, note that rotation matrices typically rotate the entire coordinate system rather than an individual point or vector. This means that if you use this matrix to transform a point, it will appear as if the point has rotated -90° around the X-axis (the opposite direction of the coordinate system rotation).
    
2:                 mt = new Mat4(
                    0, -1, 0, 0,
                    0, 0, 1, 0,
                    -1, 0, 0, 0,
                    0, 0, 0, 1
                );
    
    Let's dissect the matrix:

0, -1,  0
0,  0,  1
-1, 0,  0

Again, to interpret this 3x3 sub-matrix, let's look at how the standard basis vectors transform:

    The first column is the image of the x-axis (1,0,0) under the transformation. 
    It becomes (0,0,-1), indicating the x-axis is rotated to the negative z-axis.

    The second column is the image of the y-axis (0,1,0) under the transformation. 
    It becomes (-1,0,0), which means the y-axis is rotated to the negative x-axis.

    The third column is the image of the z-axis (0,0,1) under the transformation. 
    It remains at (0,1,0), indicating that the z-axis is rotated to the y-axis.

This matrix represents a composite rotation. Specifically, it's a 90° rotation around the Z-axis followed by a 90° 
rotation around the Y-axis in a right-handed coordinate system.

Just as before, if this matrix is used to transform a point, it will appear as if the point undergoes two opposite rotations, 
first -90° around the Y-axis and then -90° around the Z-axis, because the matrix operates by rotating the entire coordinate system.


    3:   mt = new Mat4(
                    -1, 0, 0, 0,
                    0, 0, 1, 0,
                    0, 1, 0, 0,
                    0, 0, 0, 1
                );

    For the matrix:

-1,  0,  0
 0,  0,  1
 0,  1,  0

Let's interpret the 3x3 sub-matrix by examining its effect on the standard basis vectors:

    The first column is the image of the x-axis (1,0,0) under the transformation. 
    It becomes (-1,0,0), indicating that the x-axis is reflected across the yz-plane.

    The second column is the image of the y-axis (0,1,0) under the transformation. 
    It becomes (0,0,1), which means the y-axis is rotated to the z-axis.

    The third column is the image of the z-axis (0,0,1) under the transformation. 
    It becomes (0,1,0), indicating that the z-axis is rotated to the y-axis.

This matrix represents a 180° rotation around the Z-axis in a right-handed coordinate system.

If a point is transformed using this matrix, the effect will be to rotate it by 180° around the Z-axis, 
making it seem like the entire coordinate system underwent a 180° rotation in the opposite direction around the Z-axis.

    4: 
                    mt = new Mat4(
                    0, 1, 0, 0,
                    0, 0, 1, 0,
                    1, 0, 0, 0,
                    0, 0, 0, 1
                );

For the matrix:

 0,  1,  0
 0,  0,  1
 1,  0,  0

Let's interpret the 3x3 sub-matrix by examining its effect on the standard basis vectors:

    The first column is the image of the x-axis (1,0,0) under the transformation. 
    It becomes (0,0,1), indicating that the x-axis is rotated to where the z-axis originally was.

    The second column is the image of the y-axis (0,1,0) under the transformation. 
    It becomes (1,0,0), which means the y-axis is rotated to where the x-axis originally was.

    The third column is the image of the z-axis (0,0,1) under the transformation. 
    It becomes (0,1,0), indicating that the z-axis is rotated to where the y-axis originally was.

This matrix represents a 90° rotation counterclockwise around the Y-axis in a right-handed coordinate system.

If a point is transformed using this matrix, the effect will be to rotate it by 90° around the Y-axis. Similarly, 
it can be interpreted as rotating the entire coordinate system 90° in the opposite direction around the Y-axis.









CONSIDERING PROJECTOR ANGLES: right, left, up and downAngle!
Given the context you've provided, here's what you should do:

    Set Initial Camera Rotation:
        You've provided an initial Euler rotation (rotation0) for your camera. I noticed you are directly using degrees in the Euler constructor, but typically the Euler constructor in THREE.js expects radians. Ensure that your rotation0 values are in radians or convert them if they are in degrees.
        Instead of multiplying quaternions directly, it's generally easier to set Euler rotations on the camera and let THREE.js handle the conversion to quaternions.

    Apply Yaw, Pitch, and Roll:
        When you say you applied yaw, pitch, and roll to your "present rotation", I assume you mean you adjusted the camera's rotation based on some dynamic input values for yaw, pitch, and roll. Ensure that these adjustments are in radians, or convert them from degrees if needed.
        Since you're working with Eulers and then converting to a quaternion, it would be easier to modify the Euler angles directly and then set that on your camera.

    Use the Frustum Configuration:
        The rightAngle, leftAngle, upAngle, and downAngle values from your MPCDI XML define the angular extents of your projection frustum from the center view direction. These will directly influence your projection matrix. Ensure these angles are in radians or convert them if they are in degrees.

Here's a structured approach based on the information you've provided:

// Convert degrees to radians
function degToRad(degrees) {
  return degrees * (Math.PI / 180);
}

// 1. Set Initial Rotation
const initialRotation = new THREE.Euler(
  degToRad(-14.315),
  degToRad(24.45517),
  degToRad(37.73257),
  'YXZ' // Order matters for Euler rotations
);

// 2. Apply Yaw, Pitch, and Roll adjustments
// (Replace with your actual dynamic values for yaw, pitch, roll)
const yawAdjustment = degToRad( Yaw Value );
const pitchAdjustment = degToRad( Pitch Value );
const rollAdjustment = degToRad( Roll Value );

// Update the initial rotation with the adjustments
initialRotation.x += pitchAdjustment;
initialRotation.y += yawAdjustment;
initialRotation.z += rollAdjustment;

// Set this updated rotation to your camera
this.localUser.camera.rotation.copy(initialRotation);

// 3. Use the Frustum Configuration
// Assuming you've parsed these angles from your XML and they are in degrees
const rightAngle = degToRad(/* Parsed Right Angle );
const leftAngle = degToRad(/* Parsed Left Angle );
const upAngle = degToRad(/* Parsed Up Angle );
const downAngle = degToRad(/* Parsed Down Angle );

const tanFOV = Math.tan(rightAngle); // Assuming symmetric FOV for simplification
const aspect = this.localUser.camera.aspect;
const near = this.localUser.camera.near;

const up = tanFOV * near;
const down = -tanFOV * near;
const right = up * aspect;
const left = -right;

this.localUser.camera.projectionMatrix.makePerspective(
  left,
  right,
  up,
  down,
  this.localUser.camera.near,
  this.localUser.camera.far
);

This approach sets the camera's orientation based on the initial Euler angles and any dynamic yaw, pitch, and roll adjustments. 
It then configures the camera's projection matrix based on the frustum angles provided in the MPCDI XML.

Ensure you're also updating the camera's matrix after modifying its rotation and projection matrix by calling 
this.localUser.camera.updateMatrixWorld(true);
    */
    switch (dId) {
      case 1:
        this.localUser.camera.quaternion.multiply(
          new THREE.Quaternion(
            this.degToRad(this.rotation0.x),
            this.degToRad(this.rotation0.y + this.tilt),
            this.degToRad(this.rotation0.z)
          )
        );
        break;

      case 2:
        this.localUser.camera.quaternion.multiply(
          new THREE.Quaternion(
            this.degToRad(this.rotation1.x),
            this.degToRad(this.rotation1.y + this.tilt),
            this.degToRad(this.rotation1.z)
          )
        );
        break;

      case 3:
        this.localUser.camera.quaternion.multiply(
          new THREE.Quaternion(
            this.degToRad(this.rotation2.x),
            this.degToRad(this.rotation2.y + this.tilt),
            this.degToRad(this.rotation2.z)
          )
        );
        break;

      case 4:
        this.localUser.camera.quaternion.multiply(
          new THREE.Quaternion(
            this.degToRad(this.rotation3.x),
            this.degToRad(this.rotation3.y + this.tilt),
            this.degToRad(this.rotation3.z)
          )
        );
        break;

      case 5:
        this.localUser.camera.quaternion.multiply(
          new THREE.Quaternion(
            this.degToRad(this.rotation4.x),
            this.degToRad(this.rotation4.y + this.tilt),
            this.degToRad(this.rotation4.z)
          )
        );
        break;
    }
  }

  calculateFOVDirections(camera: THREE.PerspectiveCamera): fovDirection {
    const aspect = camera.aspect;
    const near = camera.near;
    const fov = camera.fov;
    // For Example: Calculate values for one side at a time (distance from center to the top or bottom)
    // tan(FOV / 2): Find ratio between opposite sides and the adjacent side of a right triangly that repsents half the viewing frustum.
    // FOV/2: Half of the full FOV angle
    const tanFOV = Math.tan(((Math.PI / 180) * fov) / 2);

    const up = tanFOV * near;
    const down = -up;
    const right = up * aspect;
    const left = -right;

    return { up, down, left, right };
  }

  /** MAIN CONFIGS */
  setCamera() {
    /* Clippling Planes:
    A clipping plane is a plane used in 3D computer graphics to cut off objects or portions of objects that 
    fall on a specific side of the plane. Clipping planes are essential for managing what is visible in a rendered scene 
    and improving rendering efficiency.

    In the context of 3D rendering, particularly in perspective and orthographic projections, 
    there are several standard clipping planes that define a view frustum:
    Near Clipping Plane: This is the plane closest to the camera. Anything closer to the camera than this plane will not be rendered. 
    This helps in omitting objects that are too close and might obstruct the view.

    Far Clipping Plane: This is the plane furthest from the camera in the viewing direction. 
    Anything beyond this plane will not be rendered. 
    This is used to prevent rendering distant objects that have little impact on the scene but could still consume computational resources.

    Together, these planes define a frustum (a truncated pyramid shape in perspective projection, or a rectangular prism in orthographic projection) 
    within which everything is rendered. Anything outside this frustum is clipped and not drawn.
    The use of clipping planes ensures that the rendering engine only processes what is within the viewable area, 
    improving performance and preventing unwanted artifacts. Clipping can be performed in various coordinate spaces 
    (e.g., object space, world space, camera space), and the mathematics of how it's done will depend on the specific situation 
    and the type of projection being used.
    */

    /*
    Left, Right, Top, Bottom Clipping Planes: 
    These define the sides of the viewing frustum and are particularly relevant in asymmetric projections. 
    They clip the scene horizontally and vertically to fit within the desired view.

    near and far: distances to the near and far clipping planes. 
    Only objects within this range will be rendered.
    -> Keep in mind: This will affect the visibility range of the object.
    -> Outside from near or far, there will be no rendering
    */

    /* Pyramid of camera. */
    //   switch (this.deviceId) {
    //     case 1: // bottom left
    //       this.localUser.camera.projectionMatrix.makePerspective(
    //         -width / 2, // left
    //         0, // right
    //         0, // top
    //         -height / 2, // bottom
    //         this.localUser.camera.near / 4, // near
    //         this.localUser.camera.far / 4 // far
    //       );
    //       break;
    //     case 2: // top left
    //       this.localUser.camera.projectionMatrix.makePerspective(
    //         -width / 2, // left
    //         0, // right
    //         height / 2, // top
    //         0, // bottom
    //         this.localUser.camera.near / 4, // near
    //         this.localUser.camera.far / 4 // far
    //       );
    //       break;
    //     case 3: // top right
    //       this.localUser.camera.projectionMatrix.makePerspective(
    //         0, // left
    //         width / 2, // right
    //         height / 2, // top
    //         0, // bottom
    //         this.localUser.camera.near / 4, // near
    //         this.localUser.camera.far / 4 // far
    //       );
    //       break;
    //     case 4: // bottom right
    //       this.localUser.camera.projectionMatrix.makePerspective(
    //         0, // left
    //         width / 2, // right
    //         0, // top
    //         -height / 2, // bottom
    //         this.localUser.camera.near / 4, // near
    //         this.localUser.camera.far / 4 // far
    //       );
    //       break;
    //     case 5: //middle
    //       this.localUser.camera.projectionMatrix.makePerspective(
    //         -width / 2, // left
    //         width / 2, // right
    //         height / 2, // top
    //         -height / 2, // bottom
    //         this.localUser.camera.near / 4, // near
    //         this.localUser.camera.far / 4 // far
    //       );
    //       break;
    //     default:
    //       break;
    //   }
    // }
    const fovDirections = this.calculateFOVDirections(this.localUser.camera);
    switch (this.deviceId) {
      case 1: // bottom left
        this.localUser.camera.projectionMatrix.makePerspective(
          fovDirections.left, // left
          fovDirections.right, // right
          fovDirections.up, // top
          fovDirections.down, // bottom
          this.localUser.camera.near, // near
          this.localUser.camera.far // far
        );
        break;

      case 2: // top left
        this.localUser.camera.projectionMatrix.makePerspective(
          fovDirections.left, // left
          fovDirections.right, // right
          fovDirections.up, // top
          fovDirections.down, // bottom
          this.localUser.camera.near, // near
          this.localUser.camera.far // far
        );

        break;
      case 3: // top right
        this.localUser.camera.projectionMatrix.makePerspective(
          fovDirections.left, // left
          fovDirections.right, // right
          fovDirections.up, // top
          fovDirections.down, // bottom
          this.localUser.camera.near, // near
          this.localUser.camera.far // far
        );

        break;
      case 4: // bottom right
        this.localUser.camera.projectionMatrix.makePerspective(
          fovDirections.left, // left
          fovDirections.right, // right
          fovDirections.up, // top
          fovDirections.down, // bottom
          this.localUser.camera.near, // near
          this.localUser.camera.far // far
        );
        break;
      case 5: //middle
        this.localUser.camera.projectionMatrix.makePerspective(
          fovDirections.left, // left
          fovDirections.right, // right
          fovDirections.up, // top
          fovDirections.down, // bottom
          this.localUser.camera.near, // near
          this.localUser.camera.far // far
        );
        break;
      default:
        break;
    }
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'synchronization-session': SynchronizationSession;
  }
}
