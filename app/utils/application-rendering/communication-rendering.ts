import ClazzCommunicationMesh from 'explorviz-frontend/view-objects/3d/application/clazz-communication-mesh';
import applyCommunicationLayout, {
  calculateLineThickness,
} from 'explorviz-frontend/utils/application-rendering/communication-layouter';
import Configuration from 'explorviz-frontend/services/configuration';
import ApplicationObject3D from 'explorviz-frontend/view-objects/3d/application/application-object-3d';
import CommunicationLayout from 'explorviz-frontend/view-objects/layout-models/communication-layout';
import UserSettings from 'explorviz-frontend/services/user-settings';
import { Vector3 } from 'three';
import ClazzCommuMeshDataModel from 'explorviz-frontend/view-objects/3d/application/utils/clazz-communication-mesh-data-model';
import LocalUser from 'collaborative-mode/services/local-user';
import { MeshLineMaterial } from 'meshline';
import * as THREE from 'three';
import { findFirstOpen } from '../link-helper';
import ComponentCommunication from '../landscape-schemes/dynamic/component-communication';
import { Application, Package } from '../landscape-schemes/structure-data';
import ClassCommunication from '../landscape-schemes/dynamic/class-communication';
import { getAllClassesInApplication } from '../application-helpers';

export default class CommunicationRendering {
  // Service to access preferences
  configuration: Configuration;

  userSettings: UserSettings;

  localUser: LocalUser;

  constructor(
    configuration: Configuration,
    userSettings: UserSettings,
    localUser: LocalUser
  ) {
    this.configuration = configuration;
    this.userSettings = userSettings;
    this.localUser = localUser;
  }

  get appSettings() {
    return this.userSettings.applicationSettings;
  }

  private computeCurveHeight(commLayout: CommunicationLayout) {
    let baseCurveHeight = 20;

    if (this.configuration.commCurveHeightDependsOnDistance) {
      const classDistance = Math.hypot(
        commLayout.endX - commLayout.startX,
        commLayout.endZ - commLayout.startZ
      );
      baseCurveHeight = classDistance * 0.5;
    }

    return baseCurveHeight * this.appSettings.curvyCommHeight.value;
  }

  // Add arrow indicators for class communication
  private addArrows(
    pipe: ClazzCommunicationMesh,
    curveHeight: number,
    viewCenterPoint: Vector3
  ) {
    const arrowOffset = 0.8;
    const arrowHeight = curveHeight / 2 + arrowOffset;
    const arrowThickness = this.appSettings.commArrowSize.value;
    const arrowColorHex =
      this.configuration.applicationColors.communicationArrowColor.getHex();

    if (arrowThickness > 0.0) {
      pipe.addArrows(
        viewCenterPoint,
        arrowThickness,
        arrowHeight,
        arrowColorHex
      );
    }
  }

  // Update arrow indicators for class communication
  addBidirectionalArrow = (pipe: ClazzCommunicationMesh) => {
    pipe.addBidirectionalArrow();
  };


  // returns a map from class id to its superclass id
  private applyInheritance(application: Application) {

    const packages = application.packages;
    let values : [string,string][] = [];
    let values2: [string,string][] = [];
    for(const pckg of packages){
      const val = this.getMapEntries(pckg, "");
      values = [...values, ...val.fqClassNameToClassId];
      values2 = [...values2, ...val.classIdToSuperClassFqn];
    }

    const helperMap = new Map<string, string>(values); // maps full qualified class name to its id
    const helperMap2 = new Map<string, string>(values2); // maps class id to its full qualified superclass name (even if more than one "superclass", e.g. multiple interfaces, exist), they are all provided in a csv-string
    const classIdToSuperClassId = new Map();

    helperMap2.forEach((val,key) => {

      let superClassFqn = val;
      if(val.includes("<")){
        const valSplit = val.split("<"); // generic class
        superClassFqn = valSplit[0];
      }

      const superClassId = helperMap.get(superClassFqn);

      if(superClassId){
        classIdToSuperClassId.set(key, superClassId);
      }
    });

    return classIdToSuperClassId;

  }

  private getMapEntries(pckg: Package, fqn: string) : {fqClassNameToClassId: [string,string][]; classIdToSuperClassFqn: [string,string][]; }{
    let newFqn;
    if(fqn === ""){
      newFqn = pckg.name;
    }else {
      newFqn = fqn + "." + pckg.name;
    }
  
    let res: [string, string][] = [];
    let res2: [string, string][] = [];
    for(let clazz of pckg.classes){
      res.push([newFqn + "." + clazz.name, clazz.id]);
      if(clazz.superClass){
        res2.push([clazz.id, clazz.superClass]);
      }
    }

    let resres;
    for(let subPackage of pckg.subPackages){
      resres = this.getMapEntries(subPackage, newFqn);

      res = [...res, ...resres.fqClassNameToClassId];
      res2 = [...res2, ...resres.classIdToSuperClassFqn];
    }
    return {
      fqClassNameToClassId: res, 
      classIdToSuperClassFqn: res2
    };

  }

