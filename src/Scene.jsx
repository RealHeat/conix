import { useMemo } from 'react'
import { Line, Grid } from '@react-three/drei'
import * as THREE from 'three'
import { computeIntersection, planeNormalFromEuler } from './conic'

// Gruvbox palette
const G = {
  blue: '#83a598',
  blueDark: '#458588',
  purple: '#d3869b',
  yellow: '#fabd2f',
  red: '#fb4934',
  green: '#b8bb26',
  aqua: '#8ec07c',
  fg: '#ebdbb2',
  gray: '#7c6f64',
  grayDim: '#3c3836',
}

function DoubleCone({ height = 4 }) {
  // Three.js ConeGeometry: tip at +Y, base at -Y, height along Y.
  // We want each nappe with TIP AT ORIGIN and base at z = ±height.
  // For the upper nappe: rotate so the local +Y maps to -Z, then translate
  // up by `height` so the tip (originally at +Y of the un-rotated geometry,
  // now at -Z relative to the rotated mesh's origin) lands at z = 0.
  //
  // Easier: the geometry's apex sits at +height/2 in local space. Position
  // the mesh so that apex-in-world is at z=0. After rotation about X by
  // ±π/2, +Y axis maps to ±Z. So:
  //   Upper nappe (apex at z=0, base at +z): rotation [-π/2, 0, 0] → +Y → +Z.
  //     Mesh origin at z = -height/2  → apex at z = 0, base at z = +height. ✗
  //   Wait, geometry apex is at local +Y = +height/2. After rotation [-π/2,0,0],
  //   +Y → +Z, so apex at local +Z = +height/2. To place apex at world z=0,
  //   set mesh position to (0, 0, -height/2). Base then at z = -height. ✗
  // We want apex at 0, base at +height (upper nappe). So we need the apex
  // to map to +Z in mesh local, not -Z. Use rotation [+π/2, 0, 0]:
  //   +Y → -Z, so apex at local -Z = -height/2. Position (0,0,+height/2)
  //   places apex at world z=0, base (originally -Y → +Z) at z=+height.  ✓
  //
  // Lower nappe: rotation [-π/2, 0, 0], position (0,0,-height/2).
  //   +Y → +Z, apex at local +Z = +height/2. Position -height/2 → apex at 0,
  //   base at -height. ✓

  const geom = useMemo(
    () => new THREE.ConeGeometry(height, height, 96, 1, true),
    [height]
  )

  const surface = (
    <meshPhysicalMaterial
      color={G.blue}
      transmission={0.9}
      thickness={0.4}
      roughness={0.25}
      metalness={0.05}
      transparent
      opacity={0.28}
      side={THREE.DoubleSide}
      clearcoat={0.5}
    />
  )

  const wire = (
    <meshBasicMaterial color={G.aqua} wireframe transparent opacity={0.18} />
  )

  return (
    <group>
      {/* Upper nappe: apex at origin, opens toward +Z.
          ConeGeometry apex sits at local +Y; rotation [-π/2,0,0] maps +Y→-Z,
          so apex lands at local -height/2. Translating up by +height/2 puts
          the apex at world z=0 and the base at z=+height. */}
      <mesh geometry={geom} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, height / 2]}>
        {surface}
      </mesh>
      <mesh geometry={geom} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, height / 2]}>
        {wire}
      </mesh>
      {/* Lower nappe: apex at origin, opens toward -Z. */}
      <mesh geometry={geom} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -height / 2]}>
        {surface}
      </mesh>
      <mesh geometry={geom} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -height / 2]}>
        {wire}
      </mesh>
    </group>
  )
}

function CuttingPlane({ normal, distance, size = 10 }) {
  // Place the plane mesh at the foot of perpendicular: p = d * n.
  const center = useMemo(
    () => [normal[0] * distance, normal[1] * distance, normal[2] * distance],
    [normal, distance]
  )
  const quat = useMemo(() => {
    const q = new THREE.Quaternion()
    q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(...normal))
    return q
  }, [normal])
  const edgesGeom = useMemo(
    () => new THREE.EdgesGeometry(new THREE.PlaneGeometry(size, size)),
    [size]
  )

  return (
    <group position={center} quaternion={quat}>
      <mesh>
        <planeGeometry args={[size, size]} />
        <meshPhysicalMaterial
          color={G.purple}
          transmission={0.6}
          thickness={0.3}
          roughness={0.15}
          transparent
          opacity={0.22}
          side={THREE.DoubleSide}
        />
      </mesh>
      <lineSegments geometry={edgesGeom}>
        <lineBasicMaterial color={G.purple} transparent opacity={0.85} />
      </lineSegments>
    </group>
  )
}

function IntersectionCurve({ normal, distance, zLimit }) {
  const polylines = useMemo(
    () => computeIntersection(normal, distance, zLimit, 720),
    [normal, distance, zLimit]
  )
  return (
    <group>
      {polylines.map((seg, i) => (
        <Line key={i} points={seg} color={G.yellow} lineWidth={4} />
      ))}
    </group>
  )
}

function Axes({ length = 5 }) {
  const axes = [
    { dir: [length, 0, 0], color: G.red },
    { dir: [0, length, 0], color: G.green },
    { dir: [0, 0, length], color: G.blueDark },
  ]
  return (
    <group>
      {axes.map((a, i) => (
        <Line
          key={i}
          points={[[0, 0, 0], a.dir]}
          color={a.color}
          lineWidth={1.4}
          transparent
          opacity={0.55}
        />
      ))}
    </group>
  )
}

export default function Scene({ pitch, roll, distance, coneHeight }) {
  const normal = useMemo(() => planeNormalFromEuler(pitch, roll), [pitch, roll])

  return (
    // Rotate scene so the cone's z-axis appears vertical to the camera.
    <group rotation={[-Math.PI / 2, 0, 0]}>
      <ambientLight intensity={0.55} />
      <directionalLight position={[8, 10, 5]} intensity={1.0} color={G.fg} />
      <directionalLight position={[-6, -4, -8]} intensity={0.35} color={G.blue} />
      <pointLight position={[0, 0, 0]} intensity={0.4} color={G.yellow} distance={5} />

      <Grid
        args={[24, 24]}
        cellSize={0.5}
        cellThickness={0.6}
        cellColor={G.grayDim}
        sectionSize={2}
        sectionThickness={1.0}
        sectionColor={G.gray}
        fadeDistance={26}
        fadeStrength={1}
        infiniteGrid
        position={[0, 0, -coneHeight - 0.001]}
        rotation={[Math.PI / 2, 0, 0]}
      />

      <Axes length={Math.max(coneHeight + 1, 4)} />
      <DoubleCone height={coneHeight} />
      <CuttingPlane normal={normal} distance={distance} size={coneHeight * 2.4} />
      <IntersectionCurve normal={normal} distance={distance} zLimit={coneHeight} />
    </group>
  )
}
