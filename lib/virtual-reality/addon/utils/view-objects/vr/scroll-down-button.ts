import ThreeMeshUI from 'three-mesh-ui';
import { IntersectableObject } from '../interfaces/intersectable-object';

export default class ScrollDownButton extends ThreeMeshUI.Block implements IntersectableObject {

    isHovered = false;
    text : ThreeMeshUI.Text;

    constructor(text : ThreeMeshUI.Text, options : ThreeMeshUI.BlockOptions){
        super(options);
        this.text = text;
        const scrollText = new ThreeMeshUI.Text({content: 'Scroll Down'});
        this.add(scrollText);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    canBeIntersected(_intersection: THREE.Intersection) {
        return true;
    }

    triggerPress() {
        this.text.position.y += 0.01;
    }

    applyHover(){
        if(this.isHovered) return;
        
        this.isHovered = true;
        this.set({backgroundOpacity: 0.4});
    }

    resetHover(){
        this.isHovered = false;
        this.set({backgroundOpacity: 0});
    }


}