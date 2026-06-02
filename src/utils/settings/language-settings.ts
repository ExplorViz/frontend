import { Language } from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import { defaultColors } from 'explorviz-frontend/src/utils/settings/color-schemes';
import {
  ColorSettingId,
  GeometrySettingId,
  VisualizationSettings,
} from 'explorviz-frontend/src/utils/settings/settings-schemas';

export type BuildingGeometryType = 'Box' | 'Cone' | 'Sphere' | 'Cylinder';

type LanguageSettingConfig = {
  label: string;
  colorSettingId: ColorSettingId;
  geometrySettingId: GeometrySettingId;
};

export const LANGUAGE_SETTING_CONFIG: Record<Language, LanguageSettingConfig> =
  {
    JAVA: {
      label: 'Java',
      colorSettingId: 'javaBuildingColor',
      geometrySettingId: 'languageGeometryJava',
    },
    C: {
      label: 'C',
      colorSettingId: 'cBuildingColor',
      geometrySettingId: 'languageGeometryC',
    },
    CPP: {
      label: 'C++',
      colorSettingId: 'cppBuildingColor',
      geometrySettingId: 'languageGeometryCpp',
    },
    CSHARP: {
      label: 'C#',
      colorSettingId: 'csharpBuildingColor',
      geometrySettingId: 'languageGeometryCsharp',
    },
    GO: {
      label: 'Go',
      colorSettingId: 'goBuildingColor',
      geometrySettingId: 'languageGeometryGo',
    },
    JAVASCRIPT: {
      label: 'JavaScript',
      colorSettingId: 'javascriptBuildingColor',
      geometrySettingId: 'languageGeometryJavaScript',
    },
    KOTLIN: {
      label: 'Kotlin',
      colorSettingId: 'kotlinBuildingColor',
      geometrySettingId: 'languageGeometryKotlin',
    },
    PHP: {
      label: 'PHP',
      colorSettingId: 'phpBuildingColor',
      geometrySettingId: 'languageGeometryPhp',
    },
    PYTHON: {
      label: 'Python',
      colorSettingId: 'pythonBuildingColor',
      geometrySettingId: 'languageGeometryPython',
    },
    RUST: {
      label: 'Rust',
      colorSettingId: 'rustBuildingColor',
      geometrySettingId: 'languageGeometryRust',
    },
    SWIFT: {
      label: 'Swift',
      colorSettingId: 'swiftBuildingColor',
      geometrySettingId: 'languageGeometrySwift',
    },
    TYPESCRIPT: {
      label: 'TypeScript',
      colorSettingId: 'typescriptBuildingColor',
      geometrySettingId: 'languageGeometryTypeScript',
    },
    PLAINTEXT: {
      label: 'Plain Text',
      colorSettingId: 'plaintextBuildingColor',
      geometrySettingId: 'languageGeometryPlaintext',
    },
    LANGUAGE_UNSPECIFIED: {
      label: 'Other',
      colorSettingId: 'otherBuildingColor',
      geometrySettingId: 'languageGeometryOther',
    },
  };

export const LANGUAGE_DISPLAY_ORDER = Object.keys(
  LANGUAGE_SETTING_CONFIG
) as Language[];

export const LANGUAGE_COLOR_SETTING_IDS = Object.values(
  LANGUAGE_SETTING_CONFIG
).map((config) => config.colorSettingId);

export const LANGUAGE_GEOMETRY_SETTING_IDS = Object.values(
  LANGUAGE_SETTING_CONFIG
).map((config) => config.geometrySettingId);

export function normalizeLanguage(lang: string | undefined | null): Language {
  if (lang == null || lang.trim() === '') {
    return 'LANGUAGE_UNSPECIFIED';
  }

  const normalized = lang.trim().toUpperCase() as Language;
  if (normalized in LANGUAGE_SETTING_CONFIG) {
    return normalized;
  }

  return 'LANGUAGE_UNSPECIFIED';
}

export function getLanguageColorSettingId(
  lang: Language | string
): ColorSettingId {
  const normalized =
    typeof lang === 'string' ? normalizeLanguage(lang) : lang;
  return LANGUAGE_SETTING_CONFIG[normalized].colorSettingId;
}

export function getLanguageColor(
  lang: Language | string,
  settings: VisualizationSettings
): string {
  const normalized =
    typeof lang === 'string' ? normalizeLanguage(lang) : lang;
  const { colorSettingId } = LANGUAGE_SETTING_CONFIG[normalized];
  const fallback =
    settings.otherBuildingColor?.value ?? defaultColors.otherBuildingColor;

  return settings[colorSettingId]?.value ?? fallback;
}

export function getLanguageGeometry(
  lang: Language,
  settings: VisualizationSettings
): BuildingGeometryType {
  const { geometrySettingId } = LANGUAGE_SETTING_CONFIG[lang];
  return settings[geometrySettingId].value as BuildingGeometryType;
}
