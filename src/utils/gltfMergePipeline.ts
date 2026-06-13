import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'

export interface MergedGeometryGroup {
  materialKey: string
  geometry: THREE.BufferGeometry
  material: THREE.Material
}

export interface MergeStats {
  originalMeshCount: number
  mergedMeshCount: number
  materialGroupCount: number
  totalVertices: number
  totalIndices: number
  processingTimeMs: number
}

export interface ModelLoadResult {
  mergedGroups: MergedGeometryGroup[]
  stats: MergeStats
}

function getMaterialKey(material: THREE.Material): string {
  if (!material) return '__default__'

  const props: string[] = [material.type]

  if ('color' in material) {
    const c = (material as any).color as THREE.Color
    if (c) props.push(`c:${c.getHexString()}`)
  }
  if ('map' in material) {
    const map = (material as any).map as THREE.Texture
    if (map) props.push(`m:${map.uuid}`)
  }
  if ('metalness' in material) {
    props.push(`mt:${((material as any).metalness as number).toFixed(3)}`)
  }
  if ('roughness' in material) {
    props.push(`rg:${((material as any).roughness as number).toFixed(3)}`)
  }
  if ('opacity' in material) {
    const op = (material as any).opacity as number
    if (op < 1) props.push(`op:${op.toFixed(3)}`)
  }
  if ('transparent' in material) {
    if ((material as any).transparent) props.push('tr')
  }
  if ('emissive' in material) {
    const em = (material as any).emissive as THREE.Color
    if (em && (em.r > 0 || em.g > 0 || em.b > 0)) {
      props.push(`em:${em.getHexString()}`)
    }
  }

  return props.join('|')
}

function extractGeometryFromMesh(mesh: THREE.Mesh): {
  positions: Float32Array
  normals: Float32Array | null
  uvs: Float32Array | null
  indices: Uint32Array | null
  materialKey: string
  matrix: Float32Array
} | null {
  const geo = mesh.geometry
  if (!geo) return null

  const posAttr = geo.getAttribute('position')
  if (!posAttr) return null

  const positions = new Float32Array(posAttr.array as Float32Array)

  const normalAttr = geo.getAttribute('normal')
  const normals = normalAttr
    ? new Float32Array(normalAttr.array as Float32Array)
    : null

  const uvAttr = geo.getAttribute('uv')
  const uvs = uvAttr ? new Float32Array(uvAttr.array as Float32Array) : null

  let indices: Uint32Array | null = null
  if (geo.index) {
    const idxArray = geo.index.array
    indices = new Uint32Array(idxArray.length)
    if (idxArray instanceof Uint16Array) {
      for (let i = 0; i < idxArray.length; i++) {
        indices[i] = idxArray[i]
      }
    } else if (idxArray instanceof Uint32Array) {
      indices.set(idxArray)
    } else {
      for (let i = 0; i < idxArray.length; i++) {
        indices[i] = idxArray[i]
      }
    }
  }

  mesh.updateMatrixWorld(true)
  const matrix = new Float32Array(mesh.matrixWorld.elements)

  const materialKey = mesh.material
    ? getMaterialKey(mesh.material as THREE.Material)
    : '__default__'

  return { positions, normals, uvs, indices, materialKey, matrix }
}

function reconstructGeometry(data: {
  positions: ArrayBuffer
  normals: ArrayBuffer | null
  uvs: ArrayBuffer | null
  indices: ArrayBuffer | null
  vertexCount: number
  indexCount: number
}): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry()

  geo.setAttribute(
    'position',
    new THREE.BufferAttribute(new Float32Array(data.positions), 3)
  )

  if (data.normals) {
    geo.setAttribute(
      'normal',
      new THREE.BufferAttribute(new Float32Array(data.normals), 3)
    )
  } else {
    geo.computeVertexNormals()
  }

  if (data.uvs) {
    geo.setAttribute(
      'uv',
      new THREE.BufferAttribute(new Float32Array(data.uvs), 2)
    )
  }

  if (data.indices) {
    geo.setIndex(new THREE.BufferAttribute(new Uint32Array(data.indices), 1))
  }

  return geo
}

