import { useMemo } from 'react';
import { useModelStore } from 'explorviz-frontend/src/stores/repos/model-repository';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { Language } from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import { useShallow } from 'zustand/react/shallow';
import Form from 'react-bootstrap/Form';

const LANGUAGE_LABELS: Record<Language, string> = {
  JAVA: 'Java',
  PYTHON: 'Python',
  TYPESCRIPT: 'TypeScript',
  JAVASCRIPT: 'JavaScript',
  PLAINTEXT: 'Plain Text',
  LANGUAGE_UNSPECIFIED: 'Other',
};

const LANGUAGE_COLOR_KEYS: Record<Language, string> = {
  JAVA: 'languageColorJava',
  PYTHON: 'languageColorPython',
  TYPESCRIPT: 'languageColorTypeScript',
  JAVASCRIPT: 'languageColorTypeScript',
  PLAINTEXT: 'languageColorOther',
  LANGUAGE_UNSPECIFIED: 'languageColorOther',
};

export default function LanguageFiltering() {
  const allBuildings = useModelStore((state) => state.getAllBuildings);
  const { hiddenLanguages, toggleLanguageVisibility } = useVisualizationStore(
    useShallow((state) => ({
      hiddenLanguages: state.hiddenLanguages,
      toggleLanguageVisibility: state.actions.toggleLanguageVisibility,
    }))
  );

  const visualizationSettings = useUserSettingsStore(
    (state) => state.visualizationSettings
  );

  const languageStats = useMemo(() => {
    const buildings = allBuildings();
    const counts = new Map<Language, number>();

    for (const building of buildings) {
      const lang: Language = building.language ?? 'LANGUAGE_UNSPECIFIED';
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
    <div>
      {languageStats.map(([language, count]) => {
        const colorKey = LANGUAGE_COLOR_KEYS[language];
        const colorSetting = visualizationSettings[
          colorKey as keyof typeof visualizationSettings
        ] as { value: string } | undefined;
        const color = colorSetting?.value ?? '#999';
        const isVisible = !hiddenLanguages.has(language);

        return (
          <Form.Check
            key={language}
            type="checkbox"
            id={`lang-filter-${language}`}
            className="d-flex align-items-center gap-2 mb-1"
            style={{ paddingLeft: '1.75em' }}
            label={
              <span className="d-flex align-items-center gap-2">
                <span
                  style={{
                    display: 'inline-block',
                    width: 12,
                    height: 12,
                    borderRadius: 2,
                    backgroundColor: color,
                    border: '1px solid rgba(0,0,0,0.15)',
                    flexShrink: 0,
                  }}
                />
                <span>
                  {LANGUAGE_LABELS[language] ?? language}
                </span>
                <span className="text-muted" style={{ fontSize: '0.8rem' }}>
                  ({count})
                </span>
              </span>
            }
            checked={isVisible}
            onChange={() => toggleLanguageVisibility(language)}
          />
        );
      })}
    </div>
  );
}
