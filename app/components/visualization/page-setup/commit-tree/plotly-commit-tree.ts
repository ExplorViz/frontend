import { action } from '@ember/object';
import Component from '@glimmer/component';
import debugLogger from 'ember-debug-logger';
import { SelectedCommit } from 'explorviz-frontend/controllers/visualization';
import LandscapeTokenService from 'explorviz-frontend/services/landscape-token';
import {
  Branch,
  EvolutionLandscapeData,
} from 'explorviz-frontend/utils/landscape-schemes/evolution-data';
import Plotly from 'plotly.js-dist';
import { inject as service } from '@ember/service';
import Auth from 'explorviz-frontend/services/auth';
import ConfigurationRepository from 'explorviz-frontend/services/repos/configuration-repository';
import { StructureLandscapeData } from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import CommitComparisonRepository from 'explorviz-frontend/services/repos/commit-comparison-repository';
import CodeServiceRequestService from 'explorviz-frontend/services/code-service-fetching';
import CommitReportRepository from 'explorviz-frontend/services/repos/commit-report-repository';

interface IMarkerStates {
  [commitId: string]: {
    color: string;
    size: number;
    emberModel: SelectedCommit;
  };
}

const MAX_ACTIVE_ITEMS = 5; // the maximum of active configuration items to be shown

interface IArgs {
  evolutionData?: EvolutionLandscapeData;
  selectedApplication?: string;
  selectedCommits?: Map<string, SelectedCommit[]>;
  highlightedMarkerColor?: string;
  setChildReference?(timeline: PlotlyCommitTree): void;
  clicked?(
    selectedCommits: Map<string, SelectedCommit[]>,
    structureData?: StructureLandscapeData,
    timelineOfSelectedCommit?: number
  ): void;
  toggleConfigurationOverview(): void;
  applicationNameAndBranchNameToColorMap?: Map<string, string>;
}

export default class PlotlyCommitTree extends Component<IArgs> {
  private MAX_SELECTION = 2;

  @service('landscape-token')
  tokenService!: LandscapeTokenService;

  @service('auth') auth!: Auth;

  @service('repos/configuration-repository')
  configRepo!: ConfigurationRepository;

  @service('repos/commit-comparison-repository')
  commitComparisonRepo!: CommitComparisonRepository;

  @service('repos/commit-report-repository')
  commitReportRepo!: CommitReportRepository;

  @service('code-service-fetching')
  codeServiceFetchingService!: CodeServiceRequestService;

  readonly debug = debugLogger();

  oldPlotlySlidingWindow = { min: 0, max: 0 };

  userSlidingWindow = null;

  markerState: IMarkerStates = {};

  commitTreeDiv: any;

  commitSizes: Map<string, number> = new Map();
  usedColors: Set<number[]> = new Set();
  branchNameToLineColor: Map<string, string> = new Map();
  branchToY: Map<string, number> = new Map();
  branchToColor: Map<string, string> = new Map();

  // BEGIN template-argument getters

  get highlightedMarkerColor() {
    return this.args.highlightedMarkerColor || 'red';
  }

  get evolutionData() {
    return this.args.evolutionData;
  }

  get selectedApplication() {
    return this.args.selectedApplication;
  }

  get selectedCommits() {
    return this.args.selectedCommits;
  }

  get applicationNameAndBranchNameToColorMap() {
    return this.args.applicationNameAndBranchNameToColorMap || new Map();
  }

  // END template-argument getters

  // BEGIN Ember Div Events
  @action
  handleMouseEnter(plotlyDiv: any) {
    // if user hovers over plotly, save his
    // sliding window, so that updating the
    // plot won't modify his current viewport
    if (plotlyDiv && plotlyDiv.layout) {
      this.userSlidingWindow = plotlyDiv.layout;
    }
  }

  @action
  handleMouseLeave() {
    this.userSlidingWindow = null;
  }
  // END Ember Div Events

