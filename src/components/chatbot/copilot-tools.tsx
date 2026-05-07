import { useFrontendTool } from '@copilotkit/react-core/v2';
import { ToolCallCard } from 'explorviz-frontend/src/components/chatbot/tool-call-card';
import { useCameraControlsStore } from 'explorviz-frontend/src/stores/camera-controls-store';
import { useModelStore } from 'explorviz-frontend/src/stores/repos/model-repository';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import {
  closeAllDistrictsInCity,
  closeDistrict,
  openAllDistrictsInCity,
  openDistrict,
} from 'explorviz-frontend/src/utils/city-rendering/entity-manipulation';
import {
  Building,
  City,
  District,
} from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import { defaultVizSettings } from 'explorviz-frontend/src/utils/settings/default-settings';
import { VisualizationSettings } from 'explorviz-frontend/src/utils/settings/settings-schemas';
import { pingByModelId } from 'explorviz-frontend/src/view-objects/3d/city/animated-ping-r3f';
import * as htmlToImage from 'html-to-image';
import { use } from 'react';
import { z } from 'zod';
import { EditingContext } from '../editing/editing-context';
import { ChatbotContext } from './chatbot-context';

const SCREENSHOT_MAX_WIDTH = 1280;
const SCREENSHOT_MAX_HEIGHT = 720;

function normalizeText(value?: string) {
  return (value ?? '').trim().toLowerCase();
}

function matchesText(target: string | undefined, filter?: string) {
  const normalizedFilter = normalizeText(filter);
  if (!normalizedFilter) {
    return true;
  }
  return (target ?? '').toLowerCase().includes(normalizedFilter);
}

function limitList<T>(list: T[], limit?: number) {
  if (typeof limit === 'number' && limit > 0) {
    return list.slice(0, limit);
  }
  return list;
}

function districtMatchesFilter(district: District, districtName?: string) {
  if (!normalizeText(districtName)) {
    return true;
  }
  return (
    matchesText(district.name, districtName) ||
    matchesText(district.fqn, districtName)
  );
}

function buildingMatchesFilter(building: Building, buildingName?: string) {
  if (!normalizeText(buildingName)) {
    return true;
  }
  return (
    matchesText(building.name, buildingName) ||
    matchesText(building.fqn, buildingName)
  );
}

function buildCitySummary(
  city: City,
  districts: District[],
  buildings: Building[],
  limitedDistricts: District[],
  limitedBuildings: Building[]
) {
  return {
    cityId: city.id,
    cityName: city.name,
    originOfData: city.originOfData,
    districtCount: districts.length,
    buildingCount: buildings.length,
    returnedDistrictCount: limitedDistricts.length,
    returnedBuildingCount: limitedBuildings.length,
  };
}

function toDistrictResult(district: District) {
  return {
    districtId: district.id,
    districtName: district.name,
    districtFqn: district.fqn,
    districtParentDistrictId: district.parentDistrictId ?? null,
    districtParentCityId: district.parentCityId,
    originOfData: district.originOfData,
    childDistrictCount: district.districtIds.length,
    buildingCount: district.buildingIds.length,
    editingState: district.editingState,
  };
}

function toBuildingResult(building: Building) {
  return {
    buildingId: building.id,
    buildingName: building.name,
    buildingFqn: building.fqn,
    buildingParentDistrictId: building.parentDistrictId ?? null,
    buildingParentCityId: building.parentCityId,
    language: building.language,
    metrics: building.metrics,
    originOfData: building.originOfData,
    editingState: building.editingState,
  };
}

function buildSettingsPromptDescription() {
  return Object.entries(defaultVizSettings)
    .map(([id, setting]) => {
      const displayName =
        (setting as any).displayName && (setting as any).displayName !== id
          ? `${(setting as any).displayName} (${id})`
          : id;
      const description =
        (setting as any).description &&
        (setting as any).description.trim().length
          ? (setting as any).description
          : 'No description available.';
      return `${displayName}: ${description}`;
    })
    .join('; ');
}

const settingsPromptDescription = buildSettingsPromptDescription();

