import { useState, useEffect, useCallback, useRef } from 'react'
import { Html } from '@react-three/drei'
import MergedGLTFModel from '@/components/three/MergedGLTFModel'
import {
  loadAndMergeGLTF,
  loadAndMergeWithWorker,
  processScene,
  type ModelLoadResult,
} from '@/utils/gltfMergePipeline'
import * as THREE from 'three'
import { useTwinStore } from '@/stores/twinStore'
import { bayRowTierToPosition, getBlockBounds } from '@/utils/yardUtils'

interface YardModelLoaderProps {
  modelUrl?: string
  useWorker?: boolean
  showLoadingUI?: boolean
}

const generateProgrammaticYard = (): ModelLoadResult => {
  const scene = new THREE.Group()
  const yardLayout = useTwinStore.getState().yardLayout
  if (!yardLayout) {
    return { mergedGroups: [], stats: {
      originalMeshCount: 0,
      mergedMeshCount: 0,
      materialGroupCount: 0,
      totalVertices: 0,
      totalIndices: 0,
      processingTimeMs: 0,
    } }
  }

  for (let blockIdx = 0; blockIdx < yardLayout.blocks.length; blockIdx++) {
    const block = yardLayout.blocks[blockIdx]
    const blockGroup = new THREE.Group()

    const bounds = getBlockBounds(block, yardLayout)
    const width = bounds.max.x - bounds.min.x
    const depth = bounds.max.y - bounds.min.y

    const blockMat = new THREE.MeshStandardMaterial({
      color: 0x1a2a3a,
      metalness: 0.3,
      roughness: 0.7,
    })

    const groundGeo = new THREE.BoxGeometry(width, 0.3, depth)
    const groundMesh = new THREE.Mesh(groundGeo, blockMat)
    groundMesh.position.set(
      (bounds.min.x + bounds.max.x) / 2,
      -0.15,
      (bounds.min.y + bounds.max.y) / 2
    )
    blockGroup.add(groundMesh)

    const railMat = new THREE.MeshStandardMaterial({
      color: 0x3a4a5a,
      metalness: 0.8,
      roughness: 0.2,
    })

    const railGeo = new THREE.BoxGeometry(width, 0.15, 0.6)
    const rail1 = new THREE.Mesh(railGeo, railMat)
    const rail2 = new THREE.Mesh(railGeo, railMat)
    rail1.position.set(
      (bounds.min.x + bounds.max.x) / 2,
      0.15,
      bounds.min.y + 3
    )
    rail2.position.set(
      (bounds.min.x + bounds.max.x) / 2,
      0.15,
      bounds.max.y - 3
    )
    blockGroup.add(rail1, rail2)

    const markerMat = new THREE.MeshStandardMaterial({
      color: 0x00e5ff,
      emissive: 0x00e5ff,
      emissiveIntensity: 0.15,
      metalness: 0.6,
      roughness: 0.3,
    })

    for (let bay = 0; bay < block.bayCount; bay += 5) {
      for (let row = 0; row < block.rowCount; row += 2) {
        const pos = bayRowTierToPosition(bay, row, 0, block.id, yardLayout)
        if (!pos) continue
        const markerGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.02, 8)
        const markerMesh = new THREE.Mesh(markerGeo, markerMat)
        markerMesh.position.set(pos.x, 0.2, pos.y)
        blockGroup.add(markerMesh)
      }
    }

    scene.add(blockGroup)
  }

  const lightingPoleMat = new THREE.MeshStandardMaterial({
    color: 0x4a5a6a,
    metalness: 0.7,
    roughness: 0.2,
  })

  const lampMat = new THREE.MeshStandardMaterial({
    color: 0xfff0e0,
    emissive: 0xfff0e0,
    emissiveIntensity: 0.8,
    metalness: 0.3,
    roughness: 0.1,
  })

  const firstBlockBounds = getBlockBounds(yardLayout.blocks[0], yardLayout)
  const lastBlockBounds = getBlockBounds(yardLayout.blocks[yardLayout.blocks.length - 1], yardLayout)

  const polePositions: [number, number][] = [
    [firstBlockBounds.min.x - 20, firstBlockBounds.min.y - 20],
    [firstBlockBounds.min.x - 20, lastBlockBounds.max.y + 20],
    [lastBlockBounds.max.x + 20, firstBlockBounds.min.y - 20],
    [lastBlockBounds.max.x + 20, lastBlockBounds.max.y + 20],
  ]

  for (const [px, py] of polePositions) {
    const poleGeo = new THREE.CylinderGeometry(0.25, 0.35, 30, 8)
    const poleMesh = new THREE.Mesh(poleGeo, lightingPoleMat)
    poleMesh.position.set(px, 15, py)

    const lampGeo = new THREE.SphereGeometry(0.8, 12, 12)
    const lampMesh = new THREE.Mesh(lampGeo, lampMat)
    lampMesh.position.set(px, 30, py)

    scene.add(poleMesh, lampMesh)
  }

  const fenceMat = new THREE.MeshStandardMaterial({
    color: 0x2a3a4a,
    metalness: 0.5,
    roughness: 0.4,
  })

  const allBounds = yardLayout.blocks.map((b) => getBlockBounds(b, yardLayout))
  const totalMinX = Math.min(...allBounds.map((b) => b.min.x)) - 30
  const totalMaxX = Math.max(...allBounds.map((b) => b.max.x)) + 30
  const totalMinY = Math.min(...allBounds.map((b) => b.min.y)) - 30
  const totalMaxY = Math.max(...allBounds.map((b) => b.max.y)) + 30

  const perimeterFences: { geo: THREE.BufferGeometry; pos: [number, number, number] }[] = [
    { geo: new THREE.BoxGeometry(totalMaxX - totalMinX, 2.5, 0.15), pos: [(totalMinX + totalMaxX) / 2, 1.25, totalMinY] },
    { geo: new THREE.BoxGeometry(totalMaxX - totalMinX, 2.5, 0.15), pos: [(totalMinX + totalMaxX) / 2, 1.25, totalMaxY] },
    { geo: new THREE.BoxGeometry(0.15, 2.5, totalMaxY - totalMinY), pos: [totalMinX, 1.25, (totalMinY + totalMaxY) / 2] },
    { geo: new THREE.BoxGeometry(0.15, 2.5, totalMaxY - totalMinY), pos: [totalMaxX, 1.25, (totalMinY + totalMaxY) / 2] },
  ]

  for (const fence of perimeterFences) {
    const fenceMesh = new THREE.Mesh(fence.geo, fenceMat)
    fenceMesh.position.set(...fence.pos)
    scene.add(fenceMesh)
  }

  const result = processScene(scene)
  scene.traverse((child) => {
    if ((child as THREE.Mesh).geometry) {
      (child as THREE.Mesh).geometry.dispose()
    }
    if ((child as THREE.Mesh).material) {
      const mat = (child as THREE.Mesh).material
      if (Array.isArray(mat)) {
        mat.forEach((m) => m.dispose())
      } else {
        mat.dispose()
      }
    }
  })

  return result
}

