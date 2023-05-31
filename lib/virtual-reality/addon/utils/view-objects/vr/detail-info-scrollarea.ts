import ThreeMeshUI from 'three-mesh-ui';
import { IntersectableObject } from '../interfaces/intersectable-object';

export default class DetailInfoScrollarea extends ThreeMeshUI.Block implements IntersectableObject {

    isHovered : boolean = false;
    isTriggered : boolean = false;
    text : ThreeMeshUI.Text;

    readonly initialY : number;
    cx! : number;
    cy! : number;

    constructor(text : ThreeMeshUI.Text, options : ThreeMeshUI.BlockOptions){
        super(options);
        this.text = text;
        this.initialY = this.text.position.y;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    canBeIntersected(_intersection: THREE.Intersection) {
        return true;
    }

    triggerDown(intersection: THREE.Intersection){
        if(intersection.uv){
            if(this.isTriggered) return;

            this.cx = intersection.uv.x;
            this.cy = intersection.uv.y;

            this.isTriggered = true;
        }
    }

    triggerUp(){
        this.isTriggered = false;
    }

    triggerPress(intersection: THREE.Intersection) {
        if( this.isTriggered && intersection.uv){

            const y = intersection.uv.y;
            
            let yDiff = y - this.cy;

            //if(Math.abs(yDiff) > 0.05 && this.text.position.y + yDiff > this.initialY - 0.1) { // don't scroll up when we are already at top
                this.text.position.y += yDiff;   
            //}

            this.cy = y; 

            // Or we do this: when laser triggered while being on upper half => scroll up, on lower half => scroll down
            // let scrollValue = 0;
            // (this.cy < this.initialHeight/2) ? scrollValue = 0.04 : scrollValue = -0.04; 
            // if(this.text.position.y + scrollValue > this.initialY - 0.5)  // don't scroll up too much so we don't end up in an empty text block. TODO: also set a limit for scroll down (possible for three mesh ui version 7.x.x by making use of the height: "auto" attribute )
            //     this.text.position.y += scrollValue;
        }
    }



    applyHover(){
        if(this.isHovered) return;
        
        this.isHovered = true;
        this.set({backgroundOpacity: 0.4});
    }

    resetHover(){
        this.isHovered = false;
        this.isTriggered = false;
        this.set({backgroundOpacity: 0});
    }


}