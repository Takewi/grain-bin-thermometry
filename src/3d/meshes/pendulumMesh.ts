import {
  Scene,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3,
  Mesh,
  DynamicTexture,
  type LinesMesh,
} from "@babylonjs/core";
import { getSensorVisualInfo } from "../utils/colorScale";
import { THERMOMETRY_CONFIG } from "../constants";
import type { StorageDetail, SensorReading, StorageType } from "@/types/storage";

export interface SensorInstanceMetadata {
  index: number;
  pendulumIndex: number;
  sensorIndex: number;
  isCentral: boolean;
  sectorNumber?: number;
  ringIndex?: number;
  reading: SensorReading;
  worldPosition: Vector3;
}

export interface PendulumVisualizerInstance {
  root: Mesh;
  sensorMeshes: Mesh[];
  sensorMetadata: SensorInstanceMetadata[];
  dispose: () => void;
}

interface ParsedPendulum {
  pendulumIndex: number;
  localX: number;
  localZ: number;
  isCentral: boolean;
  sectorNumber?: number;
  ringIndex?: number;
  sensors: SensorReading[];
}

// Cache global de materiais e texturas dos badges de temperatura para renderização com latência zero
const badgeMaterialCache = new Map<string, StandardMaterial>();

export function clearSensorBadgeCache(): void {
  badgeMaterialCache.forEach((mat) => {
    mat.diffuseTexture?.dispose();
    mat.dispose();
  });
  badgeMaterialCache.clear();
}

/**
 * Obtém ou cria material e textura dinâmica de sensor com memoização global de alta performance
 */
function getOrCreateBadgeMaterial(
  scene: Scene,
  temp: number,
  isFaulty: boolean,
  colorHex: string
): StandardMaterial {
  const cacheKey = `${isFaulty ? "ERR" : temp.toFixed(1)}_${colorHex}`;
  const existing = badgeMaterialCache.get(cacheKey);
  if (existing) {
    return existing;
  }

  const { BADGE } = THERMOMETRY_CONFIG;
  const width = BADGE.CANVAS_WIDTH;
  const height = BADGE.CANVAS_HEIGHT;

  const texture = new DynamicTexture(
    `badge_tex_${cacheKey}`,
    { width, height },
    scene,
    false
  );
  texture.hasAlpha = true;

  const ctx = texture.getContext() as CanvasRenderingContext2D;
  ctx.clearRect(0, 0, width, height);

  const pad = 6;
  const pillW = width - pad * 2;
  const pillH = height - pad * 2;
  const radius = pillH / 2;

  // 1. Fundo da Pílula (Dark Glassmorphism)
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(pad, pad, pillW, pillH, radius);
  } else {
    ctx.arc(pad + radius, pad + radius, radius, Math.PI / 2, Math.PI * 1.5);
    ctx.arc(pad + pillW - radius, pad + radius, radius, -Math.PI / 2, Math.PI / 2);
    ctx.closePath();
  }
  ctx.fillStyle = BADGE.BG_COLOR;
  ctx.fill();

  // 2. Borda Colorida com a escala térmica
  ctx.lineWidth = BADGE.BORDER_WIDTH;
  ctx.strokeStyle = colorHex;
  ctx.stroke();

  // 3. Ponto Indicador Térmico à Esquerda
  const dotX = pad + radius * 0.72;
  const dotY = height / 2;
  ctx.beginPath();
  ctx.arc(dotX, dotY, BADGE.INDICATOR_DOT_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = colorHex;
  ctx.fill();

  // 4. Texto da Temperatura (Valor + °C ou ERR)
  const displayText = isFaulty ? "ERR" : `${temp.toFixed(1)}°`;
  ctx.font = `bold ${BADGE.FONT_SIZE}px 'JetBrains Mono', 'Inter', monospace, sans-serif`;
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(displayText, width / 2 + 18, height / 2 + 2);

  texture.update();

  const mat = new StandardMaterial(`badge_mat_${cacheKey}`, scene);
  mat.diffuseTexture = texture;
  mat.emissiveTexture = texture;
  mat.opacityTexture = texture;
  mat.useAlphaFromDiffuseTexture = true;
  mat.disableLighting = true;
  mat.backFaceCulling = false;
  mat.freeze(); // Congela material para eliminar overhead de uniformes por frame

  badgeMaterialCache.set(cacheKey, mat);
  return mat;
}

