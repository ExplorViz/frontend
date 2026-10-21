import { Text } from '@react-three/drei';
import { useImmersiveViewStore } from 'explorviz-frontend/src/stores/immersive-view-store';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { getImmersiveContentRadius } from 'explorviz-frontend/src/utils/city-rendering/immersive-target-position';
import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';

// This component defines the interface for the immersive view mode.
// That means the cards showm and the page naviogation.
// The sphere is defined in a seperate file.


const MAX_ARC_ANGLE = 160; // The angle on the sphere which can be used for the interface cards
/** World-space gap between card edges; converted to degrees so spacing stays stable across radii. */
const ITEM_GAP_ARC_LENGTH = 0.04;
/** Elevation of the separator ring — above attributes (0°) and below the header (30°). */
const RING_ELEVATION_DEG = 12;

export default function ImmersiveInterface() {
    const { activeMeshId, targetPosition, activeMetadata, fileDetailedData } = useImmersiveViewStore();

    const sphereRadius = useUserSettingsStore((state) => state.visualizationSettings.sphereRadius.value) || 0.7;
    const contentRadius = getImmersiveContentRadius(sphereRadius);

    const ringElevationRad = THREE.MathUtils.degToRad(RING_ELEVATION_DEG);
    const ringY = contentRadius * Math.sin(ringElevationRad);
    const ringHorizontalRadius = contentRadius * Math.cos(ringElevationRad);

    const [varPage, setVarPage] = useState(0);
    const [methodPage, setMethodPage] = useState(0);

    useEffect(() => {
        setVarPage(0);
        setMethodPage(0);
    }, [activeMeshId]);

    // Compute the positions of the cards and the pagination logic
    const { varPages, methodPages } = useMemo(() => {
        if (!activeMetadata && !fileDetailedData) return { varPages: [], methodPages: [] };

        const variables = fileDetailedData 
            ? fileDetailedData.classes.flatMap(c => c.fields.map(f => ({ name: f.name, type: f.type })))
            : activeMetadata?.variables || [];
        
        const methods = fileDetailedData
            ? [
                ...fileDetailedData.functions.map(f => ({ name: f.name, returnType: f.returnType, parameters: [] })),
                ...fileDetailedData.classes.flatMap(c => c.functions.map(f => ({ name: f.name, returnType: f.returnType, parameters: [] })))
              ]
            : activeMetadata?.methods || [];

        const estimateAngle = (textLength: number, radius: number) => {
            const estimatedWidth = (textLength * 0.032) + 0.15;
            return (estimatedWidth / radius) * (180 / Math.PI);
        };

        const itemGapAngle =
            (ITEM_GAP_ARC_LENGTH / contentRadius) * (180 / Math.PI);

        const layoutItems = (items: any[], type: 'var' | 'method') => {
            const pages: any[][] = [];
            let currentPage: any[] = [];
            let currentAngleSum = 0;

            items.forEach((item) => {
                let maxLen = 0;
                if (type === 'var') {
                    maxLen = Math.max(item.name.length, item.type.length);
                } else {
                    const paramLengths = item.parameters.slice(0, 2).map((p: any) => p.name.length + 4);
                    maxLen = Math.max(item.name.length, item.returnType.length, ...paramLengths);
                    maxLen += 4;
                }

                const itemAngle = estimateAngle(maxLen, contentRadius);

                if (currentAngleSum + itemAngle > MAX_ARC_ANGLE && currentPage.length > 0) {
                    pages.push(finalizePageLayout(currentPage));
                    currentPage = [];
                    currentAngleSum = 0;
                }

                currentPage.push({ ...item, angleSize: itemAngle });
                currentAngleSum += itemAngle + itemGapAngle;
            });

            if (currentPage.length > 0) {
                pages.push(finalizePageLayout(currentPage));
            }
            return pages;
        };

        const finalizePageLayout = (pageItems: any[]) => {
            const totalSpan = pageItems.reduce((acc, item) => acc + item.angleSize, 0)
                + (pageItems.length - 1) * itemGapAngle;
            let startAngle = -totalSpan / 2;
            return pageItems.map(item => {
                const centerAzimuth = startAngle + (item.angleSize / 2);
                startAngle += item.angleSize + itemGapAngle;
                return { ...item, calculatedAzimuth: centerAzimuth };
            });
        };

        return {
            varPages: layoutItems(variables, 'var'),
            methodPages: layoutItems(methods, 'method')
        };

    }, [activeMetadata, fileDetailedData, contentRadius]);


    if (!activeMeshId || !targetPosition || (!activeMetadata && !fileDetailedData)) {
        return null;
    }

    const name = fileDetailedData ? fileDetailedData.name : activeMetadata?.name;
    const fqn = fileDetailedData ? fileDetailedData.packageName : activeMetadata?.fqn;

    const currentVars = varPages[varPage] || [];
    const currentMethods = methodPages[methodPage] || [];

    return (
        <group position={targetPosition}>

            <ambientLight intensity={0.6} color="#ffffff" />
            <pointLight position={[0, 0, 0]} intensity={2.0} color="#ffffff" distance={5} decay={1} />

            {/* --- HEADER --- */}
            <SphereItem azimuth={0} elevation={30} radius={contentRadius}>
                <Text fontSize={0.15} color="black" anchorX="center" anchorY="middle" outlineWidth={0.005} outlineColor="white" renderOrder={2}>
                    {name}
                </Text>
                <Text position={[0, -0.16, 0]} fontSize={0.08} color="#333" anchorX="center" anchorY="middle" renderOrder={2}>
                    {fqn}
                </Text>
            </SphereItem>

            {/* --- RING (above attributes) --- */}
            <mesh position={[0, ringY, 0]} rotation={[Math.PI / 2, 0, 0]} renderOrder={1}>
                <torusGeometry args={[ringHorizontalRadius, 0.005, 16, 64]} />
                <meshStandardMaterial color="#888" roughness={0.2} metalness={0.8} />
            </mesh>

            {/* --- VARIABLES --- */}
            {currentVars.map((v: any, i: number) => (
                <SphereItem key={`var-${varPage}-${i}`} azimuth={v.calculatedAzimuth} elevation={0} radius={contentRadius}>
                    <VariableBox data={v} />
                </SphereItem>
            ))}

            {varPages.length > 1 && (
                <PageNav page={varPage} totalPages={varPages.length} setPage={setVarPage} elevation={0} radius={contentRadius} />
            )}

            {/* --- METHODS --- */}
            {currentMethods.map((m: any, i: number) => (
                <SphereItem key={`method-${methodPage}-${i}`} azimuth={m.calculatedAzimuth} elevation={-30} radius={contentRadius}>
                    <MethodBox data={m} />
                </SphereItem>
            ))}

            {methodPages.length > 1 && (
                <PageNav page={methodPage} totalPages={methodPages.length} setPage={setMethodPage} elevation={-30} radius={contentRadius} />
            )}

        </group>
    );
}