  @action
  didRender(plotlyDiv: any) {
    // register this component at its parent if set via template
    const parentFunction = this.args.setChildReference;
    if (parentFunction) {
      parentFunction(this);
    }

    this.commitTreeDiv = plotlyDiv;
    const evolutionData = this.evolutionData;
    const application = this.selectedApplication;
    const selectedCommits = this.selectedCommits;
    this.usedColors.add([255, 255, 255]); // initialize with white so it won't be used as color for branches on a white background
    if (evolutionData && application && selectedCommits) {
      //console.log("DID RENDER!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! ");
      //console.log("CURRENT SELECTED COMMITS: ", selectedCommits);
      this.computeSizes(evolutionData, application);
      this.createPlotlyCommitTreeChart(
        evolutionData,
        application,
        selectedCommits
      );
      this.setupPlotlyListener(evolutionData, application, selectedCommits);
      // TODO: select latest commit on main branch
    }
  }

  private createColor(branchName: string) {
    let color: string | undefined =
      this.applicationNameAndBranchNameToColorMap.get(
        this.selectedApplication + branchName
      );
    if (!color) {
      color = this.randomRGBA();
      this.applicationNameAndBranchNameToColorMap.set(
        this.selectedApplication + branchName,
        color
      );
    }
    return color;
  }

  private markCommit(
    currentSelectedCommits: SelectedCommit[],
    branch: Branch,
    colors: string[]
  ) {
    for (const selectedCommit of currentSelectedCommits) {
      const index = branch.commits.findIndex(
        (commitId) => commitId === selectedCommit.commitId
      );
      if (index !== -1) {
        colors[index] = this.highlightedMarkerColor;
      }
    }
  }

  createPlotlyCommitTreeChart(
    evolutionData: EvolutionLandscapeData,
    selectedApplication: string,
    selectedCommits: Map<string, SelectedCommit[]>
  ) {
    const application = evolutionData.applications.find(
      (application) => application.name === selectedApplication
    );
    if (
      application &&
      application.branches.find((branch) => branch.commits.length > 0)
    ) {
      if (!selectedCommits.get(selectedApplication)) {
        selectedCommits.set(selectedApplication, []);
      }

      // create branches
      const plotlyBranches: any[] = [];
      let branchCounter = 0;

      for (const branch of application.branches) {
        const numOfCommits = branch.commits.length;
        const offset = this.calculateOffset(selectedApplication, branch);
        const commits = Array.from(
          { length: numOfCommits },
          (_, i) => i + offset
        );
        const color = this.createColor(branch.name);
        const colors = Array.from(Array(numOfCommits)).map(() => color);

        //const selectedCommits = this.selectedCommits?.get(selectedApplication)?.values();
        const currentSelectedCommits = selectedCommits.get(selectedApplication);
        if (currentSelectedCommits) {
          this.markCommit(currentSelectedCommits, branch, colors);
        }

        const sizes = Array.from(Array(numOfCommits)).map(() => 10);
        const plotlyBranch = this.getPlotlyDataObject(
          commits,
          colors,
          sizes,
          branchCounter,
          branch.name,
          evolutionData,
          selectedApplication,
          color
        );
        plotlyBranches.push(plotlyBranch);
        this.branchToY.set(branch.name, branchCounter);
        this.branchToColor.set(branch.name, color);

        branchCounter++;
      }

      // add branch-to-branch connections
      for (const branch of application.branches) {
        const branchY = this.branchToY.get(branch.name);
        const branchX = this.calculateOffset(selectedApplication, branch);

        const fromBranchY = this.branchToY.get(branch.branchPoint.name);
        const fromBranchX = branchX - 1;

        if (fromBranchY !== undefined && branchY) {
          // fromBranchY can be 0 so we explicitly ask for undefined

          const color = this.branchToColor.get(branch.name)!;
          plotlyBranches.push({
            line: { color: color, width: 2 },
            mode: 'lines',
            type: 'scatter',
            name: branch.name,
            x: [fromBranchX, branchX],
            y: [fromBranchY, branchY],
          });
        }
      }

      const layout = PlotlyCommitTree.getPlotlyLayoutObject(-5, 20, -5, 5);
      this.branchToY.forEach((val, key) => {
        layout.annotations.push({
          xref: 'paper',
          x: 0,
          y: val,
          xanchor: 'left',
          yanchor: 'middle',
          text: key,
          showarrow: false,
          font: {
            family: 'Arial',
            size: 13,
            color: 'black',
          },
        });
      });

      Plotly.newPlot(
        this.commitTreeDiv,
        plotlyBranches,
        layout,
        PlotlyCommitTree.getPlotlyOptionsObject()
      );
    } else {
      // TODO: error text no commits
      console.log('No commits available yet');
    }
  }

