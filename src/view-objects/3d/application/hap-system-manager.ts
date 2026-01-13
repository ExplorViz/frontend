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

  // Cached geometries and materials for performance
  private sphereGeometries: Map<number, THREE.SphereGeometry> = new Map();
  private lineMaterials: Map<number, THREE.LineBasicMaterial> = new Map();
  private sphereMaterials: Map<number, THREE.MeshBasicMaterial> = new Map();
  private colorCache: Map<number, THREE.Color> = new Map();

  private constructor() {
    // Pre-cache colors
    this.colorCache.set(0, new THREE.Color(0xff0000)); // Application - Red
    this.colorCache.set(1, new THREE.Color(0x00ff00)); // Package - Green
    this.colorCache.set(2, new THREE.Color(0x0000ff)); // Class - Blue
    this.colorCache.set(3, new THREE.Color(0xffffff)); // Default
  }

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

    // 1. Create virtual landscape root (Level 3)
    const landscapeRoot: HAPNode = {
      id: 'LANDSCAPE_ROOT',
      position: new THREE.Vector3(0, 200, 0),
      level: 3,
      children: [],
      parent: null,
      element: { type: 'landscape', name: 'Complete Landscape' },
    };

    // 2. Create HAP for each application using actual layout positions
    applications.forEach((app) => {
      const appPosition = getPosition(app);
      const appLevel = getLevel(app);

      const appNode: HAPNode = {
        id: `APP_${app.id}`,
        position: appPosition,
        level: appLevel,
        children: [],
        parent: landscapeRoot,
        element: app,
      };

      landscapeRoot.children.push(appNode);

      // 3. Build hierarchy for this application
      // Create a wrapper for getPosition that includes application context
      const getPositionWithApp = (element: any) => {
        // If element is the application itself, use getPosition directly
        if (element.type === 'application' || element === app) {
          return getPosition(element);
        }
        // For packages and classes, we need to add the app's position offset
        // Store app reference temporarily on element for position calculation
        const originalApp = element._tempApp;
        element._tempApp = app;
        const pos = getPosition(element);
        // Restore original
        if (originalApp !== undefined) {
          element._tempApp = originalApp;
        } else {
          delete element._tempApp;
        }
        return pos;
      };
      this.buildApplicationHierarchy(
        app,
        appNode,
        getPositionWithApp,
        getLevel,
        app
      );
    });

    this.landscapeHAPTree = landscapeRoot;
    this.registerHAPNodes(landscapeRoot);

    // 4. Create a HierarchicalAttractionSystem for the landscape
    const landscapeHAPSystem = new HierarchicalAttractionSystem();
    landscapeHAPSystem.setHAPTree(landscapeRoot);
    this.hapSystems.set('LANDSCAPE', landscapeHAPSystem);
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

  // Recursively register all HAP nodes - optimized iterative version
  private registerHAPNodes(root: HAPNode): void {
    const stack: HAPNode[] = [root];

    while (stack.length > 0) {
      const node = stack.pop()!;

      if (node.element && node.element.id) {
        this.elementToHAP.set(node.element.id, node);
      }

      // Add children to stack in reverse order to maintain traversal order
      for (let i = node.children.length - 1; i >= 0; i--) {
        stack.push(node.children[i]);
      }
    }
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
  public setGlobalBeta(_beta: number): void {
    // Note: Beta is now managed within each HierarchicalAttractionSystem instance
    // This method is kept for backwards compatibility but currently does nothing
    // If needed, add a setBeta method to HierarchicalAttractionSystem
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

  public visualizeHAPs(
    applicationId: string,
    scene: THREE.Scene,
    layoutMap?: Map<string, any>
  ): void {
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

    // Use unique group name based on applicationId to avoid conflicts
    const groupName = `HAP_GROUP_${applicationId}`;
    let hapGroup = landscapeGroup.children.find(
      (child) => child.name === groupName
    ) as THREE.Group;

    if (!hapGroup) {
      hapGroup = new THREE.Group();
      hapGroup.name = groupName;
      landscapeGroup.add(hapGroup);
    } else {
      // Clear existing children more efficiently
      // Only dispose geometries we created (lines), not cached ones
      for (let i = hapGroup.children.length - 1; i >= 0; i--) {
        const child = hapGroup.children[i];
        if (child instanceof THREE.Line && child.geometry) {
          child.geometry.dispose();
        } else if (child instanceof THREE.InstancedMesh) {
          // Don't dispose geometry/material for instanced meshes (they're shared)
          child.dispose();
        }
      }
      hapGroup.clear();
    }

    const hapTree = system.getHAPTree();
    if (!hapTree) {
      return;
    }

    const scale = landscapeGroup.scale.x;
    const sizeMultiplier = 0.05 / scale;

    // For application-level HAP trees, we need to transform relative coordinates to world coordinates
    // The root node (application) is in landscape coordinates, children have relative coordinates to the application
    const isApplicationTree = applicationId !== 'LANDSCAPE';

    // Get application corner position for coordinate transformation
    let appCornerPosition = new THREE.Vector3(0, 0, 0);
    if (isApplicationTree && hapTree.element?.id && layoutMap) {
      const appLayout = layoutMap.get(hapTree.element.id);
      if (appLayout) {
        appCornerPosition = appLayout.position.clone();
      }
    }

    // Helper function to get visualization position (transforms relative to world for app trees)
    const getVisPosition = (node: HAPNode): THREE.Vector3 => {
      if (!isApplicationTree || node === hapTree) {
        // Landscape tree or application root: use position as-is
        return node.position.clone();
      }
      // Application tree children: add application corner position to convert relative to world coords
      return node.position.clone().add(appCornerPosition);
    };

    // Collect nodes by level for instancing
    const nodesByLevel: Map<
      number,
      Array<{ node: HAPNode; size: number; position: THREE.Vector3 }>
    > = new Map();
    const linesToAdd: THREE.Line[] = [];

    // First pass: collect all nodes and categorize by level
    const stack: HAPNode[] = [hapTree];
    while (stack.length > 0) {
      const node = stack.pop()!;

      // Get visualization position for this node
      const nodeVisPos = getVisPosition(node);

      // Create line to parent if exists
      if (node.parent) {
        const parentVisPos = getVisPosition(node.parent);
        const lineGeometry = new THREE.BufferGeometry().setFromPoints([
          nodeVisPos,
          parentVisPos,
        ]);

        const line = new THREE.Line(
          lineGeometry,
          this.getLineMaterial(node.level)
        );
        line.name = `HAP_LINE_${node.id}`;
        linesToAdd.push(line);
      }

      // Determine size based on level
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

      // Categorize by level
      if (!nodesByLevel.has(node.level)) {
        nodesByLevel.set(node.level, []);
      }
      nodesByLevel.get(node.level)!.push({ node, size, position: nodeVisPos });

      // Add children to stack
      for (let i = node.children.length - 1; i >= 0; i--) {
        stack.push(node.children[i]);
      }
    }

    // Second pass: create instanced meshes for each level
    const dummy = new THREE.Object3D();
    nodesByLevel.forEach((nodes, level) => {
      if (nodes.length === 0) return;

      // Use the size from the first node (all same level should have same size)
      const size = nodes[0].size;
      const geometry = this.getSphereGeometry(size);
      const material = this.getSphereMaterial(level);

      // Create instanced mesh
      const instancedMesh = new THREE.InstancedMesh(
        geometry,
        material,
        nodes.length
      );
      instancedMesh.name = `HAP_INSTANCED_LEVEL_${level}`;

      // Set positions for all instances
      nodes.forEach(({ position }, index) => {
        dummy.position.copy(position);
        dummy.updateMatrix();
        instancedMesh.setMatrixAt(index, dummy.matrix);
      });

      instancedMesh.instanceMatrix.needsUpdate = true;
      hapGroup.add(instancedMesh);
    });

    // Add lines (can't be instanced easily due to different endpoints)
    hapGroup.add(...linesToAdd);
  }

  private getLevelColor(level: number): THREE.Color {
    return this.colorCache.get(level) || this.colorCache.get(3)!;
  }

  // Get or create cached sphere geometry
  private getSphereGeometry(size: number): THREE.SphereGeometry {
    const key = Math.round(size * 10000); // Use rounded key for caching
    if (!this.sphereGeometries.has(key)) {
      // Use lower segment count for better performance
      this.sphereGeometries.set(key, new THREE.SphereGeometry(size, 8, 6));
    }
    return this.sphereGeometries.get(key)!;
  }

  // Get or create cached line material
  private getLineMaterial(level: number): THREE.LineBasicMaterial {
    if (!this.lineMaterials.has(level)) {
      this.lineMaterials.set(
        level,
        new THREE.LineBasicMaterial({
          color: this.getLevelColor(level),
          transparent: true,
          opacity: 0.6,
          linewidth: 2,
        })
      );
    }
    return this.lineMaterials.get(level)!;
  }

  // Get or create cached sphere material
  private getSphereMaterial(level: number): THREE.MeshBasicMaterial {
    if (!this.sphereMaterials.has(level)) {
      this.sphereMaterials.set(
        level,
        new THREE.MeshBasicMaterial({
          color: this.getLevelColor(level),
          transparent: true,
          opacity: 0.8,
        })
      );
    }
    return this.sphereMaterials.get(level)!;
  }

  private buildApplicationHierarchy(
    element: any,
    parentHAP: HAPNode,
    getPosition: (element: any) => THREE.Vector3,
    getLevel: (element: any) => number,
    application: any
  ): void {
    // Safe way to get children - optimized to avoid array spread when not needed
    let children: any[] = [];

    if (element.packages) {
      children = element.packages;
    } else if (element.subPackages && element.classes) {
      // Only spread if both exist
      children = [...element.subPackages, ...element.classes];
    } else if (element.subPackages) {
      children = element.subPackages;
    } else if (element.classes) {
      children = element.classes;
    }

    // Pre-allocate array if we know the size
    if (children.length > 0) {
      parentHAP.children = new Array(children.length);
    }

    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const childLevel = getLevel(child);
      const childPos = getPosition(child);

      const childNode: HAPNode = {
        id: child.id || `node_${Math.random().toString(36).substr(2, 9)}`,
        position: childPos, // Use the position directly from getPosition (already in world coordinates)
        level: childLevel,
        children: [],
        parent: parentHAP,
        element: child,
      };

      parentHAP.children[i] = childNode;

      // Recursive for non-class elements
      if (childLevel > 0) {
        this.buildApplicationHierarchy(
          child,
          childNode,
          getPosition,
          getLevel,
          application
        );
      }
    }
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

  // Dispose of cached geometries and materials
  public dispose(): void {
    // Dispose geometries
    this.sphereGeometries.forEach((geometry) => geometry.dispose());
    this.sphereGeometries.clear();

    // Dispose materials
    this.lineMaterials.forEach((material) => material.dispose());
    this.lineMaterials.clear();

    this.sphereMaterials.forEach((material) => material.dispose());
    this.sphereMaterials.clear();

    // Clear systems and trees
    this.clearAllHAPSystems();
  }
}
