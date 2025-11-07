import * as THREE from 'three';

export interface EdgeBundlingConfig {
  bundleStrength: number;
  compatibilityThreshold: number;
  iterations: number;
  stepSize: number;
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