export default function YardModelLoader({
  modelUrl,
  useWorker = true,
  showLoadingUI = true,
}: YardModelLoaderProps) {
  const [loadState, setLoadState] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle')
  const [loadProgress, setLoadProgress] = useState(0)
  const [mergeProgress, setMergeProgress] = useState(0)
  const [loadResult, setLoadResult] = useState<ModelLoadResult | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const cacheRef = useRef<Map<string, ModelLoadResult>>(new Map())
  const setStats = useTwinStore((state) => state.setModelStats)

  const loadModel = useCallback(async () => {
    if (!modelUrl) {
      const programmatic = generateProgrammaticYard()
      setLoadResult(programmatic)
      setStats({
        originalMeshCount: programmatic.stats.mergedMeshCount,
        mergedMeshCount: programmatic.stats.mergedMeshCount,
        materialCount: programmatic.stats.materialGroupCount,
        totalVertices: programmatic.stats.totalVertices,
        totalTriangles: programmatic.stats.totalIndices / 3,
      })
      setLoadState('loaded')
      return
    }

    if (cacheRef.current.has(modelUrl)) {
      const cached = cacheRef.current.get(modelUrl)!
      setLoadResult(cached)
      setStats({
        originalMeshCount: cached.stats.mergedMeshCount,
        mergedMeshCount: cached.stats.mergedMeshCount,
        materialCount: cached.stats.materialGroupCount,
        totalVertices: cached.stats.totalVertices,
        totalTriangles: cached.stats.totalIndices / 3,
      })
      setLoadState('loaded')
      return
    }

    setLoadState('loading')
    setLoadProgress(0)
    setMergeProgress(0)

    try {
      const result = useWorker
        ? await loadAndMergeWithWorker(modelUrl, (p) => {
            setLoadProgress(p * 0.7)
          })
        : await loadAndMergeGLTF(modelUrl, (p) => {
            setLoadProgress(p * 0.7)
          })

      setMergeProgress(1)
      setLoadProgress(1)

      cacheRef.current.set(modelUrl, result)

      setStats({
        originalMeshCount: result.stats.mergedMeshCount,
        mergedMeshCount: result.stats.mergedMeshCount,
        materialCount: result.stats.materialGroupCount,
        totalVertices: result.stats.totalVertices,
        totalTriangles: result.stats.totalIndices / 3,
      })

      setLoadResult(result)
      setLoadState('loaded')
    } catch (err) {
      console.error('模型加载失败，使用程序化生成:', err)
      setErrorMessage(err instanceof Error ? err.message : '加载失败')
      const fallback = generateProgrammaticYard()
      setLoadResult(fallback)
      setStats({
        originalMeshCount: fallback.stats.mergedMeshCount,
        mergedMeshCount: fallback.stats.mergedMeshCount,
        materialCount: fallback.stats.materialGroupCount,
        totalVertices: fallback.stats.totalVertices,
        totalTriangles: fallback.stats.totalIndices / 3,
      })
      setLoadState('loaded')
    }
  }, [modelUrl, useWorker, setStats])

  useEffect(() => {
    loadModel()
  }, [loadModel])

  if (loadState === 'loading' && showLoadingUI) {
    return (
      <Html center position={[0, 50, 0]} style={{ pointerEvents: 'none' }}>
        <div
          className="glass-panel glow-border rounded-lg p-6 w-80 text-center"
          style={{ pointerEvents: 'auto' }}
        >
          <div className="mb-4">
            <div className="w-16 h-16 mx-auto mb-4 relative">
              <div
                className="absolute inset-0 rounded-full border-4 border-tech-cyan/20"
              />
              <div
                className="absolute inset-0 rounded-full border-4 border-transparent border-t-tech-cyan animate-spin"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-display text-lg font-bold text-tech-cyan">
                  {Math.round(loadProgress * 100)}
                </span>
              </div>
            </div>
            <h3 className="font-display text-lg font-bold text-white mb-1">
              堆场模型加载中
            </h3>
            <p className="text-xs text-ice-blue mb-4">
              {modelUrl ? 'GLTF 几何合并管线运行中...' : '生成程序化堆场模型...'}
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-ice-blue">模型加载</span>
                <span className="font-mono text-tech-cyan">
                  {Math.round(loadProgress * 70)}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-steel-gray/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-tech-cyan rounded-full transition-all duration-200"
                  style={{ width: `${loadProgress * 70}%` }}
                />
              </div>
            </div>

            {modelUrl && (
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-ice-blue">几何合并</span>
                  <span className="font-mono text-tech-cyan">
                    {Math.round(mergeProgress * 30)}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-steel-gray/50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-orange rounded-full transition-all duration-200"
                    style={{ width: `${mergeProgress * 30}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {loadResult && (
            <div className="mt-4 pt-3 border-t border-steel-gray/50 grid grid-cols-2 gap-2 text-left">
              <div className="bg-steel-gray/30 rounded p-2">
                <p className="text-xs text-ice-blue">原始 Mesh 数</p>
                <p className="font-mono text-sm text-white">
                  {loadResult.stats.originalMeshCount.toLocaleString()}
                </p>
              </div>
              <div className="bg-steel-gray/30 rounded p-2">
                <p className="text-xs text-ice-blue">合并后 Mesh 数</p>
                <p className="font-mono text-sm text-tech-cyan">
                  {loadResult.stats.mergedMeshCount}
                </p>
              </div>
            </div>
          )}
        </div>
      </Html>
    )
  }

  if (loadState === 'error' && showLoadingUI && errorMessage) {
    return (
      <Html center position={[0, 50, 0]}>
        <div className="glass-panel glow-border rounded-lg p-6 w-80 text-center border-dark-red/50">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-dark-red/20 flex items-center justify-center">
            <span className="text-3xl">⚠️</span>
          </div>
          <h3 className="font-display text-lg font-bold text-dark-red mb-2">
            模型加载失败
          </h3>
          <p className="text-xs text-ice-blue mb-4">{errorMessage}</p>
          <button
            onClick={loadModel}
            className="px-4 py-2 bg-tech-cyan text-white rounded text-sm font-medium hover:bg-tech-cyan/80 transition-all"
          >
            重新加载
          </button>
        </div>
      </Html>
    )
  }

  if (loadState === 'loaded' && loadResult) {
    return (
      <MergedGLTFModel
        mergedGroups={loadResult.mergedGroups}
        castShadow
        receiveShadow
      />
    )
  }

  return null
}
