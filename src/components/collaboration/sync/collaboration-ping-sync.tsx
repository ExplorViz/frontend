import { pingPosition } from 'explorviz-frontend/src/view-objects/3d/application/animated-ping-r3f';
import { RPC } from 'playroomkit';
import { useEffect } from 'react';
import * as THREE from 'three';

// This component is responsible to listen for pings from others in the current room

export default function CollaborationPingSync() {
    useEffect(() => {
        RPC.register('ping', async (data: any) => {
            if (data && data.pos) {
                const pos = new THREE.Vector3().fromArray(data.pos);
                pingPosition(pos, data.color, false);
            }
        });
    }, []);

    return null;
}