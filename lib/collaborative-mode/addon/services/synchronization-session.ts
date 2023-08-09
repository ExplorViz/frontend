import Service, { inject as service } from '@ember/service';
import LocalUser from './local-user';
import CollaborationSession from './collaboration-session';
import * as THREE from 'three';
import { Mat3, Mat4, Vec3 } from 'collaborative-mode/utils/vecmat';

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

  // TestUpload attribute
  numberDevices?: number;

  roomId?: string;

  readonly rotation0 = new THREE.Euler(-14.315, 24.45517, 37.73257);
  readonly rotation1 = new THREE.Euler(16.31073, 27.50301, -35.22566);
  readonly rotation2 = new THREE.Euler(23.7238, 50.71501, -118.98493);
  readonly rotation3 = new THREE.Euler(-27.00377, 53.37216, 116.72392);
  readonly rotation4 = new THREE.Euler(2.18843, 73.21593, -9.4374);

  setCount(n: number) {
    this.numberDevices = n;
    console.log(this.numberDevices);
  }

  setUp(rId: string, dId: number) {
    this.roomId = rId;
    this.deviceId = dId;
    this.isMain = this.deviceId === 0;
  }

  degToRad = (degrees: number) => degrees * (Math.PI/180);

  setUpRotation(dId: number) {
    switch(dId) {
      case 1:
        const xRotationQuaternion0 = new THREE.Quaternion();
        xRotationQuaternion0.setFromAxisAngle(
          new THREE.Vector3(1, 0, 0),
          this.degToRad(-14.315)
        );

        const yRotationQuaternion0 = new THREE.Quaternion();
        yRotationQuaternion0.setFromAxisAngle(
          new THREE.Vector3(0, -1, 0),
          this.degToRad(24.45517)
        );

        const zRotationQuaternion0 = new THREE.Quaternion();
        zRotationQuaternion0.setFromAxisAngle(
          new THREE.Vector3(0, 0, 1),
          this.degToRad(37.73257) * Math.PI / 2 
        );

        this.localUser.camera.quaternion
        .multiply(new THREE.Quaternion(xRotationQuaternion0.x, yRotationQuaternion0.y, zRotationQuaternion0.z));

        break;

      case 2:
        const xRotationQuaternion1 = new THREE.Quaternion();
        xRotationQuaternion1.setFromAxisAngle(
          new THREE.Vector3(1, 0, 0),
          this.degToRad(16.31073)
        );

        const yRotationQuaternion1 = new THREE.Quaternion();
        yRotationQuaternion1.setFromAxisAngle(
          new THREE.Vector3(0, 1, 0),
          this.degToRad(27.50301)
        );

        const zRotationQuaternion1 = new THREE.Quaternion();
        zRotationQuaternion1.setFromAxisAngle(
          new THREE.Vector3(0, 0, 1),
          this.degToRad(-35.22566)
        );

        this.localUser.camera.quaternion
        .multiply(new THREE.Quaternion(xRotationQuaternion1.x, yRotationQuaternion1.y, zRotationQuaternion1.z));
        break;

      case 3:
        const xRotationQuaternion2 = new THREE.Quaternion();
        xRotationQuaternion2.setFromAxisAngle(
          new THREE.Vector3(1, 0, 0),
          this.degToRad(23.7238)
        );

        const yRotationQuaternion2 = new THREE.Quaternion();
        yRotationQuaternion2.setFromAxisAngle(
          new THREE.Vector3(0, -1, 0),
          this.degToRad(50.71501)
        );

        const zRotationQuaternion2 = new THREE.Quaternion();
        zRotationQuaternion2.setFromAxisAngle(
          new THREE.Vector3(0, 0, 1),
          this.degToRad(-118.98493) 
          * (Math.PI * 1.5)
        );

        this.localUser.camera.quaternion
        .multiply(new THREE.Quaternion(xRotationQuaternion2.x, yRotationQuaternion2.y, zRotationQuaternion2.z));
        break;

      case 4:
        const xRotationQuaternion3 = new THREE.Quaternion();
        xRotationQuaternion3.setFromAxisAngle(
          new THREE.Vector3(1, 0, 0),
          this.degToRad(-27.00377)
        );

        const yRotationQuaternion3 = new THREE.Quaternion();
        yRotationQuaternion3.setFromAxisAngle(
          new THREE.Vector3(0, -1, 0),
          this.degToRad( 53.37216)
        );

        const zRotationQuaternion3 = new THREE.Quaternion();
        zRotationQuaternion3.setFromAxisAngle(
          new THREE.Vector3(0, 0, 1),
          this.degToRad(116.72392) * Math.PI
        );

        this.localUser.camera.quaternion
        .multiply(new THREE.Quaternion(xRotationQuaternion3.x, yRotationQuaternion3.y, zRotationQuaternion3.z));
        break;

      case 5:
        // const xRotationQuaternion4 = new THREE.Quaternion();
        // xRotationQuaternion4.setFromAxisAngle(
        //   new THREE.Vector3(1, 0, 0),
        //   this.degToRad(2.18843)
        // );

        // const yRotationQuaternion4 = new THREE.Quaternion();
        // yRotationQuaternion4.setFromAxisAngle(
        //   new THREE.Vector3(0, 1, 0),
        //   this.degToRad(73.21593)
        // );

        // const zRotationQuaternion4 = new THREE.Quaternion();
        // zRotationQuaternion4.setFromAxisAngle(
        //   new THREE.Vector3(0, 0, 1),
        //   this.degToRad(-9.4374)
        // );

        // this.localUser.camera.quaternion
        // .multiply(new THREE.Quaternion(xRotationQuaternion4.x, yRotationQuaternion4.y, zRotationQuaternion4.z));
        break;
    }
  }

  public recalculate_camera_transform_dome_side(domeTilt: number, rot_z: number) {
    let perspective = Mat4.perspective_ext(
        -1, 
        1,
        0,
        -1,
        0.025,
        3
    );
    let mt;
    switch (rot_z) {
        case 1:
            mt = new Mat4(
                1, 0, 0, 0,
                0, 0, 1, 0,
                0, -1, 0, 0,
                0, 0, 0, 1
            );
            break;
        case 2:
            mt = new Mat4(
                0, -1, 0, 0,
                0, 0, 1, 0,
                -1, 0, 0, 0,
                0, 0, 0, 1
            );
            break;
        case 3: 
            mt = new Mat4(
                -1, 0, 0, 0,
                0, 0, 1, 0,
                0, 1, 0, 0,
                0, 0, 0, 1
            );
            break;
        default:
            mt = new Mat4(
                0, 1, 0, 0,
                0, 0, 1, 0,
                1, 0, 0, 0,
                0, 0, 0, 1
            );
    }
    // let result = this.calculate_camera_pretransform_internal();
    return perspective
        .mul_mat4(mt)
        .mul_mat4(
            Mat3.rot(
                (90 - domeTilt) / 180 * Math.PI,
                new Vec3(1, 0, 0))
            .extend()
            // .mul_mat4(result)
        );
}

