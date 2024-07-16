import { action } from '@ember/object';
import Component from '@glimmer/component';
import debugLogger from 'ember-debug-logger';
import Plotly from 'plotly.js-dist';
import {
  AppNameCommitTreeMap,
  Branch,
  Commit,
} from 'explorviz-frontend/utils/evolution-schemes/evolution-data';

interface IMarkerStates {
  [commitId: string]: {
    color: string;
    size: number;
    emberModel: Commit;
  };
}

interface IArgs {
  appNameCommitTreeMap: AppNameCommitTreeMap;
  selectedApplication: string;
  clicked?(selectedCommits: Map<string, Commit[]>): void;
}

export default class PlotlyCommitTree extends Component<IArgs> {
  private MAX_SELECTION = 2;

  private readonly debug = debugLogger('PlotlyCommitTree');

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
    return 'red';
  }

  private selectedCommits: Map<string, Commit[]> | undefined;

  get applicationNameAndBranchNameToColorMap() {
    return new Map();
  }

  get selectedApplication() {
    return this.args.selectedApplication;
  }

  get appNameCommitTreeMap() {
    return this.args.appNameCommitTreeMap;
  }

  // END template-argument getters

  // #region Ember Div Events
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
  // #endregion

  // #region Plot Setup

  @action
  setupPlotlyCommitTreeChart(plotlyDiv: any) {
    this.debug('setupPlotlyCommitTreeChart');

    this.commitTreeDiv = plotlyDiv;

    // deep copy attributes (Map and Object is passed via reference, therefor changes in this component would actually be executed on the original element)

    //this.selectedCommits = structuredClone(
    //  commitTreeData.evolutionData?.selectedCommits
    //);
    this.selectedCommits = new Map();

    this.usedColors.add([255, 255, 255]); // initialize with white so it won't be used as color for branches on a white background
    if (
      this.appNameCommitTreeMap &&
      this.selectedApplication &&
      this.selectedCommits
    ) {
      this.updatePlotlyCommitTree();
      this.setupPlotlyListener(
        this.appNameCommitTreeMap,
        this.selectedApplication,
        this.selectedCommits
      );
    }
  }

  private setupPlotlyListener(
    appNameCommitTreeMap: AppNameCommitTreeMap,
    selectedApplication: string,
    selectedCommits: Map<string, Commit[]>
  ) {
    //const dragLayer: any = document.getElementsByClassName('nsewdrag')[0];
    const plotlyDiv = this.commitTreeDiv;

    if (plotlyDiv && plotlyDiv.layout) {
      const self: PlotlyCommitTree = this;

      // singe click
      plotlyDiv.on('plotly_click', async (data: any) => {
        // https://plot.ly/javascript/reference/#scatter-marker

        //console.log('click start', this.selectedCommits);

        if (data.points[0].data.mode === 'markers') {
          // no functionality for metric circles
          return;
        }

        //console.log('data.points', data.points);

        const pn = data.points[0].pointNumber;
        let colors = data.points[0].fullData.marker.color;
        let sizes = data.points[0].fullData.marker.size;
        const branchName = data.points[0].data.name;

        const commitId = getCommitId(branchName, pn);
        const selectedCommit: Commit = { commitId, branchName };
        //console.log('selectedCommit', selectedCommit);

        let selectedCommitsForApp =
          selectedCommits.get(selectedApplication) || [];
        const { highlightedMarkerColor } = self;

        //console.log('selectedCommitsForApp', selectedCommitsForApp);

        //console.log('before unselect selectedCommits', selectedCommits);

        if (
          isCommitAlreadySelected(
            selectedCommitsForApp,
            selectedCommit.commitId
          )
        ) {
          unselectCommit(selectedCommit, pn);
        } else {
          if (selectedCommitsForApp.length >= this.MAX_SELECTION) {
            unselectAllCommits();
          } else {
            selectCommit(selectedCommit, pn);
          }
        }

        //console.log('before click selectedCommits', selectedCommits);

        // Filter out empty selections and remove empty applications
        for (const [app, commits] of selectedCommits.entries()) {
          if (commits.length === 0) {
            selectedCommits.delete(app);
          }
        }

        this.args.clicked?.(selectedCommits);

        function getCommitId(branchName: string, pointNumber: number): string {
          const commitTreeForSelectedAppName =
            appNameCommitTreeMap.get(selectedApplication);

          if (commitTreeForSelectedAppName) {
            for (const branch of commitTreeForSelectedAppName.branches) {
              if (branch.name === branchName) {
                return branch.commits[pointNumber];
              }
            }
          }
          return '';
        }

        function isCommitAlreadySelected(
          commitList: Commit[],
          commitId: string
        ): boolean {
          return commitList.some((commit) => commit.commitId === commitId);
        }

        function unselectAllCommits() {
          selectedCommits.set(selectedApplication, []);

          const commitTreeForSelectedAppName =
            appNameCommitTreeMap.get(selectedApplication);

          if (commitTreeForSelectedAppName) {
            for (const branch of commitTreeForSelectedAppName.branches) {
              const curveNumber = self.branchToY.get(branch.name);
              colors = Array(branch.commits.length).fill(
                self.branchNameToLineColor.get(branch.name)
              );
              sizes = Array(branch.commits.length).fill(
                self.commitSizes.get(branch.name)
              );
              const update = { marker: { color: colors, size: sizes } };
              Plotly.restyle(plotlyDiv, update, curveNumber);
            }
          }
        }

        function selectCommit(commit: Commit, pointNumber: number) {
          colors[pointNumber] = highlightedMarkerColor;
          const update = { marker: { color: colors, size: sizes } };
          const tn = data.points[0].curveNumber;
          Plotly.restyle(plotlyDiv, update, [tn]);

          selectedCommitsForApp.push(commit);
          selectedCommits.set(selectedApplication, selectedCommitsForApp);
        }

        function unselectCommit(commit: Commit, pointNumber: number) {
          selectedCommitsForApp = selectedCommitsForApp.filter(
            (c) => c.commitId !== commit.commitId
          );

          //console.log('unselect selectedCommitsForApp', selectedCommitsForApp);

          colors[pointNumber] = data.points[0].fullData.line.color;
          if (selectedCommitsForApp.length === 0) {
            selectedCommits.delete(selectedApplication);
          } else {
            selectedCommits.set(selectedApplication, selectedCommitsForApp);
          }
          const update = { marker: { color: colors, size: sizes } };
          const tn = data.points[0].curveNumber;
          Plotly.restyle(plotlyDiv, update, [tn]);
        }
      });
    }
  }

  // #endregion

  // #region Plot Update

  @action
  updatePlotlyCommitTree() {
    if (
      this.args.appNameCommitTreeMap &&
      this.args.selectedApplication &&
      this.selectedCommits
    ) {
      this.debug('updatePlotlyCommitTree');
      this.computeSizes(
        this.args.appNameCommitTreeMap,
        this.args.selectedApplication
      );
      this.createPlotlyCommitTreeChart(
        this.args.appNameCommitTreeMap,
        this.args.selectedApplication,
        this.selectedCommits
      );
    }
  }

  // #endregion

  // #region Helper functions

  private getPlotlyDataObject(
    commits: number[],
    colors: string[],
    sizes: number[],
    branch: number,
    branchName: string,
    appNameCommitTreeMap: AppNameCommitTreeMap,
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
      text: this.hoverText(appNameCommitTreeMap, selectedApplication, branch),
      x: commits,
      y: Array.from(Array(commits.length)).map(() => branch),
    };
  }

  private createPlotlyCommitTreeChart(
    appNameCommitTreeMap: AppNameCommitTreeMap,
    selectedApplication: string,
    selectedCommits: Map<string, Commit[]>
  ) {
    const commitTree = appNameCommitTreeMap.get(selectedApplication);

    if (
      commitTree &&
      commitTree.branches.find((branch) => branch.commits.length > 0)
    ) {
      //if (!selectedCommits.get(selectedApplication)) {
      //  selectedCommits.set(selectedApplication, []);
      //}

      // create branches
      const plotlyBranches: any[] = [];
      let branchCounter = 0;

      for (const branch of commitTree.branches) {
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
          appNameCommitTreeMap,
          selectedApplication,
          color
        );
        plotlyBranches.push(plotlyBranch);
        this.branchToY.set(branch.name, branchCounter);
        this.branchToColor.set(branch.name, color);

        branchCounter++;
      }

      // add branch-to-branch connections
      for (const branch of commitTree.branches) {
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

      const layout = this.getPlotlyLayoutObject(-5, 20, -5, 5);
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
        this.getPlotlyOptionsObject()
      );
    } else {
      // TODO: error text no commits
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
    currentSelectedCommits: Commit[],
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

  // TODO: remove this?
  private computeSizes(
    appNameCommitTreeMap: AppNameCommitTreeMap,
    selectedApplication: string
  ) {
    const commitTreeForSelectedAppName =
      appNameCommitTreeMap.get(selectedApplication);

    if (commitTreeForSelectedAppName) {
      for (const branch of commitTreeForSelectedAppName.branches) {
        this.commitSizes.set(branch.name, 10);
      }
    }
  }

  private calculateOffset(selectedApplication: string, branch: Branch) {
    // TODO: commit can have more than one predecessor (if merged). So we need to calculate and add the maximum of both recursive calls to our counter

    const commitTreeForSelectedAppName =
      this.appNameCommitTreeMap.get(selectedApplication);

    let counter = 0;

    if (commitTreeForSelectedAppName) {
      const fromCommit = branch.branchPoint.commit;
      const fromBranch = branch.branchPoint.name;

      if (fromBranch !== 'NONE') {
        for (const b of commitTreeForSelectedAppName.branches) {
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
    }
    return counter;
  }

  private randomRGBA() {
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

  private hoverText(
    appNameCommitTreeMap: AppNameCommitTreeMap,
    selectedApplication: string,
    branch: number
  ) {
    const commitTreeForApp = appNameCommitTreeMap.get(selectedApplication);

    if (commitTreeForApp) {
      let branchCounter = 0;
      for (const b of commitTreeForApp.branches) {
        if (branch === branchCounter) {
          return b.commits.map((commit) => 'Commit ID: ' + commit);
          break;
        }
        branchCounter++;
      }
    }
    return 'no commit id found';
  }

  private getPlotlyLayoutObject(
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

  private getPlotlyOptionsObject() {
    return {
      displayModeBar: false,
      doubleClick: false,
      responsive: true,
      scrollZoom: true,
    };
  }
}
