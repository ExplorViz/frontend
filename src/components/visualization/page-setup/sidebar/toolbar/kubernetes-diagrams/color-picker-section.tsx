import ColorPicker from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/customizationbar/settings/color-picker';

export function ColorPickerSection() {
  return (
    <div className="kube-color-picker-section">
      <ColorPicker id="k8sDiagramColor" />
      <ColorPicker id="highlightedEntityColor" />
    </div>
  );
}
