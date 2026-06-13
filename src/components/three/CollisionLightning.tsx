import { useRef, useMemo, useEffect } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import type { ActiveCollision, CollisionLevel } from '@/engine/collisionWarningSystem'

interface CollisionLightningProps {
  collisions: ActiveCollision[]
}

interface LightningSegment {
  start: THREE.Vector3
  end: THREE.Vector3
  mid1: THREE.Vector3
  mid2: THREE.Vector3
  intensity: number
  phase: number
}

function generateLightningSegments(
  start: THREE.Vector3,
  end: THREE.Vector3,
  segments: number,
  amplitude: number
): LightningSegment[] {
  const result: LightningSegment[] = []
  const dir = new THREE.Vector3().subVectors(end, start)
  const length = dir.length()
  const normalizedDir = dir.clone().normalize()

  const tangent1 = new THREE.Vector3()
  const tangent2 = new THREE.Vector3()

  if (Math.abs(normalizedDir.x) < 0.9) {
    tangent1.crossVectors(normalizedDir, new THREE.Vector3(1, 0, 0)).normalize()
  } else {
    tangent1.crossVectors(normalizedDir, new THREE.Vector3(0, 1, 0)).normalize()
  }
  tangent2.crossVectors(normalizedDir, tangent1).normalize()

  const stepLength = length / segments
  let currentPoint = start.clone()

  for (let i = 0; i < segments; i++) {
    const nextPoint = new THREE.Vector3().addVectors(
      start,
      normalizedDir.clone().multiplyScalar(stepLength * (i + 1))
    )

    const displacement1 = tangent1.clone().multiplyScalar(
      (Math.random() - 0.5) * amplitude * 2
    )
    const displacement2 = tangent2.clone().multiplyScalar(
      (Math.random() - 0.5) * amplitude * 2
    )

    const midPoint = new THREE.Vector3().addVectors(currentPoint, nextPoint).multiplyScalar(0.5)
    midPoint.add(displacement1).add(displacement2)

    const controlPoint1 = new THREE.Vector3().addVectors(
      currentPoint,
      midPoint.clone().sub(currentPoint).multiplyScalar(0.5)
    )
    controlPoint1.add(
      tangent1.clone().multiplyScalar((Math.random() - 0.5) * amplitude)
    )

    const controlPoint2 = new THREE.Vector3().addVectors(
      midPoint,
      nextPoint.clone().sub(midPoint).multiplyScalar(0.5)
    )
    controlPoint2.add(
      tangent2.clone().multiplyScalar((Math.random() - 0.5) * amplitude)
    )

    result.push({
      start: currentPoint.clone(),
      end: nextPoint.clone(),
      mid1: controlPoint1,
      mid2: controlPoint2,
      intensity: 0.7 + Math.random() * 0.3,
      phase: Math.random() * Math.PI * 2,
    })

    currentPoint = midPoint.clone()
  }

  result[result.length - 1].end = end.clone()

  return result
}

function getLevelColor(level: CollisionLevel): THREE.Color {
  if (level === 'critical') return new THREE.Color(0xff1744)
  if (level === 'warning') return new THREE.Color(0xff9100)
  return new THREE.Color(0xffd54f)
}

function getLevelGlowIntensity(level: CollisionLevel): number {
  if (level === 'critical') return 3.0
  if (level === 'warning') return 2.0
  return 1.2
}

