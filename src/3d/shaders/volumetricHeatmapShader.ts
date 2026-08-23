import {
  ShaderMaterial,
  Effect,
  Scene,
  Vector3,
  Color4,
} from "@babylonjs/core";
import type { StorageType, LevelMap } from "@/types/storage";
import { THERMOMETRY_CONFIG } from "../constants";

export const VOLUMETRIC_HEATMAP_SHADER_NAME = "volumetricHeatmap";

// 1. Vertex Shader GLSL
const vertexShaderSource = `
precision highp float;

attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;

uniform mat4 world;
uniform mat4 viewProjection;

varying vec3 vWorldPosition;
varying vec3 vLocalPosition;
varying vec3 vNormal;
varying vec2 vUV;

void main() {
    vec4 worldPos = world * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    vLocalPosition = position;
    vNormal = normalize((world * vec4(normal, 0.0)).xyz);
    vUV = uv;
    gl_Position = viewProjection * worldPos;
}
`;

// 2. Fragment Shader GLSL com Raymarching Volumétrico Contínuo
const fragmentShaderSource = `
precision highp float;

varying vec3 vWorldPosition;
varying vec3 vLocalPosition;
varying vec3 vNormal;
varying vec2 vUV;

uniform vec3 cameraPosition;
uniform vec3 uDimensions;      // (radius/width, height, depth)
uniform int uStorageType;      // 0 = SILO, 1 = WAREHOUSE
uniform float uBaseY;
uniform float uTopY;

// Sensores (x, y, z locais relativos ao centro do silo, w = temp)
#define MAX_SENSORS 256
uniform vec4 uSensors[MAX_SENSORS];
uniform int uSensorCount;

// Curva contínua de cores térmicas (Amarelo iniciando rigorosamente em 26°C)
vec3 getThermalColor(float temp) {
    if (temp <= 18.0) {
        return vec3(0.12, 0.45, 0.95); // Azul Frio
    } else if (temp <= 22.0) {
        float t = (temp - 18.0) / 4.0;
        return mix(vec3(0.12, 0.45, 0.95), vec3(0.10, 0.75, 0.45), t); // Azul -> Verde
    } else if (temp <= 26.0) {
        float t = (temp - 22.0) / 4.0;
        return mix(vec3(0.10, 0.75, 0.45), vec3(0.95, 0.82, 0.10), t); // Verde -> Amarelo (26°C)
    } else if (temp <= 30.0) {
        float t = (temp - 26.0) / 4.0;
        return mix(vec3(0.95, 0.82, 0.10), vec3(0.96, 0.48, 0.10), t); // Amarelo -> Laranja
    } else if (temp <= 34.0) {
        float t = (temp - 30.0) / 4.0;
        return mix(vec3(0.96, 0.48, 0.10), vec3(0.96, 0.18, 0.12), t); // Laranja -> Vermelho
    } else {
        float t = min((temp - 34.0) / 8.0, 1.0);
        return mix(vec3(0.96, 0.18, 0.12), vec3(0.98, 0.08, 0.08), t); // Vermelho Crítico
    }
}

// Amostragem IDW contínua de temperatura em qualquer ponto do espaço 3D
float sampleTemperature(vec3 pLocal) {
    if (uSensorCount == 0) return 23.0;

    float sumWeight = 0.0001;
    float sumTemp = 0.0023;

    for (int i = 0; i < MAX_SENSORS; i++) {
        if (i >= uSensorCount) break;
        vec4 s = uSensors[i];
        vec3 diff = pLocal - s.xyz;
        float d2 = dot(diff, diff);
        // IDW com decaimento suave
        float w = 1.0 / (pow(d2, 1.25) + 0.35);
        sumWeight += w;
        sumTemp += s.w * w;
    }

    return sumTemp / sumWeight;
}

// Verificação de inclusão no volume físico de grãos (estendendo-se até as paredes laterais)
bool isInsideGrain(vec3 pLocal) {
    if (pLocal.y < uBaseY || pLocal.y > uTopY) return false;

    if (uStorageType == 0) {
        // Silo cilíndrico com cone de talude
        float r = length(pLocal.xz);
        float maxR = uDimensions.x;
        if (r > maxR) return false;

        float normR = r / maxR;
        float coneTop = uTopY - normR * (uTopY * 0.22);
        if (pLocal.y > coneTop) return false;
        return true;
    } else {
        // Armazém Graneleiro com arco longitudinal (vai 100% até as paredes laterais)
        float halfW = uDimensions.x;
        float halfD = uDimensions.z;
        if (abs(pLocal.x) > halfW || abs(pLocal.z) > halfD) return false;

        float normX = abs(pLocal.x) / halfW;
        float archTop = uTopY - pow(normX, 1.8) * (uTopY * 0.38);
        if (pLocal.y > archTop) return false;
        return true;
    }
}

void main() {
    vec3 rayDir = normalize(vWorldPosition - cameraPosition);
    vec3 viewDir = -rayDir;

    // Extensão do trajeto do raio no interior da massa
    float marchDistance = max(uDimensions.x, uDimensions.z) * 2.05;
    int STEPS = 32;
    float stepSize = marchDistance / float(STEPS);

    vec4 accumColor = vec4(0.0);

    for (int i = 0; i < 32; i++) {
        vec3 sampleLocal = vLocalPosition + rayDir * (float(i) * stepSize);

        if (isInsideGrain(sampleLocal)) {
            float temp = sampleTemperature(sampleLocal);
            vec3 col = getThermalColor(temp);

            // Densidade volumétrica e brilho térmico
            float tempNorm = clamp((temp - 18.0) / 16.0, 0.0, 1.0);
            float stepAlpha = 0.038 + tempNorm * 0.046;
            
            // Autoiluminação do foco de calor
            vec3 emission = col * (0.85 + tempNorm * 0.65);

            // Acumulação de volume transparente (front-to-back ray compositing)
            float transmittance = 1.0 - accumColor.a;
            accumColor.rgb += emission * stepAlpha * transmittance;
            accumColor.a += stepAlpha * transmittance;

            if (accumColor.a >= 0.94) {
                break;
            }
        }
    }

    if (accumColor.a <= 0.01) {
        discard;
    }

    // Realce de silhueta suave nas bordas
    float fresnel = pow(1.0 - max(0.0, dot(viewDir, vNormal)), 2.6);
    accumColor.rgb += accumColor.rgb * fresnel * 0.20;

    gl_FragColor = accumColor;
}
`;