export function loadAndMergeGLTF(
  url: string,
  onProgress?: (progress: number) => void
): Promise<ModelLoadResult> {
  return new Promise((resolve, reject) => {
    const startTime = performance.now()
    const loader = new GLTFLoader()

    const dracoLoader = new DRACOLoader()
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/')
    loader.setDRACOLoader(dracoLoader)

    loader.load(
      url,
      (gltf) => {
        try {
          const result = processScene(gltf.scene, startTime)
          gltf.scene.traverse((child) => {
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
          resolve(result)
        } catch (err) {
          reject(err)
        }
      },
      (xhr) => {
        if (xhr.total > 0 && onProgress) {
          onProgress(xhr.loaded / xhr.total)
        }
      },
      (err) => {
        reject(err)
      }
    )
  })
}

export function processScene(
  scene: THREE.Group | THREE.Scene,
  startTime?: number
): ModelLoadResult {
  const start = startTime || performance.now()

  const materialGroups: Map<
    string,
    { geometries: any[]; material: THREE.Material | null }
  > = new Map()
  const materialInstances: Map<string, THREE.Material> = new Map()

  scene.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return
    const mesh = child as THREE.Mesh

    const data = extractGeometryFromMesh(mesh)
    if (!data) return

    const key = data.materialKey

    if (!materialGroups.has(key)) {
      materialGroups.set(key, { geometries: [], material: null })
    }
    materialGroups.get(key)!.geometries.push(data)

    if (!materialInstances.has(key) && mesh.material) {
      materialInstances.set(key, (mesh.material as THREE.Material).clone())
    }
  })

  const workerData: { [key: string]: any[] } = {}
  for (const [key, group] of materialGroups) {
    workerData[key] = group.geometries
  }

  const mergedGroups: MergedGeometryGroup[] = []
  let totalOriginal = 0
  let totalVerts = 0
  let totalIdx = 0

  for (const [materialKey, group] of materialGroups) {
    totalOriginal += group.geometries.length

    const allPositions: number[] = []
    const allNormals: number[] = []
    const allUVs: number[] = []
    const allIndices: number[] = []
    let vertexOffset = 0
    let hasNormals = true
    let hasUVs = true

    for (const geo of group.geometries) {
      const matrix = new THREE.Matrix4().fromArray(geo.matrix)
      const normalMatrix = new THREE.Matrix3().getNormalMatrix(matrix)
      const vCount = geo.positions.length / 3

      const posVec = new THREE.Vector3()
      for (let i = 0; i < vCount; i++) {
        posVec.set(
          geo.positions[i * 3],
          geo.positions[i * 3 + 1],
          geo.positions[i * 3 + 2]
        )
        posVec.applyMatrix4(matrix)
        allPositions.push(posVec.x, posVec.y, posVec.z)
      }

      if (geo.normals) {
        const normVec = new THREE.Vector3()
        for (let i = 0; i < vCount; i++) {
          normVec.set(
            geo.normals[i * 3],
            geo.normals[i * 3 + 1],
            geo.normals[i * 3 + 2]
          )
          normVec.applyMatrix3(normalMatrix).normalize()
          allNormals.push(normVec.x, normVec.y, normVec.z)
        }
      } else {
        hasNormals = false
      }

      if (geo.uvs) {
        for (let i = 0; i < geo.uvs.length; i++) {
          allUVs.push(geo.uvs[i])
        }
      } else {
        hasUVs = false
      }

      if (geo.indices) {
        for (let i = 0; i < geo.indices.length; i++) {
          allIndices.push(geo.indices[i] + vertexOffset)
        }
      }

      vertexOffset += vCount
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(allPositions, 3)
    )

    if (hasNormals && allNormals.length > 0) {
      geometry.setAttribute(
        'normal',
        new THREE.Float32BufferAttribute(allNormals, 3)
      )
    } else {
      geometry.computeVertexNormals()
    }

    if (hasUVs && allUVs.length > 0) {
      geometry.setAttribute(
        'uv',
        new THREE.Float32BufferAttribute(allUVs, 2)
      )
    }

    if (allIndices.length > 0) {
      geometry.setIndex(new THREE.Uint32BufferAttribute(allIndices, 1))
    }

    totalVerts += vertexOffset
    totalIdx += allIndices.length

    const material =
      materialInstances.get(materialKey) ||
      new THREE.MeshStandardMaterial({ color: 0x888888 })

    mergedGroups.push({ materialKey, geometry, material })
  }

  return {
    mergedGroups,
    stats: {
      originalMeshCount: totalOriginal,
      mergedMeshCount: mergedGroups.length,
      materialGroupCount: mergedGroups.length,
      totalVertices: totalVerts,
      totalIndices: totalIdx,
      processingTimeMs: performance.now() - start,
    },
  }
}

