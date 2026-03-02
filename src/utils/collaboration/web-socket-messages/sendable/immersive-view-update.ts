export const IMMERSIVE_VIEW_UPDATE_EVENT = 'immersive_view_update';

export type ImmersiveViewUpdateMessage = {
    event: typeof IMMERSIVE_VIEW_UPDATE_EVENT;
    classId: string;
    didEnterView: boolean;
};