  // TODO: remove this?
  computeSizes(
    evolutionData: EvolutionLandscapeData,
    selectedApplication: string
  ) {
    for (const application of evolutionData.applications) {
      if (application.name === selectedApplication) {
        for (const branch of application.branches) {
          this.commitSizes.set(branch.name, 10);
        }
        break;
      }
    }
  }

  calculateOffset(selectedApplication: string, branch: Branch) {
    // TODO: commit can have more than one predecessor (if merged). So we need to calculate and add the maximum of both recursive calls to our counter

    const evolutionData = this.evolutionData!; // evolutionData not undefined, otherwise calculateOffset wouldn't be called
    let counter = 0;
    for (const application of evolutionData.applications) {
      if (application.name === selectedApplication) {
        const fromCommit = branch.branchPoint.commit;
        const fromBranch = branch.branchPoint.name;

        if (fromBranch !== 'NONE') {
          for (const b of application.branches) {
            if (b.name === fromBranch) {
              for (const commit of b.commits) {
                counter++;
                if (commit === fromCommit) {
                  counter += this.calculateOffset(selectedApplication, b);
                  break;
                }
              }
              break;
            }
          }
        }
        break;
      }
    }
    return counter;
  }

  randomRGBA() {
    const o = Math.round,
      r = Math.random,
      s = 255;

    let red = o(r() * s);
    let green = o(r() * s);
    let blue = o(r() * s);

    let permission = false;
    while (!permission) {
      permission = true;
      for (const color of this.usedColors) {
        // only use darker colors (prevent white on white background)
        const diff =
          Math.abs(color[0] - red) +
          Math.abs(color[1] - green) +
          Math.abs(color[2] - blue);
        if (diff < 20) {
          // prevent to use colors that look very similiar
          red = o(r() * s);
          green = o(r() * s);
          blue = o(r() * s);
          permission = false;
          break;
        }
      }
    }
    const rgb = [red, green, blue];
    this.usedColors.add(rgb);
    return 'rgba(' + red + ',' + green + ',' + blue + ',' + '1)';
  }

  async updatePlotlineForMetric() {
    if (!this.evolutionData) {
      return;
    }

    if (!this.selectedApplication) {
      return;
    }

    await this.requestData(this.evolutionData, this.selectedApplication);
    this.commitReportRepo.triggerCommitReportUpdate();
  }

  plotFileMetrics() {
    const activeIdList = this.configRepo.getActiveConfigurations(
      this.tokenService.token!.value
    );
    const configItemList = this.configRepo.getConfiguration(
      this.tokenService.token!.value
    );

    const numOfCircles = activeIdList.length;

    let newData = [];
    const nonMetricData = this.commitTreeDiv.data.filter(
      (data: any) => data.mode === 'lines+markers' || data.mode === 'lines'
    ); // consider non-metric data so it won't get deleted when updating the plot

    newData = [...nonMetricData];

    for (let i = 0; i < numOfCircles; i++) {
      // for each metric we place a circle which size indicates its measurement
      for (const configItem of configItemList) {
        if (activeIdList[i] === configItem.id) {
          const circle = this.plotMetric(
            configItem.color,
            configItem.key,
            configItem.id,
            i
          );
          newData.push(circle);
        }
      }
    }

    Plotly.newPlot(
      this.commitTreeDiv,
      newData,
      this.commitTreeDiv.layout,
      PlotlyCommitTree.getPlotlyOptionsObject()
    );

    this.setupPlotlyListener(
      this.evolutionData!,
      this.selectedApplication!,
      this.selectedCommits!
    );
  }

