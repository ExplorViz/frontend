import THREE from "three";
import TitleItem from "./items/title-item";
import UiMenu, { UiMenuArgs } from "./ui-menu";
import ThreeMeshUI from 'three-mesh-ui';

import * from  '../../../public/images/keyboard/';


export default class SearchMenu extends UiMenu {

    constructor(args: UiMenuArgs) {
        super(args);

        /*const title = new TitleItem({
            text: 'Search Menu',
            position: { x: 256, y: 20 },
          });
          
          this.items.push(title);*/

        const keyboard = new ThreeMeshUI.Keyboard({
            fontSize: 0.035
        });



        
	    this.add(keyboard);
        /*this.redrawMenu();*/
    }


    makeUI() {

        const container = new THREE.Group();
        this.add( container );
    
        //////////////
        // TEXT PANEL
        //////////////
    
        const textPanel = new ThreeMeshUI.Block( {
            fontFamily: FontJSON,
            fontTexture: FontImage,
            width: 1,
            height: 0.35,
            backgroundColor: new THREE.Color( colors.panelBack ),
            backgroundOpacity: 1
        } );
    
        textPanel.position.set( 0, -0.15, 0 );
        container.add( textPanel );
    
        //
    
        const title = new ThreeMeshUI.Block( {
            width: 1,
            height: 0.1,
            justifyContent: 'center',
            fontSize: 0.045,
            backgroundOpacity: 0
        } ).add(
            new ThreeMeshUI.Text( { content: 'Type some text on the keyboard' } )
        );
    
        userText = new ThreeMeshUI.Text( { content: '' } );
    
        const textField = new ThreeMeshUI.Block( {
            width: 1,
            height: 0.4,
            fontSize: 0.033,
            padding: 0.02,
            backgroundOpacity: 0
        } ).add( userText );
    
        textPanel.add( title, textField );
    
        ////////////////////////
        // LAYOUT OPTIONS PANEL
        ////////////////////////
    
        // BUTTONS
    
        let layoutButtons = [
            [ 'English', 'eng' ],
            [ 'Nordic', 'nord' ],
            [ 'German', 'de' ],
            [ 'Spanish', 'es' ],
            [ 'French', 'fr' ],
            [ 'Russian', 'ru' ],
            [ 'Greek', 'el' ]
        ];
    
        layoutButtons = layoutButtons.map( ( options ) => {
    
            const button = new ThreeMeshUI.Block( {
                height: 0.06,
                width: 0.2,
                margin: 0.012,
                justifyContent: 'center',
                backgroundColor: new THREE.Color( colors.button ),
                backgroundOpacity: 1
            } ).add(
                new ThreeMeshUI.Text( {
                    offset: 0,
                    fontSize: 0.035,
                    content: options[ 0 ]
                } )
            );
    
            button.setupState( {
                state: 'idle',
                attributes: {
                    offset: 0.02,
                    backgroundColor: new THREE.Color( colors.button ),
                    backgroundOpacity: 1
                }
            } );
    
            button.setupState( {
                state: 'hovered',
                attributes: {
                    offset: 0.02,
                    backgroundColor: new THREE.Color( colors.hovered ),
                    backgroundOpacity: 1
                }
            } );
    
            button.setupState( {
                state: 'selected',
                attributes: {
                    offset: 0.01,
                    backgroundColor: new THREE.Color( colors.selected ),
                    backgroundOpacity: 1
                },
                onSet: () => {
    
                    // enable intersection checking for the previous layout button,
                    // then disable it for the current button
    
                    if ( currentLayoutButton ) objsToTest.push( currentLayoutButton );
    
                    if ( keyboard ) {
    
                        clear( keyboard );
    
                        keyboard.panels.forEach( panel => clear( panel ) );
    
                    }
    
                    currentLayoutButton = button;
    
                    makeKeyboard( options[ 1 ] );
    
                }
    
            } );
    
            objsToTest.push( button );
    
            // Set English button as selected from the start
    
            if ( options[ 1 ] === 'eng' ) {
    
                button.setState( 'selected' );
    
                currentLayoutButton = button;
    
            }
    
            return button;
    
        } );


}