import ThreeMeshUI from 'three-mesh-ui';
import ApplicationRepository from 'explorviz-frontend/services/repos/application-repository';
import composeContent, {
  EntityMesh,
  getIdOfEntity,
  getTypeOfEntity,
} from 'virtual-reality/utils/vr-helpers/detail-info-composer';
import InteractiveMenu from '../interactive-menu';
import { DetachableMenu } from '../detachable-menu';
import { EntityType } from 'virtual-reality/utils/vr-message/util/entity_type';
import { BaseMenuArgs } from '../base-menu';
import VRControllerButtonBinding from 'virtual-reality/utils/vr-controller/vr-controller-button-binding';
import * as THREE from 'three';
import VRControllerThumbpadBinding from 'virtual-reality/utils/vr-controller/vr-controller-thumbpad-binding';
import DetailInfoMesh from 'virtual-reality/utils/view-objects/vr/detail-info-mesh';

export type DetailInfoScrollableMenuArgs = BaseMenuArgs & {
  object: EntityMesh;
  applicationRepo: ApplicationRepository;
  renderer: THREE.WebGLRenderer;
};

export const BLOCK_OPTIONS_CONTAINER = {
  width: 0.65,
  height: 0.65,
  fontFamily: '/images/keyboard/custom-msdf.json',
  fontTexture: '/images/keyboard/custom.png',
};

export const BLOCK_OPTIONS_TITLE = {
  width: BLOCK_OPTIONS_CONTAINER.width,
  height: 0.1,
};

export const BLOCK_OPTIONS_INFO = {
  width: BLOCK_OPTIONS_CONTAINER.width - BLOCK_OPTIONS_TITLE.width,
  height: BLOCK_OPTIONS_CONTAINER.height - BLOCK_OPTIONS_TITLE.height,
};