export function renderThermometry(
  scene: Scene,
  detail: StorageDetail,
  parentPos: Vector3,
  type: StorageType,
  dimensions: { width: number; height: number; depth: number; radius: number }
): PendulumVisualizerInstance {
  const root = new Mesh(`thermo_root_${detail.id}`, scene);
  root.position = parentPos.clone();

  const disposableObjects: { dispose: () => void }[] = [];
  const sensorMeshes: Mesh[] = [];
  const sensorMetadata: SensorInstanceMetadata[] = [];

  const levelMap = detail.levelMaps[0];
  if (!levelMap) {
    return {
      root,
      sensorMeshes: [],
      sensorMetadata: [],
      dispose: () => root.dispose(),
    };
  }

  const parsedPendulums: ParsedPendulum[] = [];
  let pendulumCounter = 0;

  // 1. Pêndulo Central (Presente exclusivamente em Silos Cilíndricos)
  if (type === "SILO" && levelMap.centralPendulum && levelMap.centralPendulum.length > 0) {
    parsedPendulums.push({
      pendulumIndex: pendulumCounter++,
      localX: 0,
      localZ: 0,
      isCentral: true,
      sensors: levelMap.centralPendulum,
    });
  }

  // Guardar informações dos anéis para desenhar as guias circulares
  const ringRadii: number[] = [];

  // 2. Anéis Radiais / Setores
  if (levelMap.arcRings && levelMap.arcRings.length > 0) {
    if (type === "SILO") {
      const { RINGS } = THERMOMETRY_CONFIG;
      levelMap.arcRings.forEach((sectorData, ringIdx) => {
        const ratio = ringIdx === 0 ? RINGS.INNER_RATIO : RINGS.OUTER_RATIO;
        const ringRadius = dimensions.radius * ratio;
        ringRadii.push(ringRadius);
        const count = sectorData.pendulums.length;

        sectorData.pendulums.forEach((sensors, pIdx) => {
          const angleOffset = ringIdx * RINGS.ROTATION_OFFSET_PER_RING;
          const angle = (pIdx / count) * Math.PI * 2 + angleOffset;
          const x = ringRadius * Math.cos(angle);
          const z = ringRadius * Math.sin(angle);

          parsedPendulums.push({
            pendulumIndex: pendulumCounter++,
            localX: x,
            localZ: z,
            isCentral: false,
            sectorNumber: sectorData.sector,
            ringIndex: ringIdx + 1,
            sensors,
          });
        });
      });
    } else {
      // Graneleiro retangular alongado: Setores organizados como arcos transversais bem espaçados ao longo de Z
      const totalSectors = levelMap.arcRings.length;
      const usableDepth = dimensions.depth * 0.78;
      const zStep = totalSectors > 1 ? usableDepth / (totalSectors - 1) : 0;

      levelMap.arcRings.forEach((sectorData, secIdx) => {
        const count = sectorData.pendulums.length;
        const secZ = totalSectors > 1
          ? -usableDepth / 2 + secIdx * zStep
          : 0;

        // Distribuição transversal ao longo da largura X
        const usableWidth = dimensions.width * 0.72;
        const xStep = count > 1 ? usableWidth / (count - 1) : 0;

        sectorData.pendulums.forEach((sensors, pIdx) => {
          const x = count > 1
            ? -usableWidth / 2 + pIdx * xStep
            : 0;
          const z = secZ;

          parsedPendulums.push({
            pendulumIndex: pendulumCounter++,
            localX: x,
            localZ: z,
            isCentral: false,
            sectorNumber: sectorData.sector,
            ringIndex: secIdx + 1,
            sensors,
          });
        });
      });
    }
  }

  // 1. Alturas dos Cabos e dos Anéis Estruturais (fixação estrutural)
  const cableBottomY = 0.65;
  const cableTopY = dimensions.height * THERMOMETRY_CONFIG.SENSOR_TOP_ANCHOR_RATIO;

  // 2. Alturas dos Sensores (com gap no topo e folga aumentada do solo)
  const sensorBottomY = THERMOMETRY_CONFIG.SENSOR_BOTTOM_OFFSET_Y;
  const sensorTopY = Math.max(
    sensorBottomY + 1.0,
    dimensions.height - THERMOMETRY_CONFIG.SENSOR_TOP_OFFSET_Y
  );

  // ==========================================
  // Renderização dos Anéis Estruturais e Guias 3D
  // ==========================================
  const ringGuideLines: Vector3[][] = [];
  const { RINGS, CABLE, BADGE } = THERMOMETRY_CONFIG;

  if (type === "SILO") {
    // Círculos concêntricos dos anéis no Topo e na Base
    ringRadii.forEach((r) => {
      const segments = RINGS.CIRCLE_SEGMENTS;
      const topCircle: Vector3[] = [];
      const bottomCircle: Vector3[] = [];

      for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        const cx = r * Math.cos(theta);
        const cz = r * Math.sin(theta);
        topCircle.push(new Vector3(cx, cableTopY, cz));
        bottomCircle.push(new Vector3(cx, cableBottomY, cz));
      }
      ringGuideLines.push(topCircle);
      ringGuideLines.push(bottomCircle);
    });

    // Raios conectando centro aos cabos
    parsedPendulums.forEach((p) => {
      if (!p.isCentral) {
        ringGuideLines.push([
          new Vector3(0, cableTopY, 0),
          new Vector3(p.localX, cableTopY, p.localZ),
        ]);
      }
    });

    // Cruz indicadora do centro
    const crossSize = 0.8;
    ringGuideLines.push([
      new Vector3(-crossSize, cableTopY, 0),
      new Vector3(crossSize, cableTopY, 0),
    ]);
    ringGuideLines.push([
      new Vector3(0, cableTopY, -crossSize),
      new Vector3(0, cableTopY, crossSize),
    ]);
  } else {
    // Arcos Transversais de Termometria no Armazém Graneleiro
    const sectorZSet = new Set<number>();
    parsedPendulums.forEach((p) => sectorZSet.add(p.localZ));

    sectorZSet.forEach((secZ) => {
      const halfW = dimensions.width * 0.40;
      const archTopLine: Vector3[] = [];
      const archBottomLine: Vector3[] = [];

      for (let step = 0; step <= 16; step++) {
        const u = -1 + (step / 16) * 2;
        const ax = u * halfW;
        const ayTop = cableTopY + (1 - u * u) * 0.6;
        archTopLine.push(new Vector3(ax, ayTop, secZ));
        archBottomLine.push(new Vector3(ax, cableBottomY, secZ));
      }
      ringGuideLines.push(archTopLine);
      ringGuideLines.push(archBottomLine);
    });
  }

  const ringGuidesMesh: LinesMesh = MeshBuilder.CreateLineSystem(
    `ring_guides_${detail.id}`,
    { lines: ringGuideLines },
    scene
  );
  ringGuidesMesh.color = new Color3(...RINGS.GUIDE_COLOR_RGB);
  ringGuidesMesh.parent = root;
  ringGuidesMesh.isPickable = false;
  disposableObjects.push(ringGuidesMesh);

  // ==========================================
  // Cabos e Badges/Pílulas com Billboard Mode
  // ==========================================
  const cableLines: Vector3[][] = [];
  let globalSensorIndex = 0;

  // Template base reutilizado por clonagem de geometria (zero overhead de alocação de buffers)
  const templatePlane = MeshBuilder.CreatePlane(
    `sensor_template_${detail.id}`,
    { width: BADGE.WIDTH, height: BADGE.HEIGHT },
    scene
  );
  templatePlane.isVisible = false;
  templatePlane.isPickable = false;
  templatePlane.parent = root;
  disposableObjects.push(templatePlane);

  parsedPendulums.forEach((p) => {
    // Para armazéns graneleiros, ajusta a altura do cabo e dos sensores seguindo a curvatura do arco
    const isWh = type === "WAREHOUSE";
    const u = isWh ? p.localX / (dimensions.width * 0.5) : 0;
    const archFactor = Math.max(0, 1 - u * u);

    const pCableTopY = isWh
      ? cableTopY + archFactor * 0.75
      : cableTopY;

    const pSensorBottomY = isWh
      ? sensorBottomY + archFactor * 0.20
      : sensorBottomY;

    const pSensorTopY = isWh
      ? sensorTopY + archFactor * 0.70
      : sensorTopY;

    // Linha do cabo vertical de aço (vai da base até a abóbada do teto)
    cableLines.push([
      new Vector3(p.localX, cableBottomY, p.localZ),
      new Vector3(p.localX, pCableTopY, p.localZ),
    ]);

    const sCount = p.sensors.length;
    p.sensors.forEach((sensor, sIdx) => {
      // Distribui os sensores: sIdx = 0 no topo (mais alto) até sIdx = sCount - 1 na base (mais baixo)
      const y =
        sCount > 1
          ? pSensorTopY - (sIdx / (sCount - 1)) * (pSensorTopY - pSensorBottomY)
          : (pSensorBottomY + pSensorTopY) / 2;

      const visualInfo = getSensorVisualInfo(sensor.temperature, sensor.level);

      // 1. Material e textura obtidos instantaneamente via cache
      const badgeMat = getOrCreateBadgeMaterial(
        scene,
        sensor.temperature,
        visualInfo.isFaulty,
        visualInfo.hex
      );

      // 2. Plano Billboard clonado a partir do template com custo zero
      const badgePlane = templatePlane.clone(`sensor_badge_${globalSensorIndex}`);
      badgePlane.isVisible = true;
      badgePlane.position = new Vector3(p.localX, y, p.localZ);
      badgePlane.material = badgeMat;
      badgePlane.parent = root;
      badgePlane.billboardMode = Mesh.BILLBOARDMODE_ALL;
      badgePlane.isPickable = true;

      // Metadados para hover e tooltip
      const meta: SensorInstanceMetadata = {
        index: globalSensorIndex,
        pendulumIndex: p.pendulumIndex,
        sensorIndex: sIdx + 1,
        isCentral: p.isCentral,
        sectorNumber: p.sectorNumber,
        ringIndex: p.ringIndex,
        reading: sensor,
        worldPosition: new Vector3(
          parentPos.x + p.localX,
          parentPos.y + y,
          parentPos.z + p.localZ
        ),
      };

      badgePlane.metadata = { isSensorBadge: true, sensorMeta: meta };
      sensorMeshes.push(badgePlane);
      sensorMetadata.push(meta);
      disposableObjects.push(badgePlane);

      globalSensorIndex++;
    });
  });

  // Malha de cabos de sustentação
  const cables: LinesMesh = MeshBuilder.CreateLineSystem(
    `cables_${detail.id}`,
    { lines: cableLines },
    scene
  );
  cables.color = new Color3(...CABLE.COLOR_RGB);
  cables.parent = root;
  cables.isPickable = false;
  disposableObjects.push(cables);

  return {
    root,
    sensorMeshes,
    sensorMetadata,
    dispose: () => {
      disposableObjects.forEach((obj) => obj.dispose());
      root.dispose();
    },
  };
}