// Helper components (the boxes etc.)

function VariableBox({ data }: { data: { name: string; type: string } }) {
    const [widthScale, setWidthScale] = useState(0.25);
    const handleSync = (troika: any) => {
        if (!troika || !troika.textRenderInfo) return;
        const bounds = troika.textRenderInfo.blockBounds;
        const textWidth = bounds[2] - bounds[0];
        setWidthScale((prev) => Math.max(prev, textWidth + 0.25));
    };
    const iconX = -(widthScale / 2) + 0.08;
    return (
        <group>
            <mesh scale={[widthScale, 0.16, 1]} renderOrder={1}>
                <boxGeometry args={[1, 1, 0.02]} />
                <meshBasicMaterial color="#fffef8" />
            </mesh>
            <mesh position={[iconX, 0, 0.011]} renderOrder={1}>
                <circleGeometry args={[0.035, 32]} />
                <meshBasicMaterial color="#ff8800" />
            </mesh>
            <Text onSync={handleSync} position={[0.05, 0.03, 0.11]} fontSize={0.05} color="#4a3b2a" anchorX="center" anchorY="middle" renderOrder={2}>{data.name}</Text>
            <Text onSync={handleSync} position={[0.05, -0.03, 0.11]} fontSize={0.04} color="#8a7b6a" anchorX="center" anchorY="middle" renderOrder={2}>{data.type}</Text>
        </group>
    );
}