  async requestData(
    evolutionData: EvolutionLandscapeData,
    selectedApplication: string
  ) {
    for (const application of evolutionData.applications) {
      if (application.name === selectedApplication) {
        for (const branch of application.branches) {
          for (const commitId of branch.commits) {
            await this.codeServiceFetchingService.fetchCommitReport(
              commitId,
              selectedApplication
            );
          }
        }
        break;
      }
    }
  }

  private plotNumberOfChangedFiles(
    color: string,
    metricId: string,
    order: number
  ) {
    let maxOfChangedFiles = 0;
    const branchNameToNumOfChangedFilesList = new Map<string, number[]>();

    for (const application of this.evolutionData!.applications) {
      if (application.name === this.selectedApplication) {
        for (const branch of application.branches) {
          const numOfChangedFilesList = [];
          for (const commit of branch.commits) {
            const id = this.selectedApplication + commit;
            const commitData = this.commitReportRepo.getById(id)!;
            let changedFiles = 0;

            if (commitData?.deleted) changedFiles += commitData.deleted.length;

            if (commitData?.modified)
              changedFiles += commitData.modified.length;

            if (commitData?.added) changedFiles += commitData.added.length;

            numOfChangedFilesList.push(changedFiles);
            if (changedFiles > maxOfChangedFiles)
              maxOfChangedFiles = changedFiles;
          }
          branchNameToNumOfChangedFilesList.set(
            branch.name,
            numOfChangedFilesList
          );
        }
        break;
      }
    }

    const oldData = this.commitTreeDiv.data;
    let xValues: number[] = [];
    let yValues: number[] = [];
    const sizes: number[][] = [];
    let displayedInformation: number[] = [];

    let counter = 0;

    for (const data of oldData) {
      if (data.mode === 'lines+markers') {
        // branch lines
        counter += data.x.length;

        const information = branchNameToNumOfChangedFilesList.get(data.name);
        if (information)
          displayedInformation = [...displayedInformation, ...information];
        //else
        // throw error since every commit should have this information

        const sizeList = branchNameToNumOfChangedFilesList
          .get(data.name)
          ?.map((num) => 5 + (num / maxOfChangedFiles) * 5);

        if (sizeList) sizes.push(sizeList);
        //else
        // throw error since every commit should have this metric

        const newXCoordinates = data.x.map(
          (xval: number) => xval - 0.3 + (order % MAX_ACTIVE_ITEMS) * 0.1
        );
        const newYCoordinates = data.y.map(
          (yval: number) => yval + 0.0 + (order % MAX_ACTIVE_ITEMS) * 0.1
        );

        xValues = [...xValues, ...newXCoordinates];
        yValues = [...yValues, ...newYCoordinates];
      }
    }

    const colors = Array(counter).fill(color);
    const sizesFinal = sizes.flat();
    const circle = {
      marker: { color: colors, size: sizesFinal },
      mode: 'markers',
      type: 'scatter',
      customData: [metricId],
      name: 'number of changed files',
      text: displayedInformation.map(
        (val: number) => `number of changed files: ${val}`
      ),
      x: xValues,
      y: yValues,
    };
    return circle;
  }

