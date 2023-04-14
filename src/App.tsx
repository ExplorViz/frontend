import { Canvas } from '@react-three/fiber'
import { OrbitControls, RoundedBox } from '@react-three/drei'

export default function App() {
  return (
    <Canvas>
      <ambientLight intensity={0.5} />
      <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />
      <pointLight position={[-10, -10, -10]} />
      <RoundedBox/>
      <OrbitControls />
    </Canvas>
  )
}