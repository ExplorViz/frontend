import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { ModelType } from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import { getLabelForModelType } from 'explorviz-frontend/src/utils/model-type-utils';
import { CSSProperties } from 'react';
import { Badge } from 'react-bootstrap';

interface ModelTypeBadgeProps {
  type: ModelType | undefined;
  pill?: boolean;
  className?: string;
  style?: CSSProperties;
}

export default function ModelTypeBadge({
  type,
  pill,
  className,
  style,
}: ModelTypeBadgeProps) {
  const buildingColor = useUserSettingsStore(
    (state) => state.visualizationSettings.buildingColor
  );
  const modelTypeColorOverrides = useUserSettingsStore(
    (state) => state.visualizationSettings.modelTypeColorOverrides
  );

  const badgeColor =
    modelTypeColorOverrides.value[type ?? 'unknown'] ?? buildingColor.value;

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
      <samp>{getLabelForModelType(type ?? 'unknown')}</samp>
    </Badge>
  );
}
