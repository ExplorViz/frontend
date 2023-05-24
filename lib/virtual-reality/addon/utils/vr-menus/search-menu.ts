import UiMenu, { UiMenuArgs } from './ui-menu';
import TitleItem from './items/title-item';
import ThreeMeshUI from 'three-mesh-ui';

import * as THREE from 'three';



export type SearchMenuArgs = UiMenuArgs; /*& {
    ...
};*/

const colors = {
	keyboardBack: 0x858585,
	panelBack: 0x262626,
	button: 0x363636,
	hovered: 0x1c1c1c,
	selected: 0x109c5d
};

export default class SearchMenu extends UiMenu {

    userText : ThreeMeshUI.Text;

    constructor({...args} : SearchMenuArgs){
        super(args);

        this.userText = new ThreeMeshUI.Text({
               content: "Some text to be displayed",
               fontSize: 0.055
              });
            
            //new ThreeMeshUI.Text( { content: '' , fontSize: 0.055} );

        const textItem = new TitleItem({
            text: 'Search',
            position: { x: 256, y: 20 },
        });

        this.items.push(textItem);


         this.makeUI();


         this.redrawMenu();
    }

    //TODO: source of function
    makeUI() {

        const container = new THREE.Group();
        container.position.set( 0, 1.4, -1.2 );
        container.rotation.x = -0.15;
        this.add( container );
    
        const textPanel = new ThreeMeshUI.Block( {
            fontFamily: '/images/keyboard/Roboto-msdf.json', //FontJSON,
            fontTexture: '/images/keyboard/Roboto-msdf.png', //FontImage,
            width: 1,
            height: 0.35,
            backgroundColor: new THREE.Color( colors.panelBack ),
            backgroundOpacity: 1
        } );
    
        textPanel.position.set( 0, 0.85, 0 );
        container.add( textPanel );
    
        const title = new ThreeMeshUI.Block( {
            width: 1,
            height: 0.1,
            justifyContent: 'center',
            fontSize: 0.045,
            backgroundOpacity: 0
        } ).add(
            new ThreeMeshUI.Text( { content: 'Type some text on the keyboard' } )
        );
    
    
        const textField = new ThreeMeshUI.Block( {
            width: 1,
            height: 0.4,
            fontSize: 0.033,
            padding: 0.02,
            backgroundOpacity: 0
        } ).add( this.userText );
    
        textPanel.add( title, textField );
    }






    onUpdateMenu(delta: number) {
        super.onUpdateMenu(delta);
        ThreeMeshUI.update();
    }

}