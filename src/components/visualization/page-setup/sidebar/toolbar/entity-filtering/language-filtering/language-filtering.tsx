import { useModelStore } from 'explorviz-frontend/src/stores/repos/model-repository';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import { Language } from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import { defaultColors } from 'explorviz-frontend/src/utils/settings/color-schemes';
import {
  getLanguageColorSettingId,
  LANGUAGE_SETTING_CONFIG,
  normalizeLanguage,
} from 'explorviz-frontend/src/utils/settings/language-settings';
import { ColorSettingId } from 'explorviz-frontend/src/utils/settings/settings-schemas';
import { useMemo } from 'react';
import Form from 'react-bootstrap/Form';
import { useShallow } from 'zustand/react/shallow';

function resolveLanguageDisplayColor(
  language: Language,
  languageColors: Partial<Record<ColorSettingId, string>>
): string {
  const colorSettingId = getLanguageColorSettingId(language);
  return (
    languageColors[colorSettingId] ??
    languageColors.otherBuildingColor ??
    defaultColors.otherBuildingColor
  );
}

export default function LanguageFiltering() {
  const allBuildings = useModelStore((state) => state.getAllBuildings);
  const { hiddenLanguages, toggleLanguageVisibility } = useVisualizationStore(
    useShallow((state) => ({
      hiddenLanguages: state.hiddenLanguages,
      toggleLanguageVisibility: state.actions.toggleLanguageVisibility,
    }))
  );

  const languageColors = useUserSettingsStore(
    useShallow((state) => {
      const colors: Partial<Record<ColorSettingId, string>> = {};

      for (const config of Object.values(LANGUAGE_SETTING_CONFIG)) {
        colors[config.colorSettingId] =
          state.visualizationSettings[config.colorSettingId]?.value;
      }

      return colors;
    })
  );

  const languageStats = useMemo(() => {
    const buildings = allBuildings();
    const counts = new Map<Language, number>();

    for (const building of buildings) {
      const lang = normalizeLanguage(building.language);
      counts.set(lang, (counts.get(lang) ?? 0) + 1);
    }

    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [allBuildings]);

  if (languageStats.length === 0) {
    return (
      <p className="text-muted text-center" style={{ fontSize: '0.85rem' }}>
        No buildings loaded yet.
      </p>
    );
  }

  return (
    <div className="language-filter-list">
      {languageStats.map(([language, count]) => {
        const color = resolveLanguageDisplayColor(language, languageColors);
        const isVisible = !hiddenLanguages.has(language);

        return (
          <div
            key={language}
            className="language-filter-item d-flex align-items-center gap-2 mb-2"
          >
            <span
              className="language-filter-color-swatch"
              style={{ backgroundColor: color }}
              aria-hidden
            />
            <Form.Check
              type="checkbox"
              id={`lang-filter-${language}`}
              className="language-filter-checkbox mb-0 flex-grow-1"
              label={
                <span className="d-flex align-items-center gap-2">
                  <span>
                    {LANGUAGE_SETTING_CONFIG[language]?.label ?? language}
                  </span>
                  <span className="text-muted" style={{ fontSize: '0.8rem' }}>
                    ({count})
                  </span>
                </span>
              }
              checked={isVisible}
              onChange={() => toggleLanguageVisibility(language)}
            />
          </div>
        );
      })}
    </div>
  );
}
