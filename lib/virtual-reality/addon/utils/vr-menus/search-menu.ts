// @ts-ignore
import ThreeMeshUI from 'three-mesh-ui';
import { UiMenuArgs } from './ui-menu';
import * as THREE from 'three';
import InteractiveMenu from './interactive-menu';
import KeyboardMesh from '../view-objects/vr/keyboard-mesh';
import ApplicationRepository from 'explorviz-frontend/services/repos/application-repository';
import SearchList from '../view-objects/vr/search-list';
import VRController from '../vr-controller';
import VRControllerThumbpadBinding, { thumbpadDirectionToVector2 } from '../vr-controller/vr-controller-thumbpad-binding';
import { Class, Package } from 'explorviz-frontend/utils/landscape-schemes/structure-data';

export type SearchMenuArgs = UiMenuArgs & {
    applicationRepo: ApplicationRepository;
    renderer: THREE.WebGLRenderer;
};

const BLOCK_OPTIONS_CONTAINER = {
  width: 0.8,
  height: 1.2,
  fontFamily: '/images/keyboard/custom-msdf.json',
  fontTexture: '/images/keyboard/custom.png',
};

const BLOCK_OPTIONS_SEARCHLIST_CONTAINER = {
  width: BLOCK_OPTIONS_CONTAINER.width,
  height: 0.3
}

const colors = {
  keyboardBack: 0x858585,
  panelBack: 0x262626,
  button: 0x363636,
  hovered: 0x1c1c1c,
  selected: 0x109c5d,
};

export default class SearchMenu extends InteractiveMenu {
  container!: ThreeMeshUI.Block;
  userText!: ThreeMeshUI.Text;
  keyboard!: ThreeMeshUI.Keyboard;
  applicationRepo: ApplicationRepository;
  renderer: THREE.WebGLRenderer;
  map!: Map<string,string>;
  searchListContainer!: ThreeMeshUI.Block;
  keyboardContainer!: ThreeMeshUI.Block;
  searchList!: SearchList;
  _isNewInput: boolean = false;

  constructor({ applicationRepo, renderer, ...args }: SearchMenuArgs) {
    super(args);
    this.applicationRepo = applicationRepo;
    this.renderer = renderer;
    this.renderer.localClippingEnabled = true;
    this.makeUI();
    this.makeKeyboard();
  }

  makeUI() {
    this.container = new ThreeMeshUI.Block({
      width: BLOCK_OPTIONS_CONTAINER.width,
      height: BLOCK_OPTIONS_CONTAINER.height,
      fontFamily: BLOCK_OPTIONS_CONTAINER.fontFamily,
      fontTexture: BLOCK_OPTIONS_CONTAINER.fontTexture,
      fontSize: 0.03,
      justifyContent: 'start',
      backgroundOpacity: 0,
      offset: -0.001,
    });

    this.add(this.container);

    const textPanel = new ThreeMeshUI.Block({
      width: BLOCK_OPTIONS_CONTAINER.width,
      height: 0.2,
      offset: 0.001,
      backgroundOpacity: 0,
    });

    this.container.add(textPanel);

    const title = new ThreeMeshUI.Block({
      width: BLOCK_OPTIONS_CONTAINER.width,
      height: 0.1,
      fontSize: 0.045,
      justifyContent: 'center',
      offset: 0.02,
    }).add(new ThreeMeshUI.Text({ content: 'Type some text on the keyboard' }));
    this.userText = new ThreeMeshUI.Text({ content: '', fontColor: new THREE.Color('black') });

    const textField = new ThreeMeshUI.Block({
      width: BLOCK_OPTIONS_CONTAINER.width,
      height: 0.1,
      fontSize: 0.033,
      padding: 0.02,
      backgroundColor: new THREE.Color('white'),
      offset: 0.001,
    }).add(this.userText);

    textPanel.add(title, textField);

    this.map = this.search(this.userText.content);
    this.searchListContainer = new ThreeMeshUI.Block({
      hiddenOverflow: true,
      width: BLOCK_OPTIONS_SEARCHLIST_CONTAINER.width, 
      height: BLOCK_OPTIONS_SEARCHLIST_CONTAINER.height, 
      offset: 0.001,
      backgroundColor: new THREE.Color('#777777'),
      backgroundOpacity: 0.6,
    });
    this.searchList = new SearchList({
      items: this.map, 
      width: BLOCK_OPTIONS_SEARCHLIST_CONTAINER.width, 
      height: BLOCK_OPTIONS_SEARCHLIST_CONTAINER.height, 
      offset: 0.001,
      backgroundOpacity: 0,
    });
    this.searchListContainer.add(this.searchList);
    this.container.add(this.searchListContainer);

    this.container.position.y += 0.09;
    this.container.position.z -= 0.1;

  }

