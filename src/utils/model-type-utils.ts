import { ModelType } from './landscape-schemes/flat-landscape';

const MODEL_TYPE_TO_LABEL = new Map<ModelType, string>([
  ['service', 'Service'],
  ['instrumentation_scope', 'Instrumentation Scope'],
  ['code', 'Code'],
  ['rpc', 'RPC'],
  ['http', 'HTTP'],
  ['unknown', 'Unknown'],
]);

const TRAILING_MODEL_TYPES: ModelType[] = ['unknown'];

/**
 * Returns a human-friendly textual representation for the given model type.
 * If the input is not a valid model type according to {@link ModelType}, undefined is returned.
 */
export function getLabelForModelType(type: ModelType) {
  return MODEL_TYPE_TO_LABEL.get(type);
}

/**
 * Returns a shallow copy of the provided array of {@link ModelType} values,
 * sorted according to a custom ordering. Values are sorted alphabetically,
 * but certain special cases should always be placed after the regular types.
 */
export function sortModelTypes(types: ModelType[]): ModelType[] {
  return [...types].sort(compareModelTypes);
}

function compareModelTypes(a: ModelType, b: ModelType): number {
  const aTrailingIndex = TRAILING_MODEL_TYPES.indexOf(a);
  const bTrailingIndex = TRAILING_MODEL_TYPES.indexOf(b);

  if (aTrailingIndex !== -1 || bTrailingIndex !== -1) {
    if (aTrailingIndex !== -1 && bTrailingIndex !== -1) {
      return aTrailingIndex - bTrailingIndex;
    }
    return aTrailingIndex !== -1 ? 1 : -1;
  }

  return a.localeCompare(b);
}
