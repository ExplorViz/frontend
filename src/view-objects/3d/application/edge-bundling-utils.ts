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
        element: element
      };

      const children = getChildren(element);
      node.children = children.map(child => buildTree(child, node));

      return node;
    };

    this.hapTree = buildTree(rootElement, null);
    return this.hapTree;
  }

   // Symmetric difference between origin and destination paths to root
  public findHAPPath(origin: HAPNode, destination: HAPNode): {
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
      return path.reverse(); // From root to node
    };

    const pathO = pathToRoot(origin);
    const pathD = pathToRoot(destination);

    // Find common ancestor
    let commonIndex = 0;
    const minLength = Math.min(pathO.length, pathD.length);
    while (commonIndex < minLength && pathO[commonIndex].id === pathD[commonIndex].id) {
      commonIndex++;
    }

    // Symmetric difference between those two sets
    // path(O,D) = path(O,Root) Δ path(D,Root)
    return {
      pathOrigin: pathO.slice(commonIndex),
      pathDestination: pathD.slice(commonIndex)
    };
  }

  // Scattering implementation
  // Scatter the edges around the first 3D-HAP (the one at class level)
  private addScattering(points: THREE.Vector3[], scatterRadius: number = 0.3): void {
    if (points.length < 2) return;
    
    // Only add scattering to first HAP after origin (class level)
    // This prevents edges from having exactly the same coordinates
    const scatterVector = new THREE.Vector3(
      (Math.random() - 0.5) * scatterRadius,
      (Math.random() - 0.5) * scatterRadius, 
      (Math.random() - 0.5) * scatterRadius
    );
    
    // Apply scattering to first HAP point (index 1, after origin)
    if (points.length > 1) {
      points[1].add(scatterVector);
    }
  }


   // Calculates edge path with attraction power (β factor)
   // P′′n = Pn * β + (1 - β)(P′n * β)
  public calculateEdgePath(
    origin: THREE.Vector3,
    destination: THREE.Vector3,
    hapPath: { pathOrigin: HAPNode[], pathDestination: HAPNode[] },
    beta: number = 0.8
  ): THREE.Vector3[] {
    const allHAPs = [...hapPath.pathOrigin, ...hapPath.pathDestination];
    
    if (allHAPs.length === 0 || beta === 0) {
      return [origin, destination];
    }

    const points: THREE.Vector3[] = [origin];

  // Apply attraction power to each HAP
  allHAPs.forEach(hap => {
    const Pn = hap.position.clone();
    
    // Level-based beta-value
    const levelBasedBeta = this.calculateLevelBasedBeta(hap.level, beta);
    
    // Project HAP onto the OD line (P′n)
    const OD = new THREE.Vector3().subVectors(destination, origin);
    const OPn = new THREE.Vector3().subVectors(Pn, origin);
    const dotProduct = OPn.dot(OD);
    const magnitudeSquared = OD.lengthSq();
    
    // P′n = O + OD * (OPn · OD) / ||OD||²
    const P_prime = origin.clone().add(OD.multiplyScalar(dotProduct / magnitudeSquared));
    
    const P_prime_scaled = P_prime.multiplyScalar(levelBasedBeta); // P′n * β
    const P_final = new THREE.Vector3()
      .addVectors(
        Pn.multiplyScalar(levelBasedBeta),                    // Pn * β
        P_prime_scaled.multiplyScalar(1 - levelBasedBeta)     // (1 - β) * (P′n * β)
      );
    
    points.push(P_final);
  });

    points.push(destination);
    
    // Apply Scattering to prevent overlapping edges
    this.addScattering(points);
    
    return points;
  }

  public setBeta(beta: number): void {
    this.beta = Math.max(0, Math.min(1, beta));
  }

  public getBeta(): number {
    return this.beta;
  }

   // Level-based beta calculation
   // Deeper levels (higher level number) = stronger attraction
  private calculateLevelBasedBeta(level: number, baseBeta: number): number {
    // Paper suggests stronger attraction for deeper hierarchy levels
    // Application (level 2) = strongest, Class (level 0) = weakest
    const levelMultiplier = 1.0 + (level * 0.2); // +20% per level
    return Math.min(0.9, baseBeta * levelMultiplier);
  }

  /**
   * Test function to verify paper mathematics
   */
  public testPaperMathematics(): void {
    // Simple test setup like in paper figure 8
    const O = new THREE.Vector3(0, 0, 0);    // Origin Class
    const D = new THREE.Vector3(10, 0, 0);   // Destination Class  
    const P0 = new THREE.Vector3(5, 5, 0);   // HAP like in paper
    
    const beta = 0.8;
    
    // Calculate projection P′0
    const OD = new THREE.Vector3().subVectors(D, O);
    const OP0 = new THREE.Vector3().subVectors(P0, O);
    const dotProduct = OP0.dot(OD);
    const magnitudeSquared = OD.lengthSq();
    const P_prime = O.clone().add(OD.multiplyScalar(dotProduct / magnitudeSquared));
    
    // PAPER FORMULA: P′′0 = P0 * β + (1 - β)(P′0 * β)
    const P_prime_scaled = P_prime.multiplyScalar(beta);
    const P_final = new THREE.Vector3()
      .addVectors(
        P0.multiplyScalar(beta),
        P_prime_scaled.multiplyScalar(1 - beta)
      );
    
    console.log('=== PAPER MATHEMATICS TEST ===');
    console.log('O (Origin):', O);
    console.log('D (Destination):', D); 
    console.log('P0 (HAP):', P0);
    console.log('P′0 (Projection):', P_prime);
    console.log('P′′0 (Final):', P_final);
    console.log('β (Beta):', beta);
    console.log('=== END TEST ===');
  }

  // Get HAP tree for debugging
  public getHAPTree(): HAPNode | null {
    return this.hapTree;
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
    const scaleComp = 2 / (
      (Math.max(length1, length2) / avgLength) +
      (avgLength / Math.min(length1, length2))
    );

    // Position compatibility
    const mid1 = new THREE.Vector3().addVectors(start1, end1).multiplyScalar(0.5);
    const mid2 = new THREE.Vector3().addVectors(start2, end2).multiplyScalar(0.5);
    const dist = mid1.distanceTo(mid2);
    const maxDist = Math.max(
      start1.distanceTo(end1),
      start2.distanceTo(end2)
    );
    const positionComp = maxDist / (maxDist + dist);

    return angleComp * scaleComp * positionComp;
  }

  public static applyEdgeBundling(
    edges: THREE.Vector3[][],
    config: EdgeBundlingConfig
  ): THREE.Vector3[][] {
    const { bundleStrength, compatibilityThreshold, iterations, stepSize } = config;
    
    let currentEdges = edges.map(edge => [...edge]);
    
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
            
            if (compatibility > compatibilityThreshold && j < otherEdge.length) {
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
    controlPoints.forEach(point => {
      const elevatedPoint = point.clone();
      elevatedPoint.y += curveHeight;
      points.push(elevatedPoint);
    });
    
    points.push(endPoint);
    
    return new THREE.CatmullRomCurve3(points);
  }
}