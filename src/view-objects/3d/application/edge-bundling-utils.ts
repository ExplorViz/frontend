import * as THREE from 'three';

export interface EdgeBundlingConfig {
  bundleStrength: number;
  compatibilityThreshold: number;
  iterations: number;
  stepSize: number;
}

export interface HAPNode {
  id: string;
  position: THREE.Vector3;
  level: number;
  children: HAPNode[];
  parent: HAPNode | null;
  element: any;
}

export class HierarchicalAttractionSystem {
  private hapTree: HAPNode | null = null;
  private beta: number = 0.8;

  /**
   * Builds the HAP tree from the software hierarchy
   */
  public buildHAPTree(
    rootElement: any,
    getChildren: (element: any) => any[],
    getPosition: (element: any) => THREE.Vector3,
    getLevel: (element: any) => number
  ): HAPNode {
    const buildTree = (element: any, parent: HAPNode | null): HAPNode => {
      const node: HAPNode = {
        id: element.id || Math.random().toString(),
        position: getPosition(element),
        level: getLevel(element),
        children: [],
        parent: parent,
        element: element,
      };

      const children = getChildren(element);
      node.children = children.map((child) => buildTree(child, node));

      return node;
    };

    this.hapTree = buildTree(rootElement, null);
    return this.hapTree;
  }

  /**
   * Find HAP path with leaf package optimization
   */
  public findHAPPath(
    origin: HAPNode,
    destination: HAPNode,
    streamline: boolean = true,
    leafPackagesOnly: boolean = false // NEU
  ): {
    pathOrigin: HAPNode[];
    pathDestination: HAPNode[];
  } {
    const pathToRoot = (node: HAPNode): HAPNode[] => {
      const path: HAPNode[] = [];
      let current: HAPNode | null = node;
      while (current) {
        path.push(current);
        current = current.parent;
      }
      return path.reverse();
    };

    const pathO = pathToRoot(origin);
    const pathD = pathToRoot(destination);

    // Find common ancestor
    let commonIndex = 0;
    const minLength = Math.min(pathO.length, pathD.length);
    while (
      commonIndex < minLength &&
      pathO[commonIndex].id === pathD[commonIndex].id
    ) {
      commonIndex++;
    }

    let originPath = pathO.slice(commonIndex);
    let destinationPath = pathD.slice(commonIndex);

    // 🔥 Filter out non-leaf packages if needed
    if (leafPackagesOnly) {
      originPath = this.filterLeafPackagesOnly(originPath);
      destinationPath = this.filterLeafPackagesOnly(destinationPath);
    }

    // Apply streamline if requested
    if (streamline) {
      originPath = this.applyStreamline(originPath);
      destinationPath = this.applyStreamline(destinationPath);
    }

    return {
      pathOrigin: originPath,
      pathDestination: destinationPath,
    };
  }

  /**
   * Filter to keep only leaf packages (and always keep classes/application)
   */
  private filterLeafPackagesOnly(path: HAPNode[]): HAPNode[] {
    return path.filter((node) => {
      // Always keep:
      // - Application (level 2)
      // - Classes (level 0)
      // - Packages that are leaves (no children with level 1)
      if (node.level === 2 || node.level === 0) {
        return true;
      }

      if (node.level === 1) {
        // Package level
        // Check if this package has any child packages
        const hasChildPackages = node.children.some(
          (child) => child.level === 1
        );

        // Keep only if no child packages (leaf package)
        return !hasChildPackages;
      }

      return true;
    });
  }

  /**
   * Apply streamline (keep only first and last)
   */
  private applyStreamline(path: HAPNode[]): HAPNode[] {
    if (path.length <= 2) return path;

    const streamlined: HAPNode[] = [];

    if (path.length > 0) {
      // First point (highest level)
      streamlined.push(path[0]);
    }

    if (path.length > 1) {
      // Last point (class level)
      streamlined.push(path[path.length - 1]);
    }

    return streamlined;
  }

  private addScattering(
    points: THREE.Vector3[],
    scatteringStrength: number = 0.3,
    scatterRadius: number = 15
  ): void {
    if (points.length < 3 || scatteringStrength <= 0) return;

    const effectiveRadius = scatterRadius * scatteringStrength;

    // Scatter the edges around the first 3D-HAP (the one at class level)
    const classLevelIndices: number[] = [];

    // Find class-level points
    for (let i = 1; i < points.length - 1; i++) {
      if (i === 1 || i === points.length - 2) {
        classLevelIndices.push(i);
      }
    }

    // Use scattering only on class-level points
    classLevelIndices.forEach((index) => {
      const scatterVector = new THREE.Vector3(
        (Math.random() - 0.5) * effectiveRadius,
        (Math.random() - 0.5) * effectiveRadius * 0.5,
        (Math.random() - 0.5) * effectiveRadius
      );
      points[index].add(scatterVector);
    });
  }

