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
  
  console.log(`Cleared HAP system for application: ${applicationId}`);
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

}

