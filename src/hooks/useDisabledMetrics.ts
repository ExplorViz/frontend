import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { getDisabledMetrics } from 'explorviz-frontend/src/utils/settings/metric-settings';
import { useShallow } from 'zustand/react/shallow';

/** Names of the metrics that the user has disabled in the settings. */
export default function useDisabledMetrics(): ReadonlySet<string> {
  return useUserSettingsStore(useShallow((state) => getDisabledMetrics(state.visualizationSettings)));
}
