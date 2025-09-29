export function getLabelRotation(
  componentLabelPlacement: string
): [number, number, number] {
  switch (componentLabelPlacement) {
    case 'top':
      return [-1.5 * Math.PI, -Math.PI, 0];
    case 'bottom':
      return [1.5 * Math.PI, 0, 0];
    case 'left':
      return [1.5 * Math.PI, 0, -Math.PI / 2];
    case 'right':
      return [1.5 * Math.PI, 0, Math.PI / 2];
    default:
      return [1.5 * Math.PI, 0, 0];
  }
}
