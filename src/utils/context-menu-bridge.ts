import type { ContextMenuHitEntity } from 'explorviz-frontend/src/utils/context-menu-world-pick';

/** DOM pointer fields needed to position the HTML context menu overlay. */
type NativePointerSubset = Pick<
  MouseEvent,
  'clientX' | 'clientY' | 'pageX' | 'pageY' | 'preventDefault'
>;

export type ContextMenuBridgePayload = {
  hit: ContextMenuHitEntity;
  pointer: Pick<NativePointerSubset, 'clientX' | 'clientY' | 'pageX' | 'pageY'>;
};

type BridgeSubscriber = (payload: ContextMenuBridgePayload) => void;

let subscriber: BridgeSubscriber | null = null;

/**
 * Registers the React context-menu host (one consumer, typically Visualization).
 */
export function subscribeContextMenuFromWorld(
  handler: BridgeSubscriber | null
): void {
  subscriber = handler;
}

/**
 * Open the HTML context menu from inside the R3F tree (foundation / districts / buildings)
 * or from Canvas callbacks (right-click miss).
 */
export function emitContextMenuFromWorld(
  hit: ContextMenuHitEntity,
  nativeEvent: NativePointerSubset
): void {
  nativeEvent.preventDefault();
  subscriber?.({
    hit,
    pointer: {
      clientX: nativeEvent.clientX,
      clientY: nativeEvent.clientY,
      pageX: nativeEvent.pageX,
      pageY: nativeEvent.pageY,
    },
  });
}