// Registra os shaders no ShadersStore do Babylon.js
export function registerVolumetricHeatmapShaders(): void {
  if (!Effect.ShadersStore[`${VOLUMETRIC_HEATMAP_SHADER_NAME}VertexShader`]) {
    Effect.ShadersStore[`${VOLUMETRIC_HEATMAP_SHADER_NAME}VertexShader`] =
      vertexShaderSource;
  }
  if (!Effect.ShadersStore[`${VOLUMETRIC_HEATMAP_SHADER_NAME}FragmentShader`]) {
    Effect.ShadersStore[`${VOLUMETRIC_HEATMAP_SHADER_NAME}FragmentShader`] =
      fragmentShaderSource;
  }
}

export interface VolumetricHeatmapUniformParams {
  dimensions: { width: number; height: number; depth: number; radius: number };
  storageType: StorageType;
  baseY: number;
  topY: number;
  levelMap?: LevelMap;
}

/**
 * Cria o material de shader volumétrico raymarching para o heatmap 3D
 */
export function createVolumetricHeatmapMaterial(
  scene: Scene,
  params: VolumetricHeatmapUniformParams
): ShaderMaterial {
  registerVolumetricHeatmapShaders();

  const mat = new ShaderMaterial(
    `volumetricHeatmapMat_${Math.random()}`,
    scene,
    {
      vertex: VOLUMETRIC_HEATMAP_SHADER_NAME,
      fragment: VOLUMETRIC_HEATMAP_SHADER_NAME,
    },
    {
      attributes: ["position", "normal", "uv"],
      uniforms: [
        "world",
        "viewProjection",
        "cameraPosition",
        "uDimensions",
        "uStorageType",
        "uBaseY",
        "uTopY",
        "uSensors",
        "uSensorCount",
      ],
      needAlphaBlending: true,
      needAlphaTesting: false,
    }
  );

  mat.backFaceCulling = false;
  updateVolumetricHeatmapUniforms(mat, params);

  return mat;
}

