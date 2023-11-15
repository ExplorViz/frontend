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

interface IMarkerStates {
  [commitId: string]: {
    color: string;
    size: number;
    emberModel: SelectedCommit;
  };
}

type FileMetric = {
  fileName: string;
  loc: number;
  cyclomaticComplexity: number | undefined;
  numberOfMethods: number | undefined;
}
type CommitData = {
  commitID: string;
  parentCommitID: string;
  branchName: string;
  modified: string[] | undefined;
  deleted: string[] | undefined;
  added: string[] | undefined;
  fileMetric: FileMetric[];
}

function isCommitData(commitData: any): commitData is CommitData {
  return (
    commitData !== null &&
    typeof commitData === 'object' &&
    typeof commitData.commitID === 'string' &&
    typeof commitData.parentCommitID === 'string' &&
    typeof commitData.branchName === 'string' &&
    (typeof commitData.modified === 'undefined' || typeof commitData.modified.every((x: any) => typeof x === 'string')) &&
    (typeof commitData.deleted === 'undefined' || typeof commitData.deleted.every((x: any) => typeof x === 'string')) &&
    (typeof commitData.added === 'undefined' || typeof commitData.added.every((x: any) => typeof x === 'string')) &&
    commitData.fileMetric.every(isFileMetricType)
  );
}

function isFileMetricType(fileMetric: any): fileMetric is FileMetric {
  return (
    fileMetric !== null &&
    typeof fileMetric === 'object' &&
    typeof fileMetric.fileName === 'string' &&
    typeof fileMetric.loc === 'number' &&
    (typeof fileMetric.cyclomaticComplexity === 'number' ||
    typeof fileMetric.cyclomaticComplexity === 'undefined') &&
    (typeof fileMetric.numberOfMethods === 'number' ||
    typeof fileMetric.numberOfMethods === 'undefined')
  );
}

interface IArgs {
  evolutionData?: EvolutionLandscapeData;
  selectedApplication?: string;
  //selectedCommits?: Map<string,Map<string,SelectedCommit[]>>; // outer key is application id, inner key is branch name
  selectedCommits?: Map<string, SelectedCommit[]>;
  highlightedMarkerColor?: string;
  setChildReference?(timeline: PlotlyCommitline): void;
  clicked?(selectedCommits: Map<string,SelectedCommit[]>, structureData?: StructureLandscapeData): void;
  toggleConfigurationOverview(): void;
}

const { landscapeService} = ENV.backendAddresses;
export default class PlotlyCommitline extends Component<IArgs> {

    private MAX_SELECTION = 2;

  @service('landscape-token')
  tokenService!: LandscapeTokenService;

  @service('auth') auth!: Auth;

  @service('repos/configuration-repository')
  configRepo!: ConfigurationRepository;

  @service('repos/commit-comparison-repository')
  commitComparisonRepo!: CommitComparisonRepository;


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

  readonly debug = debugLogger();

  oldPlotlySlidingWindow = { min: 0, max: 0 };

  userSlidingWindow = null;

  markerState: IMarkerStates = {};

  commitlineDiv: any;

  branchToY: Map<string,number> = new Map();
  branchToColor: Map<string,string> = new Map();
  commitSizes: Map<string, number> = new Map();
  branchNameToLineColor: Map<string, string> = new Map();
  usedColors: Set<number[]> = new Set();

  commitIdToCommitData: Map<string, CommitData> = new Map();
  

  maxCommits = 0;

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
      console.log("DID RENDER!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
        this.computeSizes(evolutionData, application);
        this.createPlotlyCommitlineChart(evolutionData, application, selectedCommits);
        this.setupPlotlyListener(evolutionData, application,selectedCommits);
        // TODO: select latest commit on main branch
    }
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
    