export default function CollisionLightning({ collisions }: CollisionLightningProps) {
  const groupRef = useRef<THREE.Group>(null)
  const segmentsRef = useRef<Map<string, {
    lines: LightningSegment[]
    particles: THREE.Points | null
    material: THREE.LineBasicMaterial
    level: CollisionLevel
    lastRegen: number
    startTime: number
  }>>(new Map())

  const activeIds = useMemo(() => new Set(collisions.map((c) => c.id)), [collisions])

  useEffect(() => {
    if (!groupRef.current) return

    for (const [id, data] of segmentsRef.current) {
      if (!activeIds.has(id)) {
        if (data.particles) {
          data.particles.geometry.dispose()
          ;(data.particles.material as THREE.Material).dispose()
        }
        data.material.dispose()
        segmentsRef.current.delete(id)
      }
    }

    groupRef.current.clear()

    for (const collision of collisions) {
      const start = collision.result.closestPointA
      const end = collision.result.closestPointB

      const color = getLevelColor(collision.level)
      const intensity = getLevelGlowIntensity(collision.level)
      const amplitude = collision.level === 'critical' ? 0.8 : 0.5
      const segmentCount = collision.level === 'critical' ? 18 : 12

      const existingData = segmentsRef.current.get(collision.id)
      const now = performance.now()

      if (!existingData || now - existingData.lastRegen > (collision.level === 'critical' ? 120 : 200)) {
        const segments = generateLightningSegments(start, end, segmentCount, amplitude)

        const particleCount = segments.length * 4
        const positions = new Float32Array(particleCount * 3)
        const sizes = new Float32Array(particleCount)
        const colors = new Float32Array(particleCount * 3)

        for (let i = 0; i < segments.length; i++) {
          const seg = segments[i]
          const particlePos = [
            seg.start,
            seg.mid1,
            seg.mid2,
            seg.end,
          ]
          for (let j = 0; j < 4; j++) {
            const idx = (i * 4 + j) * 3
            positions[idx] = particlePos[j].x
            positions[idx + 1] = particlePos[j].y
            positions[idx + 2] = particlePos[j].z
            sizes[i * 4 + j] = 0.15 + Math.random() * 0.2
            colors[idx] = color.r
            colors[idx + 1] = color.g
            colors[idx + 2] = color.b
          }
        }

        const linePositions: number[] = []
        for (const seg of segments) {
          for (let t = 0; t <= 1; t += 0.05) {
            const it = 1 - t
            const x =
              it * it * it * seg.start.x +
              3 * it * it * t * seg.mid1.x +
              3 * it * t * t * seg.mid2.x +
              t * t * t * seg.end.x
            const y =
              it * it * it * seg.start.y +
              3 * it * it * t * seg.mid1.y +
              3 * it * t * t * seg.mid2.y +
              t * t * t * seg.end.y
            const z =
              it * it * it * seg.start.z +
              3 * it * it * t * seg.mid1.z +
              3 * it * t * t * seg.mid2.z +
              t * t * t * seg.end.z
            linePositions.push(x, y, z)
          }
        }

        const lineGeo = new THREE.BufferGeometry()
        lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3))

        const lineMat = new THREE.LineBasicMaterial({
          color,
          transparent: true,
          opacity: 0.95,
          linewidth: collision.level === 'critical' ? 4 : 2,
        })

        const line = new THREE.Line(lineGeo, lineMat)
        line.name = `lightning-${collision.id}`
        groupRef.current.add(line)

        const particleGeo = new THREE.BufferGeometry()
        particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
        particleGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
        particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3))

        const particleMat = new THREE.PointsMaterial({
          size: 0.3,
          vertexColors: true,
          transparent: true,
          opacity: 0.85,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          sizeAttenuation: true,
        })

        const particles = new THREE.Points(particleGeo, particleMat)
        particles.name = `particles-${collision.id}`
        groupRef.current.add(particles)

        const sphereGeo = new THREE.SphereGeometry(
          collision.level === 'critical' ? 0.6 : 0.4,
          16,
          16
        )
        const sphereMat = new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.8,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })

        const sphereA = new THREE.Mesh(sphereGeo, sphereMat)
        sphereA.position.copy(start)
        const sphereB = new THREE.Mesh(sphereGeo, sphereMat.clone())
        sphereB.position.copy(end)

        sphereA.name = `sphereA-${collision.id}`
        sphereB.name = `sphereB-${collision.id}`
        groupRef.current.add(sphereA, sphereB)

        segmentsRef.current.set(collision.id, {
          lines: segments,
          particles,
          material: lineMat,
          level: collision.level,
          lastRegen: now,
          startTime: existingData?.startTime || now,
        })
      } else {
        const data = segmentsRef.current.get(collision.id)!
        for (let i = 0; i < groupRef.current.children.length; i++) {
          const child = groupRef.current.children[i]
          if (child.name.endsWith(collision.id)) {
            if (child instanceof THREE.Line) {
              const geo = child.geometry
              const posAttr = geo.getAttribute('position') as THREE.BufferAttribute
              const positions = posAttr.array as Float32Array
              const segments = data.lines
              let idx = 0
              for (const seg of segments) {
                for (let t = 0; t <= 1; t += 0.05) {
                  const it = 1 - t
                  positions[idx] =
                    it * it * it * seg.start.x +
                    3 * it * it * t * seg.mid1.x +
                    3 * it * t * t * seg.mid2.x +
                    t * t * t * seg.end.x
                  positions[idx + 1] =
                    it * it * it * seg.start.y +
                    3 * it * it * t * seg.mid1.y +
                    3 * it * t * t * seg.mid2.y +
                    t * t * t * seg.end.y
                  positions[idx + 2] =
                    it * it * it * seg.start.z +
                    3 * it * it * t * seg.mid1.z +
                    3 * it * t * t * seg.mid2.z +
                    t * t * t * seg.end.z
                  idx += 3
                }
              }
              posAttr.needsUpdate = true
            }
          }
        }
      }
    }
  }, [collisions, activeIds])

  useFrame((state, delta) => {
    if (!groupRef.current) return
    const time = state.clock.elapsedTime

    for (let i = 0; i < groupRef.current.children.length; i++) {
      const child = groupRef.current.children[i]

      if (child instanceof THREE.Line) {
        const mat = child.material as THREE.LineBasicMaterial
        const flicker = 0.7 + 0.3 * Math.sin(time * 45 + i)
        mat.opacity = Math.min(1, flicker * 1.0)
        const collisionId = child.name.replace('lightning-', '')
        const collisionData = segmentsRef.current.get(collisionId)
        if (collisionData) {
          const age = (time * 1000 - collisionData.startTime) / 1000
          const pulseSpeed = collisionData.level === 'critical' ? 30 : 15
          const pulse = 0.5 + 0.5 * Math.sin(time * pulseSpeed)
          mat.opacity *= (0.6 + 0.4 * pulse)
          if (collisionData.level === 'critical') {
            mat.color.multiplyScalar(1 + pulse * 0.2)
          }
        }
      } else if (child instanceof THREE.Points) {
        const mat = child.material as THREE.PointsMaterial
        mat.opacity = 0.7 + 0.3 * Math.sin(time * 30 + i * 0.5)
        mat.size = 0.25 + 0.15 * Math.sin(time * 20 + i * 0.3)
      } else if (child instanceof THREE.Mesh) {
        const mat = child.material as THREE.MeshBasicMaterial
        const pulse = 0.5 + 0.5 * Math.sin(time * 25 + i * 0.7)
        mat.opacity = 0.6 + 0.4 * pulse
        const scale = 0.8 + 0.4 * pulse
        child.scale.setScalar(scale)
      }
    }
  })

  return <group ref={groupRef} />
}
