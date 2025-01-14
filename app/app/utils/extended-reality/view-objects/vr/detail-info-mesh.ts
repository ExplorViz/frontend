// @ts-ignore because three mesh ui's typescript support is not fully matured
import ScrollUpButton from 'react-lib/src/utils/extended-reality/view-objects/vr/scroll-up-button';
import ScrollDownButton from 'react-lib/src/utils/extended-reality/view-objects/vr/scroll-down-button';
import OpenEntityButton from 'explorviz-frontend/utils/extended-reality/view-objects/vr/open-entity-button';
import ThreeMeshUI from 'three-mesh-ui';
import DetailInfoScrollarea from './detail-info-scrollarea';
import VrMenuFactoryService from 'explorviz-frontend/services/extended-reality/vr-menu-factory';
import * as THREE from 'three';

export default class DetailInfoMesh extends ThreeMeshUI.Block /*implements IntersectableObject*/ {
  owner: any;
  sourceClass: string;
  targetClass: string;

  sourceClassId: string;
  targetClassId: string;
  sourceAppId: string | undefined;
  targetAppId: string | undefined;
  content: string;
  menuFactory: VrMenuFactoryService;
  text: ThreeMeshUI.Text;
  constructor(
    owner: any,
    sourceClass: string,
    targetClass: string,
    sourceClassId: string,
    targetClassId: string,
    sourceAppId: string | undefined,
    targetAppId: string | undefined,
    content: string,
    menuFactory: VrMenuFactoryService,
    options: ThreeMeshUI.BlockOptions
  ) {
    super({ ...options, justifyContent: 'start' }); // make sure we have justifyContent: 'start'
    this.owner = owner;
    this.content = content;
    this.menuFactory = menuFactory;
    this.sourceClass = sourceClass;
    this.targetClass = targetClass;
    this.sourceClassId = sourceClassId;
    this.targetClassId = targetClassId;
    this.sourceAppId = sourceAppId;
    this.targetAppId = targetAppId;

    let boxhight;
    if (this.sourceClass !== '') {
      boxhight = 0.27;
    } else {
      boxhight = 0.45;
    }

    const textBlockBlock = new ThreeMeshUI.Block({
      width: 0.65,
      height: boxhight,
      hiddenOverflow: true,
      backgroundOpacity: 0,
      offset: 0.001,
      textAlign: 'left',
    }); // This Block with hiddenOverflow set to true is needed so the text stays within its block!
    this.text = new ThreeMeshUI.Text({
      content: this.content,
      backgroundOpacity: 0,
    });
    const textBlock = new DetailInfoScrollarea(this.text, this.menuFactory, {
      height: boxhight,
      width: 0.64,
      backgroundOpacity: 0,
      offset: 0.001,
    });
    const scrollButtonBox = new ThreeMeshUI.Block({
      height: 0.1,
      width: 0.65,
      contentDirection: 'row',
      backgroundOpacity: 0,
      offset: 0.001,
      //padding:0.05
    });

    const scrollUpButton = new ScrollUpButton(this.text, {
      width: 0.3,
      height: 0.1,
      offset: 0.02,
      justifyContent: 'center',
      textAlign: 'center',
      backgroundOpacity: 0.2,
      borderRadius: [0.02, 0.02, 0.02, 0.02],
      borderWidth: 0.002,
      borderColor: new THREE.Color(0x7a7a7a),
      borderOpacity: 0.8,
      margin: 0.01,
    });

    const scrollDownButton = new ScrollDownButton(this.text, {
      width: 0.3,
      height: 0.1,
      offset: 0.02,
      justifyContent: 'center',
      textAlign: 'center',
      backgroundOpacity: 0.2,
      borderRadius: [0.02, 0.02, 0.02, 0.02],
      borderWidth: 0.002,
      borderColor: new THREE.Color(0x7a7a7a),
      borderOpacity: 0.8,
      margin: 0.01,
    });

    const sourceLableBox = new ThreeMeshUI.Block({
      width: 0.2,
      height: 0.08,
      offset: 0.02,
      justifyContent: 'center',
      textAlign: 'center',
      backgroundOpacity: 0,
      fontColor: new THREE.Color(0x554343),
    });

    const targetLableBox = new ThreeMeshUI.Block({
      width: 0.2,
      height: 0.08,
      offset: 0.02,
      justifyContent: 'center',
      textAlign: 'center',
      backgroundOpacity: 0,
      fontColor: new THREE.Color(0x554343),
    });

    const sourceButton = new OpenEntityButton({
      owner: this.owner,
      label: this.sourceClass,
      classId: this.sourceClassId,
      applicationId: this.sourceAppId!,

      ...{
        width: 0.43,
        height: 0.08,
        offset: 0.02,
        justifyContent: 'center',
        textAlign: 'center',
        backgroundOpacity: 0.2,
        borderRadius: [0.02, 0.02, 0.02, 0.02],
        borderWidth: 0.002,
        borderColor: new THREE.Color(0x7a7a7a),
        borderOpacity: 0.8,
      },
    });

    const targetButton = new OpenEntityButton({
      owner: this.owner,
      label: this.targetClass,
      classId: this.targetClassId,
      applicationId: this.targetAppId!,
      ...{
        width: 0.43,
        height: 0.08,
        offset: 0.02,
        justifyContent: 'center',
        textAlign: 'center',
        backgroundOpacity: 0.2,
        borderRadius: [0.02, 0.02, 0.02, 0.02],
        borderWidth: 0.002,
        borderColor: new THREE.Color(0x7a7a7a),
        borderOpacity: 0.8,
      },
    });
    const sourceBox = new ThreeMeshUI.Block({
      height: 0.08,
      width: 0.65,
      contentDirection: 'row',
      backgroundOpacity: 0,
      offset: 0.001,
      margin: 0.005,
    });
    const targetBox = new ThreeMeshUI.Block({
      height: 0.08,
      width: 0.65,
      contentDirection: 'row',
      backgroundOpacity: 0,
      offset: 0.001,
      margin: 0.005,
    });

    const sorceLable = new ThreeMeshUI.Text({ content: 'Source Class: ' });
    const targetLable = new ThreeMeshUI.Text({ content: 'Target Class: ' });

    sourceLableBox.add(sorceLable);
    targetLableBox.add(targetLable);

    sourceBox.add(sourceLableBox, sourceButton);
    targetBox.add(targetLableBox, targetButton);

    scrollButtonBox.add(scrollUpButton, scrollDownButton);
    this.add(scrollButtonBox);
    if (this.targetClass !== '' && this.sourceClass !== '') {
      this.add(sourceBox, targetBox);
    }
    textBlock.add(this.text);
    textBlockBlock.add(textBlock);
    this.add(textBlockBlock);
  }

  public get textBlock(): ThreeMeshUI.Text {
    return this.text;
  }
}
