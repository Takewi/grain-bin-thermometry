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

export function renderGrainVolume(
  scene: Scene,
  parentPos: Vector3,
  type: StorageType,
  dimensions: { width: number; height: number; depth: number; radius: number },
  fillPercentage: number,
  levelMap?: LevelMap
): Mesh {
  const { GRAIN } = MATERIAL_CONFIG;
  const grainMesh = new Mesh(`grainVolume_${Math.random()}`, scene);
  grainMesh.position = parentPos.clone();

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

    // Geração da malha radial com cone superior
    const NS = 36; // Fatias angulares em 360°
    const NR = 4;  // Anéis concêntricos

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

    // Triângulos entre anéis concêntricos
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

    // Parede lateral cilíndrica até a base
    const offsetTopRim = 1 + (NR - 1) * NS;
    const offsetBottomRim = positions.length / 3;

    for (let s = 0; s < NS; s++) {
      const theta = (s / NS) * Math.PI * 2;
      positions.push(rMesh * Math.cos(theta), baseY, rMesh * Math.sin(theta));
    }

    for (let s = 0; s < NS; s++) {
      const next = (s + 1) % NS;
      const t1 = offsetTopRim + s;
      const t2 = offsetTopRim + next;
      const b1 = offsetBottomRim + s;
      const b2 = offsetBottomRim + next;
      indices.push(t1, b1, t2);
      indices.push(t2, b1, b2);
    }

    // Fundo plano na base
    const idxBottomCenter = positions.length / 3;
    positions.push(0, baseY, 0);
    for (let s = 0; s < NS; s++) {
      const next = (s + 1) % NS;
      indices.push(idxBottomCenter, offsetBottomRim + next, offsetBottomRim + s);
    }

  } else {
    // ==========================================
    // ARMAZÉM GRANELEIRO: TOPO EM FORMA DE ONDA/CRISTAS LONGITUDINAIS
    // ==========================================
    const wMesh = dimensions.width * 0.95;
    const dMesh = dimensions.depth * 0.95;

    const sectorHeights: { midY: number; sideY: number }[] = [];

    if (levelMap?.arcRings && levelMap.arcRings.length > 0) {
      levelMap.arcRings.forEach((sectorData) => {
        const pendulums = sectorData.pendulums;
        const pCount = pendulums.length;
        if (pCount > 0) {
          const heights = pendulums.map((p) => {
            return getPendulumGrainTopY(p, sensorTopY + 0.7, sensorBottomY);
          });
          // Centro (pêndulos do meio) vs Laterais (pêndulos das pontas)
          const midIdx1 = Math.floor(pCount / 2) - 1;
          const midIdx2 = Math.floor(pCount / 2);
          const midY = (heights[midIdx1] + heights[midIdx2]) / 2;
          const sideY = (heights[0] + heights[pCount - 1]) / 2;
          sectorHeights.push({ midY, sideY });
        }
      });
    }

    // Fallback caso não haja setores
    if (sectorHeights.length === 0) {
      const ratio = Math.max(0.08, Math.min(1.0, fillPercentage / 100));
      const defH = dimensions.height * ratio * GRAIN.HEIGHT_MAX_RATIO;
      for (let s = 0; s < 4; s++) {
        sectorHeights.push({ midY: defH, sideY: defH * 0.75 });
      }
    }

    // Função de interpolação do perfil 3D de topo do armazém (montanha transversal + onda longitudinal)
    const getTopY = (x: number, z: number): number => {
      const uZ = (z + dMesh / 2) / dMesh; // 0 a 1 ao longo da profundidade
      const secFloat = uZ * (sectorHeights.length - 1);
      const secIdx = Math.min(sectorHeights.length - 2, Math.max(0, Math.floor(secFloat)));
      const frac = secFloat - secIdx;

      const sA = sectorHeights[secIdx] || sectorHeights[0];
      const sB = sectorHeights[secIdx + 1] || sA;

      // Interpolação suave cúbica entre setores
      const smoothFrac = frac * frac * (3 - 2 * frac);
      const curMidY = sA.midY + (sB.midY - sA.midY) * smoothFrac;
      const curSideY = sA.sideY + (sB.sideY - sA.sideY) * smoothFrac;

      // Curvatura transversal em arco (cume no centro X = 0, talude nas laterais)
      const uX = x / (wMesh / 2);
      const archFactor = Math.max(0, 1 - uX * uX);

      return curSideY + (curMidY - curSideY) * archFactor;
    };

    const NX = 20;
    const NZ = 30;
    const dx = wMesh / NX;
    const dz = dMesh / NZ;

    // 1. Grade Superior
    for (let j = 0; j <= NZ; j++) {
      const z = -dMesh / 2 + j * dz;
      for (let i = 0; i <= NX; i++) {
        const x = -wMesh / 2 + i * dx;
        const y = getTopY(x, z);
        positions.push(x, y, z);
      }
    }

    for (let j = 0; j < NZ; j++) {
      const rowA = j * (NX + 1);
      const rowB = (j + 1) * (NX + 1);
      for (let i = 0; i < NX; i++) {
        const a1 = rowA + i;
        const a2 = rowA + i + 1;
        const b1 = rowB + i;
        const b2 = rowB + i + 1;
        indices.push(a1, b1, a2);
        indices.push(a2, b1, b2);
      }
    }

    // 2. Paredes Laterais Verticais de Fechamento (Norte, Sul, Leste, Oeste)
    const addWallSegment = (x1: number, y1: number, z1: number, x2: number, y2: number, z2: number) => {
      const startIdx = positions.length / 3;
      positions.push(x1, y1, z1);
      positions.push(x2, y2, z2);
      positions.push(x1, baseY, z1);
      positions.push(x2, baseY, z2);
      indices.push(startIdx, startIdx + 2, startIdx + 1);
      indices.push(startIdx + 1, startIdx + 2, startIdx + 3);
    };

    // Parede Sul (z = -dMesh / 2)
    for (let i = 0; i < NX; i++) {
      const x1 = -wMesh / 2 + i * dx;
      const x2 = -wMesh / 2 + (i + 1) * dx;
      const z = -dMesh / 2;
      addWallSegment(x1, getTopY(x1, z), z, x2, getTopY(x2, z), z);
    }
    // Parede Norte (z = +dMesh / 2)
    for (let i = 0; i < NX; i++) {
      const x1 = -wMesh / 2 + (i + 1) * dx;
      const x2 = -wMesh / 2 + i * dx;
      const z = dMesh / 2;
      addWallSegment(x1, getTopY(x1, z), z, x2, getTopY(x2, z), z);
    }
    // Parede Oeste (x = -wMesh / 2)
    for (let j = 0; j < NZ; j++) {
      const z1 = -dMesh / 2 + (j + 1) * dz;
      const z2 = -dMesh / 2 + j * dz;
      const x = -wMesh / 2;
      addWallSegment(x, getTopY(x, z1), z1, x, getTopY(x, z2), z2);
    }
    // Parede Leste (x = +wMesh / 2)
    for (let j = 0; j < NZ; j++) {
      const z1 = -dMesh / 2 + j * dz;
      const z2 = -dMesh / 2 + (j + 1) * dz;
      const x = wMesh / 2;
      addWallSegment(x, getTopY(x, z1), z1, x, getTopY(x, z2), z2);
    }

  // 3. Fundo Plano na Base
    const baseStartIdx = positions.length / 3;
    positions.push(-wMesh / 2, baseY, -dMesh / 2);
    positions.push(wMesh / 2, baseY, -dMesh / 2);
    positions.push(wMesh / 2, baseY, dMesh / 2);
    positions.push(-wMesh / 2, baseY, dMesh / 2);
    indices.push(baseStartIdx, baseStartIdx + 2, baseStartIdx + 1);
    indices.push(baseStartIdx, baseStartIdx + 3, baseStartIdx + 2);
  }

  // ==========================================
  // Extração dos Pontos de Amostragem Térmica (Sensores in_grain)
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
      const numSectors = arcRings.length;
      arcRings.forEach((sector, secIdx) => {
        const z =
          numSectors > 1
            ? -dimensions.depth * 0.375 +
              (secIdx / (numSectors - 1)) * (dimensions.depth * 0.75)
            : 0;

        const pList = sector.pendulums;
        const numP = pList.length;
        pList.forEach((p, pIdx) => {
          const x =
            numP > 1
              ? -dimensions.width * 0.40 +
                (pIdx / (numP - 1)) * (dimensions.width * 0.80)
              : 0;

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
  // Interpolação Térmica 3D (Heatmap Volumétrico IDW)
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
      const w = 1 / Math.pow(distSq + 0.6, 1.25);
      sumWeight += w;
      sumTemp += sp.temp * w;
    }

    const vertTemp = sumWeight > 0 ? sumTemp / sumWeight : 23.0;
    const [r, g, b] = temperatureToRGB(vertTemp);
    colors.push(r, g, b, 0.58);
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

  grainMesh.hasVertexAlpha = true;
  grainMesh.isPickable = false;

  // Material Heatmap Volumétrico Translúcido
  const mat = new StandardMaterial(`grainHeatmapMat_${Math.random()}`, scene);
  mat.diffuseColor = new Color3(1.0, 1.0, 1.0);
  mat.specularColor = new Color3(0.15, 0.15, 0.15);
  mat.emissiveColor = new Color3(0.25, 0.25, 0.25); // Autoiluminação para brilho térmico
  mat.backFaceCulling = false;
  grainMesh.material = mat;

  return grainMesh;
}
