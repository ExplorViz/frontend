/** A switch for an on/off value. */
export default function WideCheckbox({
  value,
  onToggle,
  label,
}: {
  value: any;
  onToggle: (value: any) => void;
  label?: string;
}) {
  return (
    <label className="wide-checkbox-container">
      <input type="checkbox" role="switch" aria-label={label} checked={value} onChange={() => onToggle(!value)} />
      <span className="wide-checkbox" aria-hidden></span>
    </label>
  );
}
