import { action } from '@ember/object';
import Component from '@glimmer/component';
import debugLogger from 'ember-debug-logger';
import { tracked } from '@glimmer/tracking';
import { LandscapeData, SelectedCommit } from 'explorviz-frontend/controllers/visualization';
import LandscapeTokenService from 'explorviz-frontend/services/landscape-token';
import { Branch, EvolutionLandscapeData } from 'explorviz-frontend/utils/landscape-schemes/evolution-data';
import Plotly from 'plotly.js-dist';
import { inject as service } from '@ember/service';
import ENV from 'explorviz-frontend/config/environment';
import Auth from 'explorviz-frontend/services/auth';
import ConfigurationRepository from 'explorviz-frontend/services/repos/configuration-repository';
import { StructureLandscapeData, isLandscape, preProcessAndEnhanceStructureLandscape } from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import CommitComparisonRepository, { CommitComparison } from 'explorviz-frontend/services/repos/commit-comparison-repository';
import { getClassById } from 'explorviz-frontend/utils/class-helpers';
import { getApplicationFromPackage, getApplicationInLandscapeById } from 'explorviz-frontend/utils/landscape-structure-helpers';
import { getPackageById } from 'explorviz-frontend/utils/package-helpers';
import CodeServiceFetchingService from 'explorviz-frontend/services/code-service-fetching';

interface IMarkerStates {
  [commitId: string]: {
    color: string;
    size: number;
    emberModel: SelectedCommit;
  };
}


interface IArgs {
  evolutionData?: EvolutionLandscapeData;
  selectedApplication?: string;
  selectedCommits?: Map<string, SelectedCommit[]>;
  highlightedMarkerColor?: string;
  setChildReference?(timeline: PlotlyCommitline): void;
  clicked?(selectedCommits: Map<string,SelectedCommit[]>, timelineOfSelectedCommit: number, structureData?: StructureLandscapeData): void;
  toggleConfigurationOverview(): void;
}


export default class PlotlyCommitline extends Component<IArgs> {

  private MAX_SELECTION = 2;

  @service('landscape-token')
  tokenService!: LandscapeTokenService;

  @service('auth') auth!: Auth;

  @service('repos/configuration-repository')
  configRepo!: ConfigurationRepository;

  @service('repos/commit-comparison-repository')
  commitComparisonRepo!: CommitComparisonRepository;

  @service('code-service-fetching')
  codeServiceFetchingService!: CodeServiceFetchingService;

  readonly debug = debugLogger();

  oldPlotlySlidingWindow = { min: 0, max: 0 };

  userSlidingWindow = null;

  markerState: IMarkerStates = {};

  commitlineDiv: any;

  commitSizes: Map<string, number> = new Map();
  usedColors: Set<number[]> = new Set();
  applicationNameAndBranchNameToColorMap : Map<string, string> = new Map();
  branchNameToLineColor: Map<string, string> = new Map();
  branchToY: Map<string,number> = new Map();
  branchToColor: Map<string,string> = new Map();






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