/**
 * Atualiza todos os uniforms de sensores e geometria no ShaderMaterial
 */
export function updateVolumetricHeatmapUniforms(
  mat: ShaderMaterial,
  params: VolumetricHeatmapUniformParams
): void {
  const { dimensions, storageType, baseY, topY, levelMap } = params;

  const halfX = storageType === "SILO" ? dimensions.radius * 0.96 : dimensions.width * 0.44;
  const halfZ = storageType === "SILO" ? dimensions.radius * 0.96 : dimensions.depth * 0.44;

  mat.setVector3("uDimensions", new Vector3(halfX, dimensions.height, halfZ));
  mat.setInt("uStorageType", storageType === "SILO" ? 0 : 1);
  mat.setFloat("uBaseY", baseY);
  mat.setFloat("uTopY", topY);

  // Extrai coordenadas locais e temperaturas dos sensores ativos
  const sensorBottomY = THERMOMETRY_CONFIG.SENSOR_BOTTOM_OFFSET_Y;
  const sensorTopY = Math.max(
    sensorBottomY + 1.0,
    dimensions.height - THERMOMETRY_CONFIG.SENSOR_TOP_OFFSET_Y
  );

  const sensorVectors: Color4[] = [];

  if (levelMap) {
    if (storageType === "SILO") {
      // 1. Pêndulo central
      if (levelMap.centralPendulum) {
        const sCount = levelMap.centralPendulum.length;
        levelMap.centralPendulum.forEach((s, idx) => {
          if (s.level === "in_grain" && s.temperature < 100) {
            const y =
              sCount > 1
                ? sensorTopY - (idx / (sCount - 1)) * (sensorTopY - sensorBottomY)
                : (sensorTopY + sensorBottomY) / 2;
            sensorVectors.push(new Color4(0, y, 0, s.temperature));
          }
        });
      }

      // 2. Anéis concêntricos (Anel 1 ~45% e Anel 2 ~80%)
      const arcRings = levelMap.arcRings || [];
      const ringRadii = [dimensions.radius * 0.45, dimensions.radius * 0.80];

      arcRings.forEach((ring, rIdx) => {
        const r = ringRadii[rIdx] || dimensions.radius * 0.6;
        const pList = ring.pendulums || [];
        pList.forEach((p, pIdx) => {
          const theta = (pIdx / pList.length) * Math.PI * 2;
          const px = r * Math.cos(theta);
          const pz = r * Math.sin(theta);
          const sCount = p.length;
          p.forEach((s, idx) => {
            if (s.level === "in_grain" && s.temperature < 100) {
              const y =
                sCount > 1
                  ? sensorTopY - (idx / (sCount - 1)) * (sensorTopY - sensorBottomY)
                  : (sensorTopY + sensorBottomY) / 2;
              sensorVectors.push(new Color4(px, y, pz, s.temperature));
            }
          });
        });
      });
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
              sensorVectors.push(new Color4(x, y, z, s.temperature));
            }
          });
        });
      });
    }
  }

  // Preenche todos os sensores até o limite do array de uniforms (256)
  const clampedVectors = sensorVectors.slice(0, 256);
  mat.setColor4Array("uSensors", clampedVectors);
  mat.setInt("uSensorCount", clampedVectors.length);
}
