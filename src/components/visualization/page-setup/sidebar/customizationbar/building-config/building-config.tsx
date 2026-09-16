import BuildingMetricSettings from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/customizationbar/building-config/building-metric-settings';
import useLanguagesInLandscape from 'explorviz-frontend/src/hooks/useLanguagesInLandscape';
import { useModelStore } from 'explorviz-frontend/src/stores/repos/model-repository';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { SUPPORTED_LANGUAGES } from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import {
  getLabelForLanguage,
  normalizeLanguage,
  sortLanguages,
} from 'explorviz-frontend/src/utils/language-utils';
import {
  getLabelForModelType,
  sortModelTypes,
} from 'explorviz-frontend/src/utils/model-type-utils';
import { useMemo, useState } from 'react';
import Accordion from 'react-bootstrap/Accordion';
import Form from 'react-bootstrap/Form';
import LanguageBuildingSettings from './language-building-settings';
import ModelTypeBuildingSettings from './model-type-building-settings';

export default function BuildingConfig() {
  const buildings = useModelStore((state) => state.buildings);

  const buildingColor = useUserSettingsStore(
    (state) => state.visualizationSettings.buildingColor
  );
  const languageColorOverrides = useUserSettingsStore(
    (state) => state.visualizationSettings.languageColorOverrides
  );
  const modelTypeColorOverrides = useUserSettingsStore(
    (state) => state.visualizationSettings.modelTypeColorOverrides
  );

  const languagesInLandscape = useLanguagesInLandscape();

  const buildingTypesInLandscape = sortModelTypes(
    Array.from(
      new Set(
        Object.values(buildings)
          .map((m) => m.type)
          .filter((t) => !!t)
      )
    )
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [showAllLanguages, setShowAllLanguages] = useState(
    () => languagesInLandscape.length === 0
  );

  const visibleLanguages = useMemo(() => {
    const baseLanguages =
      showAllLanguages || languagesInLandscape.length === 0
        ? SUPPORTED_LANGUAGES
        : sortLanguages(languagesInLandscape);

    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return baseLanguages;
    }

    return baseLanguages.filter((language) => {
      const label = normalizeLanguage(language);
      return (
        label.toLowerCase().includes(normalizedQuery) ||
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

      {buildingTypesInLandscape.length > 0 && (
        <section>
          <h6 className="fw-bold">Model types</h6>
          <p className="small mb-2">
            Set the color and geometry for buildings from different analysis
            types. Model types found in the current landscape are shown by
            default.
          </p>

          <Accordion className="building-config-language-accordion">
            {buildingTypesInLandscape.map((type) => {
              const color =
                modelTypeColorOverrides.value[type] ?? buildingColor.value;

              return (
                <Accordion.Item
                  eventKey={type}
                  key={type}
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
                        {getLabelForModelType(type) ?? type}
                      </span>
                    </span>
                  </Accordion.Header>
                  <Accordion.Body>
                    <ModelTypeBuildingSettings type={type} />
                  </Accordion.Body>
                </Accordion.Item>
              );
            })}
          </Accordion>
        </section>
      )}

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
            id="language-accordion"
            className="building-config-language-accordion"
          >
            {visibleLanguages.map((language) => {
              const normalizedLanguage = normalizeLanguage(language);
              const color =
                languageColorOverrides.value[normalizedLanguage] ??
                modelTypeColorOverrides.value['code'] ??
                buildingColor.value;

              return (
                <Accordion.Item
                  eventKey={normalizedLanguage}
                  key={normalizedLanguage}
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
                        {getLabelForLanguage(normalizedLanguage) ??
                          normalizedLanguage}
                      </span>
                    </span>
                  </Accordion.Header>
                  <Accordion.Body>
                    <LanguageBuildingSettings language={normalizedLanguage} />
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
