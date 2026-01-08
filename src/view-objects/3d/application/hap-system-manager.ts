import {
  HAPNode,
  HierarchicalAttractionSystem,
} from 'explorviz-frontend/src/view-objects/3d/application/edge-bundling-utils';
import * as THREE from 'three';

export class HAPSystemManager {
  private static instance: HAPSystemManager;
  private hapSystems: Map<string, HierarchicalAttractionSystem> = new Map();
  private elementToHAP: Map<string, HAPNode> = new Map();

  private landscapeHAPTree: HAPNode | null = null;
  private isTreeBuilding: boolean = false;

  private constructor() {}

  public static getInstance(): HAPSystemManager {
    if (!HAPSystemManager.instance) {
      HAPSystemManager.instance = new HAPSystemManager();
    }
    return HAPSystemManager.instance;
  }

  public buildLandscapeHAPTree(
    applications: any[],
    getPosition: (element: any) => THREE.Vector3,
    getLevel: (element: any) => number
  ): void {
    this.clearAllHAPSystems();
    this.isTreeBuilding = true;

    // 1. Create virtual landscape root (Level 3)
    const landscapeRoot: HAPNode = {
      id: 'LANDSCAPE_ROOT',
      position: new THREE.Vector3(0, 200, 0),
      level: 3,
      children: [],
      parent: null,
      element: { type: 'landscape', name: 'Complete Landscape' },
    };

    // 2. Create HAP for each application (arranged in a circle)
    applications.forEach((app, index) => {
      const angle = (index / applications.length) * Math.PI * 2;
      const radius = 150;

      const appNode: HAPNode = {
        id: `APP_${app.id}`,
        position: new THREE.Vector3(
          Math.cos(angle) * radius,
          60, // Fixed height for all applications
          Math.sin(angle) * radius
        ),
        level: 2, // Application level
        children: [],
        parent: landscapeRoot,
        element: app,
      };

      landscapeRoot.children.push(appNode);

      // 3. Build hierarchy for this application
      this.buildApplicationHierarchy(app, appNode, getPosition, getLevel);
    });

    this.landscapeHAPTree = landscapeRoot;
    this.registerHAPNodes(landscapeRoot);
    this.isTreeBuilding = false;
  }

  /**
   * Build HAP tree with optional leaf packages only filter
   */
  public buildApplicationHAPTree(
    applicationId: string,
    rootElement: any,
    getChildren: (element: any) => any[],
    getPosition: (element: any) => THREE.Vector3,
    getLevel: (element: any) => number,
    leafPackagesOnly: boolean = false
  ): void {
    // Clear existing system
    this.clearHAPSystem(applicationId);

    const hapSystem = new HierarchicalAttractionSystem();

    // Modified build function that respects leafPackagesOnly
    const buildTree = (
      element: any,
      parent: HAPNode | null,
      depth: number = 0
    ): HAPNode | null => {
      // Determine if HAP for this element should be created
      const shouldCreateHAP = this.shouldCreateHAPForElement(
        element,
        getChildren,
        leafPackagesOnly,
        depth
      );

      if (!shouldCreateHAP && element !== rootElement) {
        // Skip this element, but process its children
        const children = getChildren(element);
        children.forEach((child) => {
          buildTree(child, parent, depth + 1);
        });
        return null;
      }

      // Create HAP node
      const node: HAPNode = {
        id: element.id || Math.random().toString(),
        position: getPosition(element),
        level: getLevel(element),
        children: [],
        parent: parent,
        element: element,
      };

      // Process children
      const children = getChildren(element);
      children.forEach((child) => {
        const childNode = buildTree(child, node, depth + 1);
        if (childNode) {
          node.children.push(childNode);
        }
      });

      return node;
    };

    const rootHAP = buildTree(rootElement, null, 0);

    if (rootHAP) {
      hapSystem.setHAPTree(rootHAP);
      this.hapSystems.set(applicationId, hapSystem);
      this.registerHAPNodes(rootHAP);
    }
  }