    this.commitlineDiv = plotlyDiv;
    const evolutionData = this.evolutionData;
    const application = this.selectedApplication;
    const selectedCommits = this.selectedCommits;
    this.usedColors.add([255,255,255]); // initialize with white so it won't be used as color for branches on a white background
    if(evolutionData && application && selectedCommits) {
      //console.log("DID RENDER!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! ");
      //console.log("CURRENT SELECTED COMMITS: ", selectedCommits);
      this.computeSizes(evolutionData, application);
      this.createPlotlyCommitlineChart(evolutionData, application, selectedCommits);
      this.setupPlotlyListener(evolutionData, application, selectedCommits);
        // TODO: select latest commit on main branch
    }
  }

  createPlotlyCommitlineChart(evolutionData: EvolutionLandscapeData, selectedApplication: string, selectedCommits: Map<string,SelectedCommit[]>) {
    let application = evolutionData.applications.find(application => application.name === selectedApplication);
    if(application && application.branches.find(branch => branch.commits.length > 0)) { 
      
      if(!selectedCommits.get(selectedApplication)){ 
        selectedCommits.set(selectedApplication, []);
      }

      // create branches
      let plotlyBranches: any[] = [];
      let branchCounter = 0;

      for(const branch of application.branches) {

        const numOfCommits = branch.commits.length;
        const offset = this.calculateOffset(selectedApplication, branch);
        const commits = Array.from({length: numOfCommits}, (_, i) => i + offset);

        let color : string | undefined = this.applicationNameAndBranchNameToColorMap.get(this.selectedApplication + branch.name);
        if (!color) {
            color = this.randomRGBA();
            this.applicationNameAndBranchNameToColorMap.set(this.selectedApplication + branch.name, color);
        }

        const colors = Array.from(Array(numOfCommits)).map(() => color);


        // TODO: recoloring selected commits, e.g. when switching back from another application or the timeline
        //const selectedCommits = this.selectedCommits?.get(selectedApplication)?.values();
        const currentSelectedCommits = selectedCommits.get(selectedApplication);
        if(currentSelectedCommits){
          for (const selectedCommit of currentSelectedCommits){
            const index = branch.commits.findIndex(commitId => commitId === selectedCommit.commitId);
            if(index !== -1){
              colors[index] = this.highlightedMarkerColor;
            }
          }
        }


        const sizes = Array.from(Array(numOfCommits)).map(() => 10);
        const plotlyBranch = this.getPlotlyDataObject(commits,colors,sizes,branchCounter, branch.name, evolutionData, selectedApplication, color);
        plotlyBranches.push(plotlyBranch);
        this.branchToY.set(branch.name, branchCounter);
        this.branchToColor.set(branch.name, color);

        branchCounter++;
      }

      // add branch-to-branch connections
      for(const branch of application.branches) {
        const branchY = this.branchToY.get(branch.name);
        const branchX = this.calculateOffset(selectedApplication, branch);

        const fromBranchY = this.branchToY.get(branch.branchPoint.name);
        const fromBranchX = branchX - 1;

        if (fromBranchY !== undefined && branchY){ // fromBranchY can be 0 so we explicitly ask for undefined
          
          const color = this.branchToColor.get(branch.name)!;
          plotlyBranches.push({
            line: { color: color, width: 2},
            mode: 'lines',
            type: 'scatter',
            name: branch.name,
            x: [fromBranchX, branchX],
            y: [fromBranchY, branchY]
          });
        }
      }

      const layout = PlotlyCommitline.getPlotlyLayoutObject(0,15);
        this.branchToY.forEach((val, key) => {
            layout.annotations.push({
                xref: 'paper',
                x: 0,
                y: val,
                xanchor: 'right',
                yanchor: 'middle',
                text: key,
                showarrow: false,
                font: {
                  family: 'Arial',
                  size: 16,
                  color: 'black'
                }
              });
        });

        Plotly.newPlot(
            this.commitlineDiv,
            plotlyBranches,
            layout,
            PlotlyCommitline.getPlotlyOptionsObject()
          );



    }else {
        // TODO: error text no commits
        console.log("No commits available yet");
    }
  }

  // TODO: remove this?
  computeSizes(evolutionData: EvolutionLandscapeData, selectedApplication: string){
    for (const application of evolutionData.applications) {
        if(application.name === selectedApplication){
            for(const branch of application.branches){
                this.commitSizes.set(branch.name, 10);
            }
            break;
        }
    }
  }

  calculateOffset(selectedApplication: string, branch: Branch) {
    // TODO: commit can have more than one predecessor (merging). So we need to calculate and add the maximum of both recursive calls to our counter
  
      const evolutionData = this.evolutionData!; // evolutionData not undefined, otherwise calculateOffset wouldn't be called
      let counter = 0;
      for (const application of evolutionData.applications) {
          if(application.name === selectedApplication){
  
              const fromCommit = branch.branchPoint.commit;
              const fromBranch = branch.branchPoint.name;
  
              if(fromBranch !== "NONE")
              {
                  for(const b of application.branches) {
                      if (b.name === fromBranch){
                          for(const commit of b.commits){
                              counter++;
                              if(commit === fromCommit){
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
        const o = Math.round, r = Math.random, s = 255;

        let red = o(r()*s);
        let green = o(r()*s);
        let blue = o(r()*s);

        let permission = false;
        while(!permission) {
            permission = true;
            for (const color of this.usedColors){ // only use darker colors (prevent white on white background)
                const diff = Math.abs(color[0] - red) + Math.abs(color[1] - green) + Math.abs(color[2] - blue);
                if (diff < 20) { // prevent to use colors that look very similiar
                    red = o(r()*s);
                    green = o(r()*s);
                    blue = o(r()*s);
                    permission = false;
                    break;
                }
            }
        }
        let rgb = [red,green,blue];
        this.usedColors.add(rgb);
        return 'rgba(' + red + ',' + green + ',' + blue + ',' + '1)';
    }

    getPlotlyDataObject(
        commits: number[],
        colors: string[],
        sizes: number[],
        branch: number,
        branchName: string,
        evolutionData: EvolutionLandscapeData,
        selectedApplication: string,
        lineColor: string,
      ) {
          
    
    
        this.branchNameToLineColor.set(branchName, lineColor);
        return {
          name: branchName,
          marker: { color: colors, size: sizes },
          line: { color: lineColor, width: 2},
          mode: 'lines+markers',
          type: 'scatter',
          hoverinfo: 'text',
          hoverlabel: {
            align: 'left',
          },
          text: PlotlyCommitline.hoverText(evolutionData, selectedApplication, branch),
          x: commits,
          y: Array.from(Array(commits.length)).map(() => branch)
        };
    }

    static hoverText(evolutionData: EvolutionLandscapeData, selectedApplication: string, branch: number) {
        for (const application of evolutionData.applications) {
          if(application.name === selectedApplication){
              let branchCounter = 0;
              for(const b of application.branches){
                if(branch === branchCounter){
                  return b.commits.map(commit => "Commit ID: " + commit);
                  break;
                }
                branchCounter++;
              }
              break;
            }
        }  
        return "no commit id found";
      }

      static getPlotlyLayoutObject(minRange: number, maxRange: number) : {
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
            b: 40,
            pad: 5,
            t: 20,
            r: 40,
          },
          xaxis: {
            range: [minRange,maxRange],
            showline: false,
            showgrid: false,
            showticklabels: false,
          },
        
          yaxis: {
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
          annotations: []
          
          
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





   setupPlotlyListener(evolutionData: EvolutionLandscapeData, selectedApplication: string, selectedCommits: Map<string,SelectedCommit[]>) {
    const dragLayer: any = document.getElementsByClassName('nsewdrag')[0];
    const plotlyDiv = this.commitlineDiv;

    if (plotlyDiv && plotlyDiv.layout) {
      const self: PlotlyCommitline = this;

      // singe click
      plotlyDiv.on('plotly_click', async (data: any) => {
        // https://plot.ly/javascript/reference/#scatter-marker

        if(data.points[0].data.mode === "markers"){ // no functionality for metric circles
          return;
        }


        const pn = data.points[0].pointNumber;
        const numberOfPoints = data.points[0].fullData.x.length;

        let colors = data.points[0].fullData.marker.color;
        let sizes = data.points[0].fullData.marker.size;

        const branchName = data.points[0].data.name;

        // add selected commit ------------------------------------------------------

        let commitId = "";
        for (const application of evolutionData.applications) {
            if(application.name === selectedApplication ) {
                for(const branch of application.branches) {
                    if(branch.name === branchName){
                        commitId = branch.commits[pn];
                    break;
                    }
                }
                break;
            }
        }

          const selectedCommit : SelectedCommit = {
            commitId: commitId,
            branchName: branchName
          };

          let selectedCommitList  = selectedCommits.get(selectedApplication)!;
          const { highlightedMarkerColor } = self;

          if(selectedCommitList.length > 0){

            // is already selected?
            let isSelected = false;
            for( const selCom of selectedCommitList ) {
                if (selCom.commitId  === selectedCommit.commitId){
                    isSelected = true;
                    break;
                }
            }
    
            if(!isSelected){


              if(selectedCommitList.length >= this.MAX_SELECTION){
                // unselect all 
                selectedCommits.set(selectedApplication, []);
                for (const application of evolutionData.applications) {
                  if(application.name === selectedApplication ) {
                    for(const branch of application.branches) {
                        const curveNumber = this.branchToY.get(branch.name);
                        colors = Array(branch.commits.length).fill(this.branchNameToLineColor.get(branch.name));
                        sizes = Array(branch.commits.length).fill(this.commitSizes.get(branch.name));
                        const update = { marker: { color: colors, size: sizes} };
                        Plotly.restyle(plotlyDiv, update, curveNumber);
                    }
                    break;
                  }
                }
              }else {
                // select 2nd commit
                colors[pn] = highlightedMarkerColor;
                const update = { marker: { color: colors, size: sizes } };
                const tn = data.points[0].curveNumber;
                Plotly.restyle(plotlyDiv, update, [tn]);

                selectedCommitList.push(selectedCommit);
                selectedCommits.set(selectedApplication, selectedCommitList);

                // const callbackCommitComparison = (commitComparison : CommitComparison) => {
                //   console.log("Commit Comparison ", commitComparison);
                //   this.commitComparisonRepo.add(commitComparison);
                // }
                // await so we can be sure that the commit repo has persisted the data before we rerender the landscape
                //await this.codeServiceFetchingService.initCommitComparisonFetchingWithCallback(callbackCommitComparison, this.selectedApplication!, [selectedCommitList[0], selectedCommitList[1]]);

                const callback = (landscapeStructure: StructureLandscapeData) => {
                  this.args.clicked?.(this.selectedCommits!,1, landscapeStructure);
                };
                this.codeServiceFetchingService.initStaticLandscapeStructureFetchingWithCallback(callback, this.selectedApplication!, [selectedCommitList[0], selectedCommitList[1]]); 

              }
            }else { 
              // unselect one commit
              const timelineOfSelectedCommit = selectedCommitList.findIndex(commit => commit.commitId === selectedCommit.commitId);
              selectedCommitList = selectedCommitList.filter((commit => { return commit.commitId !== selectedCommit.commitId}));
              colors[pn] = data.points[0].fullData.line.color;
              selectedCommits.set(selectedApplication, selectedCommitList);
              const update = { marker: { color: colors, size: sizes } };
              const tn = data.points[0].curveNumber;
              Plotly.restyle(plotlyDiv, update, [tn]);
              if(selectedCommitList.length == 1){
                const callback = (landscapeStructure: StructureLandscapeData) => {
                  this.args.clicked?.(this.selectedCommits!, timelineOfSelectedCommit, landscapeStructure);
                };
                this.codeServiceFetchingService.initStaticLandscapeStructureFetchingWithCallback(callback, this.selectedApplication!, selectedCommitList);
              }else {
                // no structure since we unselected the only selected commit
                this.args.clicked?.(this.selectedCommits!, 0);
              }

              // TODO: if no selected commit remains, load latest landscape structure of main branch (write function for that)
              // TODO: if one selected commit remains, load its landscape structure
            }
          }else { 
            // first commit has been selected
            colors[pn] = highlightedMarkerColor;
            selectedCommits.set(selectedApplication, [selectedCommit]);
            const update = { marker: { color: colors, size: sizes } };
            const tn = data.points[0].curveNumber;
            Plotly.restyle(plotlyDiv, update, [tn]);

            const callback = (landscapeStructure: StructureLandscapeData) => {
                this.args.clicked?.(this.selectedCommits!, 0, landscapeStructure);
            };
            this.codeServiceFetchingService.initStaticLandscapeStructureFetchingWithCallback(callback, this.selectedApplication!, [selectedCommit]);
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