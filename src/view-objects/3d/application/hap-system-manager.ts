import { HierarchicalAttractionSystem, HAPNode } from './edge-bundling-utils';
import * as THREE from 'three';

export class HAPSystemManager {
  private static instance: HAPSystemManager;
  private hapSystems: Map<string, HierarchicalAttractionSystem> = new Map();
  private elementToHAP: Map<string, HAPNode> = new Map();

  private constructor() {}

  public static getInstance(): HAPSystemManager {
    if (!HAPSystemManager.instance) {
      HAPSystemManager.instance = new HAPSystemManager();
    }
    return HAPSystemManager.instance;
  }

  // Build HAP tree for an application
  public buildApplicationHAPTree(
    applicationId: string,
    rootElement: any,
    getChildren: (element: any) => any[],
    getPosition: (element: any) => THREE.Vector3,
    getLevel: (element: any) => number
  ): void {
    const hapSystem = new HierarchicalAttractionSystem();
    const rootHAP = hapSystem.buildHAPTree(rootElement, getChildren, getPosition, getLevel);
    
    this.hapSystems.set(applicationId, hapSystem);
    this.registerHAPNodes(rootHAP);
  }

  // Recursively register all HAP nodes
  private registerHAPNodes(node: HAPNode): void {
    if (node.element && node.element.id) {
      this.elementToHAP.set(node.element.id, node);
    }
    node.children.forEach(child => this.registerHAPNodes(child));
  }

  // Get HAP node for a software element
  public getHAPNode(elementId: string): HAPNode | null {
    return this.elementToHAP.get(elementId) || null;
  }

  // Get HAP system for an application
  public getHAPSystem(applicationId: string): HierarchicalAttractionSystem | null {
    return this.hapSystems.get(applicationId) || null;
  }

  // Set global beta parameter
  public setGlobalBeta(beta: number): void {
    this.hapSystems.forEach(system => system.setBeta(beta));
  }

public clearHAPSystem(applicationId: string): void {
  this.hapSystems.delete(applicationId);
  
  // Delete all HAP-Nodes for application
  const elementsToRemove: string[] = [];
  this.elementToHAP.forEach((node, elementId) => {
    if (node.element && this.isElementInApplication(node.element, applicationId)) {
      elementsToRemove.push(elementId);
    }
  });
  
  elementsToRemove.forEach(elementId => {
    this.elementToHAP.delete(elementId);
  });
}

private isElementInApplication(element: any, applicationId: string): boolean {
  let current = element;
  while (current && current.parent) {
    if (current.id === applicationId) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

// HAP-visualization
public visualizeHAPs(applicationId: string, scene: THREE.Scene): void {
  const system = this.getHAPSystem(applicationId);
  if (!system) return;

  const hapTree = system.getHAPTree();
  if (!hapTree) return;

  const visualizeNode = (node: HAPNode) => {
    // Visualize HAPs as spheres
    const geometry = new THREE.SphereGeometry(0.5);
    const material = new THREE.MeshBasicMaterial({ 
      color: this.getLevelColor(node.level),
      transparent: true,
      opacity: 0.7
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(node.position);
    scene.add(mesh);

    // Connection to parent
    if (node.parent) {
      const lineGeometry = new THREE.BufferGeometry().setFromPoints([
        node.position,
        node.parent.position
      ]);
      const lineMaterial = new THREE.LineBasicMaterial({ 
        color: this.getLevelColor(node.level),
        transparent: true,
        opacity: 0.3
      });
      const line = new THREE.Line(lineGeometry, lineMaterial);
      scene.add(line);
    }

    node.children.forEach(child => visualizeNode(child));
  };

  visualizeNode(hapTree);
}

private getLevelColor(level: number): THREE.Color {
  switch(level) {
    case 0: return new THREE.Color(0xff0000); // Class - Blue
    case 1: return new THREE.Color(0x00ff00); // Package - Green  
    case 2: return new THREE.Color(0x0000ff); // Application - Red
    default: return new THREE.Color(0xffffff);
  }
}

}



