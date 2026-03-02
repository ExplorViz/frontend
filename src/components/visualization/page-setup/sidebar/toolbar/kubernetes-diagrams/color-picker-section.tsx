import ColorPicker from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/customizationbar/settings/color-picker';

export function ColorPickerSection() {
  return (
    <div
      style={{
        padding: 12,
        borderBottom: '1px solid #ccc',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <ColorPicker id="k8sDiagramColor" />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <ColorPicker id="highlightedEntityColor" />
      </div>
    </div>
  );
}