            if(!isSelected){ // second or third commit got selected 
              if(selectedCommitList.length >= this.MAX_SELECTION){
                //TODO unselect all and remove applications visualization from landscape
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



                console.log("CURRENT COMMIT LIST ", selectedCommitList);

                selectedCommitList.push(selectedCommit);
                selectedCommits.set(selectedApplication, selectedCommitList);

                // normally we would get the fqn as entries in each list, which we need to convert into the "most comprehensive" component id with its children all matching the category 

                // for testing purpose compare first master commit and latest master commit  //latest master commit and latest featureX commit

                const commitComparison : CommitComparison = {
                  firstCommit: selectedCommitList[0],
                  secondCommit: selectedCommitList[1],
                  //modified: ["9568a86818902296a61985e1ac1bc4be8b9ed88f46ce42e1f8712b37a3da680b"], // the components from the first commit that got modified in the second commit
                  //added: ["46ccd8261eac1ee5203c567bcd10509b82f994768b99f043bb88152f6f0d83d0"], // the components from the second commit that are missing in the first commit
                  //missing: ["96e1c58c2ee0462ce0e37cc06001a55d8b6e73feb8157ae97ab88b23152b89ab", "f74f396d522d6e01e89dbce09c4809b5c63ac7ee4f16ae6da2f9fe74e82fc24a"], // the components from the first commit that are missing in the second commit
                  //deleted: ["49ca0bb9a53b518a0344e31ba385c95e9b2ef780f1fac45fa922ae41346d2ecb"], // the components from the first commit that got deleted in the second commit
                  added: ["96e1c58c2ee0462ce0e37cc06001a55d8b6e73feb8157ae97ab88b23152b89ab"],
                  modified: [],
                  deleted: [],
                  missing: []
                }

                this.commitComparisonRepo.add(commitComparison);


                
                this.args.clicked?.(this.selectedCommits!);

                //this.compareBothSelectedCommits(evolutionData, selectedApplication, selectedCommitList[0].commitId, selectedCommitList[1].commitId);

              }
            }else { 
              // unselect 
              selectedCommitList = selectedCommitList.filter((commit => { return commit.commitId !== selectedCommit.commitId}));
              colors[pn] = data.points[0].fullData.line.color;
              selectedCommits.set(selectedApplication, selectedCommitList);
              const update = { marker: { color: colors, size: sizes } };
              const tn = data.points[0].curveNumber;
              Plotly.restyle(plotlyDiv, update, [tn]);

              // TODO: if no selected commit remains, load latest landscape structure of main branch (write function for that)
              // TODO: if one selected commit remains, load its landscape structure
            }
          }else { 
            // first commit got selected
            console.log("!!!!!!!!!FIRST COMMIT!!!");
            colors[pn] = highlightedMarkerColor;
            selectedCommits.set(selectedApplication, [selectedCommit]);
            const update = { marker: { color: colors, size: sizes } };
            const tn = data.points[0].curveNumber;
            Plotly.restyle(plotlyDiv, update, [tn]);

            // TODO: load landscape structure of commit
            let commitStructureData =  await this.requestStructureData(selectedCommit.commitId);
            commitStructureData = preProcessAndEnhanceStructureLandscape(commitStructureData);
            console.log(commitStructureData);
            this.args.clicked?.(this.selectedCommits!, commitStructureData);


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

  @action
  toggleConfigOverview() {
    this.args.toggleConfigurationOverview();
  }

  async requestData(evolutionData: EvolutionLandscapeData, selectedApplication: string) {
    const commitIdToCommitData = new Map();
    for (const application of evolutionData.applications) {
      if(application.name === selectedApplication ) {
        for(const branch of application.branches) {
          for(const commitId of branch.commits){
            const commitData =  await this.requestCommitData(commitId);

            if(isCommitData(commitData)){
              commitIdToCommitData.set(commitData.commitID, commitData);
            }
          }
        }
        break;
      }
    }

    return commitIdToCommitData;
  }
  

  requestStructureData(commitId: string){
    return new Promise<StructureLandscapeData>((resolve, reject) => {
      if (this.tokenService.token === null) {
        reject(new Error('No landscape token selected'));
        return;
      }
      fetch(
        `${landscapeService}/v2/landscapes/${this.tokenService.token.value}/commit-structure/${commitId}`, 
        {
          headers: {
            Authorization: `Bearer ${this.auth.accessToken}`,
          },
        }
      )
        .then(async (response: Response) => {
          if (response.ok) {
            const commitStructureData =
              (await response.json()) as StructureLandscapeData;
            resolve(commitStructureData);
          } else {
            reject();
          }
        })
        .catch((e) => reject(e));
    });
  }

  requestCommitData(commitId: string) {
    return new Promise<CommitData>((resolve, reject) => {
      if (this.tokenService.token === null) {
        reject(new Error('No landscape token selected'));
        return;
      }
      fetch(
        `${landscapeService}/v2/landscapes/${this.tokenService.token.value}/commit-report/${commitId}`,
        {
          headers: {
            Authorization: `Bearer ${this.auth.accessToken}`,
          },
        }
      )
        .then(async (response: Response) => {
          if (response.ok) {
            const commitData =
              (await response.json()) as CommitData;
            resolve(commitData);
          } else {
            reject();
          }
        })
        .catch((e) => reject(e));
    });
  }



  createPlotlyCommitlineChart(evolutionData: EvolutionLandscapeData, selectedApplication: string, selectedCommits: Map<string,SelectedCommit[]>) {
    if(evolutionData.applications.find(application => application.name === selectedApplication)) { 


        if(!selectedCommits.get(selectedApplication)){
            selectedCommits.set(selectedApplication, []);
        }

        // TODO: used old branch colors after switching back from timeline or other applications commitline

        // create branches
        let plotlyBranches: any[] = [];
        let branchCounter = 0;

        for (const application of evolutionData.applications) {
            if(application.name === selectedApplication ) {
                for(const branch of application.branches) {

                    const numOfCommits = branch.commits.length;
                    

                    
                    const offset = this.calculateOffset(selectedApplication, branch);
                    const commits = Array.from({length: numOfCommits}, (_, i) => i + offset);

                    let color = this.randomRGBA();

                    const colors = Array.from(Array(numOfCommits)).map(() => color);

                    // TODO: recoloring selected commits, e.g. when switching back from another application or the timeline
                    const selectedCommits = this.selectedCommits?.get(selectedApplication)?.values();
                    if(selectedCommits){
                      for (const selectedCommit of selectedCommits){
                        const index = branch.commits.findIndex(commitId => commitId === selectedCommit.commitId);
                        if(index){
                          colors[index] = this.highlightedMarkerColor;
                        }
                      }
                    }


                    const sizes = Array.from(Array(numOfCommits)).map(() => 10);

                    const plotlyBranch = this.getPlotlyDataObject(commits,colors,sizes,branchCounter, branch.name, evolutionData, selectedApplication);
                    plotlyBranches.push(plotlyBranch);
                    this.branchToY.set(branch.name, branchCounter);
                    this.branchToColor.set(branch.name, color);

                    branchCounter++;
                }
                break;
            }
        }


        // add branch to branch connections

        for (const application of evolutionData.applications) {
            if(application.name === selectedApplication ) {
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
                break;
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

  //calculateSelectedCommits(evolutionData: EvolutionLandscapeData, selectedApplication: string, involvedBranch: string, selectedCommits: Map<string,Map<string,SelectedCommit[]>>) {

    //const chainsWithInvolvedBranch = this.getListOfFullBranchPaths(evolutionData, selectedApplication, involvedBranch);
    //console.log(chainsWithInvolvedBranch);
 

    // let counter = 0;
    // for (const application of evolutionData.applications) {
    //     if(application.name === selectedApplication){

    //         const applicationSelectedCommits = selectedCommits.get(selectedApplication);
            
    //         // current branch selected commits
    //         const branchSelectedCommits = applicationSelectedCommits?.get(branch.name);
    //         if(branchSelectedCommits){
    //             counter += branchSelectedCommits.length;
    //         }

    //         branch.commits.forEach(commit => {
    //             if(applicationSelectedCommits?.get(branch.name)){
    //                 counter += applicationSelectedCommits?.get(commit)?.length;
    //             }
    //         });

    //         const fromCommit = branch.branchPoint.commit;
    //         const fromBranch = branch.branchPoint.name;

    //         if(fromBranch !== "NONE")
    //         {
    //             for(const b of application.branches) {
    //                 if (b.name === fromBranch){
    //                     for(const commit of b.commits){
    //                         counter++;
    //                         if(commit === fromCommit){
    //                             counter += this.calculateOffset(selectedApplication, b);
    //                             break;
    //                         }
    //                     }
    //                     break;
    //                 }
    //             }
    
    //         }
    //         break;   
    //     }
    // }
    // return counter;
  //}

  // TODO: needed?
  // returns the list of branch paths that contain involvedBranch. A branch path starts with the origin branch and ends with a branch with no branch points (except the one it originates from) 
  // getListOfFullBranchPaths(evolutionData: EvolutionLandscapeData, selectedApplication: string, involvedBranch: string){
  //   const setOfBranches = new Set<string>();
  //   setOfBranches.add("NONE");
  //   let listOfChains = [];
  //   for (const application of evolutionData.applications) {
  //       if(application.name === selectedApplication){
  //           //const numberOfBranches = application.branches.length;
  //           let involvedBranchFound = false;
  //           let done = false;

  //           let addToSet: string[] = []; // used for DFS
  //           let currentChain : string[] = [];
  //           let ignorableBranches : string[] = [];
  //           let noNewCandidate = false;
  //           let involvedBranchFoundFirstTime = true;
  //           while(/*setOfBranches.size - 1 !== numberOfBranches*/ !done){
  //               let counter = 0;

  //               for (const branch of application.branches) { // candidate branches for DFS
  //                   if(setOfBranches.has(branch.branchPoint.name) && !setOfBranches.has(branch.name) && !addToSet.includes(branch.name) && !ignorableBranches.includes(branch.name) ){
                        
  //                       // found a new candidate 

  //                       counter++;
  //                       if(branch.name === involvedBranch){
  //                           involvedBranchFound = true; 
  //                       }else {
  //                           addToSet = [branch.name, ...addToSet];
  //                       }
  //                   }
  //               }

  //               if(counter > 0){ // we are not done with DFS for the current chain
  //                   if(involvedBranchFound && involvedBranchFoundFirstTime){
  //                       involvedBranchFoundFirstTime = false;
  //                       ignorableBranches = addToSet.slice(0); // copy. Note that especially all "sibling" branches are ignored
  //                       addToSet = [involvedBranch];
  //                   }

  //                   const nextBranch = addToSet[0]; // next branch for DFS
  //                   addToSet = addToSet.slice(1); 
  //                   currentChain.push(nextBranch);
  //                   setOfBranches.add(nextBranch);
  //               }else { // no new candidate found. Our current chain has reached its end

  //                   if(!noNewCandidate){
  //                       noNewCandidate = true;
  //                   }
  //                   else {
  //                       done = true;
  //                       break;
  //                   }

  //                   if(involvedBranchFound){
  //                       listOfChains.push(currentChain);
  //                   }

  //                   if(addToSet.length > 0){ 
  //                       noNewCandidate = false; // prevent done=true when we reach a chains end 

  //                       // backtracking
  //                      let resetChainEnd = "";

  //                      for (const app of evolutionData.applications) {
  //                       if(app.name === selectedApplication){
  //                           for (const b of app.branches){
  //                               if(b.name === addToSet[0]){
  //                                   resetChainEnd = b.branchPoint.name;
  //                                   break;
  //                               }
  //                           }
  //                       }
  //                       break;
  //                   }

  //                   const index = currentChain.findIndex(branchName => branchName === resetChainEnd);
  //                   currentChain = currentChain.slice(0,index+1);
                    
  //                   const nextBranch = addToSet[0];
  //                   addToSet = addToSet.slice(1);
  //                   currentChain.push(nextBranch);
  //                   }
                    
  //               }
  //           }
            

  //           break;
  //       }
  //   }
  //   return listOfChains;
  // }

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


   getPlotlyDataObject(
    commits: number[],
    colors: string[],
    sizes: number[],
    branch: number,
    branchName: string,
    evolutionData: EvolutionLandscapeData,
    selectedApplication: string,
  ) {
      this.branchNameToLineColor.set(branchName, colors[0]);
      return {
        name: branchName,
        marker: { color: colors, size: sizes },
        line: { color: colors[0], width: 2},
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

  static getPlotlyOptionsObject() {
    return {
      displayModeBar: false,
      doubleClick: false,
      responsive: true,
      scrollZoom: true,
    };
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

    async updatePlotlineForMetric(){
      const activeIdList = this.configRepo.getActiveConfigurations(this.tokenService.token!.value);
      const configItemList = this.configRepo.getConfiguration(this.tokenService.token!.value);
      
      if(!this.evolutionData){
        return;
      }

      if(!this.selectedApplication){
        return;
      }

      this.commitIdToCommitData = await this.requestData(this.evolutionData, this.selectedApplication); // TODO: only request data that was not requested before
      const numOfCircles = activeIdList.length;
      
      let newData = [];
      let nonMetricData = this.commitlineDiv.data.filter((data: any) => 
        data.mode === "lines+markers" || data.mode === "lines"
      ); // consider non-metric data

      newData = [...nonMetricData];


      for(let i = 0; i < numOfCircles; i++){ // for each metric we place a circle which size indicates its measurement
        for (const configItem of configItemList){
          if(activeIdList[i] === configItem.id){
            const circle = this.plotMetric(configItem.color, configItem.key, configItem.id, i);
            console.log("CIRCLE: ", circle);
            newData.push(circle);
          }
        }
      }

      
      Plotly.newPlot(
        this.commitlineDiv,
        newData,
        this.commitlineDiv.layout,
        PlotlyCommitline.getPlotlyOptionsObject()
      );

      this.setupPlotlyListener(this.evolutionData!, this.selectedApplication!, this.selectedCommits!);

    }

    plotMetric(color: string, metric: string, metricId: string, order: number){
      if(metric === "number of changed files"){

        let maxOfChangedFiles = 0;
        const branchNameToNumOfChangedFilesList = new Map<string, number[]>();

        for (const application of this.evolutionData!.applications) {
          if(application.name === this.selectedApplication ) {
              for(const branch of application.branches) {
                let numOfChangedFilesList = [];
                for(const commit of branch.commits){
                  const commitData = this.commitIdToCommitData.get(commit);
                  let changedFiles = 0;

                  if(commitData?.deleted)
                    changedFiles += commitData.deleted.length;

                  if(commitData?.modified)
                    changedFiles += commitData.modified.length;

                  if(commitData?.added)
                    changedFiles += commitData.added.length;

                  numOfChangedFilesList.push(changedFiles);
                  if(changedFiles > maxOfChangedFiles)
                    maxOfChangedFiles = changedFiles;
                }
                branchNameToNumOfChangedFilesList.set(branch.name, numOfChangedFilesList);
              }
            break;
          }
        }

        let oldData = this.commitlineDiv.data;
        let xValues : number[] = [];
        let yValues : number[] = [];
        let sizes : number[][] = [];
        let displayedInformation : number[] = [];

        let counter = 0;
        
        for (const data of oldData) {

          if(data.mode === "lines+markers"){
            counter += data.x.length;


            const information = branchNameToNumOfChangedFilesList.get(data.name);
            if(information)
            displayedInformation = [...displayedInformation, ...information];
            //else
              // throw error since every commit should have this information

            let sizeList = branchNameToNumOfChangedFilesList.get(data.name)?.map(num => 5 + (num/maxOfChangedFiles) * 5);

            if(sizeList)
              sizes.push(sizeList);
            //else
              // throw error since every commit should have this metric

            const newXCoordinates = data.x.map((xval: number) => (xval - 0.3) + (order%10)*0.1); 
            const newYCoordinates = data.y.map((yval: number) => yval + 0.1 + (order%10)*0.1);

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
          name: "number of changed files",
          text: displayedInformation.map((val: number) => `number of changed files: ${val}` ),
          x: xValues,
          y: yValues,
        }
        return circle;

      }
      
      else {
        return {};
      }
    }


    async compareBothSelectedCommits(evolutionData: EvolutionLandscapeData, selectedApplication: string, firstCommitId: string, secondCommitId: string){
      //const firstCommitReport = await this.requestCommitData(firstCommitId);
      //const secondCommitReport = await this.requestCommitData(secondCommitId);

      const branchPathForFirstCommit = this.getBranchNameListOfCommitId(evolutionData, selectedApplication, firstCommitId);
      const branchPathForSecondCommit = this.getBranchNameListOfCommitId(evolutionData, selectedApplication, secondCommitId);

      if(branchPathForFirstCommit && branchPathForSecondCommit){

        // first we find the latest common branch
        let latestCommonBranch : string | undefined = undefined;
        for(const branch of branchPathForFirstCommit.slice().reverse()){
          if(branchPathForSecondCommit.includes(branch)){
            latestCommonBranch = branch;
            break;
          }
        }

        if(!latestCommonBranch){
          return undefined;
        }

          // now we find the latest common commit
          let latestCommonId = undefined;

          const indexFirstCommitCommonBranch = branchPathForFirstCommit.findIndex(branch => latestCommonBranch === branch);
          let branch1 = undefined; // branch name after the latest common branch for the first commit 
          if(branchPathForFirstCommit.length > indexFirstCommitCommonBranch + 1){
            branch1 = branchPathForFirstCommit[indexFirstCommitCommonBranch + 1];
          }

          const indexSecondCommitCommonBranch = branchPathForSecondCommit.findIndex(branch => latestCommonBranch === branch);
          let branch2 = undefined; // branch name after the latest common branch for the second commit 
          if(branchPathForSecondCommit.length > indexSecondCommitCommonBranch + 1){
            branch2 = branchPathForSecondCommit[indexSecondCommitCommonBranch + 1];
          }

          for (const application of evolutionData.applications) {
            if(application.name === selectedApplication){
              for(const branch of application.branches){
                if(branch.name === latestCommonBranch){
                  
                  for(let commitId of branch.commits){
                    // List of branches that emerged from commitId
                    const mergedBranchList = this.mergedBranchFromCommitId(evolutionData, selectedApplication, commitId);

                    
                    if((branch1 && mergedBranchList.includes(branch1) && secondCommitId !== commitId) || 
                      (branch2 && mergedBranchList.includes(branch2) && firstCommitId !== commitId) ||
                      (!branch1 && firstCommitId === commitId) ||
                      (!branch2 && secondCommitId === commitId)){
                      // the first commit Id that fulfills the condition is our latest common id
                      latestCommonId = commitId;
                      break;
                    }

                  }

                  break;
                }
              }

              break;
            }
          }

          if(!latestCommonId){
            return undefined;
          }



          console.log(latestCommonId);

          // TODO: collect what must be "deleted" and what must be added


        
        
      }
      
    }

    mergedBranchFromCommitId(evolutionData: EvolutionLandscapeData, selectedApplication: string, commitId: string){
      const branchList = [];
      for (const application of evolutionData.applications) {
        if(application.name === selectedApplication){
          for(const branch of application.branches){
            if(branch.branchPoint.commit === commitId){
               branchList.push(branch.name);
            }
          }
          break;
        }
      }
      return branchList;
    }


    getBranchNameListOfCommitId(evolutionData: EvolutionLandscapeData, selectedApplication: string, commitId: string) : string[] | undefined {
    for (const application of evolutionData.applications) {
        if(application.name === selectedApplication){
            const setOfBranches = new Set<string>();
            setOfBranches.add("NONE");

            let involvedBranchFound = false;
            let exit = false;

            let addToSet: string[] = []; // used for DFS. Acts like a stack. The first string is the branch name to visit traverse
            let currentChain : string[] = [];
            let ignorableBranches = new Set<string>();

            while(/*setOfBranches.size - 1 !== numberOfBranches*/ !involvedBranchFound && !exit){


                let counter = 0;
                let involvedBranch;


                for (const branch of application.branches) { // candidate branches for DFS
                    if(setOfBranches.has(branch.branchPoint.name) && !setOfBranches.has(branch.name) && !addToSet.includes(branch.name) && !ignorableBranches.has(branch.name) ){
                        
                        // found a new candidate 

                        counter++;
                        if(branch.commits.includes(commitId)){ // if(branch.commits.includes(commitId))
                            involvedBranch = branch.name;
                            involvedBranchFound = true; 
                            break;
                        }else {
                            addToSet = [branch.name, ...addToSet]; 
                        }
                    }
                }



                if(counter > 0){ // we are not done with DFS for the current chain
                    if(involvedBranchFound){
                        currentChain.push(involvedBranch!);
                    }else {
                      const nextBranch = addToSet[0]; // next branch for DFS
                      addToSet = addToSet.slice(1); 
                      currentChain.push(nextBranch);
                      setOfBranches.add(nextBranch);
                    }
                }else { // no new candidate found. Our current chain has reached its end

                    if(addToSet.length > 0){
                      const ignorable = currentChain[currentChain.length - 1];
                      currentChain = currentChain.slice(0,-1);
                      ignorableBranches.add(ignorable);
                    }else {
                      exit = true;
                    }
                }
            }
            
            if(involvedBranchFound){
              return currentChain;
            }
            break;
        }
    }
    return undefined;
  }


}
