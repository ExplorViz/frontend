import { LandscapeData } from "explorviz-frontend/controllers/visualization";
import THREE from "three";

export default class K8sNodeObject3d extends THREE.Object3D{

    landscapeData: LandscapeData;

    constructor(landscapeData: LandscapeData){
        super();
        this.landscapeData = landscapeData;
    }
}