// calculate_camera_pretransform_internal(): Mat4 {
//     let result = Mat3.identity().translate(new Vec3(0, 0, (this.camera_zposition_filtered - 1) * (Services.SettingsService.getValueOrDefault("Exaggeration", 1) / this.camera_distance_filtered)));
//     result = Mat3.rot(Math.PI / 2 - this.camera_elevation_filtered, new Vec3(1, 0, 0)).extend().mul_mat4(result);
//     result = Mat3.identity().translate(new Vec3(0, 0, 1)).mul_mat4(result);
//     return result.mul_mat4(new Mat4(0, -1, 0, 0, 1, 0, 0, 0, 0, 0, -1, 0, 0, 0, 0, 1));
// }

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

  // Transformation of 3D Coordinates into a 2D space that represents what a camera would see.
  // fov:    Field of view angle in the vertical direction (in radians?).
  //         It defines how wide the view is and is usually within the range of 30-45 degrees for human-like perception.
  // aspect: Aspect ratio of the view, usually defined as the width divided by the height of the display area.
  // near:   Distance to the near clipping plane. Any objects closer than this distance will not be rendered.
  // far:    Distance to the far clipping plane. Any objects farther than this distance will not be rendered.
  // x:      Scaling factor used to reduce the horizontal dimension according to the tangent of half the field of view.
  // y:      Scaling factor used to reduce the vertical dimension according to the tangent of half the field of view and the aspect ratio.
  // c, d:   Factors used in the transformation that depends on the distances to the near and far clipping planes.
  perspective(
    fov: number,
    aspect: number,
    near: number,
    far: number
  ): THREE.Matrix4 {
    // Assuming fov is in degrees?
    // const fovRad = fov * Math.PI / 180;

    const x = 1 / Math.tan(fov / 2);
    const y = aspect / Math.tan(fov / 2);
    const c = (far + near) / (far - near);
    const d = (-2 * far * near) / (far - near);

    return new THREE.Matrix4().set(
      x,
      0.0,
      0.0,
      0.0,

      0.0,
      y,
      0.0,
      0.0,

      0.0,
      0.0,
      c,
      d,

      0.0,
      0.0,
      1.0,
      0.0
    );
  }

  perspective_ext(
    left: number,
    right: number,
    top: number,
    bottom: number,
    near: number,
    far: number
  ): THREE.Matrix4 {
    const x = 2 / (right - left);
    const y = 2 / (top - bottom);

    const a = (right + left) / (right - left);
    const b = (top + bottom) / (top - bottom);

    const c = (far + near) / (far - near);
    const d = (-2 * far * near) / (far - near);

    return new THREE.Matrix4().set(
      x,
      0.0,
      a,
      0.0,

      0.0,
      y,
      b,
      0.0,

      0.0,
      0.0,
      c,
      d,

      0.0,
      0.0,
      1.0,
      0.0
    );
  }

  /** MAIN CONFIGS */
  setCamera() {

    // translate pixel to radians and divide it by projector count (here 4)
    const tanFOV = Math.tan(((Math.PI / 180) * this.localUser.camera.fov) / 4);

    // Calculating height of near clipping plane, which is a plane perpendicular to the viewing direction,
    // and is used to help determine which parts of the landscape should be rendered and which should not.
    const height = tanFOV * this.localUser.camera.near;
    // The proportion of the camera's viewport
    const width = height * this.localUser.camera.aspect;

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