  private extendClassCommunications(applicationObject3D: ApplicationObject3D, classIdToSuperClassId: Map<string,string>){
    // TODO: extend application.data.classCommunications
    
    classIdToSuperClassId.forEach((val,key) => {

      const classList = getAllClassesInApplication(applicationObject3D.data.application);

      const sourceClass = classList.find(clazz => {return clazz.id === key; });
      const targetClass = classList.find(clazz => {return clazz.id === val; });

      if(sourceClass && targetClass){
        const classCommunication = new ClassCommunication(
          `inheritance_${key}_${val}`,
          applicationObject3D.data.application,
          sourceClass,
          applicationObject3D.data.application,
          targetClass,
          `inheritance_${key}_${val}`
        );

        applicationObject3D.data.classCommunications.push(classCommunication);
      }

      
    });

  }

  /**
   * Computes communication and communication arrows and adds them to the
   * applicationObject3D
   *
   * @param applicationObject3D Contains all application meshes.
   *                            Computed communication is added to to object.
   */
  addCommunication(applicationObject3D: ApplicationObject3D) {
    if (!this.configuration.isCommRendered) return;

    const application = applicationObject3D.data.application;
    const applicationLayout = applicationObject3D.boxLayoutMap.get(
      application.id
    );

    if (!applicationLayout) {
      return;
    }

    // Store colors of highlighting
    const oldHighlightedColors = new Map<string, THREE.Color>();
    applicationObject3D.getCommMeshes().forEach((mesh) => {
      if (mesh.highlighted) {
        oldHighlightedColors.set(
          mesh.getModelId(),
          (
            (mesh.material as THREE.MeshLambertMaterial) ||
            THREE.MeshBasicMaterial ||
            MeshLineMaterial
          ).color
        );
      }
    });

    // Remove old communication
    applicationObject3D.removeAllCommunication();


    // treat inheritance relationship like some sort of class communication
   const classIdToSuperClassId = this.applyInheritance(application);
   this.extendClassCommunications(applicationObject3D, classIdToSuperClassId);

    // Compute communication Layout
    const commLayoutMap = applyCommunicationLayout(applicationObject3D);

    // Retrieve color preferences
    const { communicationColor, highlightedEntityColor } =
      this.configuration.applicationColors;

    const componentCommunicationMap = new Map<string, ComponentCommunication>();

    // Render all class communications
    applicationObject3D.data.classCommunications.forEach(
      (classCommunication) => {
        const commLayout = commLayoutMap.get(classCommunication.id);

        // No layouting information available due to hidden communication
        if (!commLayout) {
          return;
        }

        const viewCenterPoint = applicationLayout.center;

        const start = new Vector3();
        start.subVectors(commLayout.startPoint, viewCenterPoint);

        const end = new Vector3();
        end.subVectors(commLayout.endPoint, viewCenterPoint);

        const visibleSource = findFirstOpen(
          applicationObject3D,
          classCommunication.sourceClass
        );

        const visibleTarget = findFirstOpen(
          applicationObject3D,
          classCommunication.targetClass
        );

        let clazzCommuMeshData!: ClazzCommuMeshDataModel;

        if (
          visibleSource.id !== classCommunication.sourceClass.id ||
          visibleTarget.id !== classCommunication.targetClass.id
        ) {
          const ids = [visibleSource.id, visibleTarget.id].sort();
          const componentCommunicationId = ids[0] + '_' + ids[1];

          let componentCommunication: ComponentCommunication;
          // Add communication to existing component communication
          if (componentCommunicationMap.has(componentCommunicationId)) {
            componentCommunication = componentCommunicationMap.get(
              componentCommunicationId
            )!;
            componentCommunication.addClassCommunication(classCommunication);
            const mesh = applicationObject3D.getCommMeshByModelId(
              componentCommunicationId
            )!;
            clazzCommuMeshData = mesh.dataModel;
            mesh.geometry.dispose();
            applicationObject3D.remove(mesh);

            commLayout.lineThickness = calculateLineThickness(
              componentCommunication
            );
            // Create new component communication
          } else {
            componentCommunication = new ComponentCommunication(
              componentCommunicationId,
              visibleSource,
              visibleTarget,
              classCommunication
            );
            clazzCommuMeshData = new ClazzCommuMeshDataModel(
              application,
              componentCommunication,
              componentCommunication.id
            );

            componentCommunicationMap.set(
              componentCommunicationId,
              componentCommunication
            );
          }
          // Create new communication between classes
        } else {
          clazzCommuMeshData = new ClazzCommuMeshDataModel(
            application,
            classCommunication,
            classCommunication.id
          );
        }

        const oldColor = oldHighlightedColors.get(clazzCommuMeshData.id);

        const pipe = new ClazzCommunicationMesh(
          commLayout,
          clazzCommuMeshData,
          communicationColor,
          oldColor ? oldColor : highlightedEntityColor
        );

        const curveHeight = this.computeCurveHeight(commLayout);

        pipe.render(viewCenterPoint, curveHeight);

        applicationObject3D.add(pipe);

        this.addArrows(pipe, curveHeight, viewCenterPoint);

        if (classCommunication.isBidirectional) {
          this.addBidirectionalArrow(pipe);
        }
      }
    );

    // Apply highlighting properties to newly added communication
    applicationObject3D.updateCommunicationMeshHighlighting();
  }
}