export default class DetailInfoMenu
  extends InteractiveMenu
  implements DetachableMenu
{
  private object: EntityMesh;

  private applicationRepo: ApplicationRepository;
  private renderer: THREE.WebGLRenderer;

  private container?: ThreeMeshUI.Block;
  private informationBlock?: ThreeMeshUI.Block;

  private informationText: string = '';
  private firstTime: boolean = true;

  constructor({
    object,
    applicationRepo,
    renderer,
    ...args
  }: DetailInfoScrollableMenuArgs) {
    super(args);
    this.object = object;
    this.applicationRepo = applicationRepo;
    this.renderer = renderer;
    this.renderer.localClippingEnabled = true;
  }

  getDetachId(): string {
    return getIdOfEntity(this.object);
  }

  getEntityType(): EntityType {
    return getTypeOfEntity(this.object);
  }

  createMenu() {
    const content = composeContent(this.object, this.applicationRepo);
    if (!content) {
      this.closeMenu();
      return;
    }

    this.container = new ThreeMeshUI.Block({
      width: BLOCK_OPTIONS_CONTAINER.width,
      height: BLOCK_OPTIONS_CONTAINER.height,
      fontFamily: BLOCK_OPTIONS_CONTAINER.fontFamily,
      fontTexture: BLOCK_OPTIONS_CONTAINER.fontTexture,
      fontSize: 0.03,
      justifyContent: 'start',
      backgroundColor: new THREE.Color('#777777'),
      backgroundOpacity: 0.6,
    });

    this.add(this.container);

    const titleBlock = new ThreeMeshUI.Block({
      width: BLOCK_OPTIONS_TITLE.width,
      height: BLOCK_OPTIONS_TITLE.height,
      justifyContent: 'center',
      textAlign: 'center',
      offset: 0.02,
    });

    const title = new ThreeMeshUI.Text({
      content: content.title,
      fontColor: new THREE.Color('#ffffff'),
    });

    titleBlock.add(title);
    this.container.add(titleBlock);

    // this.informationText = `Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.
    //  Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi. Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat.
    //  Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse`;

    content.entries.forEach(({ key, value }) => {
      this.informationText += key + ' ' + value + '\n\n';
    });

    this.informationBlock = new DetailInfoMesh(this.informationText, {
      width: BLOCK_OPTIONS_INFO.width,
      height: BLOCK_OPTIONS_INFO.height,
      backgroundOpacity: 0,
      hiddenOverflow: false,
      offset: 0.001,
    });

    //informationBlockWrapper.add(this.informationBlock);
    this.container.add(this.informationBlock /*Wrapper*/);

    this.firstTime = false;
  }

  onOpenMenu() {
    super.onOpenMenu();
    if (this.firstTime) {
      // otherwise it duplicates when detaching
      this.createMenu();
    }
  }

  onCloseMenu(): void {
    super.onCloseMenu();

    //this.firstTime = true;
  }

  onUpdateMenu(delta: number) {
    super.onUpdateMenu(delta);
    ThreeMeshUI.update();

    const content = composeContent(this.object, this.applicationRepo);
    if (content) {
      content.entries.forEach(({ key, value }) => {
        // maybe just do this when content.entries is indeed different from previous one (for that we need to store the previous one and update it to the newer one if it is indeed different)
        // this.informationText += key + " " + value + "\n";
        // change content
      });
    } else {
      this.closeMenu();
    }
  }

  /**
   * The thumbpad can be used to scroll through the text.
   */
  makeThumbpadBinding() {
    return new VRControllerThumbpadBinding(
      { labelUp: 'Scroll up', labelDown: 'Scroll down' },
      //{ labelUp: 'Scroll up', labelDown: 'Scroll down' },
      {
        // onThumbpadDown: (_controller, axes) => {
        // const direction = VRControllerThumbpadBinding.getDirection(axes);
        // const vector = thumbpadDirectionToVector2(direction);
        // const offset = vector.toArray()[1]; // vertical part
        // if (offset !== 0) {
        //   if(this.informationBlock){
        //     this.informationBlock.position.y += offset * 0.01;
        //   }
        //   // Get index of currently selected item or if no item is selected,
        //   // get `0` if the user wants to select the previous (i.e., if
        //   // `offset = -1`) or `-1` if the user want to select the next item
        //   // (i.e., if `offset = 1`).
        // }
        //},
      }
    );
  }

  makeTriggerButtonBinding() {
    return new VRControllerButtonBinding('Detach', {
      onButtonDown: () => {
        this.detachMenu();
      },
    });
  }

  // makeTextPanel() {

  //     const title = new ThreeMeshUI.Block( {
  //         height: 0.2,
  //         width: 1.2,
  //         fontSize: 0.09,
  //         justifyContent: 'center',
  //         fontFamily: '/images/keyboard/Roboto-msdf.json',
  //         fontTexture: '/images/keyboard/Roboto-msdf.png',
  //         backgroundColor: new THREE.Color( 'blue' ),
  //         backgroundOpacity: 0.2
  //     } ).add(
  //         new ThreeMeshUI.Text( { content:  } )
  //     );

  //     //title.position.set( 0, 0.8, -2 );
  //     this.add( title );

  //     // !!! BEWARE !!!
  //     // three-mesh-ui uses three.js local clipping to hide overflows, so don't
  //     // forget to enable local clipping with renderer.localClippingEnabled = true;

  //     this.container = new ThreeMeshUI.Block( {
  //         height: 0.7,
  //         width: 0.6,
  //         padding: 0.05,
  //         justifyContent: 'center',
  //         backgroundOpacity: 1,
  //         backgroundColor: new THREE.Color( 'grey' )
  //     } );

  //     this.container.setupState( {
  //         state: 'hidden-on',
  //         attributes: { hiddenOverflow: true }
  //     } );

  //     this.container.setupState( {
  //         state: 'hidden-off',
  //         attributes: { hiddenOverflow: false }
  //     } );

  //     this.container.setState( 'hidden-on' );

  //     this.container.position.z = 0.00001;
  //     //this.container.rotation.x = -0.55;

  //     this.add( this.container );

  //     //

  //     this.textContainer = new ThreeMeshUI.Block( {
  //         width: 1,
  //         height: 1,
  //         padding: 0.09,
  //         backgroundColor: new THREE.Color( 'blue' ),
  //         backgroundOpacity: 0.2,
  //         justifyContent: 'center'
  //     } );

  //     this.container.add( this.textContainer );

  //     //

  //     const text = new ThreeMeshUI.Text( {
  //         content: 'hiddenOverflow '.repeat( 28 ),
  //         fontSize: 0.054,
  //         fontFamily: '/images/keyboard/Roboto-msdf.json',
  //         fontTexture: '/images/keyboard/Roboto-msdf.png',
  //     } );

  //     this.textContainer.add( text );

  //     setInterval( () => {

  //         if ( this.container.currentState === 'hidden-on' ) {

  //             this.container.setState( 'hidden-off' );

  //         } else {

  //             this.container.setState( 'hidden-on' );

  //         }

  //     }, 1500 );

  // }
}
