import { describe, expect, it, vi } from 'vitest';
import { describeFile, MAX_FILES, queryFiles } from '../../src/components/chatbot/file-query';
import type { ClazzDto, FileDetailedDto } from '../../src/utils/landscape-schemes/file-detailed-data';
import type { Building } from '../../src/utils/landscape-schemes/flat-landscape';
import { TypeOfAnalysis } from '../../src/utils/landscape-schemes/structure-data';

const functionOf = (name: string, returnType: string) => ({ name, returnType, metrics: { loc: 3 } });

function classOf(name: string, overrides: Partial<ClazzDto> = {}): ClazzDto {
  return { name, type: 'CLASS', metrics: { loc: 9 }, functions: [], fields: [], innerClasses: [], ...overrides };
}

function fileOf(overrides: Partial<FileDetailedDto> = {}): FileDetailedDto {
  return {
    name: 'Cart.java',
    language: 'JAVA',
    packageName: 'shop',
    importNames: ['java.util.List', 'java.time.Instant'],
    addedLines: 1,
    modifiedLines: 2,
    deletedLines: 3,
    metrics: { lineCount: 40 },
    functions: [functionOf('main', 'void')],
    classes: [
      classOf('Cart', {
        superclassFqns: ['shop.Base'],
        fields: [
          { name: 'items', type: 'List<Item>' },
          { name: 'created', type: 'Instant' },
        ],
        functions: [functionOf('total', 'Money'), functionOf('add', 'void')],
        innerClasses: [classOf('Builder', { functions: [functionOf('build', 'Cart')] })],
      }),
      classOf('Marker', { type: 'INTERFACE' }),
    ],
    fileUrl: 'https://example.com/Cart.java',
    ...overrides,
  };
}

const counts = { imports: 2, topLevelFunctions: 1, dataStructures: 3 };

describe('describing a file for the chatbot', () => {
  it('returns imports, functions, and data structures in a stable order', () => {
    const file = fileOf();

    expect(describeFile(file, {})).toEqual({
      language: 'JAVA',
      package: 'shop',
      counts,
      imports: ['java.time.Instant', 'java.util.List'],
      functions: ['main: void'],
      dataStructures: [
        {
          name: 'Cart',
          type: 'CLASS',
          superclasses: ['shop.Base'],
          fields: ['created: Instant', 'items: List<Item>'],
          functions: ['add: void', 'total: Money'],
        },
        { name: 'Cart.Builder', type: 'CLASS', functions: ['build: Cart'] },
        { name: 'Marker', type: 'INTERFACE' },
      ],
    });
    expect(describeFile({ ...file, classes: [...file.classes].reverse() }, {})).toEqual(describeFile(file, {}));
  });

  it('returns functions together with the data structure they belong to, but nothing else of it', () => {
    expect(describeFile(fileOf(), { sections: ['functions'] })).toEqual({
      language: 'JAVA',
      package: 'shop',
      counts,
      functions: ['main: void'],
      dataStructures: [
        { name: 'Cart', type: 'CLASS', functions: ['add: void', 'total: Money'] },
        { name: 'Cart.Builder', type: 'CLASS', functions: ['build: Cart'] },
      ],
    });
  });

  it('returns only imports if only those are asked for', () => {
    expect(Object.keys(describeFile(fileOf(), { sections: ['imports'] }))).toEqual([
      'language',
      'package',
      'counts',
      'imports',
    ]);
  });

  it('searches names and types, and returns a data structure with a matching name completely', () => {
    expect(describeFile(fileOf(), { search: 'INSTANT' })).toEqual({
      language: 'JAVA',
      package: 'shop',
      counts,
      imports: ['java.time.Instant'],
      dataStructures: [{ name: 'Cart', type: 'CLASS', superclasses: ['shop.Base'], fields: ['created: Instant'] }],
    });
    expect(describeFile(fileOf(), { search: 'builder' }).dataStructures).toEqual([
      { name: 'Cart.Builder', type: 'CLASS', functions: ['build: Cart'] },
    ]);
    expect(describeFile(fileOf(), { search: 'shop.base' }).dataStructures).toMatchObject([{ name: 'Cart' }]);
  });

  it('adds metrics only if asked for', () => {
    expect(JSON.stringify(describeFile(fileOf(), {}))).not.toContain('metrics');
    expect(describeFile(fileOf(), { includeMetrics: true })).toMatchObject({
      metrics: { lineCount: 40 },
      functions: [{ function: 'main: void', metrics: { loc: 3 } }],
      dataStructures: [{ metrics: { loc: 9 } }, {}, {}],
    });
  });

  it('limits the entries and counts what is missing', () => {
    expect(describeFile(fileOf(), { maxEntries: 3 })).toMatchObject({
      imports: ['java.time.Instant', 'java.util.List'],
      functions: ['main: void'],
      omitted: { dataStructures: 3 },
    });
  });

  it('copes with data that is missing', () => {
    const incomplete = {
      name: 'a.txt',
      language: 'PLAINTEXT',
      packageName: '',
      classes: [{ name: 'A', type: null, fields: [{ name: 'x', type: null }] }],
    } as unknown as FileDetailedDto;

    expect(describeFile(incomplete, {})).toEqual({
      language: 'PLAINTEXT',
      counts: { imports: 0, topLevelFunctions: 0, dataStructures: 1 },
      dataStructures: [{ name: 'A', fields: ['x'] }],
    });
  });
});

describe('inspecting files for the chatbot', () => {
  const buildingOf = (id: string, originOfData: TypeOfAnalysis): Building => ({
    id,
    name: id,
    fqn: `shop/${id}`,
    type: 'code',
    parentCityId: 'city',
    originOfData,
  });
  const getBuilding = (id: string) =>
    id === 'gone'
      ? undefined
      : buildingOf(id, id.startsWith('runtime') ? TypeOfAnalysis.Runtime : TypeOfAnalysis.StaticAndRuntime);

  it('reports files that cannot be inspected next to those that can', async () => {
    const requestFile = vi.fn(async (id: string) => {
      if (id === 'broken') {
        throw new Error('404: File revision not found');
      }
      return fileOf();
    });

    const { files } = await queryFiles(
      { ids: ['1', 'gone', 'runtime', 'broken'], sections: ['imports'] },
      getBuilding,
      requestFile
    );

    expect(files).toMatchObject([
      { id: '1', name: 'shop/1', imports: ['java.time.Instant', 'java.util.List'] },
      { id: 'gone', error: expect.stringContaining('query-landscape-data') },
      { id: 'runtime', error: expect.stringContaining('static analysis') },
      { id: 'broken', error: '404: File revision not found' },
    ]);
    expect(requestFile.mock.calls).toEqual([['1'], ['broken']]);
  });

  it('requests each file once and not more than allowed', async () => {
    const requestFile = vi.fn(async () => fileOf());
    const ids = Array.from({ length: MAX_FILES + 2 }, (_, index) => String(index));

    const result = await queryFiles({ ids: ['0', ...ids] }, getBuilding, requestFile);

    expect(requestFile).toHaveBeenCalledTimes(MAX_FILES);
    expect(result.omittedIds).toEqual(['10', '11']);
  });
});