export function CopilotTools() {
  const { actions } = useVisualizationStore();
  const { lookAtEntity, resetCamera } = useCameraControlsStore();
  const {
    addApplication,
    addClasses,
    removeComponent,
    goBack,
    goForward,
    canGoBack,
    canGoForward,
  } = use(EditingContext);

  const {
    pingScreenAtPoint,
    showToolsSidebar,
    setShowToolsSidebar,
    showSettingsSidebar,
    setShowSettingsSidebar,
    openedToolComponent,
    setOpenedToolComponent,
    openedSettingComponent,
    setOpenedSettingComponent,
    entityFilteringControllerRef,
    entitySearchControllerRef,
  } = use(ChatbotContext);

  useFrontendTool({
    name: 'query-landscape-data',
    description:
      'Returns flat 3D landscape data (cities, districts, buildings) with filters and adjustable detail level so you can request only the slices you need.',
    parameters: z.object({
      cityIds: z.array(z.string()).optional(),
      cityName: z.string().optional(),
      districtName: z.string().optional(),
      buildingName: z.string().optional(),
      detailLevel: z.string().optional(),
      maxCities: z.number().optional(),
      maxDistricts: z.number().optional(),
      maxBuildings: z.number().optional(),
    }),
    // @ts-ignore
    _isRenderAndWait: true,
    handler: async ({
      cityIds,
      cityName,
      districtName,
      buildingName,
      maxCities,
      maxDistricts,
      maxBuildings,
    }) => {
      const availableCities = useModelStore.getState().getAllCities() ?? [];
      const filteredCities = availableCities.filter((city) => {
        const idMatches =
          !Array.isArray(cityIds) ||
          cityIds.length === 0 ||
          cityIds.includes(city.id);
        const nameMatches = matchesText(city.name, cityName);
        return idMatches && nameMatches;
      });

      const limitedCities = limitList(filteredCities, maxCities);

      const response: {
        filters: Record<string, unknown>;
        cities: ReturnType<typeof buildCitySummary>[];
        districts?: ReturnType<typeof toDistrictResult>[];
        buildings?: ReturnType<typeof toBuildingResult>[];
      } = {
        filters: {
          cityIds:
            Array.isArray(cityIds) && cityIds.length > 0 ? cityIds : undefined,
          cityName: cityName || undefined,
          districtName: districtName || undefined,
          buildingName: buildingName || undefined,
          maxCities,
          maxDistricts,
          maxBuildings,
        },
        cities: [],
      };

      limitedCities.forEach((city) => {
        const cityDistricts = city.allContainedDistrictIds
          .map((districtId) => useModelStore.getState().getDistrict(districtId))
          .filter((district): district is District => !!district);
        const cityBuildings = city.allContainedBuildingIds
          .map((buildingId) => useModelStore.getState().getBuilding(buildingId))
          .filter((building): building is Building => !!building);

        const filteredDistricts = cityDistricts.filter((district) =>
          districtMatchesFilter(district, districtName)
        );
        const filteredBuildings = cityBuildings.filter((building) =>
          buildingMatchesFilter(building, buildingName)
        );

        const filteredBuildingsWithDistrictConstraint = normalizeText(
          districtName
        )
          ? filteredBuildings.filter((building) => {
              const districtId = building.parentDistrictId;
              if (!districtId) {
                return false;
              }
              return filteredDistricts.some(
                (district) => district.id === districtId
              );
            })
          : filteredBuildings;

        const limitedDistricts = limitList(filteredDistricts, maxDistricts);
        const limitedBuildings = limitList(
          filteredBuildingsWithDistrictConstraint
        );

        response.cities.push(
          buildCitySummary(
            city,
            filteredDistricts,
            filteredBuildingsWithDistrictConstraint,
            limitedDistricts,
            limitedBuildings
          )
        );

        response.districts ??= [];
        response.districts.push(...limitedDistricts.map(toDistrictResult));

        response.buildings ??= [];
        response.buildings.push(...limitedBuildings.map(toBuildingResult));
      });

      return response;
    },
    render: ({ status, args }) => {
      const labelParts: string[] = [];
      if (args.detailLevel) {
        labelParts.push(args.detailLevel);
      }
      if (args.cityName) {
        labelParts.push(`city~${args.cityName}`);
      } else if (args.districtName) {
        labelParts.push(`district~${args.districtName}`);
      } else if (args.buildingName) {
        labelParts.push(`building~${args.buildingName}`);
      }

      return (
        <ToolCallCard
          status={status}
          action="queryLandscapeData"
          component={{
            name: labelParts.length ? labelParts.join(' | ') : 'landscape data',
          }}
        />
      );
    },
  });

  useFrontendTool({
    name: 'highlight-entities',
    description:
      'Highlights or un-highlights cities, districts, or buildings by their ids in the 3D visualization.',
    parameters: z.object({
      ids: z.array(z.string()),
      areHighlighted: z.boolean().default(true),
    }),
    // @ts-ignore
    _isRenderAndWait: true,
    handler: async ({ ids, areHighlighted }) => {
      actions.setHighlightedEntityIds(ids, areHighlighted);
    },
    render: ({ args, status }) => {
      const action =
        args.areHighlighted === undefined
          ? undefined
          : args.areHighlighted
            ? 'highlight'
            : 'removeHighlight';

      return (
        <ToolCallCard
          component={{ name: args.ids?.toString() }}
          status={status}
          action={action}
        />
      );
    },
  });

  useFrontendTool({
    name: 'open-close-tools-sidebar',
    description:
      'Opens or closes the tools sidebar in the UI. The tools sidebar is located on the top left side of the screen.',
    parameters: z.object({
      open: z.boolean(),
    }),
    // @ts-ignore
    _isRenderAndWait: true,
    handler: async ({ open }) => {
      if (showToolsSidebar !== open) {
        setShowToolsSidebar(open);
      }
    },
    render: ({ args, status }) => (
      <ToolCallCard
        component={{ id: 'tools-sidebar', name: 'Tools Sidebar' }}
        status={status}
        action={args.open ? 'openToolsSidebar' : 'closeToolsSidebar'}
      />
    ),
  });

  useFrontendTool({
    name: 'open-close-settings-sidebar',
    description:
      'Opens or closes the settings sidebar in the UI. The settings sidebar is located on the top right side of the screen.',
    parameters: z.object({
      open: z.boolean(),
    }),
    // @ts-ignore
    _isRenderAndWait: true,
    handler: async ({ open }) => {
      if (showSettingsSidebar !== open) {
        setShowSettingsSidebar(open);
      }
    },
    render: ({ args, status }) => (
      <ToolCallCard
        component={{ id: 'settings-sidebar', name: 'Settings Sidebar' }}
        status={status}
        action={args.open ? 'openSettingsSidebar' : 'closeSettingsSidebar'}
      />
    ),
  });

  useFrontendTool({
    name: 'open-close-tools-component',
    description:
      'Opens or closes a component inside the tools sidebar. Opening the component will also open the sidebar. Allowed component ids: entity-filtering, entity-search, Trace-Replayer.',
    parameters: z.object({
      id: z.string(),
      open: z.boolean(),
    }),
    // @ts-ignore
    _isRenderAndWait: true,
    handler: async ({ id, open }) => {
      if (open) {
        setShowToolsSidebar(true);
        setOpenedToolComponent(id);
      } else if (openedToolComponent === id) {
        setOpenedToolComponent(null);
      }
    },
    render: ({ args, status }) => (
      <ToolCallCard
        component={{ name: args.id }}
        status={status}
        action={args.open ? 'openToolsComponent' : 'closeToolsComponent'}
      />
    ),
  });

  useFrontendTool({
    name: 'open-close-settings-component',
    description:
      'Opens or closes a component inside the settings sidebar. Opening the component will also open the sidebar. Allowed component ids: Collaboration, Chatbot, VSCode-Extension-Settings, Restructure-Landscape, Persist-Landscape, Settings.',
    parameters: z.object({
      id: z.string(),
      open: z.boolean(),
    }),
    // @ts-ignore
    _isRenderAndWait: true,
    handler: async ({ id, open }) => {
      if (open) {
        setShowSettingsSidebar(true);
        setOpenedSettingComponent(id);
      } else if (openedSettingComponent === id) {
        setOpenedSettingComponent(null);
      }
    },
    render: ({ args, status }) => (
      <ToolCallCard
        component={{ name: args.id }}
        status={status}
        action={args.open ? 'openSettingsComponent' : 'closeSettingsComponent'}
      />
    ),
  });

  useFrontendTool({
    name: 'filter-entities',
    description:
      'Filters entities in the visualization using the existing Entity Filtering panel. Provide one or more thresholds.',
    parameters: z.object({
      minTraceStartTimestamp: z.number().optional(),
      minTraceDuration: z.number().optional(),
      minClassMethodCount: z.number().optional(),
    }),
    // @ts-ignore
    _isRenderAndWait: true,
    handler: async ({
      minTraceStartTimestamp,
      minTraceDuration,
      minClassMethodCount,
    }) => {
      setShowToolsSidebar(true);
      setOpenedToolComponent('entity-filtering');
      setTimeout(() => {
        entityFilteringControllerRef?.current?.applyFilters({
          minTraceStartTimestamp,
          minTraceDuration,
          minClassMethodCount,
        });
      }, 200);
    },
    render: ({ status }) => (
      <ToolCallCard
        component={{ id: 'entity-filtering', name: 'Entity Filtering' }}
        status={status}
        action={'filterEntities'}
      />
    ),
  });

  useFrontendTool({
    name: 'update-visualization-settings',
    description: `Updates visualization settings by setting specific setting IDs to new values. You can also reset settings to their defaults. Available settings (id: description): ${settingsPromptDescription}`,
    parameters: z.object({
      settings: z.record(z.string(), z.unknown()).optional(),
      resetIds: z.array(z.string()).optional(),
      resetAll: z.boolean().optional(),
    }),
    // @ts-ignore
    _isRenderAndWait: true,
    handler: async ({ settings, resetIds, resetAll }) => {
      const { visualizationSettings, updateSetting, applyDefaultSettings } =
        useUserSettingsStore.getState();
      if (resetAll) {
        applyDefaultSettings();
      } else if (Array.isArray(resetIds) && resetIds.length > 0) {
        resetIds.forEach((id) => {
          const defaultSetting = (defaultVizSettings as any)[id];
          if (defaultSetting) {
            updateSetting(
              id as keyof VisualizationSettings,
              defaultSetting.value
            );
          }
        });
      }

      if (settings && typeof settings === 'object') {
        Object.entries(settings as Record<string, unknown>).forEach(
          ([id, value]) => {
            if (
              Object.prototype.hasOwnProperty.call(visualizationSettings, id)
            ) {
              updateSetting(id as keyof VisualizationSettings, value);
            }
          }
        );
      }
    },
    render: ({ status, args }) => (
      <ToolCallCard
        component={{
          name:
            args.settings && Object.keys(args.settings).length
              ? `Update Settings: ${Object.keys(args.settings).join(', ')}`
              : args.resetIds && args.resetIds.length
                ? `Reset Settings: ${args.resetIds.join(', ')}`
                : args.resetAll
                  ? 'Reset All Settings'
                  : undefined,
        }}
        status={status}
        action={'updateSettings'}
        onClick={() => {
          setShowSettingsSidebar(true);
          setOpenedSettingComponent('Settings');
        }}
      />
    ),
  });

  useFrontendTool({
    name: 'entity-search',
    description:
      'Searches for cities, districts, and buildings by fully qualified name in the search panel. Optionally selects all results.',
    parameters: z.object({
      query: z.string(),
      selectAll: z.boolean().optional(),
    }),
    // @ts-ignore
    _isRenderAndWait: true,
    handler: async ({ query, selectAll }) => {
      setShowToolsSidebar(true);
      setOpenedToolComponent('entity-search');
      setTimeout(() => {
        entitySearchControllerRef?.current?.search({
          query,
          selectAll,
        });
      }, 200);
    },
    render: ({ status, args }) => (
      <ToolCallCard
        component={{ name: args.query }}
        status={status}
        action={'searchComponents'}
      />
    ),
  });

  useFrontendTool({
    name: 'open-close-district',
    description:
      'Opens or closes a district (usually representing a folder), meaning its children are now visible (if opened) or hidden (if closed) in the 3d visualization. Closing a district also closes all its sub-districts automatically. The provided id can also be an id of a city to open or close all districts in this city.',
    parameters: z.object({
      id: z.string(),
      open: z.boolean(),
    }),
    // @ts-ignore
    _isRenderAndWait: true,
    handler: async ({ id, open }) => {
      const district = useModelStore.getState().getDistrict(id);
      if (district) {
        if (open) {
          openDistrict(id);
        } else {
          closeDistrict(id);
        }
      } else {
        const city = useModelStore.getState().getCity(id);
        if (city) {
          if (open) {
            openAllDistrictsInCity(city);
          } else {
            closeAllDistrictsInCity(city);
          }
        }
      }
    },
    render: ({ args, status }) => {
      const action =
        args.open === undefined ? undefined : args.open ? 'open' : 'close';

      return (
        <ToolCallCard
          component={{ id: args.id }}
          status={status}
          action={action}
        />
      );
    },
  });

  useFrontendTool({
    name: 'ping-entities',
    description:
      "Causes a visual ping effect on given entities (cities, districts, buildings) in the 3D visualization to draw the user's attention to it. This does not change the state of the entity, it only triggers a temporary animated visual effect.",
    parameters: z.object({
      ids: z.array(z.string()),
    }),
    // @ts-ignore
    _isRenderAndWait: true,
    handler: async ({ ids }) => {
      ids.forEach((id) => {
        pingByModelId(id);
      });
    },
    render: ({ args, status }) => (
      <ToolCallCard
        component={{ name: args.ids?.toString() }}
        status={status}
        action={'ping'}
      />
    ),
  });

  useFrontendTool({
    name: 'move-camera-to-entity',
    description:
      'Moves the camera to focus on a specific entity (city, district, building) in the 3D visualization by its id.',
    parameters: z.object({
      id: z.string(),
    }),
    // @ts-ignore
    _isRenderAndWait: true,
    handler: async ({ id }) => {
      lookAtEntity(id);
    },
    render: ({ args, status }) => (
      <ToolCallCard
        component={{ id: args.id }}
        status={status}
        action="moveCamera"
      />
    ),
  });

  useFrontendTool({
    name: 'reset-camera',
    description:
      'Resets the camera to its default position and orientation in the 3D visualization.',
    parameters: z.object({}),
    // @ts-ignore
    _isRenderAndWait: true,
    handler: async () => {
      resetCamera();
    },
    render: ({ status }) => (
      <ToolCallCard status={status} action="resetCamera" />
    ),
  });

  useFrontendTool({
    name: 'add-application',
    description:
      'Adds a new application to the current landscape. Classes should include their fully qualified name (FQN) and can optionally include methods.',
    parameters: z.object({
      name: z.string(),
      classes: z.array(
        z.object({
          fqn: z.string(),
          methods: z
            .array(
              z.object({
                name: z.string(),
                private: z.boolean(),
                parameters: z.array(
                  z.object({
                    name: z.string(),
                    type: z.string(),
                  })
                ),
                returnType: z.string(),
              })
            )
            .optional(),
        })
      ),
    }),
    // @ts-ignore
    _isRenderAndWait: true,
    handler: async ({ name, classes }) => {
      return addApplication(name, classes);
    },
    render: ({ status, args, result }) => (
      <ToolCallCard
        status={status}
        action="addApplication"
        component={{ id: result, name: args.name }}
      />
    ),
  });

  useFrontendTool({
    name: 'add-classes-to-application',
    description:
      'Adds new classes to an existing application in the current landscape. Classes should include their fully qualified name (FQN) and can optionally include methods.',
    parameters: z.object({
      applicationId: z.string(),
      classes: z.array(
        z.object({
          fqn: z.string(),
          methods: z
            .array(
              z.object({
                name: z.string(),
                private: z.boolean(),
                parameters: z.array(
                  z.object({
                    name: z.string(),
                    type: z.string(),
                  })
                ),
                returnType: z.string(),
              })
            )
            .optional(),
        })
      ),
    }),
    // @ts-ignore
    _isRenderAndWait: true,
    handler: async ({ applicationId, classes }) => {
      addClasses(applicationId, classes);
    },
    render: ({ status, args }) => (
      <ToolCallCard
        status={status}
        action="addClasses"
        messageArgs={args}
        component={{ id: args.applicationId }}
      />
    ),
  });

  useFrontendTool({
    name: 'remove-component-from-landscape',
    description:
      'Removes a component (application, package, or class) from the current landscape by its id. If you cant find the removed component, it has been removed already.',
    parameters: z.object({
      id: z.string(),
    }),
    // @ts-ignore
    _isRenderAndWait: true,
    handler: async ({ id }) => {
      removeComponent(id);
    },
    render: ({ status, args }) => (
      <ToolCallCard
        status={status}
        action="removeComponent"
        component={{ id: args.id }}
        showPopup
      />
    ),
  });

  useFrontendTool({
    name: 'undo-edit',
    description:
      'Undoes the last edit made to the landscape, reverting it to the previous state.',
    parameters: z.object({}),
    // @ts-ignore
    _isRenderAndWait: true,
    handler: async () => {
      if (canGoBack) {
        goBack();
      }
    },
    render: ({ status }) => <ToolCallCard status={status} action="undoEdit" />,
  });

  useFrontendTool({
    name: 'redo-edit',
    description:
      'Redoes the last undone edit to the landscape, reapplying the change that was previously reverted.',
    parameters: z.object({}),
    // @ts-ignore
    _isRenderAndWait: true,
    handler: async () => {
      if (canGoForward) {
        goForward();
      }
    },
    render: ({ status }) => <ToolCallCard status={status} action="redoEdit" />,
  });

  useFrontendTool({
    name: 'take-screenshot',
    description:
      'Takes a screenshot of the current browser window, scales it down to a max of 1280x720 if larger, and appends it as an user message to the chat. Use this to explain UI parts outside the 3d landscape. When an error occurs when taking the screenshot, please explain the error message to the user.',
    parameters: z.object({}),
    // @ts-ignore
    _isRenderAndWait: true,
    handler: async () => {
      const url = await htmlToImage.toBlob(document.body).then((blob) => {
        return new Promise<string>((resolve, reject) => {
          if (!blob) {
            reject(new Error('Could not convert to blob'));
            return;
          }
          const reader = new FileReader();
          reader.onloadend = () => {
            const img = new Image();
            img.onload = () => {
              const { width, height } = img;
              const scale = Math.min(
                1,
                SCREENSHOT_MAX_WIDTH / width,
                SCREENSHOT_MAX_HEIGHT / height
              );
              if (scale < 1) {
                const canvas = document.createElement('canvas');
                canvas.width = Math.round(width * scale);
                canvas.height = Math.round(height * scale);
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                  reject(new Error('Could not get canvas context'));
                  return;
                }
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/png'));
              } else {
                resolve(img.src);
              }
            };
            img.onerror = () => reject(new Error('Could not load screenshot'));
            img.src = reader.result as string;
          };
          reader.onerror = () =>
            reject(new Error('Could not read screenshot data'));
          reader.readAsDataURL(blob);
        });
      });
      const [format, bytes] = url
        .split(/data:image\/|;|base64,/)
        .filter(Boolean);
      const mimeType = format === 'jpg' ? 'image/jpeg' : `image/${format}`;
      return [
        {
          type: 'image',
          source: {
            type: 'data',
            value: bytes,
            mimeType,
          },
        },
      ];
    },
    render: ({ status, result }) => (
      <ToolCallCard
        status={status}
        action="screenshot"
        errorMessage={
          (typeof result === 'string' &&
            result.includes('Error taking screenshot: ') &&
            result.split('Error taking screenshot: ')[1]) ||
          undefined
        }
      />
    ),
    followUp: false,
  });

  useFrontendTool({
    name: 'click-on-screen',
    description:
      'Simulates a click on a specific position on the screen given by the normalized screen position. This can be used to interact with UI elements outside of the 3D visualization, such as buttons or menus in the ExplorViz frontend. Do the following steps to achieve optimal results: 1. Check if there was a screenshot taken already, if not take a screenshot with the take-screenshot tool. 2. Read the screenshot resolution (width W, height H in pixels). 3. Visually locate the target element and determine the pixel coordinates of its center (x_px, y_px). Do not guess. Do not eyeball. Aim for the center of interactive elements like texts and buttons. 4. Convert to normalized coordinates with 5 decimals: x = round(x_px / W, 5) y = round(y_px / H, 5). 5. Take these normalized coordinates as parameters for this tool call. If the target is ambiguous or partially hidden, ask for clarification before clicking. After clicking, verify the expected UI change; if not achieved, adjust by small offsets (±3–5 px) and retry once.',
    parameters: z.object({
      x: z.number(),
      y: z.number(),
    }),
    // @ts-ignore
    _isRenderAndWait: true,
    handler: async ({ x, y }) => {
      const clientX = Math.round(x * window.innerWidth);
      const clientY = Math.round(y * window.innerHeight);
      const clickEvent = new MouseEvent('click', {
        clientX,
        clientY,
        bubbles: true,
        cancelable: true,
        view: window,
      });
      document.elementFromPoint(clientX, clientY)?.dispatchEvent(clickEvent);
      pingScreenAtPoint(clientX, clientY);
    },
    render: ({ args, status }) => {
      const clientX = args.x ? Math.round(args.x * window.innerWidth) : 0;
      const clientY = args.y ? Math.round(args.y * window.innerHeight) : 0;

      return (
        <ToolCallCard
          status={status}
          action="clickOnScreen"
          component={{ name: `(${clientX}, ${clientY})` }}
          onClick={() => pingScreenAtPoint(clientX, clientY)}
        />
      );
    },
  });

  return null;
}
