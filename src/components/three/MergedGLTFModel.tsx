import { useRef, useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import type { MergedGeometryGroup, MergeStats } from '@/utils/gltfMergePipeline'

interface MergedGLTFModelProps {
  mergedGroups: MergedGeometryGroup[]
  position?: [number, number, number]
  rotation?: [number, number, number]
  scale?: [number, number, number]
  castShadow?: boolean
  receiveShadow?: boolean
  visible?: boolean
  onLoad?: (stats: MergeStats) => void
}

export default function MergedGLTFModel({
  mergedGroups,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
  castShadow = false,
  receiveShadow = false,
  visible = true,
}: MergedGLTFModelProps) {
  const groupRef = useRef<THREE.Group>(null)
  const [hoveredMesh, setHoveredMesh] = useState<string | null>(null)

  const meshes = useMemo(() => {
    return mergedGroups.map((group, idx) => {
      const geometry = group.geometry
      const material = group.material.clone()
      const key = `merged-${group.materialKey}-${idx}`

      return { key, geometry, material, materialKey: group.materialKey }
    })
  }, [mergedGroups])

  useEffect(() => {
    return () => {
      for (const mesh of meshes) {
        mesh.geometry.dispose()
        mesh.material.dispose()
      }
    }
  }, [meshes])

  useFrame((state) => {
    if (!groupRef.current) return
    if (hoveredMesh) {
      const mat = (groupRef.current.getObjectByName(hoveredMesh) as THREE.Mesh)?.material as THREE.Material
      if (mat && 'emissive' in mat) {
        const time = state.clock.elapsedTime
        const pulse = (Math.sin(time * 4) + 1) * 0.5
        ;(mat as any).emissive.setRGB(0, pulse * 0.4, pulse * 0.6)
      }
    }
  })

  return (
    <group ref={groupRef} position={position} rotation={rotation} scale={scale} visible={visible}>
      {meshes.map(({ key, geometry, material, materialKey }) => (
        <mesh
          key={key}
          name={key}
          geometry={geometry}
          material={material}
          castShadow={castShadow}
          receiveShadow={receiveShadow}
          onPointerOver={(e) => {
            e.stopPropagation()
            document.body.style.cursor = 'pointer'
            setHoveredMesh(key)
          }}
          onPointerOut={(e) => {
            e.stopPropagation()
            document.body.style.cursor = 'auto'
            if ('emissive' in material) {
              ;(material as any).emissive.setRGB(0, 0, 0)
            }
            setHoveredMesh(null)
          }}
        />
      ))}
    </group>
  )
}
