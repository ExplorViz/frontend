// @ts-ignore because three mesh ui's typescript support is not fully matured
import ScrollUpButton from './scroll-up-button';
import ScrollDownButton from './scroll-down-button';
import ThreeMeshUI from 'three-mesh-ui';
import DetailInfoScrollarea from './detail-info-scrollarea';
import VrMenuFactoryService from 'virtual-reality/services/vr-menu-factory';

export default class DetailInfoMesh extends ThreeMeshUI.Block /*implements IntersectableObject*/ {
  content: string;
  menuFactory: VrMenuFactoryService;
  text: ThreeMeshUI.Text;

  constructor(content: string, menuFactory: VrMenuFactoryService, options: ThreeMeshUI.BlockOptions) {
    super({ ...options, justifyContent: 'start' }); // make sure we have justifyContent: 'start'
    this.content = content;
    this.menuFactory = menuFactory;
    const textBlockBlock = new ThreeMeshUI.Block({
      width: 0.65,
      height: 0.45,
      hiddenOverflow: true,
      backgroundOpacity: 0,
      offset: 0.001,
    }); // This Block with hiddenOverflow set to true is needed so the text stays within its block!
    this.text = new ThreeMeshUI.Text({
      content: this.content,
      backgroundOpacity: 0,
    });
    const textBlock = new DetailInfoScrollarea(this.text, this.menuFactory, {
      height: 0.45,
      width: 0.65,
      backgroundOpacity: 0,
      offset: 0.001,
    });
    const scrollButtonBox = new ThreeMeshUI.Block({
      height: 0.1,
      width: 0.65,
      contentDirection: 'row',
      backgroundOpacity: 0,
      offset: 0.001,
    });

    const scrollUpButton = new ScrollUpButton(this.text, {
      width: 0.325,
      height: 0.1,
      offset: 0.02,
      justifyContent: 'center',
      textAlign: 'center',
      backgroundOpacity: 0,
    });

    const scrollDownButton = new ScrollDownButton(this.text, {
      width: 0.325,
      height: 0.1,
      offset: 0.02,
      justifyContent: 'center',
      textAlign: 'center',
      backgroundOpacity: 0,
    });

    scrollButtonBox.add(scrollUpButton, scrollDownButton);
    this.add(scrollButtonBox);

    textBlock.add(this.text);
    textBlockBlock.add(textBlock);
    this.add(textBlockBlock);
  }

  public get textBlock(): ThreeMeshUI.Text {
    return this.text;
  }
}
