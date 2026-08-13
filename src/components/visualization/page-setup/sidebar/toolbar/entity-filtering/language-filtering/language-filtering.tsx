import { InfoIcon } from '@primer/octicons-react';
import { useEntityFilteringStore } from 'explorviz-frontend/src/stores/entity-filtering-store';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import { Language } from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import { defaultColors } from 'explorviz-frontend/src/utils/settings/color-schemes';
import {
  getLanguageColorSettingId,
  LANGUAGE_SETTING_CONFIG,
} from 'explorviz-frontend/src/utils/settings/language-settings';
import { ColorSettingId } from 'explorviz-frontend/src/utils/settings/settings-schemas';
import Form from 'react-bootstrap/Form';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';
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

function LanguageFileExtensionInfo({
  language,
}: {
  readonly language: Language;
}) {
  const extensionStats = useEntityFilteringStore(
    (state) => state.baselineLanguageFileExtensionStats[language] ?? []
  );

  if (extensionStats.length === 0) {
    return null;
  }

  return (
    <OverlayTrigger
      placement="left"
      trigger={['hover', 'focus']}
      overlay={
        <Tooltip className="language-filter-extension-tooltip">
          <div className="text-start">
            {extensionStats.map(([extension, count]) => (
              <div key={extension}>
                {extension}: {count}
              </div>
            ))}
          </div>
        </Tooltip>
      }
    >
      <button
        type="button"
        className="language-filter-info-button btn btn-link p-0 border-0"
        aria-label={`File extensions for ${LANGUAGE_SETTING_CONFIG[language]?.label ?? language}`}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <InfoIcon className="align-middle" size="small" fill="#777" />
      </button>
    </OverlayTrigger>
  );
}

export default function LanguageFiltering() {
  const baselineLanguageStats = useEntityFilteringStore(
    (state) => state.baselineLanguageStats
  );
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

  if (baselineLanguageStats.length === 0) {
    return (
      <p className="text-muted text-center" style={{ fontSize: '0.85rem' }}>
        No buildings loaded yet.
      </p>
    );
  }

  return (
    <div className="language-filter-list">
      {baselineLanguageStats.map(([language, count]) => {
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
                  <span
                    className="d-inline-flex align-items-center gap-1 text-muted"
                    style={{ fontSize: '0.8rem' }}
                  >
                    ({count})
                    <LanguageFileExtensionInfo language={language} />
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