export function loadAndMergeWithWorker(
  url: string,
  onProgress?: (progress: number) => void
): Promise<ModelLoadResult> {
  return new Promise((resolve, reject) => {
    const startTime = performance.now()
    const loader = new GLTFLoader()

    const dracoLoader = new DRACOLoader()
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/')
    loader.setDRACOLoader(dracoLoader)

    loader.load(
      url,
      (gltf) => {
        try {
          const materialInstances: Map<string, THREE.Material> = new Map()
          const workerGeometryGroups: {
            [materialKey: string]: any[]
          } = {}

          gltf.scene.traverse((child) => {
            if (!(child as THREE.Mesh).isMesh) return
            const mesh = child as THREE.Mesh
            const data = extractGeometryFromMesh(mesh)
            if (!data) return

            const key = data.materialKey
            if (!workerGeometryGroups[key]) {
              workerGeometryGroups[key] = []
            }
            workerGeometryGroups[key].push(data)

            if (!materialInstances.has(key) && mesh.material) {
              materialInstances.set(
                key,
                (mesh.material as THREE.Material).clone()
              )
            }
          })

          const worker = new Worker(
            new URL(
              '@/workers/geometryMergeWorker.ts',
              import.meta.url
            ),
            { type: 'module' }
          )

          const taskId = `merge-${Date.now()}`

          worker.onmessage = (e) => {
            const result = e.data
            if (result.id !== taskId) return

            const mergedGroups: MergedGeometryGroup[] = []

            for (const group of result.mergedGroups) {
              const geometry = reconstructGeometry(group)
              const material =
                materialInstances.get(group.materialKey) ||
                new THREE.MeshStandardMaterial({ color: 0x888888 })

              mergedGroups.push({ materialKey: group.materialKey, geometry, material })
            }

            worker.terminate()

            gltf.scene.traverse((child) => {
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

            resolve({
              mergedGroups,
              stats: {
                ...result.stats,
                totalVertices: mergedGroups.reduce(
                  (s, g) =>
                    s +
                    (g.geometry.getAttribute('position')?.count || 0),
                  0
                ),
                totalIndices: mergedGroups.reduce(
                  (s, g) => s + (g.geometry.index?.count || 0),
                  0
                ),
                processingTimeMs: performance.now() - startTime,
              },
            })
          }

          worker.onerror = (err) => {
            worker.terminate()
            const fallback = processScene(gltf.scene, startTime)
            resolve(fallback)
          }

          worker.postMessage({
            id: taskId,
            geometryGroups: workerGeometryGroups,
          })
        } catch (err) {
          const fallback = processScene(gltf.scene, startTime)
          resolve(fallback)
        }
      },
      (xhr) => {
        if (xhr.total > 0 && onProgress) {
          onProgress(xhr.loaded / xhr.total)
        }
      },
      (err) => {
        reject(err)
      }
    )
  })
}
