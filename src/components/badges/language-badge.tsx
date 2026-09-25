import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { Language } from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import { getLabelForLanguage } from 'explorviz-frontend/src/utils/language-utils';
import { CSSProperties } from 'react';
import { Badge } from 'react-bootstrap';

interface LanguageBadgeProps {
  language: Language | undefined;
  pill?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * Displays a badge indicating a {@link Language} value. The badge's color
 * is set to match the color of buildings with that particular language value.
 */
export default function LanguageBadge({
  language,
  pill,
  className,
  style,
}: LanguageBadgeProps) {
  const buildingColor = useUserSettingsStore(
    (state) => state.visualizationSettings.buildingColor
  );
  const buildingColorOverrides = useUserSettingsStore(
    (state) => state.visualizationSettings.buildingColorOverrides
  );

  const badgeColor =
    buildingColorOverrides.value.language[language ?? 'LANGUAGE_UNSPECIFIED'] ??
    buildingColorOverrides.value.modelType['code'] ??
    buildingColor.value;

  return (
    <Badge
      bg=""
      pill={pill ?? true}
      className={`align-middle ${className}`}
      style={{
        backgroundColor: badgeColor,
        color: `contrast-color(${badgeColor})`,
        ...style,
      }}
    >
      <samp>{getLabelForLanguage(language ?? 'LANGUAGE_UNSPECIFIED')}</samp>
    </Badge>
  );
}