  private plotNumberOfMethods(color: string, metricId: string, order: number) {
    let maxNumOfMethods = 0;
    const branchNameToNumOfMethodsList = new Map<string, number[]>();

    for (const application of this.evolutionData!.applications) {
      if (application.name === this.selectedApplication) {
        for (const branch of application.branches) {
          const numOfMethodsList = [];
          for (const commit of branch.commits) {
            const id = this.selectedApplication + commit;
            const commitData = this.commitReportRepo.getById(id);
            const fileMetrics = commitData?.fileMetric;
            if (fileMetrics) {
              let numOfMethods = 0;
              for (const fileMetric of fileMetrics) {
                if (fileMetric.numberOfMethods)
                  numOfMethods += fileMetric.numberOfMethods;
              }

              numOfMethodsList.push(numOfMethods);
              if (numOfMethods > maxNumOfMethods)
                maxNumOfMethods = numOfMethods;
            }
          }
          branchNameToNumOfMethodsList.set(branch.name, numOfMethodsList);
        }
        break;
      }
    }

    const oldData = this.commitTreeDiv.data;
    let xValues: number[] = [];
    let yValues: number[] = [];
    const sizes: number[][] = [];
    let displayedInformation: number[] = [];

    let counter = 0;

    for (const data of oldData) {
      if (data.mode === 'lines+markers') {
        // branch lines
        counter += data.x.length;

        const information = branchNameToNumOfMethodsList.get(data.name);
        if (information)
          displayedInformation = [...displayedInformation, ...information];
        //else
        // throw error since every commit should have this information

        const sizeList = branchNameToNumOfMethodsList
          .get(data.name)
          ?.map((num) => 5 + (num / maxNumOfMethods) * 5);

        if (sizeList) sizes.push(sizeList);
        //else
        // throw error since every commit should have this metric

        const newXCoordinates = data.x.map(
          (xval: number) => xval - 0.3 + (order % MAX_ACTIVE_ITEMS) * 0.1
        );
        const newYCoordinates = data.y.map(
          (yval: number) => yval + 0.0 + (order % MAX_ACTIVE_ITEMS) * 0.1
        );

        xValues = [...xValues, ...newXCoordinates];
        yValues = [...yValues, ...newYCoordinates];
      }
    }

    const colors = Array(counter).fill(color);
    const sizesFinal = sizes.flat();
    const circle = {
      marker: { color: colors, size: sizesFinal },
      mode: 'markers',
      type: 'scatter',
      customData: [metricId],
      name: 'number of methods',
      text: displayedInformation.map(
        (val: number) => `number of methods: ${val}`
      ),
      x: xValues,
      y: yValues,
    };
    return circle;
  }

  private plotCyclomaticComplexity(
    color: string,
    metricId: string,
    order: number
  ) {
    let maxAvgCyclomaticComplexity = 0;
    const branchNameToNumOfMethodsList = new Map<string, number[]>();

    for (const application of this.evolutionData!.applications) {
      if (application.name === this.selectedApplication) {
        for (const branch of application.branches) {
          const avgCyclomaticComplexityList = [];
          for (const commit of branch.commits) {
            const id = this.selectedApplication + commit;
            console.log(commit);
            const commitData = this.commitReportRepo.getById(id);
            const fileMetrics = commitData?.fileMetric;
            if (fileMetrics) {
              let cyclomaticComplexity = 0;
              for (const fileMetric of fileMetrics) {
                if (fileMetric.cyclomaticComplexity)
                  cyclomaticComplexity += fileMetric.cyclomaticComplexity;
              }

              if (fileMetrics.length > 0) {
                cyclomaticComplexity = Math.floor(
                  cyclomaticComplexity / fileMetrics.length
                );
              }
              avgCyclomaticComplexityList.push(cyclomaticComplexity);
              if (cyclomaticComplexity > maxAvgCyclomaticComplexity)
                maxAvgCyclomaticComplexity = cyclomaticComplexity;
            }
          }
          branchNameToNumOfMethodsList.set(
            branch.name,
            avgCyclomaticComplexityList
          );
        }
        break;
      }
    }

    const oldData = this.commitTreeDiv.data;
    let xValues: number[] = [];
    let yValues: number[] = [];
    const sizes: number[][] = [];
    let displayedInformation: number[] = [];

    let counter = 0;

    for (const data of oldData) {
      if (data.mode === 'lines+markers') {
        // branch lines
        counter += data.x.length;

        const information = branchNameToNumOfMethodsList.get(data.name);
        if (information)
          displayedInformation = [...displayedInformation, ...information];
        //else
        // throw error since every commit should have this information

        const sizeList = branchNameToNumOfMethodsList
          .get(data.name)
          ?.map((num) => 5 + (num / maxAvgCyclomaticComplexity) * 5);

        if (sizeList) sizes.push(sizeList);
        //else
        // throw error since every commit should have this metric

        const newXCoordinates = data.x.map(
          (xval: number) => xval - 0.3 + (order % MAX_ACTIVE_ITEMS) * 0.1
        );
        const newYCoordinates = data.y.map(
          (yval: number) => yval + 0.0 + (order % MAX_ACTIVE_ITEMS) * 0.1
        );

        xValues = [...xValues, ...newXCoordinates];
        yValues = [...yValues, ...newYCoordinates];
      }
    }

    const colors = Array(counter).fill(color);
    const sizesFinal = sizes.flat();
    const circle = {
      marker: { color: colors, size: sizesFinal },
      mode: 'markers',
      type: 'scatter',
      customData: [metricId],
      name: 'average cyclomatic complexity',
      text: displayedInformation.map(
        (val: number) => `average cyclomatic complexity: ${val}`
      ),
      x: xValues,
      y: yValues,
    };
    return circle;
  }

