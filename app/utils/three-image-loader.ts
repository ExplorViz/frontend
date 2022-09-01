import * as THREE from 'three';
import LogoMesh from 'explorviz-frontend/view-objects/3d/logo-mesh';

export default class ThreeImageLoader {
  // Used for efficient re-use and access of logos
  logoCache: Map<string, THREE.Texture> = new Map();

  // Class that actually is loading the texture
  textureLoader: THREE.TextureLoader = new THREE.TextureLoader();

  /**
   * Creates a LogoMesh by using a cached texture or loading a new one with
   * the passed parameters and adds it to the given parent.
   *
   * @param position Desired position of the picture
   * @param width Width of the picture in px
   * @param height Height of the picture in px
   * @param textureName Name of the .png file which contains the desired image
   * @param parent Object3D to which the picture is added
   */
  createPicture(position: THREE.Vector3, width: number, height: number,
    textureName: string, parent: THREE.Object3D): void {
    const logo = this.logoCache.get(textureName);

    /**
     * Instantiates a LogoMesh with the given texture and adds it to the object.
     * @param texture Texture for the LogoMesh
     * @param object New parent for the created LogoMesh
     */
    function createAndAddLogoMesh(texture: THREE.Texture, object: THREE.Object3D) {
      const logoMesh = new LogoMesh(texture, width, height);
      logoMesh.position.copy(position);

      object.add(logoMesh);
    }

    // Use cached texture for logo if one exists
    if (logo) {
      createAndAddLogoMesh(logo, parent);
    // Load new texture and create logo
    } else {
      this.textureLoader.load(`/images/logos/${textureName}.png`, (texture) => {
        this.logoCache.set(textureName, texture);

        createAndAddLogoMesh(this.logoCache.get(textureName) as THREE.Texture, parent);
      });
    }
  }
}