  /**
   * Determine if HAP should be created for element
   */
  private shouldCreateHAPForElement(
    element: any,
    getChildren: (element: any) => any[],
    leafPackagesOnly: boolean,
    depth: number
  ): boolean {
    // Always create HAPs for:
    // 1. Root application
    // 2. Classes (level 0)
    // 3. Packages at level 1 (if not filtering)

    const children = getChildren(element);
    const hasSubPackages = children.some(
      (child) => child.type === 'package' || child.type === 'Package'
    );

    const isPackage = element.type === 'package' || element.type === 'Package';
    const isClass = element.type === 'class' || element.type === 'Class';
    const isApplication =
      element.type === 'application' || element.type === 'Application';

    // Always include root application
    if (depth === 0 && isApplication) {
      return true;
    }

    // Always include classes
    if (isClass) {
      return true;
    }

    // For packages:
    if (isPackage) {
      if (leafPackagesOnly) {
        // Only include leaf packages (no sub-packages)
        return !hasSubPackages;
      } else {
        // Include all packages
        return true;
      }
    }

    // Default: include other elements
    return true;
  }

  /**
   * Rebuild HAP tree with leafPackagesOnly setting
   */
  public rebuildHAPTreeWithLeafSetting(
    applicationId: string,
    rootElement: any,
    getChildren: (element: any) => any[],
    getPosition: (element: any) => THREE.Vector3,
    getLevel: (element: any) => number,
    leafPackagesOnly: boolean
  ): void {
    this.buildApplicationHAPTree(
      applicationId,
      rootElement,
      getChildren,
      getPosition,
      getLevel,
      leafPackagesOnly
    );
  }

  // Recursively register all HAP nodes
  private registerHAPNodes(node: HAPNode): void {
    if (node.element && node.element.id) {
      this.elementToHAP.set(node.element.id, node);
    }
    node.children.forEach((child) => this.registerHAPNodes(child));
  }

  // // Get HAP node for a software element
  // public getHAPNode(elementId: string): HAPNode | null {
  //   return this.elementToHAP.get(elementId) || null;
  // }

  // Get HAP system for an application
  public getHAPSystem(
    applicationId: string
  ): HierarchicalAttractionSystem | null {
    return this.hapSystems.get(applicationId) || null;
  }

  // Set global beta parameter
  public setGlobalBeta(beta: number): void {
    this.hapSystems.forEach((system) => system.setBeta(beta));
  }

