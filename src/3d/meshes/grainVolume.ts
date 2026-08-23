import {
  Scene,
  Mesh,
  VertexData,
  StandardMaterial,
  Color3,
  Vector3,
} from "@babylonjs/core";
import { MATERIAL_CONFIG, THERMOMETRY_CONFIG } from "../constants";
import { temperatureToRGB } from "../utils/colorScale";
import type { StorageType, LevelMap, SensorReading } from "@/types/storage";

/**
 * Calcula a altura Y do topo da massa de grãos para um dado pêndulo com base no sensor 'in_grain' mais alto
 */
function getPendulumGrainTopY(
  sensors: SensorReading[],
  sensorTopY: number,
  sensorBottomY: number
): number {
  if (!sensors || sensors.length === 0) {
    return sensorBottomY;
  }
  const sCount = sensors.length;
  // Procura o primeiro sensor com level === "in_grain" (de cima para baixo: índice 0 no topo até N-1 na base)
  const firstInGrainIdx = sensors.findIndex((s) => s.level === "in_grain");
  if (firstInGrainIdx === -1) {
    // Todos estão out_of_grain: nível residual na base
    return sensorBottomY * 0.4;
  }
  // Interpola a superfície do grão logo acima do sensor mais alto que está dentro do grão
  const effectiveIdx = Math.max(0, firstInGrainIdx - 0.4);
  return sCount > 1
    ? sensorTopY - (effectiveIdx / (sCount - 1)) * (sensorTopY - sensorBottomY)
    : sensorTopY;
}

export type GrainVisualMode = "level" | "heatmap";

export function applyGrainVolumeMode(
  grainMesh: Mesh,
  mode: GrainVisualMode,
  avgTemp?: number
): void {
  const mat = grainMesh.material as StandardMaterial;
  if (!mat) return;

  if (mode === "heatmap") {
    // Modo Heatmap: Ativa o mapa de calor por vértice com autoiluminação equilibrada
    grainMesh.useVertexColors = true;
    grainMesh.hasVertexAlpha = true;
    mat.diffuseColor = new Color3(0.65, 0.65, 0.65);
    mat.specularColor = new Color3(0, 0, 0);
    mat.emissiveColor = new Color3(0.55, 0.55, 0.55); // Brilho térmico balanceado sem esbranquiçar
    mat.alpha = 1.0;
    mat.backFaceCulling = false;
    mat.transparencyMode = StandardMaterial.MATERIAL_ALPHABLEND;
  } else {
    // Modo Nível: Desativa totalmente as cores de vértice para ser 100% da MESMA cor uniforme (cor da temp média)
    grainMesh.useVertexColors = false;
    grainMesh.hasVertexAlpha = false;
    const temp = avgTemp ?? (grainMesh.metadata?.avgTemp ?? 23);
    const [r, g, b] = temperatureToRGB(temp);
    mat.diffuseColor = new Color3(r, g, b);
    mat.specularColor = new Color3(0.12, 0.12, 0.12);
    mat.emissiveColor = new Color3(r * 0.45, g * 0.45, b * 0.45);
    mat.alpha = 0.44;
    mat.backFaceCulling = false;
    mat.transparencyMode = StandardMaterial.MATERIAL_ALPHABLEND;
  }
}

