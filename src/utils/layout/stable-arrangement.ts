import { useLayoutStore } from 'explorviz-frontend/src/stores/layout-store';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { ARRANGEMENT_SETTING_IDS } from 'explorviz-frontend/src/utils/settings/layout-settings';

/**
 * The places the stable (maxrects) layout remembers, kept apart from the
 * layouter so that the collaboration module can hand them over to and from a
 * Room without depending on the layouter.
 */

/** The place a container reserved for one of its children, relative to its content area. */
export type Slot = { x: number; z: number; width: number; depth: number };

/**
 * How one container (the landscape, a City or a District) arranges its
 * children: the place of each child and the width it packs them into.
 */
export type Arrangement = { slots: Map<string, Slot>; width: number };

/** The arrangements of all containers, by container id ("landscape" for the landscape). */
export type Arrangements = Map<string, Arrangement>;

type Memory = {
  /** The settings and layout revision the places were made for. */
  key: string;
  arrangements: Arrangements;
  /** The containers whose places changed since the changes were last taken. */
  changed: Set<string>;
  /** Whether the places were dropped (packed afresh) since the changes were last taken. */
  reset: boolean;
};

let memory: Memory | null = null;

/**
 * What remembered places are made for: the layout revision and the settings
 * that change sizes or spacing. Places made for another key are dropped.
 */
function getArrangementKey(): string {
  const vs = useUserSettingsStore.getState().visualizationSettings;
  const settings = ARRANGEMENT_SETTING_IDS.map((id) => `${id}=${JSON.stringify(vs[id].value)}`).join('|');
  return `${useLayoutStore.getState().layoutRevision};${settings}`;
}

export function cloneArrangements(arrangements: Arrangements): Arrangements {
  return new Map(
    Array.from(arrangements, ([id, { slots, width }]) => [
      id,
      { width, slots: new Map(Array.from(slots, ([childId, slot]) => [childId, { ...slot }])) },
    ])
  );
}

/** The own remembered places for the current settings; dropped (packed afresh) if they were made for others. */
export function getOwnArrangements(): { arrangements: Arrangements; changed: Set<string> } {
  const key = getArrangementKey();
  if (!memory || memory.key !== key) {
    memory = { key, arrangements: new Map(), changed: new Set(), reset: true };
  }
  return memory;
}

/**
 * The own places the layout changed since this was last called, and whether
 * they were packed afresh in between.
 */
export function takeArrangementChanges(): { arrangements: Arrangements; changed: Set<string>; reset: boolean } | null {
  if (!memory) return null;
  const { arrangements, changed, reset } = memory;
  memory.changed = new Set();
  memory.reset = false;
  return { arrangements, changed, reset };
}

/** All own places, for handing them over (e.g. to a new Room). */
export function peekOwnArrangements(): Arrangements | undefined {
  return memory?.arrangements;
}

/** These places become the own ones, made for the current settings (e.g. the Room's when leaving it). */
export function adoptArrangements(arrangements: Arrangements): void {
  memory = {
    key: getArrangementKey(),
    arrangements: cloneArrangements(arrangements),
    changed: new Set(),
    reset: false,
  };
}

/** Forgets all remembered places, so the next layout is packed afresh. */
export function resetMaxRectsLayout(): void {
  memory = null;
}
