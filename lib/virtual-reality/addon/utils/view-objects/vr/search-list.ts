import ThreeMeshUI from 'three-mesh-ui';
import { IntersectableObject } from '../interfaces/intersectable-object';
import SearchListItem, { BLOCK_OPTIONS_LIST_ITEM } from './search-list-item';
import * as THREE from 'three';
import SearchListText from './search-list-text';
import VRControllerThumbpadBinding, { thumbpadDirectionToVector2 } from 'virtual-reality/utils/vr-controller/vr-controller-thumbpad-binding';
import VRController from 'virtual-reality/utils/vr-controller';


export type SearchListArgs = ThreeMeshUI.BlockOptions & {
    items: Map<string,string>,
}

export default class SearchList
  extends ThreeMeshUI.Block
  //implements IntersectableObject
{
  items: Map<string,string>;
  //textItems: SearchListText[];

  constructor({items, ...options} : SearchListArgs) {
    super(options);
    this.items = items;
    //this.textItems = [];

    this.items.forEach((val,key)=>{
      //const textItem = new SearchListText({text: key, meshId: val});
     // this.textItems.push(textItem);
      //this.add(textItem);

      // if(this.text === "")
      //   this.text = key;
      // else
      //   this.text = this.text + "\n" + key;


      // console.log("ITERATION");
      const listItemOptions = {width: options.width, height: BLOCK_OPTIONS_LIST_ITEM.height, offset: 0.001, backgroundOpacity: 0,  };
      const item = new SearchListItem({text: key, meshId: val, ...listItemOptions});
      this.add(item);



    });
  }

  // applyHover(index: number){
  //   this.textItems[index]?.applyHover();
  // }

  // resetHover(index: number){
  //   this.textItems[index]?.resetHover();
  // }

  // getPositionY(index: number) {
  //   const textItem = this.textItems[index];
  //   let v = new THREE.Vector3();
  //   console.log(textItem.getWorldPosition(v));
  //   console.log(v);
  //   return v.y;
  // }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
//   canBeIntersected(_intersection: THREE.Intersection) {
//     return true;
//   }

  
}