export function renderGrainVolume(
  scene: Scene,
  parentPos: Vector3,
  type: StorageType,
  dimensions: { width: number; height: number; depth: number; radius: number },
  fillPercentage: number,
  levelMap?: LevelMap,
  mode: GrainVisualMode = "heatmap",
  avgTemp: number = 23
): Mesh {
  const { GRAIN } = MATERIAL_CONFIG;
  const grainMesh = new Mesh(`grainVolume_${Math.random()}`, scene);
  grainMesh.position = parentPos.clone();
  grainMesh.metadata = { avgTemp };

  // Alturas verticais limites de termometria
  const sensorBottomY = THERMOMETRY_CONFIG.SENSOR_BOTTOM_OFFSET_Y;
  const sensorTopY = Math.max(
    sensorBottomY + 1.0,
    dimensions.height - THERMOMETRY_CONFIG.SENSOR_TOP_OFFSET_Y
  );

  const positions: number[] = [];
  const indices: number[] = [];
  const baseY = 0.05; // Piso base de apoio

  if (type === "SILO") {
    // ==========================================
    // SILO CILÍNDRICO: TOPO EM FORMA DE TALUDE/CONE (MONTANHA DE GRÃOS)
    // ==========================================
    const rMesh = dimensions.radius * 0.96;

    // 1. Altura do pico central (Pêndulo Central)
    let centerTopY: number;
    if (levelMap?.centralPendulum && levelMap.centralPendulum.length > 0) {
      centerTopY = getPendulumGrainTopY(levelMap.centralPendulum, sensorTopY, sensorBottomY);
    } else {
      const ratio = Math.max(0.08, Math.min(1.0, fillPercentage / 100));
      centerTopY = dimensions.height * ratio * GRAIN.HEIGHT_MAX_RATIO;
    }

    // 2. Alturas médias dos anéis interno e externo
    let innerRingTopY = centerTopY * 0.92;
    let outerRingTopY = centerTopY * 0.82;

    if (levelMap?.arcRings && levelMap.arcRings.length > 0) {
      // Setor 1: Anel interno
      const innerPendulums = levelMap.arcRings[0]?.pendulums || [];
      if (innerPendulums.length > 0) {
        const heights = innerPendulums.map((p) =>
          getPendulumGrainTopY(p, sensorTopY, sensorBottomY)
        );
        innerRingTopY = heights.reduce((a, b) => a + b, 0) / heights.length;
      }
      // Setor 2: Anel externo
      const outerPendulums = levelMap.arcRings[1]?.pendulums || [];
      if (outerPendulums.length > 0) {
        const heights = outerPendulums.map((p) =>
          getPendulumGrainTopY(p, sensorTopY, sensorBottomY)
        );
        outerRingTopY = heights.reduce((a, b) => a + b, 0) / heights.length;
      }
    }

    // Altura na parede do silo (extrapolação da descida do talude natural)
    const wallTopY = Math.max(
      baseY + 0.3,
      outerRingTopY - (centerTopY - outerRingTopY) * 0.4
    );

    // Geração da malha radial com cone superior de alta densidade
    const NS = 48; // Fatias angulares em 360°
    const NR = 8;  // Anéis concêntricos no topo
    const NH = 6;  // Fatias verticais nas paredes

    // Vértice central do topo (pico da montanha): index 0
    positions.push(0, centerTopY, 0);

    // Vértices dos anéis concêntricos do topo
    for (let r = 1; r <= NR; r++) {
      const u = r / NR;
      const rad = u * rMesh;

      // Interpolação suave passando pelos anéis de sensores
      let y: number;
      if (u <= 0.45) {
        const t = u / 0.45;
        y = centerTopY + (innerRingTopY - centerTopY) * t;
      } else if (u <= 0.80) {
        const t = (u - 0.45) / 0.35;
        y = innerRingTopY + (outerRingTopY - innerRingTopY) * t;
      } else {
        const t = (u - 0.80) / 0.20;
        y = outerRingTopY + (wallTopY - outerRingTopY) * t;
      }

      for (let s = 0; s < NS; s++) {
        const theta = (s / NS) * Math.PI * 2;
        positions.push(rad * Math.cos(theta), y, rad * Math.sin(theta));
      }
    }

    // Triângulos do centro para o 1º anel
    for (let s = 0; s < NS; s++) {
      const next = (s + 1) % NS;
      indices.push(0, 1 + s, 1 + next);
    }

    // Triângulos entre anéis concêntricos no topo
    for (let r = 1; r < NR; r++) {
      const offsetA = 1 + (r - 1) * NS;
      const offsetB = 1 + r * NS;
      for (let s = 0; s < NS; s++) {
        const next = (s + 1) % NS;
        const a1 = offsetA + s;
        const a2 = offsetA + next;
        const b1 = offsetB + s;
        const b2 = offsetB + next;
        indices.push(a1, b1, a2);
        indices.push(a2, b1, b2);
      }
    }

    // Função auxiliar para construir paredes cilíndricas verticais completas (internas nos anéis e externa na parede)
    const addCylindricalWall = (radius: number, topY: number) => {
      let prevOffset = positions.length / 3;
      for (let s = 0; s < NS; s++) {
        const theta = (s / NS) * Math.PI * 2;
        positions.push(radius * Math.cos(theta), topY, radius * Math.sin(theta));
      }

      for (let h = 1; h <= NH; h++) {
        const t = h / NH;
        const layerY = topY + (baseY - topY) * t;
        const currOffset = positions.length / 3;

        for (let s = 0; s < NS; s++) {
          const theta = (s / NS) * Math.PI * 2;
          positions.push(radius * Math.cos(theta), layerY, radius * Math.sin(theta));
        }

        for (let s = 0; s < NS; s++) {
          const next = (s + 1) % NS;
          const t1 = prevOffset + s;
          const t2 = prevOffset + next;
          const b1 = currOffset + s;
          const b2 = currOffset + next;
          indices.push(t1, b1, t2);
          indices.push(t2, b1, b2);
        }
        prevOffset = currOffset;
      }
      return prevOffset;
    };

    // 1. Parede Interna do Anel 1 (raio interno ~45% - alinhada aos sensores internos)
    addCylindricalWall(dimensions.radius * 0.45, innerRingTopY);

    // 2. Parede Interna do Anel 2 (raio externo ~80% - alinhada aos sensores do anel 2)
    addCylindricalWall(dimensions.radius * 0.80, outerRingTopY);

    // 3. Parede Externa Perimetral do Silo (raio 96%)
    const outerWallBaseOffset = addCylindricalWall(rMesh, wallTopY);

    // 4. Fundo plano na base
    const idxBottomCenter = positions.length / 3;
    positions.push(0, baseY, 0);
    for (let s = 0; s < NS; s++) {
      const next = (s + 1) % NS;
      indices.push(idxBottomCenter, outerWallBaseOffset + next, outerWallBaseOffset + s);
    }
  } else {
    // ==========================================
    // ARMAZÉM GRANELEIRO: TOPO EM CRISTA LONGITUDINAL + PAREDES INTERNAS VOLUMÉTRICAS
    // ==========================================
    const halfW = dimensions.width * 0.44;
    const halfD = dimensions.depth * 0.44;

    const sectorHeights = [0, 0, 0, 0];
    const arcRings = levelMap?.arcRings || [];
    for (let secIdx = 0; secIdx < 4; secIdx++) {
      const sec = arcRings[secIdx];
      if (sec && sec.pendulums && sec.pendulums.length > 0) {
        const heights = sec.pendulums.map((p) =>
          getPendulumGrainTopY(p, sensorTopY, sensorBottomY)
        );
        sectorHeights[secIdx] = heights.reduce((a, b) => a + b, 0) / heights.length;
      } else {
        const ratio = Math.max(0.08, Math.min(1.0, fillPercentage / 100));
        sectorHeights[secIdx] = dimensions.height * ratio * GRAIN.HEIGHT_MAX_RATIO;
      }
    }

    const NX = 36; // Resolução transversal
    const NZ = 36; // Resolução longitudinal
    const NY = 6;  // Camadas verticais nas paredes

    // Grid do topo
    for (let iz = 0; iz <= NZ; iz++) {
      const v = iz / NZ;
      const z = -halfD + v * (2 * halfD);

      const secNorm = v * 3;
      const secFloor = Math.min(2, Math.floor(secNorm));
      const secFrac = secNorm - secFloor;
      const h0 = sectorHeights[secFloor] || sectorHeights[0];
      const h1 = sectorHeights[secFloor + 1] || h0;
      const ridgeY = h0 + (h1 - h0) * secFrac;

      for (let ix = 0; ix <= NX; ix++) {
        const u = ix / NX;
        const x = -halfW + u * (2 * halfW);

        const distFromCenter = Math.abs((ix - NX / 2) / (NX / 2));
        const archProfile = Math.max(0, 1 - Math.pow(distFromCenter, 1.8));
        const edgeY = Math.max(baseY + 0.3, ridgeY * 0.35);
        const y = edgeY + (ridgeY - edgeY) * archProfile;

        positions.push(x, y, z);
      }
    }

    // Triângulos do topo
    for (let iz = 0; iz < NZ; iz++) {
      for (let ix = 0; ix < NX; ix++) {
        const row1 = iz * (NX + 1);
        const row2 = (iz + 1) * (NX + 1);
        const a = row1 + ix;
        const b = row1 + ix + 1;
        const c = row2 + ix;
        const d = row2 + ix + 1;
        indices.push(a, c, b);
        indices.push(b, c, d);
      }
    }

    // Função auxiliar para construir parede vertical em plano
    const addQuadWall = (
      x1: number, y1: number, z1: number,
      x2: number, y2: number, z2: number
    ) => {
      const startIdx = positions.length / 3;
      for (let h = 0; h <= NY; h++) {
        const t = h / NY;
        const py1 = y1 + (baseY - y1) * t;
        const py2 = y2 + (baseY - y2) * t;
        positions.push(x1, py1, z1);
        positions.push(x2, py2, z2);
      }
      for (let h = 0; h < NY; h++) {
        const p1 = startIdx + h * 2;
        const p2 = startIdx + h * 2 + 1;
        const p3 = startIdx + (h + 1) * 2;
        const p4 = startIdx + (h + 1) * 2 + 1;
        indices.push(p1, p3, p2);
        indices.push(p2, p3, p4);
      }
    };

    // 1. Paredes Internas Transversais (Fatias exatas nos setores de pêndulos Z)
    if (arcRings.length > 0) {
      const totalSectors = arcRings.length;
      const usableDepth = dimensions.depth * 0.78;
      const zStep = totalSectors > 1 ? usableDepth / (totalSectors - 1) : 0;

      arcRings.forEach((_, secIdx) => {
        const secZ = totalSectors > 1 ? -usableDepth / 2 + secIdx * zStep : 0;
        const v = (secZ + halfD) / (2 * halfD);
        const secNorm = Math.max(0, Math.min(2.99, v * 3));
        const secFloor = Math.floor(secNorm);
        const secFrac = secNorm - secFloor;
        const h0 = sectorHeights[secFloor] || sectorHeights[0];
        const h1 = sectorHeights[secFloor + 1] || h0;
        const ridgeY = h0 + (h1 - h0) * secFrac;

        for (let ix = 0; ix < NX; ix++) {
          const u1 = ix / NX;
          const u2 = (ix + 1) / NX;
          const x1 = -halfW + u1 * (2 * halfW);
          const x2 = -halfW + u2 * (2 * halfW);

          const distFromCenter1 = Math.abs((ix - NX / 2) / (NX / 2));
          const archProfile1 = Math.max(0, 1 - Math.pow(distFromCenter1, 1.8));
          const edgeY1 = Math.max(baseY + 0.3, ridgeY * 0.35);
          const y1 = edgeY1 + (ridgeY - edgeY1) * archProfile1;

          const distFromCenter2 = Math.abs((ix + 1 - NX / 2) / (NX / 2));
          const archProfile2 = Math.max(0, 1 - Math.pow(distFromCenter2, 1.8));
          const edgeY2 = Math.max(baseY + 0.3, ridgeY * 0.35);
          const y2 = edgeY2 + (ridgeY - edgeY2) * archProfile2;

          addQuadWall(x1, y1, secZ, x2, y2, secZ);
        }
      });
    }

    // 2. Paredes Externas do Armazém (4 faces perimetrais)
    // Parede Frontal (Z = -halfD)
    for (let ix = 0; ix < NX; ix++) {
      const idxA = ix;
      const idxB = ix + 1;
      addQuadWall(
        positions[idxA * 3], positions[idxA * 3 + 1], positions[idxA * 3 + 2],
        positions[idxB * 3], positions[idxB * 3 + 1], positions[idxB * 3 + 2]
      );
    }
    // Parede Traseira (Z = halfD)
    const backRow = NZ * (NX + 1);
    for (let ix = 0; ix < NX; ix++) {
      const idxA = backRow + ix + 1;
      const idxB = backRow + ix;
      addQuadWall(
        positions[idxA * 3], positions[idxA * 3 + 1], positions[idxA * 3 + 2],
        positions[idxB * 3], positions[idxB * 3 + 1], positions[idxB * 3 + 2]
      );
    }
    // Parede Esquerda (X = -halfW)
    for (let iz = 0; iz < NZ; iz++) {
      const idxA = (iz + 1) * (NX + 1);
      const idxB = iz * (NX + 1);
      addQuadWall(
        positions[idxA * 3], positions[idxA * 3 + 1], positions[idxA * 3 + 2],
        positions[idxB * 3], positions[idxB * 3 + 1], positions[idxB * 3 + 2]
      );
    }
    // Parede Direita (X = halfW)
    for (let iz = 0; iz < NZ; iz++) {
      const idxA = iz * (NX + 1) + NX;
      const idxB = (iz + 1) * (NX + 1) + NX;
      addQuadWall(
        positions[idxA * 3], positions[idxA * 3 + 1], positions[idxA * 3 + 2],
        positions[idxB * 3], positions[idxB * 3 + 1], positions[idxB * 3 + 2]
      );
    }

    // 4. Fundo plano na base
    const b0 = positions.length / 3;
    positions.push(-halfW, baseY, -halfD);
    positions.push(halfW, baseY, -halfD);
    positions.push(halfW, baseY, halfD);
    positions.push(-halfW, baseY, halfD);
    indices.push(b0, b0 + 2, b0 + 1);
    indices.push(b0, b0 + 3, b0 + 2);
  }

  // ==========================================
  // Extração dos Sensores 3D para Heatmap IDW
  // ==========================================
  interface ThermalSamplePoint {
    x: number;
    y: number;
    z: number;
    temp: number;
  }
  const samplePoints: ThermalSamplePoint[] = [];

  if (levelMap) {
    if (type === "SILO") {
      // 1. Pêndulo central
      if (levelMap.centralPendulum) {
        const sCount = levelMap.centralPendulum.length;
        levelMap.centralPendulum.forEach((s, idx) => {
          if (s.level === "in_grain" && s.temperature < 100) {
            const y =
              sCount > 1
                ? sensorTopY - (idx / (sCount - 1)) * (sensorTopY - sensorBottomY)
                : (sensorTopY + sensorBottomY) / 2;
            samplePoints.push({ x: 0, y, z: 0, temp: s.temperature });
          }
        });
      }

      // 2. Anéis concêntricos
      const arcRings = levelMap.arcRings || [];
      // Anel interno (raio ~45%)
      if (arcRings[0]?.pendulums) {
        const pList = arcRings[0].pendulums;
        const rInner = dimensions.radius * 0.45;
        pList.forEach((p, pIdx) => {
          const theta = (pIdx / pList.length) * Math.PI * 2;
          const px = rInner * Math.cos(theta);
          const pz = rInner * Math.sin(theta);
          const sCount = p.length;
          p.forEach((s, idx) => {
            if (s.level === "in_grain" && s.temperature < 100) {
              const y =
                sCount > 1
                  ? sensorTopY - (idx / (sCount - 1)) * (sensorTopY - sensorBottomY)
                  : (sensorTopY + sensorBottomY) / 2;
              samplePoints.push({ x: px, y, z: pz, temp: s.temperature });
            }
          });
        });
      }

      // Anel externo (raio ~80%)
      if (arcRings[1]?.pendulums) {
        const pList = arcRings[1].pendulums;
        const rOuter = dimensions.radius * 0.80;
        pList.forEach((p, pIdx) => {
          const theta = (pIdx / pList.length) * Math.PI * 2;
          const px = rOuter * Math.cos(theta);
          const pz = rOuter * Math.sin(theta);
          const sCount = p.length;
          p.forEach((s, idx) => {
            if (s.level === "in_grain" && s.temperature < 100) {
              const y =
                sCount > 1
                  ? sensorTopY - (idx / (sCount - 1)) * (sensorTopY - sensorBottomY)
                  : (sensorTopY + sensorBottomY) / 2;
              samplePoints.push({ x: px, y, z: pz, temp: s.temperature });
            }
          });
        });
      }
    } else {
      // Armazém Graneleiro
      const arcRings = levelMap.arcRings || [];
      const totalSectors = arcRings.length;
      const usableDepth = dimensions.depth * 0.78;
      const zStep = totalSectors > 1 ? usableDepth / (totalSectors - 1) : 0;

      arcRings.forEach((sector, secIdx) => {
        const secZ = totalSectors > 1 ? -usableDepth / 2 + secIdx * zStep : 0;
        const pList = sector.pendulums;
        const count = pList.length;
        const usableWidth = dimensions.width * 0.72;
        const xStep = count > 1 ? usableWidth / (count - 1) : 0;

        pList.forEach((p, pIdx) => {
          const x = count > 1 ? -usableWidth / 2 + pIdx * xStep : 0;
          const z = secZ;

          const u = x / (dimensions.width * 0.5);
          const archFactor = Math.max(0, 1 - u * u);
          const pCableTopY = sensorTopY + archFactor * 0.70;
          const pCableBottomY = sensorBottomY + archFactor * 0.20;

          const sCount = p.length;
          p.forEach((s, idx) => {
            if (s.level === "in_grain" && s.temperature < 100) {
              const y =
                sCount > 1
                  ? pCableTopY - (idx / (sCount - 1)) * (pCableTopY - pCableBottomY)
                  : (pCableTopY + pCableBottomY) / 2;
              samplePoints.push({ x, y, z, temp: s.temperature });
            }
          });
        });
      });
    }
  }

  // ==========================================
  // Interpolação Térmica 3D (Heatmap Volumétrico IDW Suave)
  // ==========================================
  const colors: number[] = [];
  const vertexCount = positions.length / 3;

  for (let i = 0; i < vertexCount; i++) {
    const vx = positions[i * 3];
    const vy = positions[i * 3 + 1];
    const vz = positions[i * 3 + 2];

    let sumWeight = 0;
    let sumTemp = 0;

    for (let k = 0; k < samplePoints.length; k++) {
      const sp = samplePoints[k];
      const dx = vx - sp.x;
      const dy = vy - sp.y;
      const dz = vz - sp.z;
      const distSq = dx * dx + dy * dy + dz * dz;
      // IDW refinado com decaimento suave
      const w = 1 / (Math.pow(distSq, 1.25) + 0.35);
      sumWeight += w;
      sumTemp += sp.temp * w;
    }

    const vertTemp = sumWeight > 0 ? sumTemp / sumWeight : 23.0;
    const [r, g, b] = temperatureToRGB(vertTemp);

    // Alpha adaptativo: áreas quentes têm levemente maior opacidade e brilho mantendo saturação
    const tempRatio = Math.max(0, Math.min(1, (vertTemp - 18) / 16));
    const vertAlpha = 0.36 + tempRatio * 0.16;

    colors.push(r, g, b, vertAlpha);
  }

  // Monta a geometria calculada com normais e cores térmicas por vértice
  const normals: number[] = [];
  VertexData.ComputeNormals(positions, indices, normals);

  const vertexData = new VertexData();
  vertexData.positions = positions;
  vertexData.indices = indices;
  vertexData.normals = normals;
  vertexData.colors = colors;
  vertexData.applyToMesh(grainMesh);

  grainMesh.isPickable = false;

  // Material Dinâmico
  const mat = new StandardMaterial(`grainMat_${Math.random()}`, scene);
  mat.backFaceCulling = false;
  grainMesh.material = mat;

  applyGrainVolumeMode(grainMesh, mode, avgTemp);

  return grainMesh;
}