  plotMetric(color: string, metric: string, metricId: string, order: number) {
    if (metric === 'number of changed files') {
      return this.plotNumberOfChangedFiles(color, metricId, order);
    } else if (metric === 'total number of methods') {
      return this.plotNumberOfMethods(color, metricId, order);
    } else if (metric === 'average cyclomatic complexity') {
      return this.plotCyclomaticComplexity(color, metricId, order);
    } else {
      return {};
    }
  }

  getPlotlyDataObject(
    commits: number[],
    colors: string[],
    sizes: number[],
    branch: number,
    branchName: string,
    evolutionData: EvolutionLandscapeData,
    selectedApplication: string,
    lineColor: string
  ) {
    this.branchNameToLineColor.set(branchName, lineColor);
    return {
      name: branchName,
      marker: { color: colors, size: sizes },
      line: { color: lineColor, width: 2 },
      mode: 'lines+markers',
      type: 'scatter',
      hoverinfo: 'text',
      hoverlabel: {
        align: 'left',
      },
      text: PlotlyCommitTree.hoverText(
        evolutionData,
        selectedApplication,
        branch
      ),
      x: commits,
      y: Array.from(Array(commits.length)).map(() => branch),
    };
  }

  static hoverText(
    evolutionData: EvolutionLandscapeData,
    selectedApplication: string,
    branch: number
  ) {
    for (const application of evolutionData.applications) {
      if (application.name === selectedApplication) {
        let branchCounter = 0;
        for (const b of application.branches) {
          if (branch === branchCounter) {
            return b.commits.map((commit) => 'Commit ID: ' + commit);
            break;
          }
          branchCounter++;
        }
        break;
      }
    }
    return 'no commit id found';
  }

