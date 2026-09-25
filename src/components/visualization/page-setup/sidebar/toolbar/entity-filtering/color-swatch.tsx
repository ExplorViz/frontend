interface ColorSwatchProps {
  color: string;
}

/** Small square indicator for a color value */
export default function ColorSwatch({ color }: ColorSwatchProps) {
  return (
    <span
      style={{
        backgroundColor: color,
        border: '1px solid rgba(0, 0, 0, 0.15)',
        borderRadius: '0.2rem',
        width: '0.85rem',
        height: '0.85rem',
        flexShrink: 0,
      }}
      aria-hidden
    />
  );
}