  public clearHAPSystem(applicationId: string): void {
    this.hapSystems.delete(applicationId);

    // Delete all HAP-Nodes for application
    const elementsToRemove: string[] = [];
    this.elementToHAP.forEach((node, elementId) => {
      if (
        node.element &&
        this.isElementInApplication(node.element, applicationId)
      ) {
        elementsToRemove.push(elementId);
      }
    });

    elementsToRemove.forEach((elementId) => {
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

  public visualizeHAPs(applicationId: string, scene: THREE.Scene): void {
    const system = this.getHAPSystem(applicationId);
    if (!system) {
      return;
    }

    const landscapeGroup = scene.children.find(
      (child) => child.type === 'Group' && child.scale.x < 1
    ) as THREE.Group;

    if (!landscapeGroup) {
      return;
    }
    let hapGroup = landscapeGroup.children.find(
      (child) => child.name === 'HAP_GROUP'
    ) as THREE.Group;

    if (!hapGroup) {
      hapGroup = new THREE.Group();
      hapGroup.name = 'HAP_GROUP';
      landscapeGroup.add(hapGroup);
    } else {
      while (hapGroup.children.length > 0) {
        const child = hapGroup.children[0];
        hapGroup.remove(child);
        if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
          if (child.geometry) child.geometry.dispose();
          if (child.material) child.material.dispose();
        }
      }
    }

    const hapTree = system.getHAPTree();
    if (!hapTree) {
      return;
    }

    const scale = landscapeGroup.scale.x;
    const sizeMultiplier = 0.05 / scale;

    const drawHAPTree = (node: HAPNode) => {
      if (node.parent) {
        const lineGeometry = new THREE.BufferGeometry().setFromPoints([
          node.position.clone(),
          node.parent.position.clone(),
        ]);

        const lineMaterial = new THREE.LineBasicMaterial({
          color: this.getLevelColor(node.level),
          transparent: true,
          opacity: 0.6,
          linewidth: 2,
        });

        const line = new THREE.Line(lineGeometry, lineMaterial);
        line.name = `HAP_LINE_${node.id}`;
        hapGroup.add(line);
      }

      let size: number;
      switch (node.level) {
        case 0:
          size = 0.6 * sizeMultiplier;
          break;
        case 1:
          size = 0.4 * sizeMultiplier;
          break;
        case 2:
          size = 5 * sizeMultiplier;
          break;
        default:
          size = 0.4 * sizeMultiplier;
      }

      const geometry = new THREE.SphereGeometry(size);
      const material = new THREE.MeshBasicMaterial({
        color: this.getLevelColor(node.level),
        transparent: true,
        opacity: 0.8,
      });

      const sphere = new THREE.Mesh(geometry, material);
      sphere.position.copy(node.position);
      sphere.name = `HAP_SPHERE_${node.id}`;
      hapGroup.add(sphere);

      node.children.forEach((child) => drawHAPTree(child));
    };

    drawHAPTree(hapTree);
  }

  private getLevelColor(level: number): THREE.Color {
    switch (level) {
      case 0:
        return new THREE.Color(0xff0000); // Application - Red
      case 1:
        return new THREE.Color(0x00ff00); // Package - Green
      case 2:
        return new THREE.Color(0x0000ff); // Class - Blue
      default:
        return new THREE.Color(0xffffff);
    }
  }

  private buildApplicationHierarchy(
    element: any,
    parentHAP: HAPNode,
    getPosition: (element: any) => THREE.Vector3,
    getLevel: (element: any) => number
  ): void {
    // Safe way to get children
    let children: any[] = [];

    if (element.packages) children = element.packages;
    else if (element.subPackages) children = element.subPackages;
    else if (element.classes) children = element.classes;

    if (element.classes && element.subPackages) {
      children = [...element.subPackages, ...element.classes];
    }

    children.forEach((child) => {
      const childLevel = getLevel(child);
      const childPos = getPosition(child);

      const childNode: HAPNode = {
        id: child.id || `node_${Math.random().toString(36).substr(2, 9)}`,
        position: new THREE.Vector3(
          parentHAP.position.x + childPos.x * 0.3,
          childLevel * 15,
          parentHAP.position.z + childPos.z * 0.3
        ),
        level: childLevel,
        children: [],
        parent: parentHAP,
        element: child,
      };

      parentHAP.children.push(childNode);

      // Recursive for non-class elements
      if (childLevel > 0) {
        this.buildApplicationHierarchy(child, childNode, getPosition, getLevel);
      }
    });
  }

  public getHAPNode(elementId: string): HAPNode | null {
    // Check cache first
    if (this.elementToHAP.has(elementId)) {
      return this.elementToHAP.get(elementId)!;
    }

    // Search in global tree
    if (this.landscapeHAPTree) {
      const findNode = (node: HAPNode): HAPNode | null => {
        if (node.element?.id === elementId) {
          return node;
        }

        for (const child of node.children) {
          const found = findNode(child);
          if (found) return found;
        }

        return null;
      };

      const found = findNode(this.landscapeHAPTree);
      if (found) {
        this.elementToHAP.set(elementId, found);
        return found;
      }
    }

    return null;
  }

  public getLandscapeRoot(): HAPNode | null {
    return this.landscapeHAPTree;
  }

  public clearAllHAPSystems(): void {
    this.hapSystems.clear();
    this.elementToHAP.clear();
    this.landscapeHAPTree = null;
  }
}
