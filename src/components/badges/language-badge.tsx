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

export default function LanguageBadge({
  language,
  pill,
  className,
  style,
}: LanguageBadgeProps) {
  const buildingColor = useUserSettingsStore(
    (state) => state.visualizationSettings.buildingColor
  );
  const modelTypeColorOverrides = useUserSettingsStore(
    (state) => state.visualizationSettings.modelTypeColorOverrides
  );
  const languageColorOverrides = useUserSettingsStore(
    (state) => state.visualizationSettings.languageColorOverrides
  );

  const badgeColor =
    languageColorOverrides.value[language ?? 'LANGUAGE_UNSPECIFIED'] ??
    modelTypeColorOverrides.value['code'] ??
    buildingColor.value;

  return (
    <Badge
      bg=""
      pill={pill ?? true}
      className={className}
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
