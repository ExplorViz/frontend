import ColorPicker from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/customizationbar/settings/color-picker';

export function ColorPickerSection() {
  return (
    <div className="kube-color-picker-section">
      <div className="kube-color-picker-row">
        <ColorPicker id="k8sDiagramColor" />
      </div>
      <div className="kube-color-picker-row">
        <ColorPicker id="highlightedEntityColor" />
      </div>
    </div>
  );
}
