import { BoxGeometry, Mesh, MeshLambertMaterial, Object3D, Object3DEventMap, Vector3 } from "three";

export default class SimpleParentMesh extends Mesh
implements ChildMesh
{

    constructor() {
        super();
        this.geometry = new BoxGeometry(1, 1, 1);
        this.material = new MeshLambertMaterial({ color: 0x00ff00 });
        this.dimensionsValue = new Vector3(1, 1, 1);
    }

    private dimensionsValue: Vector3;
    get dimensions(): Vector3 {
        return this.dimensionsValue;
    }
    
    override add(...object: Object3D<Object3DEventMap>[]) : this {
        // debugger;
        if(object.find(obj => !(obj as any).dimensions))
            throw new Error("All children must have dimensions");
        super.add(...object);
        
        const children = this.children as any as ChildMesh[];
        const largestChildWidth = Math.max(...children.map(child => child.dimensions.x));
        const largestChildDepth = Math.max(...children.map(child => child.dimensions.z));

        const count = Math.ceil(Math.sqrt(this.children.length));
        const count2 = count * count;

        let cellSize = Math.max(largestChildWidth, largestChildDepth);
        cellSize += 5; // padding
        const ownDimWidth = cellSize * count;
        const ownDimDepth = cellSize * Math.ceil(this.children.length / count);
        this.geometry = new BoxGeometry(ownDimWidth, 1, ownDimDepth);
        this.dimensionsValue = new Vector3(ownDimWidth, 1, ownDimDepth);

        const centerPoints =
            Array.from({ length: count2 }, (_, i) => i)
                .map(i => {
                    const width = i % count;
                    const depth = Math.floor(i / count);
                    return new Vector3(width * cellSize, this.position.y + this.dimensions.y, depth * cellSize)
                     .add(new Vector3(cellSize / 2, 0, cellSize / 2))
                     .sub(new Vector3(ownDimWidth / 2, 0, ownDimDepth / 2));
                });
        
        children.forEach((child, i) => {
            console.log("child", child);
            console.log("centerPoints[i]", centerPoints[i]);
            this.updateChild(child, centerPoints[i]);
        });


        return this;
    }

    private updateChild(child: ChildMesh, centerPosition: Vector3){
        child.position.set(centerPosition.x, centerPosition.y, centerPosition.z);
    }
}

export interface ChildMesh {
    get dimensions(): Vector3;
    get position(): Vector3;
}