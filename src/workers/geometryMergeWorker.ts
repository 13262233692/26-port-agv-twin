interface GeometryData {
  positions: Float32Array
  normals: Float32Array | null
  uvs: Float32Array | null
  indices: Uint32Array | null
  materialKey: string
  matrix: Float32Array
}

interface MergeTask {
  id: string
  geometryGroups: { [materialKey: string]: GeometryData[] }
}

interface MergeResult {
  id: string
  mergedGroups: {
    materialKey: string
    positions: ArrayBuffer
    normals: ArrayBuffer | null
    uvs: ArrayBuffer | null
    indices: ArrayBuffer | null
    vertexCount: number
    indexCount: number
  }[]
  stats: {
    originalMeshCount: number
    mergedMeshCount: number
    materialGroupCount: number
  }
}

function applyMatrix4ToPosition(
  mx: Float32Array,
  px: number,
  py: number,
  pz: number
): [number, number, number] {
  const x = mx[0] * px + mx[4] * py + mx[8] * pz + mx[12]
  const y = mx[1] * px + mx[5] * py + mx[9] * pz + mx[13]
  const z = mx[2] * px + mx[6] * py + mx[10] * pz + mx[14]
  return [x, y, z]
}

function applyMatrix3ToNormal(
  mx: Float32Array,
  nx: number,
  ny: number,
  nz: number
): [number, number, number] {
  const x = mx[0] * nx + mx[4] * ny + mx[8] * nz
  const y = mx[1] * nx + mx[5] * ny + mx[9] * nz
  const z = mx[2] * nx + mx[6] * ny + mx[10] * nz
  const len = Math.sqrt(x * x + y * y + z * z) || 1
  return [x / len, y / len, z / len]
}

function mergeGeometries(geos: GeometryData[]): {
  positions: Float32Array
  normals: Float32Array | null
  uvs: Float32Array | null
  indices: Uint32Array | null
  vertexCount: number
  indexCount: number
} {
  let totalVerts = 0
  let totalIndices = 0
  let hasNormals = true
  let hasUVs = true
  let hasIndices = false

  for (const g of geos) {
    totalVerts += g.positions.length / 3
    if (g.indices) {
      totalIndices += g.indices.length
      hasIndices = true
    }
    if (!g.normals) hasNormals = false
    if (!g.uvs) hasUVs = false
  }

  const mergedPositions = new Float32Array(totalVerts * 3)
  const mergedNormals = hasNormals ? new Float32Array(totalVerts * 3) : null
  const mergedUVs = hasUVs ? new Float32Array(totalVerts * 2) : null
  const mergedIndices = hasIndices ? new Uint32Array(totalIndices) : null

  let vertOffset = 0
  let idxOffset = 0
  let indexVertOffset = 0

  for (const g of geos) {
    const vCount = g.positions.length / 3
    const matrix = g.matrix

    for (let i = 0; i < vCount; i++) {
      const px = g.positions[i * 3]
      const py = g.positions[i * 3 + 1]
      const pz = g.positions[i * 3 + 2]

      const [tx, ty, tz] = applyMatrix4ToPosition(matrix, px, py, pz)
      mergedPositions[(vertOffset + i) * 3] = tx
      mergedPositions[(vertOffset + i) * 3 + 1] = ty
      mergedPositions[(vertOffset + i) * 3 + 2] = tz
    }

    if (mergedNormals && g.normals) {
      const normalMatrix = computeNormalMatrix(matrix)
      for (let i = 0; i < vCount; i++) {
        const nx = g.normals[i * 3]
        const ny = g.normals[i * 3 + 1]
        const nz = g.normals[i * 3 + 2]
        const [tnx, tny, tnz] = applyMatrix3ToNormal(normalMatrix, nx, ny, nz)
        mergedNormals[(vertOffset + i) * 3] = tnx
        mergedNormals[(vertOffset + i) * 3 + 1] = tny
        mergedNormals[(vertOffset + i) * 3 + 2] = tnz
      }
    }

    if (mergedUVs && g.uvs) {
      mergedUVs.set(g.uvs, vertOffset * 2)
    }

    if (mergedIndices && g.indices) {
      for (let i = 0; i < g.indices.length; i++) {
        mergedIndices[idxOffset + i] = g.indices[i] + indexVertOffset
      }
      idxOffset += g.indices.length
    }

    indexVertOffset += vCount
    vertOffset += vCount
  }

  return {
    positions: mergedPositions,
    normals: mergedNormals,
    uvs: mergedUVs,
    indices: mergedIndices,
    vertexCount: totalVerts,
    indexCount: totalIndices,
  }
}

function computeNormalMatrix(m: Float32Array): Float32Array {
  const a00 = m[0], a01 = m[1], a02 = m[2]
  const a10 = m[4], a11 = m[5], a12 = m[6]
  const a20 = m[8], a21 = m[9], a22 = m[10]

  const b01 = a22 * a11 - a12 * a21
  const b11 = -a22 * a10 + a12 * a20
  const b21 = a21 * a10 - a11 * a20

  let det = a00 * b01 + a01 * b11 + a02 * b21
  if (Math.abs(det) < 1e-10) det = 1

  const invDet = 1 / det

  const result = new Float32Array(9)
  result[0] = b01 * invDet
  result[1] = (-a22 * a01 + a02 * a21) * invDet
  result[2] = (a12 * a01 - a02 * a11) * invDet
  result[3] = b11 * invDet
  result[4] = (a22 * a00 - a02 * a20) * invDet
  result[5] = (-a12 * a00 + a02 * a10) * invDet
  result[6] = b21 * invDet
  result[7] = (-a21 * a00 + a01 * a20) * invDet
  result[8] = (a11 * a00 - a01 * a10) * invDet

  return result
}

self.onmessage = function (e: MessageEvent) {
  const task = e.data as MergeTask

  const mergedGroups: MergeResult['mergedGroups'] = []
  let totalOriginal = 0

  for (const materialKey of Object.keys(task.geometryGroups)) {
    const geos = task.geometryGroups[materialKey]
    totalOriginal += geos.length

    const merged = mergeGeometries(geos)

    mergedGroups.push({
      materialKey,
      positions: merged.positions.buffer as ArrayBuffer,
      normals: merged.normals ? (merged.normals.buffer as ArrayBuffer) : null,
      uvs: merged.uvs ? (merged.uvs.buffer as ArrayBuffer) : null,
      indices: merged.indices ? (merged.indices.buffer as ArrayBuffer) : null,
      vertexCount: merged.vertexCount,
      indexCount: merged.indexCount,
    })
  }

  const transferables: ArrayBuffer[] = []
  for (const g of mergedGroups) {
    transferables.push(g.positions)
    if (g.normals) transferables.push(g.normals)
    if (g.uvs) transferables.push(g.uvs)
    if (g.indices) transferables.push(g.indices)
  }

  const result: MergeResult = {
    id: task.id,
    mergedGroups,
    stats: {
      originalMeshCount: totalOriginal,
      mergedMeshCount: mergedGroups.length,
      materialGroupCount: mergedGroups.length,
    },
  }

  self.postMessage(result, transferables as any)
}