  //  // Calculates edge path with attraction power (β factor)
  //  // P′′n = Pn * β + (1 - β)(P′n * β)
  // public calculateEdgePath(
  //   origin: THREE.Vector3,
  //   destination: THREE.Vector3,
  //   hapPath: { pathOrigin: HAPNode[], pathDestination: HAPNode[] },
  //   beta: number = 0.8
  // ): THREE.Vector3[] {
  //   const allHAPs = [...hapPath.pathOrigin, ...hapPath.pathDestination];

  //   if (allHAPs.length === 0 || beta === 0) {
  //     return [origin, destination];
  //   }

  //   const points: THREE.Vector3[] = [origin];

  // // Apply attraction power to each HAP
  // allHAPs.forEach(hap => {
  //   const Pn = hap.position.clone();

  //   // Level-based beta-value
  //   const levelBasedBeta = this.calculateLevelBasedBeta(hap.level, beta);

  //   // Project HAP onto the OD line (P′n)
  //   const OD = new THREE.Vector3().subVectors(destination, origin);
  //   const OPn = new THREE.Vector3().subVectors(Pn, origin);
  //   const dotProduct = OPn.dot(OD);
  //   const magnitudeSquared = OD.lengthSq();

  //   // P′n = O + OD * (OPn · OD) / ||OD||²
  //   const P_prime = origin.clone().add(OD.multiplyScalar(dotProduct / magnitudeSquared));

  //   // P′′n = Pn * β + (1 − β)(P′n * β)
  //   const term1 = Pn.multiplyScalar(levelBasedBeta);                    // Pn * β
  //   const term2 = P_prime.multiplyScalar(levelBasedBeta)               // P′n * β
  //                     .multiplyScalar(1 - levelBasedBeta);             // * (1 - β)

  //   const P_final = new THREE.Vector3().addVectors(term1, term2);

  //   points.push(P_final);
  // });

  //   points.push(destination);

  //   // Apply Scattering to prevent overlapping edges
  //   this.addScattering(points);

  //   return points;
  // }

  public calculateEdgePath(
    origin: THREE.Vector3,
    destination: THREE.Vector3,
    hapPath: { pathOrigin: HAPNode[]; pathDestination: HAPNode[] },
    beta: number = 0.8,
    scatterRadius: number = 0.5,
    streamline: boolean = true
  ): THREE.Vector3[] {
    let allHAPs = [...hapPath.pathOrigin, ...hapPath.pathDestination.reverse()];

    if (streamline && allHAPs.length > 2) {
      const simplifiedHAPs: HAPNode[] = [];

      if (allHAPs.length > 0) {
        simplifiedHAPs.push(allHAPs[0]);
      }

      if (allHAPs.length > 1) {
        simplifiedHAPs.push(allHAPs[allHAPs.length - 1]);
      }

      allHAPs = simplifiedHAPs;
    }

    if (allHAPs.length === 0 || beta === 0) {
      return [origin, destination];
    }

    const points: THREE.Vector3[] = [origin];

    allHAPs.forEach((hap, index) => {
      const Pn = hap.position.clone(); // Original HAP Position

      if (hap.level === 0) {
        points.push(Pn);
        return;
      }

      const levelBasedBeta = this.calculateLevelBasedBeta(hap.level, beta);

      const OD = new THREE.Vector3().subVectors(destination, origin);
      const OPn = new THREE.Vector3().subVectors(Pn, origin);

      // t = (OPn · OD) / ||OD||²
      let t = OPn.dot(OD) / OD.lengthSq();
      t = Math.max(0, Math.min(1, t));
      // P′n = O + t * OD
      const P_prime = origin.clone().add(OD.multiplyScalar(t));

      const P_final = new THREE.Vector3();
      P_final.x = Pn.x * levelBasedBeta + P_prime.x * (1 - levelBasedBeta);
      P_final.y = Pn.y * levelBasedBeta + P_prime.y * (1 - levelBasedBeta);
      P_final.z = Pn.z * levelBasedBeta + P_prime.z * (1 - levelBasedBeta);

      points.push(P_final);
    });

    points.push(destination);

    this.addScattering(points, scatterRadius);
    return points;
  }

