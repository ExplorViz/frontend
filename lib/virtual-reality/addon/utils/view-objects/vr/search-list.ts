import ThreeMeshUI from 'three-mesh-ui';
import SearchListItem, { BLOCK_OPTIONS_LIST_ITEM } from './search-list-item';
import { searchItemVal } from 'virtual-reality/utils/vr-menus/search-menu';

export type SearchListArgs = ThreeMeshUI.BlockOptions & {
  owner: any;
  items: any[];
};

export default class SearchList extends ThreeMeshUI.Block {
  owner: any;
  items: any[];

  constructor({
    owner,
    items,
    applicationRenderer,
    ...options
  }: SearchListArgs) {
    super(options);
    this.owner = owner;
    this.items = items;
    this.items.forEach(elem => {
      const listItemOptions = {
        width: options.width,
        height: BLOCK_OPTIONS_LIST_ITEM.height,
        offset: 0.001,
        backgroundOpacity: 0,
      };
      const item = new SearchListItem({
        owner: this.owner,
        text: elem.fqn,
        meshId: elem.modelId,
        applicationId: elem.applicationModelId,
        ...listItemOptions,
      });
      this.add(item);
    });
  }
}
