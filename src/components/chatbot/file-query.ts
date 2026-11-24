import {
  ClazzDto,
  FieldDto,
  FileDetailedDto,
  FunctionDto,
} from 'explorviz-frontend/src/utils/landscape-schemes/file-detailed-data';
import { Building } from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import { TypeOfAnalysis } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';

export const FILE_SECTIONS = ['imports', 'functions', 'dataStructures'] as const;
export type FileSection = (typeof FILE_SECTIONS)[number];

/** Every file is a request to the landscape service. */
export const MAX_FILES = 10;
export const DEFAULT_MAX_ENTRIES = 100;

export interface FileQuery {
  ids: string[];
  sections?: FileSection[];
  search?: string;
  includeMetrics?: boolean;
  maxEntries?: number;
}

type Entry = Record<string, unknown>;

/** Drops absent values and empty lists so they cost no tokens. */
function compact(entry: Entry): Entry {
  return Object.fromEntries(
    Object.entries(entry).filter(
      ([, value]) => value !== undefined && value !== null && !(Array.isArray(value) && value.length === 0)
    )
  );
}

/** The service returns these lists in no particular order, which would make equal results look different. */
function sortedByName<T extends { name: string }>(items: T[] | null | undefined): T[] {
  return [...(items ?? [])].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}

interface DataStructure {
  /** Includes the names of the data structures it is nested in. */
  name: string;
  clazz: ClazzDto;
}

function flatten(classes: ClazzDto[] | null | undefined, prefix = ''): DataStructure[] {
  return sortedByName(classes).flatMap((clazz) => {
    const name = prefix + clazz.name;
    return [{ name, clazz }, ...flatten(clazz.innerClasses, `${name}.`)];
  });
}

/** Counts down how many entries may still be listed for a file. */
class Budget {
  omitted: Partial<Record<FileSection, number>> = {};

  constructor(private remaining: number) {}

  take<T>(section: FileSection, items: T[]): T[] {
    const taken = items.slice(0, this.remaining);
    this.remaining -= taken.length;
    if (taken.length < items.length) {
      this.omitted[section] = (this.omitted[section] ?? 0) + items.length - taken.length;
    }
    return taken;
  }
}

/** Selects the requested data of one file. The same function serves functions of files and of data structures. */
export function describeFile(file: FileDetailedDto, query: Omit<FileQuery, 'ids'>): Entry {
  const sections = new Set<FileSection>(query.sections?.length ? query.sections : FILE_SECTIONS);
  const search = query.search?.trim().toLowerCase() ?? '';
  const matches = (...texts: (string | null | undefined)[]) =>
    !search || texts.some((text) => text?.toLowerCase().includes(search));
  const maxEntries = query.maxEntries;
  const budget = new Budget(
    typeof maxEntries === 'number' && maxEntries >= 0 ? Math.floor(maxEntries) : DEFAULT_MAX_ENTRIES
  );

  const toFunction = ({ name, returnType, metrics }: FunctionDto) => {
    const signature = returnType ? `${name}: ${returnType}` : name;
    return query.includeMetrics ? { function: signature, metrics } : signature;
  };
  const toField = ({ name, type }: FieldDto) => (type ? `${name}: ${type}` : name);
  const listFunctions = (functions: FunctionDto[] | null | undefined, takeAll = false) =>
    sections.has('functions')
      ? budget
          .take(
            'functions',
            sortedByName(functions).filter(({ name, returnType }) => takeAll || matches(name, returnType))
          )
          .map(toFunction)
      : [];

  const imports = sections.has('imports')
    ? budget.take(
        'imports',
        [...(file.importNames ?? [])].sort().filter((name) => matches(name))
      )
    : [];
  const functions = listFunctions(file.functions);

  const dataStructures = flatten(file.classes).flatMap(({ name, clazz }) => {
    // A data structure that is searched for is returned with everything in it.
    const isMatch = matches(name);
    const superclasses = clazz.superclassFqns ?? [];
    const hasMatchingSuperclass = sections.has('dataStructures') && matches(...superclasses);
    const matchingFields = sections.has('dataStructures')
      ? sortedByName(clazz.fields).filter((field) => isMatch || matches(field.name, field.type))
      : [];
    const hasMatchingFunction =
      sections.has('functions') && (clazz.functions ?? []).some((fn) => isMatch || matches(fn.name, fn.returnType));
    const isListed =
      (isMatch && sections.has('dataStructures')) ||
      (search !== '' && hasMatchingSuperclass) ||
      matchingFields.length > 0 ||
      hasMatchingFunction;
    if (!isListed || budget.take('dataStructures', [clazz]).length === 0) {
      return [];
    }
    return [
      compact({
        name,
        type: clazz.type,
        ...(sections.has('dataStructures') && {
          superclasses: [...superclasses].sort(),
          fields: budget.take('dataStructures', matchingFields).map(toField),
          metrics: query.includeMetrics ? clazz.metrics : undefined,
        }),
        functions: listFunctions(clazz.functions, isMatch),
      }),
    ];
  });

  return compact({
    language: file.language,
    package: file.packageName || undefined,
    metrics: query.includeMetrics ? file.metrics : undefined,
    // Totals, so that the chatbot can tell "none" from "none that match".
    counts: {
      imports: file.importNames?.length ?? 0,
      topLevelFunctions: file.functions?.length ?? 0,
      dataStructures: flatten(file.classes).length,
    },
    imports,
    functions,
    dataStructures,
    omitted: Object.keys(budget.omitted).length > 0 ? budget.omitted : undefined,
  });
}

function hasFileData({ originOfData }: Building) {
  return originOfData === TypeOfAnalysis.Static || originOfData === TypeOfAnalysis.StaticAndRuntime;
}

/**
 * Loads and describes files. A file that cannot be inspected is reported in its
 * place, so it does not keep the chatbot from getting the others.
 */
export async function queryFiles(
  query: FileQuery,
  getBuilding: (id: string) => Building | undefined,
  requestFile: (id: string) => Promise<FileDetailedDto>
): Promise<{ files: Entry[]; omittedIds?: string[] }> {
  const ids = [...new Set(query.ids)];
  const files = await Promise.all(
    ids.slice(0, MAX_FILES).map(async (id) => {
      const building = getBuilding(id);
      if (!building) {
        return { id, error: 'Not the id of a building. Look up the id with query-landscape-data.' };
      }
      const name = building.fqn ?? building.name;
      if (!hasFileData(building)) {
        return { id, name, error: 'Has no file data: it does not come from static analysis.' };
      }
      try {
        return { id, name, ...describeFile(await requestFile(id), query) };
      } catch (error) {
        return { id, name, error: error instanceof Error ? error.message : String(error) };
      }
    })
  );
  return { files, ...(ids.length > MAX_FILES && { omittedIds: ids.slice(MAX_FILES) }) };
}