  public setHAPTree(tree: HAPNode): void {
    this.hapTree = tree;
  }

  // Get HAP tree for debugging
  public getHAPTree(): HAPNode | null {
    return this.hapTree;
  }

  private calculateLevelBasedBeta(level: number, baseBeta: number): number {
    if (level === 0) {
      return 0.0;
    }

    // switch (level) {
    //   case 1: // Package-Level
    //     return baseBeta * 0.8;
    //   case 2: // Application-Level
    //     return baseBeta * 1.0;
    //   default:
    //     return baseBeta * 0.5; // Fallback
    // }
    return baseBeta;
  }
}

export class EdgeBundlingProcessor {
  private static calculateCompatibility(
    edge1: THREE.Vector3[],
    edge2: THREE.Vector3[]
  ): number {
    if (edge1.length < 2 || edge2.length < 2) return 0;

    const start1 = edge1[0];
    const end1 = edge1[edge1.length - 1];
    const start2 = edge2[0];
    const end2 = edge2[edge2.length - 1];

    // Angle compatibility
    const vec1 = new THREE.Vector3().subVectors(end1, start1).normalize();
    const vec2 = new THREE.Vector3().subVectors(end2, start2).normalize();
    const angleComp = Math.abs(vec1.dot(vec2));

    // Scale compatibility
    const length1 = start1.distanceTo(end1);
    const length2 = start2.distanceTo(end2);
    const avgLength = (length1 + length2) / 2;
    const scaleComp =
      2 /
      (Math.max(length1, length2) / avgLength +
        avgLength / Math.min(length1, length2));

    // Position compatibility
    const mid1 = new THREE.Vector3()
      .addVectors(start1, end1)
      .multiplyScalar(0.5);
    const mid2 = new THREE.Vector3()
      .addVectors(start2, end2)
      .multiplyScalar(0.5);
    const dist = mid1.distanceTo(mid2);
    const maxDist = Math.max(start1.distanceTo(end1), start2.distanceTo(end2));
    const positionComp = maxDist / (maxDist + dist);

    return angleComp * scaleComp * positionComp;
  }

  public static applyEdgeBundling(
    edges: THREE.Vector3[][],
    config: EdgeBundlingConfig
  ): THREE.Vector3[][] {
    const { bundleStrength, compatibilityThreshold, iterations, stepSize } =
      config;

    let currentEdges = edges.map((edge) => [...edge]);

    for (let iter = 0; iter < iterations; iter++) {
      const newEdges: THREE.Vector3[][] = [];

      for (let i = 0; i < currentEdges.length; i++) {
        const edge = currentEdges[i];
        const newEdge: THREE.Vector3[] = [];

        for (let j = 0; j < edge.length; j++) {
          const point = edge[j].clone();
          let force = new THREE.Vector3();
          let forceCount = 0;

          // Calculate attraction to compatible edges
          for (let k = 0; k < currentEdges.length; k++) {
            if (i === k) continue;

            const otherEdge = currentEdges[k];
            const compatibility = this.calculateCompatibility(edge, otherEdge);

            if (
              compatibility > compatibilityThreshold &&
              j < otherEdge.length
            ) {
              const attraction = new THREE.Vector3()
                .subVectors(otherEdge[j], point)
                .multiplyScalar(compatibility * bundleStrength);

              force.add(attraction);
              forceCount++;
            }
          }

          if (forceCount > 0) {
            force.divideScalar(forceCount);
            point.add(force.multiplyScalar(stepSize));
          }

          newEdge.push(point);
        }

        newEdges.push(newEdge);
      }

      currentEdges = newEdges;
    }

    return currentEdges;
  }

  public static createBundledCurve(
    startPoint: THREE.Vector3,
    endPoint: THREE.Vector3,
    controlPoints: THREE.Vector3[],
    curveHeight: number
  ): THREE.CatmullRomCurve3 {
    const points: THREE.Vector3[] = [startPoint];

    // Add control points with height
    controlPoints.forEach((point) => {
      const elevatedPoint = point.clone();
      elevatedPoint.y += curveHeight;
      points.push(elevatedPoint);
    });

    points.push(endPoint);

    return new THREE.CatmullRomCurve3(points);
  }
}
