import { Gradient } from 'explorviz-frontend/src/utils/heatmap/simple-heatmap';

export default function revertKey(gradient: Gradient) {
  const replacedItems = Object.keys(gradient).map((key) => ({
    [key.replace(/_/g, '.').replace(/\+/g, '')]: gradient[key],
  }));
  return Object.assign({}, ...replacedItems);
}
