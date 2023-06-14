import VRControllerThumbpadBinding, { thumbpadDirectionToVector2 } from "virtual-reality/utils/vr-controller/vr-controller-thumbpad-binding";
import BaseMenu, { BaseMenuArgs } from "../base-menu";
import VRController from "virtual-reality/utils/vr-controller";
import ThreeMeshUI from 'three-mesh-ui';
import DetailInfoScrollarea from "virtual-reality/utils/view-objects/vr/detail-info-scrollarea";
import VRControllerButtonBinding from "virtual-reality/utils/vr-controller/vr-controller-button-binding";
import VrRendering from "virtual-reality/components/vr-rendering";


export type AuxiliaryScrollMenuArgs = BaseMenuArgs & {
    text: ThreeMeshUI.Text,
    controller: VRController | null,
    renderer: VrRendering,
    object: DetailInfoScrollarea
  };

// This Menu is built just to define the controller thumbpad bindings when hovering the ScrollArea
export class AuxiliaryScrollMenu extends BaseMenu {
    text : ThreeMeshUI.Text;
    controller!: VRController | null;
    renderer : VrRendering;
    object: DetailInfoScrollarea;

    constructor({text, controller, renderer, object, ...args} : AuxiliaryScrollMenuArgs){
        super(args);
        this.text = text;
        if(controller){
          this.controller = controller;
        }

        this.renderer = renderer;
        this.object = object;
    }
   

    get enableControllerRay(): boolean {
        return true;
    }

    /**
   * The thumbpad can be used to scroll through the text.
   */
  makeThumbpadBinding() {
    return new VRControllerThumbpadBinding(
      { labelUp: 'Scroll up', 
      labelDown: 'Scroll down', 
    },
      {
        onThumbpadTouch: (controller: VRController, axes:number[]) => {
         controller.updateIntersectedObject();
         if (!controller.intersectedObject) return;
         
         const textBlock = this.text;

        const direction = VRControllerThumbpadBinding.getDirection(axes);
        const vector = thumbpadDirectionToVector2(direction);
        const offset = vector.toArray()[1]; // vertical part
        if (offset !== 0) {
            //up
            if(offset === -1&& textBlock.position.y >0){
              textBlock.position.y +=  offset * 0.01;
            }
            //down
            if(offset === 1 ){
              textBlock.position.y +=  offset * 0.01;
            }
          }
        
        },
      }
    );
  }

  makeGripButtonBinding() {
    return new VRControllerButtonBinding('', {
      onButtonPress: () => {
        this.object.isAuxiliaryCreated = false;
       // this.controller?.gripIsPressed = true;
        //this.controller?.updateIntersectedObject();
        this.closeMenu();
        if(this.controller){
            this.renderer['grabIntersectedObject'](this.controller); // intentional escape hatch. Dirty, but gets the job done.
            //this.controller.updateIntersectedObject();
            //this.controller.isHovered = true;
        }

      },
    });
  }



}