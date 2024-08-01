import { BoxGeometry, Mesh, MeshLambertMaterial, Object3D, Object3DEventMap, Vector3 } from "three";

export default class SimpleParentMesh extends Mesh
implements ChildMesh
{

    constructor(children: Object3D<Object3DEventMap>[] = []) {
        
        super();
        this.geometry = new BoxGeometry(1, 1, 1);
        // random color
        const color = Math.floor(Math.random() * 16777215);
        this.material = new MeshLambertMaterial({ color });
        this.dimensionsValue = new Vector3(1, 1, 1);
        this.add(...children);
    }

    private dimensionsValue: Vector3;
    get dimensions(): Vector3 {
        return this.dimensionsValue;
    }
    
    override add(...object: Object3D<Object3DEventMap>[]) : this {
        if(object.length === 0)
            return this;

        if(object.find(obj => !(obj as any)?.dimensions))
            throw new Error("All children must have dimensions");
        super.add(...object);
        
        const children = this.children as any as ChildMesh[];
        let largestChildWidth = Math.max(...children.map(child => 
            child.dimensions.clone().applyAxisAngle(new Vector3(0, 1, 0), (child as any as Object3D).rotation.y).x)
        );
        let largestChildDepth = Math.max(...children.map(child => 
            
            child.dimensions.clone().applyAxisAngle(new Vector3(0, 1, 0), (child as any as Object3D).rotation.y).z)
        );
        // abs
        largestChildWidth = Math.abs(largestChildWidth);
        largestChildDepth = Math.abs(largestChildDepth);
        // padding
        largestChildWidth += 5
        largestChildDepth += 5

        const count = Math.ceil(Math.sqrt(this.children.length));
        const count2 = count * count;

        const ownDimWidth = largestChildWidth * count;
        const ownDimDepth = largestChildDepth * Math.ceil(this.children.length / count);
        this.geometry = new BoxGeometry(ownDimWidth, 1, ownDimDepth);
        this.dimensionsValue = new Vector3(ownDimWidth, 1, ownDimDepth);

        const centerPoints =
            Array.from({ length: count2 }, (_, i) => i)
                .map(i => {
                    const width = i % count;
                    const depth = Math.floor(i / count);
                    return new Vector3(width * largestChildWidth, this.dimensions.y / 2, depth * largestChildDepth)
                     .add(new Vector3(largestChildWidth / 2, 0, largestChildDepth / 2))
                     .sub(new Vector3(ownDimWidth / 2, 0, ownDimDepth / 2));
                });
        
        children.forEach((child, i) => {
            this.updateChild(child, centerPoints[i]);
        });


        return this;
    }

    private updateChild(child: ChildMesh, centerPosition: Vector3){
        child.position.set(centerPosition.x, centerPosition.y + child.dimensions.y / 2, centerPosition.z);
    }
}

export interface ChildMesh {
    get dimensions(): Vector3;
    get position(): Vector3;
}