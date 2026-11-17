import { describe, expect, it } from 'vitest';
import {
  queryLandscape,
  referenceEarlierResult,
  type ConversationMessage,
  type LandscapeModels,
} from '../src/components/chatbot/landscape-query';
import type { Building, City, District } from '../src/utils/landscape-schemes/flat-landscape';

function landscapeOf(buildingCount: number): LandscapeModels {
  const buildings: Building[] = Array.from({ length: buildingCount }, (_, index) => ({
    id: `building-${index}`,
    name: `Class${index}`,
    fqn: `shop.checkout.Class${index}`,
    type: 'code',
    parentCityId: 'city',
    parentDistrictId: 'checkout',
    language: 'JAVA',
    metrics: { lineCount: { current: index * 10 }, cloc: { current: null } },
  }));
  const districts: District[] = [
    {
      id: 'shop',
      name: 'shop',
      fqn: 'shop',
      type: 'code',
      parentCityId: 'city',
      districtIds: ['checkout'],
      buildingIds: [],
    },
    {
      id: 'checkout',
      name: 'checkout',
      fqn: 'shop.checkout',
      type: 'code',
      parentCityId: 'city',
      parentDistrictId: 'shop',
      districtIds: [],
      buildingIds: buildings.map(({ id }) => id),
    },
  ];
  const city: City = {
    id: 'city',
    name: 'Shop',
    type: 'code',
    districtIds: ['shop'],
    buildingIds: [],
    allContainedDistrictIds: districts.map(({ id }) => id),
    allContainedBuildingIds: buildings.map(({ id }) => id),
  };
  return {
    getAllCities: () => [city],
    getCity: (id) => (id === city.id ? city : undefined),
    getDistrict: (id) => districts.find((district) => district.id === id),
    getBuilding: (id) => buildings.find((building) => building.id === id),
  };
}

describe('querying the landscape for the chatbot', () => {
  it('answers a summary with counts only', () => {
    expect(queryLandscape({ detailLevel: 'summary' }, landscapeOf(3))).toEqual({
      cities: [{ id: 'city', name: 'Shop', districtCount: 2, buildingCount: 3 }],
    });
  });

  it('lists ids, names, and parents by default, without metrics', () => {
    const result = queryLandscape({}, landscapeOf(1));

    expect(result.districts).toEqual([
      { id: 'shop', fqn: 'shop' },
      { id: 'checkout', fqn: 'shop.checkout', parentId: 'shop' },
    ]);
    expect(result.buildings).toEqual([{ id: 'building-0', fqn: 'shop.checkout.Class0', parentId: 'checkout' }]);
  });

  it('adds metrics that have a value at full detail', () => {
    const result = queryLandscape({ detailLevel: 'full', buildingName: 'class1' }, landscapeOf(2));

    expect(result.buildings).toEqual([
      {
        id: 'building-1',
        fqn: 'shop.checkout.Class1',
        parentId: 'checkout',
        type: 'code',
        language: 'JAVA',
        metrics: { lineCount: 10 },
      },
    ]);
  });

  it('limits the buildings and reports how many are missing', () => {
    const result = queryLandscape({ maxBuildings: 2 }, landscapeOf(5));

    expect(result.buildings).toHaveLength(2);
    expect(result.omitted).toEqual({ buildings: 3 });
  });

  it('limits the buildings even when no limit is given', () => {
    const result = queryLandscape({}, landscapeOf(80));

    expect(result.buildings).toHaveLength(50);
    expect(result.omitted).toEqual({ buildings: 30 });
  });

  it('returns the largest buildings first when sorted by a metric, without the districts', () => {
    const result = queryLandscape({ sortByMetric: 'lineCount', maxBuildings: 2 }, landscapeOf(5));

    expect(result.districts).toBeUndefined();
    expect(result.buildings).toEqual([
      { id: 'building-4', fqn: 'shop.checkout.Class4', parentId: 'checkout', lineCount: 40 },
      { id: 'building-3', fqn: 'shop.checkout.Class3', parentId: 'checkout', lineCount: 30 },
    ]);
  });

  it('restricts buildings to the matching districts', () => {
    const result = queryLandscape({ districtName: 'CHECKOUT' }, landscapeOf(2));

    expect(result.districts).toEqual([{ id: 'checkout', fqn: 'shop.checkout', parentId: 'shop' }]);
    expect(result.buildings).toHaveLength(2);
    expect(result.cities[0]).toMatchObject({ matchingDistrictCount: 1, matchingBuildingCount: 2 });
  });

  it('looks up entities by id and names the ids it does not know', () => {
    const result = queryLandscape({ ids: ['city', 'checkout', 'building-0', 'gone'] }, landscapeOf(1));

    expect(result.cities).toHaveLength(1);
    expect(result.districts).toEqual([{ id: 'checkout', fqn: 'shop.checkout', parentId: 'shop', cityId: 'city' }]);
    expect(result.buildings).toEqual([
      { id: 'building-0', fqn: 'shop.checkout.Class0', parentId: 'checkout', cityId: 'city' },
    ]);
    expect(result.unknownIds).toEqual(['gone']);
  });
});

describe('answering a repeated landscape query', () => {
  const result = (buildingCount: number) => JSON.stringify(queryLandscape({}, landscapeOf(buildingCount)));
  const earlierCall: ConversationMessage[] = [
    {
      role: 'assistant',
      toolCalls: [{ id: 'call-1', function: { name: 'query-landscape-data', arguments: '{"cityName":"shop"}' } }],
    },
    { role: 'tool', toolCallId: 'call-1', content: result(20) },
  ];

  it('sends the data when the conversation does not contain it yet', () => {
    expect(referenceEarlierResult(result(20), [], 'call-1')).toBe(result(20));
  });

  it('only says that the data is unchanged when the conversation still contains it', () => {
    const answer = referenceEarlierResult(result(20), earlierCall, 'call-2');

    expect(answer.length).toBeLessThan(result(20).length);
    expect(JSON.parse(answer)).toMatchObject({ unchanged: true });
    expect(answer).toContain('cityName');
  });

  it('keeps answering "unchanged" for further repetitions', () => {
    const messages: ConversationMessage[] = [
      ...earlierCall,
      { role: 'tool', toolCallId: 'call-2', content: referenceEarlierResult(result(20), earlierCall, 'call-2') },
    ];

    expect(JSON.parse(referenceEarlierResult(result(20), messages, 'call-3'))).toMatchObject({ unchanged: true });
  });

  it('sends the data again when the landscape changed', () => {
    expect(referenceEarlierResult(result(21), earlierCall, 'call-2')).toBe(result(21));
  });

  it('sends the data again when the chat was reset', () => {
    expect(referenceEarlierResult(result(20), [], 'call-2')).toBe(result(20));
  });

  it('repeats a result that is shorter than the note would be', () => {
    const small = result(0);
    const messages: ConversationMessage[] = [{ role: 'tool', toolCallId: 'call-1', content: small }];

    expect(referenceEarlierResult(small, messages, 'call-2')).toBe(small);
  });
});
