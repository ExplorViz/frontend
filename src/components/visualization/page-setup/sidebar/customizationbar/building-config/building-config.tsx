import BuildingMetricSettings from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/customizationbar/building-config/building-metric-settings';
import LanguageBuildingSettings, {
  useLanguagesInLandscape,
} from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/customizationbar/building-config/language-building-settings';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { Language } from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import {
  getLanguageColor,
  LANGUAGE_DISPLAY_ORDER,
  LANGUAGE_SETTING_CONFIG,
} from 'explorviz-frontend/src/utils/settings/language-settings';
import { useMemo, useState } from 'react';
import Accordion from 'react-bootstrap/Accordion';
import Form from 'react-bootstrap/Form';

function sortLanguages(languages: Language[]): Language[] {
  const order = new Map(
    LANGUAGE_DISPLAY_ORDER.map((language, index) => [language, index])
  );

  return [...languages].sort(
    (a, b) =>
      (order.get(a) ?? Number.MAX_SAFE_INTEGER) -
      (order.get(b) ?? Number.MAX_SAFE_INTEGER)
  );
}

export default function BuildingConfig() {
  const visualizationSettings = useUserSettingsStore(
    (state) => state.visualizationSettings
  );
  const languagesInLandscape = useLanguagesInLandscape();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllLanguages, setShowAllLanguages] = useState(
    () => languagesInLandscape.length === 0
  );

  const visibleLanguages = useMemo(() => {
    const baseLanguages =
      showAllLanguages || languagesInLandscape.length === 0
        ? LANGUAGE_DISPLAY_ORDER
        : sortLanguages(languagesInLandscape);

    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return baseLanguages;
    }

    return baseLanguages.filter((language) => {
      const label = LANGUAGE_SETTING_CONFIG[language].label.toLowerCase();
      return (
        label.includes(normalizedQuery) ||
        language.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [languagesInLandscape, searchQuery, showAllLanguages]);

  const defaultExpandedLanguage = visibleLanguages[0] ?? null;

  return (
    <div className="building-config">
      <section className="building-config-section">
        <h6 className="building-config-section-title">Metric mapping</h6>
        <BuildingMetricSettings />
      </section>

      <section className="building-config-section">
        <div className="building-config-section-heading">
          <h6 className="building-config-section-title mb-0">
            Programming languages
          </h6>
          <Form.Check
            type="switch"
            id="building-config-show-all-languages"
            className="building-config-show-all-toggle"
            label="Show all languages"
            checked={showAllLanguages}
            onChange={(event) => setShowAllLanguages(event.target.checked)}
          />
        </div>
        <p className="building-config-section-description">
          Set the color and geometry for each programming language. Languages
          found in the current landscape are shown by default.
        </p>

        <Form.Control
          type="search"
          placeholder="Search languages..."
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          className="building-config-search mb-3"
          aria-label="Search programming languages"
        />

        {visibleLanguages.length === 0 ? (
          <p className="text-muted text-center building-config-empty">
            No languages match your search.
          </p>
        ) : (
          <Accordion
            defaultActiveKey={defaultExpandedLanguage ?? undefined}
            className="building-config-language-accordion"
          >
            {visibleLanguages.map((language) => {
              const { label } = LANGUAGE_SETTING_CONFIG[language];
              const color = getLanguageColor(language, visualizationSettings);

              return (
                <Accordion.Item
                  eventKey={language}
                  key={language}
                  className="building-config-language-item"
                >
                  <Accordion.Header>
                    <span className="building-config-language-header">
                      <span
                        className="building-config-language-swatch building-config-language-swatch--header"
                        style={{ backgroundColor: color }}
                        aria-hidden
                      />
                      <span className="building-config-language-name">
                        {label}
                      </span>
                    </span>
                  </Accordion.Header>
                  <Accordion.Body>
                    <LanguageBuildingSettings language={language} />
                  </Accordion.Body>
                </Accordion.Item>
              );
            })}
          </Accordion>
        )}
      </section>
    </div>
  );
}