  static getPlotlyLayoutObject(
    minRangeX: number,
    maxRangeX: number,
    minRangeY: number,
    maxRangeY: number
  ): {
    dragmode: string;
    margin: {
      b: number;
      pad: number;
      t: number;
      r: number;
    };
    xaxis: {
      showline: boolean;
      showgrid: boolean;
      showticklabels: boolean;
      range: number[];
    };
    yaxis: {
      showgrid: boolean;
      zeroline: boolean;
      showline: boolean;
      showticklabels: boolean;
      range: number[];
      title: {
        font: {
          color: string;
          size: number;
        };
        text: string;
      };
    };
    annotations: any[];
  } {
    return {
      dragmode: 'pan',
      //   hoverdistance: 10,
      //   hovermode: 'closest',
      margin: {
        b: 120,
        pad: 5,
        t: 20,
        r: 40,
      },
      xaxis: {
        range: [minRangeX, maxRangeX],
        showline: false,
        showgrid: false,
        showticklabels: false,
      },

      yaxis: {
        range: [minRangeY, maxRangeY],
        showgrid: false,
        zeroline: false,
        showline: false,
        showticklabels: false,
        title: {
          font: {
            color: '#7f7f7f',
            size: 16,
          },
          text: 'Branches',
        },
      },
      annotations: [],

      //,
      //   xaxis: {
      //     title: {
      //       font: {
      //         color: '#7f7f7f',
      //         size: 16,
      //       },
      //       text: 'Commit',
      //     },
      //   },
      //   yaxis: {
      //     fixedrange: true,
      //     title: {
      //       font: {
      //         color: '#7f7f7f',
      //         size: 16,
      //       },
      //       text: 'Branch',
      //     },
      //   },
    };
  }

  static getPlotlyOptionsObject() {
    return {
      displayModeBar: false,
      doubleClick: false,
      responsive: true,
      scrollZoom: true,
    };
  }

  @action
  toggleConfigOverview() {
    this.args.toggleConfigurationOverview();
  }