  makeKeyboard() {
    this.keyboard = new KeyboardMesh({
      userText: this.userText,
      language: 'de',
      fontFamily: '/images/keyboard/Roboto-msdf.json', //FontJSON,
      fontTexture: '/images/keyboard/Roboto-msdf.png', //FontImage,
      fontSize: 0.035, // fontSize will propagate to the keys blocks
      backgroundColor: new THREE.Color(colors.keyboardBack),
      backgroundOpacity: 1,
      backspaceTexture: '/images/keyboard/backspace.png',
      shiftTexture: '/images/keyboard/shift.png',
      enterTexture: '/images/keyboard/enter.png',
    });

    this.keyboard.rotation.x = -0.55;
    this.add(this.keyboard);

  }

  private searchComponents(searchWord : string, object: any, appName: string){
    const res : {name?: string, id?: string, objects: any[]} = {objects: []};
    const REGEXP_SPECIAL_CHAR = /[\!\#\$\%\^\&\*\)\(\+\=\.\<\>\{\}\[\]\:\;\'\"\|\~\`\_\-]/g;
    const escapedSearchWord = searchWord.replace(REGEXP_SPECIAL_CHAR, '\\$&');

    if(object.hasOwnProperty('name') && typeof object['name'] === 'string'){ //TODO: escape searchWord for regexp symbols
        if( new RegExp(escapedSearchWord, 'i').test(object.name) && searchWord.length !== 0){ //object['name'].substring(0, searchWord.length).toLowerCase() === searchWord.toLowerCase()
          if(object.hasOwnProperty('id')){
            res.id = object['id'];
            let object2 = object;
            let tempName = object2.name;
            while(object2.hasOwnProperty('parent') && object2.parent.hasOwnProperty('name')){
              object2 = object2.parent;
              tempName = object2.name + '.' + tempName;
            }
            if(appName !== tempName)
              res.name = appName + '.' + tempName;
            else
              res.name = appName;
          }
        }
    }

    if(object.hasOwnProperty('packages') /*&& typeof object['packages'] === 'object' &&*/){
      object['packages'].forEach( element => {
        console.log("PUSHE PACKAGE: " + element.name);
        res.objects.push(element);
      });
       // res.arrays.push(object['packages']);
    }

    if(object.hasOwnProperty('subPackages') /*&& typeof object['subpackages'] === 'object' &&*/){
    
      object['subPackages'].forEach( element => {
        console.log("PUSHE SUBPACKAGES: " + element.name);
        res.objects.push(element);
      });
        //res.arrays.push(object['subPackages']);
    }

    if(object.hasOwnProperty('classes') /*&& typeof object['classes'] === 'object' &&*/){
      object['classes'].forEach( element => {
        console.log("PUSHE CLASSES: " + element.name);
        res.objects.push(element);
      });
       // res.arrays.push(object['classes']);
    }

    return res;
  }

  private search(searchWord: string) : Map<string,string>{

    
    // TODO:
    // ApplicationRenderer gewährt uns Möglichkeit auf einen Zugriff auf ApplicationObject3D
    // ApplicationObject3D wichtige Klasse. Sie beinhaltet alle Meshes, auf die wir Zugreifen können wenn wir die ID haben
    // application-renderer kann uns Zugriff auf alle ApplicationObjects3D gewähren. Wenn wir also filtern, können wir auf das jeweilige Objekt zugreifen
    // Eventuell mit RegEx arbeiten

    const resObj = new Map<string,string>();
    for (const applicationData of this.applicationRepo.getAll()) {
      const application = applicationData.application;
      console.log(application);
      const res = this.searchComponents(searchWord, application, application.name); 
      if(res.name && res.id){
        resObj.set(res.name, res.id);
      }

      while(res.objects.length > 0){
        const object = res.objects.pop();
         //console.log(object);
        let res2 = this.searchComponents(searchWord, object, application.name);
        if(res2.name && res2.id){
          resObj.set(res2.name, res2.id);
        }
        res.objects = res.objects.concat(res2.objects);
      }
  }
    return resObj;
  }

  onUpdateMenu(delta: number) {
    super.onUpdateMenu(delta);

    if(this.isNewInput){
    this.isNewInput = false;

    let isEqual = false;
    const tmpMap = this.search(this.userText.content);

    
    if(tmpMap.size === this.map.size){
      isEqual = true;
      tmpMap.forEach( (val,key) => {
        const val2 = this.map.get(key);
        if(val2 !== val || (val2 === undefined && !this.map.has(key))){ 
          isEqual = false;
        }
      });
    }

    if(!isEqual){
      this.map = tmpMap;
      this.searchList.clear(); // needed before removing, otherwise ThreeMeshUI throws an error
      this.searchListContainer.remove(this.searchList);
      this.searchList = new SearchList({items: this.map, width: BLOCK_OPTIONS_SEARCHLIST_CONTAINER.width, height: BLOCK_OPTIONS_SEARCHLIST_CONTAINER.height, offset: 0.001,
        backgroundOpacity: 0,});
      this.searchListContainer.add(this.searchList);
    }
  }
    ThreeMeshUI.update();

  }

  public get isNewInput(){
    return this._isNewInput;
  }

  public set isNewInput(flag){
    this._isNewInput = flag;
  }

  



  /**
   * The thumbpad can be used to select a searched item
   */
 makeThumbpadBinding() {
  return new VRControllerThumbpadBinding(
    { labelUp: 'Scroll up', 
    labelDown: 'Scroll down', 
  },
    {
      // onThumbpadDown: (controller, axes) => {
      //   console.log("ThumbpadDown");

      //   const direction = VRControllerThumbpadBinding.getDirection(axes);
      //   const vector = thumbpadDirectionToVector2(direction);
      //   const offset = vector.toArray()[1]; // vertical part

      //   if(this.searchList && this.map.size > 0){
      //     const n = this.map.size;
      //     this.searchList.resetHover(this.currentSelectedListItem);
      //     if (offset !== 0) {
      //       //up
      //       if(offset === -1){
      //         //this.earchList.position.y +=  offset * 0.01;
      //         this.currentSelectedListItem = (this.currentSelectedListItem + 1) % n;

      //         const YPosTopItem = this.searchList.getPositionY(this.currentTopItem);
      //         const YPosCurrentItem = this.searchList.getPositionY(this.currentSelectedListItem);
      //         console.log("TOP ITEM Y: " + YPosTopItem);
      //         console.log("CURRENT ITEM Y: " + YPosCurrentItem);
      //         if(Math.abs(YPosTopItem - YPosCurrentItem) > BLOCK_OPTIONS_SEARCHLIST_CONTAINER.height){
      //           console.log("WEIT AUSEINANDER OMG");
      //         }
      //       }
      //       //down
      //       if(offset === 1 ){
      //         //this.searchList.position.y +=  offset * 0.01;
      //         this.currentSelectedListItem = (((this.currentSelectedListItem - 1) % n) + n) % n; // in Typescript % is doesn't behave like the mathematical definition of modulo so we have to adapt in case of negative numbers
      //       }
      //     }
      //     this.searchList.applyHover(this.currentSelectedListItem);
      //   }
      // },
     
      onThumbpadTouch: (controller: VRController, axes:number[]) => {
      // controller.updateIntersectedObject();
       //if (!controller.intersectedObject) return;

      // console.log("THUMBAD TOUCH");

       if(this.searchList && this.map.size > 0){

        const direction = VRControllerThumbpadBinding.getDirection(axes);
        const vector = thumbpadDirectionToVector2(direction);
        const offset = vector.toArray()[1]; // vertical part
        
        if (offset !== 0) {
          //up
          if(offset === -1){
            this.searchList.position.y +=  offset * 0.01;
          }
          //down
          if(offset === 1 ){
            this.searchList.position.y +=  offset * 0.01;   
          }
        }
       }
      },
    }
  );
}





}
