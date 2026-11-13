import { getCircularReplacer } from 'explorviz-frontend/src/utils/circular-replacer';

const BIGINT_TAG = '__bigint__';

/**
 * JSON.stringify cannot handle BigInt values (e.g. nanosecond timestamps).
 * They are encoded as `{ "__bigint__": "<digits>" }` and restored by {@link parseSnapshotJson}.
 */
export function stringifySnapshotJson(value: unknown): string {
  const circularReplacer = getCircularReplacer();
  return JSON.stringify(value, function (this: unknown, key: string, val: unknown) {
    if (typeof val === 'bigint') {
      return { [BIGINT_TAG]: val.toString() };
    }
    return circularReplacer.call(this, key, val);
  });
}

export function reviveSnapshotJson(_key: string, value: unknown): unknown {
  if (
    value !== null &&
    typeof value === 'object' &&
    typeof (value as Record<string, unknown>)[BIGINT_TAG] === 'string'
  ) {
    return BigInt((value as Record<string, string>)[BIGINT_TAG]);
  }
  return value;
}

export function parseSnapshotJson<T>(text: string): T {
  return JSON.parse(text, reviveSnapshotJson) as T;
}
