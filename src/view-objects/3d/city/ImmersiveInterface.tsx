import { Text } from '@react-three/drei';
import { useImmersiveViewStore } from 'explorviz-frontend/src/stores/immersive-view-store';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';

// This component defines the interface for the immersive view mode.
// That means the cards showm and the page naviogation.
// The sphere is defined in a seperate file.


const MAX_ARC_ANGLE = 160; // The angle on the sphere which can be used for the interface cards
const ITEM_GAP_ANGLE = 5;  // The distance between to cards (also given as an angle)

export default function ImmersiveInterface() {
    const { activeMeshId, targetPosition, activeMetadata } = useImmersiveViewStore();

    const sphereRadius = useUserSettingsStore((state) => state.visualizationSettings.sphereRadius.value) || 0.7;

    const ringRadius = sphereRadius + 0.1;

    const [varPage, setVarPage] = useState(0);
    const [methodPage, setMethodPage] = useState(0);

    useEffect(() => {
        setVarPage(0);
        setMethodPage(0);
    }, [activeMeshId]);

    // Compute the positions of the cards and the pagination logic
    const { varPages, methodPages } = useMemo(() => {
        if (!activeMetadata) return { varPages: [], methodPages: [] };

        const estimateAngle = (textLength: number, radius: number) => {
            const estimatedWidth = (textLength * 0.032) + 0.15;
            return (estimatedWidth / radius) * (180 / Math.PI);
        };

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

                const itemAngle = estimateAngle(maxLen, sphereRadius);

                if (currentAngleSum + itemAngle > MAX_ARC_ANGLE && currentPage.length > 0) {
                    pages.push(finalizePageLayout(currentPage));
                    currentPage = [];
                    currentAngleSum = 0;
                }

                currentPage.push({ ...item, angleSize: itemAngle });
                currentAngleSum += itemAngle + ITEM_GAP_ANGLE;
            });

            if (currentPage.length > 0) {
                pages.push(finalizePageLayout(currentPage));
            }
            return pages;
        };

        const finalizePageLayout = (pageItems: any[]) => {
            const totalSpan = pageItems.reduce((acc, item) => acc + item.angleSize, 0)
                + (pageItems.length - 1) * ITEM_GAP_ANGLE;
            let startAngle = -totalSpan / 2;
            return pageItems.map(item => {
                const centerAzimuth = startAngle + (item.angleSize / 2);
                startAngle += item.angleSize + ITEM_GAP_ANGLE;
                return { ...item, calculatedAzimuth: centerAzimuth };
            });
        };

        return {
            varPages: layoutItems(activeMetadata.variables, 'var'),
            methodPages: layoutItems(activeMetadata.methods, 'method')
        };

    }, [activeMetadata, sphereRadius]);


    if (!activeMeshId || !targetPosition || !activeMetadata) {
        return null;
    }

    const currentVars = varPages[varPage] || [];
    const currentMethods = methodPages[methodPage] || [];

    return (
        <group position={targetPosition}>

            <ambientLight intensity={0.6} color="#ffffff" />
            <pointLight position={[0, 0, 0]} intensity={2.0} color="#ffffff" distance={5} decay={1} />

            {/* --- HEADER --- */}
            <SphereItem azimuth={0} elevation={30} radius={sphereRadius + 0.1}>
                <Text fontSize={0.15} color="black" anchorX="center" anchorY="middle" outlineWidth={0.005} outlineColor="white">
                    {activeMetadata.name}
                </Text>
                <Text position={[0, -0.08, 0]} fontSize={0.08} color="#333" anchorX="center" anchorY="middle">
                    {activeMetadata.fqn}
                </Text>
            </SphereItem>

            {/* --- RING --- */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[ringRadius, 0.005, 16, 64]} />
                <meshStandardMaterial color="#888" roughness={0.2} metalness={0.8} />
            </mesh>

            {/* --- VARIABLES --- */}
            {currentVars.map((v: any, i: number) => (
                <SphereItem key={`var-${varPage}-${i}`} azimuth={v.calculatedAzimuth} elevation={0} radius={sphereRadius + 0.05}>
                    <VariableBox data={v} />
                </SphereItem>
            ))}

            {varPages.length > 1 && (
                <PageNav page={varPage} totalPages={varPages.length} setPage={setVarPage} elevation={0} radius={sphereRadius + 0.05} />
            )}

            {/* --- METHODS --- */}
            {currentMethods.map((m: any, i: number) => (
                <SphereItem key={`method-${methodPage}-${i}`} azimuth={m.calculatedAzimuth} elevation={-30} radius={sphereRadius + 0.05}>
                    <MethodBox data={m} />
                </SphereItem>
            ))}

            {methodPages.length > 1 && (
                <PageNav page={methodPage} totalPages={methodPages.length} setPage={setMethodPage} elevation={-30} radius={sphereRadius + 0.05} />
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
            <mesh scale={[widthScale, 0.16, 1]}>
                <boxGeometry args={[1, 1, 0.02]} />
                <meshStandardMaterial color="#fffbf0" emissive="#665544" emissiveIntensity={0.1} roughness={0.9} metalness={0.0} />
            </mesh>
            <mesh position={[iconX, 0, 0.011]}>
                <circleGeometry args={[0.035, 32]} />
                <meshStandardMaterial color="#ff8800" roughness={0.5} />
            </mesh>
            <Text onSync={handleSync} position={[0.05, 0.03, 0.11]} fontSize={0.05} color="#4a3b2a" anchorX="center" anchorY="middle">{data.name}</Text>
            <Text onSync={handleSync} position={[0.05, -0.03, 0.11]} fontSize={0.04} color="#8a7b6a" anchorX="center" anchorY="middle">{data.type}</Text>
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
            <mesh scale={[widthScale, height, 1]}>
                <boxGeometry args={[1, 1, 0.02]} />
                <meshStandardMaterial color="#f0f6fc" emissive="#112233" emissiveIntensity={0.15} roughness={0.2} metalness={0.3} />
            </mesh>
            <mesh position={[iconX, height / 2 - 0.06, 0.011]}>
                <planeGeometry args={[0.06, 0.06]} />
                <meshStandardMaterial color="#007acc" metalness={0.5} roughness={0.2} />
            </mesh>
            <Text onSync={handleSync} position={[0.05, height / 2 - 0.05, 0.11]} fontSize={0.05} color="#003366" anchorX="center" anchorY="middle">{data.name}</Text>
            <Text onSync={handleSync} position={[0.05, height / 2 - 0.10, 0.11]} fontSize={0.03} color="#5577aa" anchorX="center" anchorY="middle">{data.returnType}</Text>
            {data.parameters.slice(0, 2).map((p: any, pIdx: number) => (
                <Text key={pIdx} onSync={handleSync} position={[0.05, height / 2 - 0.15 - (pIdx * 0.04), 0.11]} fontSize={0.03} color="#445566" anchorX="center" anchorY="middle">• {p.name}</Text>
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