function MethodBox({ data }: { data: any }) {
    const [widthScale, setWidthScale] = useState(0.35);
    const paramCount = data.parameters.slice(0, 2).length;
    const height = 0.18 + (paramCount * 0.04);
    const handleSync = (troika: any) => {
        if (!troika || !troika.textRenderInfo) return;
        const bounds = troika.textRenderInfo.blockBounds;
        const textWidth = bounds[2] - bounds[0];
        setWidthScale((prev) => Math.max(prev, textWidth + 0.25));
    };
    const iconX = -(widthScale / 2) + 0.08;
    return (
        <group>
            <mesh scale={[widthScale, height, 1]} renderOrder={1}>
                <boxGeometry args={[1, 1, 0.02]} />
                <meshBasicMaterial color="#f7fbff" />
            </mesh>
            <mesh position={[iconX, height / 2 - 0.06, 0.011]} renderOrder={1}>
                <planeGeometry args={[0.06, 0.06]} />
                <meshBasicMaterial color="#007acc" />
            </mesh>
            <Text onSync={handleSync} position={[0.05, height / 2 - 0.05, 0.11]} fontSize={0.05} color="#003366" anchorX="center" anchorY="middle" renderOrder={2}>{data.name}</Text>
            <Text onSync={handleSync} position={[0.05, height / 2 - 0.10, 0.11]} fontSize={0.03} color="#5577aa" anchorX="center" anchorY="middle" renderOrder={2}>{data.returnType}</Text>
            {data.parameters.slice(0, 2).map((p: any, pIdx: number) => (
                <Text key={pIdx} onSync={handleSync} position={[0.05, height / 2 - 0.15 - (pIdx * 0.04), 0.11]} fontSize={0.03} color="#445566" anchorX="center" anchorY="middle" renderOrder={2}>• {p.name}</Text>
            ))}
        </group>
    );
}

function PageNav({ page, totalPages, setPage, elevation, radius }: any) {
    const borderAngle = (MAX_ARC_ANGLE / 2) + 10;
    return (
        <>
            {page > 0 && <SphereItem azimuth={-borderAngle} elevation={elevation} radius={radius}><NavButton onClick={() => setPage(page - 1)} label="<" /></SphereItem>}
            {page < totalPages - 1 && <SphereItem azimuth={borderAngle} elevation={elevation} radius={radius}><NavButton onClick={() => setPage(page + 1)} label=">" /></SphereItem>}
        </>
    );
}

function NavButton({ onClick, label }: { onClick: () => void, label: string }) {
    const [hovered, setHover] = useState(false);
    return (
        <group onClick={(e) => { e.stopPropagation(); onClick(); }} onPointerOver={() => setHover(true)} onPointerOut={() => setHover(false)}>
            <mesh><circleGeometry args={[0.08, 32]} /><meshStandardMaterial color={hovered ? "#ffffff" : "#eeeeee"} emissive="#333" roughness={0.2} /></mesh>
            <mesh position={[0, 0, -0.01]}><circleGeometry args={[0.09, 32]} /><meshStandardMaterial color="#666" /></mesh>
            <Text position={[0, 0, 0.1]} fontSize={0.1} color="#333" anchorX="center" anchorY="middle">{label}</Text>
        </group>
    )
}

function SphereItem({ azimuth, elevation, radius, children }: { azimuth: number, elevation: number, radius: number, children: React.ReactNode }) {
    const rotY = THREE.MathUtils.degToRad(-azimuth);
    const rotX = THREE.MathUtils.degToRad(elevation);
    return (
        <group rotation={[0, rotY, 0]}><group rotation={[rotX, 0, 0]}><group position={[0, 0, -radius]}><group rotation={[0, 0, 0]}>{children}</group></group></group></group>
    );
}