import Component from '@glimmer/component';
import { Node } from 'explorviz-frontend/utils/landscape-schemes/structure-data';

interface Args {
  node: Node
}

export default class NodePopup extends Component<Args> {
  get displayName() {
    const { node } = this.args;
    if (node.hostName && node.hostName.length > 0 && !node.hostName.startsWith('<')) {
      return node.hostName;
    }
    return node.ipAddress;
  }
}