  setupPlotlyListener(
    evolutionData: EvolutionLandscapeData,
    selectedApplication: string,
    selectedCommits: Map<string, SelectedCommit[]>
  ) {
    //const dragLayer: any = document.getElementsByClassName('nsewdrag')[0];
    const plotlyDiv = this.commitTreeDiv;

    if (plotlyDiv && plotlyDiv.layout) {
      const self: PlotlyCommitTree = this;

      // singe click
      plotlyDiv.on('plotly_click', async (data: any) => {
        // https://plot.ly/javascript/reference/#scatter-marker

        if (data.points[0].data.mode === 'markers') {
          // no functionality for metric circles
          return;
        }

        const pn = data.points[0].pointNumber;
        //const numberOfPoints = data.points[0].fullData.x.length;

        let colors = data.points[0].fullData.marker.color;
        let sizes = data.points[0].fullData.marker.size;

        const branchName = data.points[0].data.name;

        // add selected commit ------------------------------------------------------

        let commitId = '';
        for (const application of evolutionData.applications) {
          if (application.name === selectedApplication) {
            for (const branch of application.branches) {
              if (branch.name === branchName) {
                commitId = branch.commits[pn];
                break;
              }
            }
            break;
          }
        }

        const selectedCommit: SelectedCommit = {
          commitId: commitId,
          branchName: branchName,
        };

        let selectedCommitList = selectedCommits.get(selectedApplication)!;
        const { highlightedMarkerColor } = self;

        if (selectedCommitList.length > 0) {
          // is already selected?
          let isSelected = false;
          for (const selCom of selectedCommitList) {
            if (selCom.commitId === selectedCommit.commitId) {
              isSelected = true;
              break;
            }
          }

          if (!isSelected) {
            if (selectedCommitList.length >= this.MAX_SELECTION) {
              // unselect all
              selectedCommits.set(selectedApplication, []);
              for (const application of evolutionData.applications) {
                if (application.name === selectedApplication) {
                  for (const branch of application.branches) {
                    const curveNumber = this.branchToY.get(branch.name);
                    colors = Array(branch.commits.length).fill(
                      this.branchNameToLineColor.get(branch.name)
                    );
                    sizes = Array(branch.commits.length).fill(
                      this.commitSizes.get(branch.name)
                    );
                    const update = { marker: { color: colors, size: sizes } };
                    Plotly.restyle(plotlyDiv, update, curveNumber);
                  }
                  break;
                }
              }
              this.args.clicked?.(this.selectedCommits!);
            } else {
              // select 2nd commit
              colors[pn] = highlightedMarkerColor;
              const update = { marker: { color: colors, size: sizes } };
              const tn = data.points[0].curveNumber;
              Plotly.restyle(plotlyDiv, update, [tn]);

              selectedCommitList.push(selectedCommit);
              selectedCommits.set(selectedApplication, selectedCommitList);

              const callback = (landscapeStructure: StructureLandscapeData) => {
                this.args.clicked?.(this.selectedCommits!, landscapeStructure);
              };
              this.codeServiceFetchingService.initStaticLandscapeStructureAndMetricsFetchingWithCallback(
                callback,
                this.selectedApplication!,
                [selectedCommitList[0], selectedCommitList[1]]
              );
            }
          } else {
            // unselect one commit
            const timelineOfSelectedCommit = selectedCommitList.findIndex(
              (commit) => commit.commitId === selectedCommit.commitId
            );
            selectedCommitList = selectedCommitList.filter((commit) => {
              return commit.commitId !== selectedCommit.commitId;
            });
            colors[pn] = data.points[0].fullData.line.color;
            selectedCommits.set(selectedApplication, selectedCommitList);
            const update = { marker: { color: colors, size: sizes } };
            const tn = data.points[0].curveNumber;
            Plotly.restyle(plotlyDiv, update, [tn]);
            if (selectedCommitList.length == 1) {
              const callback = (landscapeStructure: StructureLandscapeData) => {
                this.args.clicked?.(
                  this.selectedCommits!,
                  landscapeStructure,
                  timelineOfSelectedCommit
                );
              };
              this.codeServiceFetchingService.initStaticLandscapeStructureAndMetricsFetchingWithCallback(
                callback,
                this.selectedApplication!,
                selectedCommitList
              );
            } else {
              // no structure since we unselected the only selected commit
              this.args.clicked?.(this.selectedCommits!);
            }
          }
        } else {
          // first commit has been selected
          colors[pn] = highlightedMarkerColor;
          selectedCommits.set(selectedApplication, [selectedCommit]);
          const update = { marker: { color: colors, size: sizes } };
          const tn = data.points[0].curveNumber;
          Plotly.restyle(plotlyDiv, update, [tn]);

          const callback = (landscapeStructure: StructureLandscapeData) => {
            this.args.clicked?.(this.selectedCommits!, landscapeStructure);
          };
          this.codeServiceFetchingService.initStaticLandscapeStructureAndMetricsFetchingWithCallback(
            callback,
            this.selectedApplication!,
            [selectedCommit]
          );
        }

        // end of add selected commit ---------------------------------------------

        //     // Check if component should pass the selected timestamps
        //     // to its parent
        //     if (self.selectionCount > 1) {
        //       if (self.selectedTimestamps.length === self.selectionCount) {
        //         // closure action
        //         if (self.args.clicked) self.args.clicked(self.selectedTimestamps);
        //       }
        //     } else if (self.args.clicked) {
        //       // closure action
        //       self.args.clicked(self.selectedTimestamps);
        //     }
      });

      //   // double click
      //   plotlyDiv.on('plotly_doubleclick', () => {
      //     const { min, max } = self.oldPlotlySlidingWindow;
      //     const update = PlotlyTimeline.getPlotlySlidingWindowUpdateObject(
      //       min,
      //       max
      //     );
      //     Plotly.relayout(plotlyDiv, update);
      //   });

      //   // Show cursor when hovering data point
      //   if (dragLayer) {
      //     plotlyDiv.on('plotly_hover', () => {
      //       dragLayer.style.cursor = 'pointer';
      //     });

      //     plotlyDiv.on('plotly_unhover', () => {
      //       dragLayer.style.cursor = '';
      //     });

      //     plotlyDiv.on('plotly_relayouting', () => {
      //       // if user drags the plot, save his
      //       // sliding window, so that updating the
      //       // plot won't modify his current viewport
      //       if (plotlyDiv && plotlyDiv.layout) {
      //         self.userSlidingWindow = plotlyDiv.layout;
      //       }
      //     });
      //}
    }
  }
}
