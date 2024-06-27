import * as THREE from 'three';


const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); // Virtual ground Plane used to intersect raycast
let cam;


export function raycastToGround(camera: THREE.Camera): THREE.Vector3{
    const raycaster = new THREE.Raycaster();
    cam = camera;
    const screenX = window.innerWidth / 2;
    const screenY = window.innerHeight / 2;
    
    // Convert screen coordinates to world coordinates
    const middlePoint = screenToWorld(screenX, screenY);

    
    // Calculate the direction from the camera to the unprojected point
    const direction = middlePoint.sub(camera.position).normalize();
    
    // Set up the raycaster with the camera's position and the calculated direction
    raycaster.set(camera.position, direction);
    
    // Calculate the intersection point with the ground plane
    const intersectionPoint = new THREE.Vector3();
    raycaster.ray.intersectPlane(groundPlane, intersectionPoint);

    // Optional: Visualize the intersection point with a sphere
    // const sphereGeometry = new THREE.SphereGeometry(0.1, 32, 32);
    // const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    // const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    // sphere.position.copy(intersectionPoint);

    return intersectionPoint;
}

function screenToWorld(screenX: number, screenY: number): THREE.Vector3 {
    const vector = new THREE.Vector3();
    vector.set(
        (screenX / window.innerWidth) * 2 - 1,
        -(screenY / window.innerHeight) * 2 + 1,
        0.5
    );
    vector.unproject(cam);
    return vector;
}
function checkPosition(){

}
