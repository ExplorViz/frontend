import ThreeMeshUI from 'three-mesh-ui';
import SearchListItem, {
  BLOCK_OPTIONS_LIST_ITEM,
} from 'react-lib/src/utils/extended-reality/view-objects/vr/search-list-item';

export type SearchListArgs = ThreeMeshUI.BlockOptions & {
  items: any[];
};

export default class SearchList extends ThreeMeshUI.Block {
  items: any[];

  constructor({ items, ...options }: SearchListArgs) {
    super(options);
    this.items = items;
    this.items.forEach((elem) => {
      const listItemOptions = {
        width: options.width,
        height: BLOCK_OPTIONS_LIST_ITEM.height,
        offset: 0.001,
        backgroundOpacity: 0,
      };
      const item = new SearchListItem({
        text: elem.fqn,
        meshId: elem.modelId,
        applicationId: elem.applicationModelId,
        ...listItemOptions,
      });
      this.add(item);
    });
  }
}
