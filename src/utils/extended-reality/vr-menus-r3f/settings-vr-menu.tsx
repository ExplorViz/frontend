import { Container } from "@react-three/uikit";

import { useUserSettingsStore } from "explorviz-frontend/src/stores/user-settings";

export default function SettingsMenu(){
    const visualizationSettings = useUserSettingsStore(
        (state) => state.visualizationSettings
    );
    const updateUserSetting = useUserSettingsStore(
        (state) => state.updateSetting
    );
    

    return (
        <Container>

        </Container>
    );
}