import { ColorSchemeId } from 'explorviz-frontend/src/utils/settings/color-schemes';
import SettingLabel from './setting-type/setting-label';

/** Applies one of the predefined color schemes; it has no current value, so it always shows its prompt. */
export default function ColorSchemeSelector({ colorSchemes, applyColorScheme }: ColorSchemeProps) {
  return (
    <div className="setting-row">
      <SettingLabel name="Color Presets" htmlFor="setting-color-presets" />
      <div className="setting-control">
        <select
          id="setting-color-presets"
          className="setting-select"
          value=""
          onChange={(event) => {
            if (event.target.value) applyColorScheme(event.target.value as ColorSchemeId);
          }}
        >
          <option value="" disabled>
            Apply…
          </option>
          {colorSchemes.map((colorScheme) => (
            <option key={colorScheme.id} value={colorScheme.id}>
              {colorScheme.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

type ColorSchemeProps = {
  colorSchemes: { name: string; id: ColorSchemeId }[];
  applyColorScheme: (colorSchemeId: ColorSchemeId) => void;
};
