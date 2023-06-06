// @ts-ignore
import ThreeMeshUI from 'three-mesh-ui';
import { IntersectableObject } from '../interfaces/intersectable-object';
import * as THREE from 'three';

export type KeyboardMeshArgs = ThreeMeshUI.KeyboardOptions & {
    userText: ThreeMeshUI.Text;
};

const objsToTest = [];

const colors = {
	keyboardBack: 0x858585,
	panelBack: 0x262626,
	button: 0x363636,
	hovered: 0x1c1c1c,
	selected: 0x109c5d
};

export default class KeyboardMesh extends ThreeMeshUI.Keyboard implements IntersectableObject{
    userText : ThreeMeshUI.Text;

    constructor({userText, ...options}: KeyboardMeshArgs){
        super(options);
        this.userText = userText;
        this.setUpKeyStates();
    }


    setUpKeyStates(){
        
        this.keys.forEach( ( key ) => {
    
            objsToTest.push( key );
    
            key.setupState( {
                state: 'idle',
                attributes: {
                    offset: 0,
                    backgroundColor: new THREE.Color( colors.button ),
                    backgroundOpacity: 1
                }
            } );
    
            key.setupState( {
                state: 'hovered',
                attributes: {
                    offset: 0,
                    backgroundColor: new THREE.Color( colors.hovered ),
                    backgroundOpacity: 1
                }
            } );
    
            key.setupState( {
                state: 'selected',
                attributes: {
                    offset: -0.009,
                    backgroundColor: new THREE.Color( colors.selected ),
                    backgroundOpacity: 1
                },
                // triggered when the user clicked on a keyboard's key
                onSet: () => {
    
                    // if the key have a command (eg: 'backspace', 'switch', 'enter'...)
                    // special actions are taken
                    if ( key.info.command ) {
    
                        switch ( key.info.command ) {
    
                            // switch between panels
                            case 'switch' :
                                this.setNextPanel();
                                break;
    
                            // switch between panel charsets (eg: russian/english)
                            case 'switch-set' :
                                this.setNextCharset();
                                break;
    
                            case 'enter' :
                                this.userText.set( { content: this.userText.content + '\n' } );
                                break;
    
                            case 'space' :
                                userText.set( { content: this.userText.content + ' ' } );
                                break;
    
                            case 'backspace' :
                                if ( !this.userText.content.length ) break;
                                this.userText.set( {
                                    content: this.userText.content.substring( 0, this.userText.content.length - 1 ) || ''
                                } );
                                break;
    
                            case 'shift' :
                                this.toggleCase();
                                break;
    
                        }
    
                        // print a glyph, if any
                    } else if ( key.info.input ) {
                        this.userText.set( { content: userText.content + key.info.input } );
                    }
    
                }
            });
        });
        
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    canBeIntersected(_intersection: THREE.Intersection) {
        return true;
    }
    
    applyHover(intersection: THREE.Intersection){

    }

}