import { Vector3 } from "@babylonjs/core";

// ==========================================
// 1. Constantes de Geometria e Estruturas
// ==========================================

export const STORAGE_GEOMETRY = {
  // Silo Cilíndrico
  SILO: {
    DEFAULT_DIAMETER: 10,
    DEFAULT_HEIGHT: 15,
    BASE_HEIGHT: 0.6,
    BASE_DIAMETER_SCALE: 1.08,
    ROOF_HEIGHT: 2.5,
    ROOF_TOP_DIAMETER: 0.8,
    ROOF_BOTTOM_DIAMETER_SCALE: 1.02,
    TESSELLATION: 36,
  },
  // Armazém Graneleiro Retangular Alongado (Perfil Rebaixado)
  WAREHOUSE: {
    DEFAULT_WIDTH: 18,
    DEFAULT_HEIGHT: 7.9, // Altura reduzida em mais 10% (de 8.8m para 7.9m)
    DEFAULT_DEPTH: 36,   // Armazém comprido/profundo
    BASE_HEIGHT: 0.5,
    BASE_SCALE: 1.04,
    BODY_HEIGHT_RATIO: 0.88, // Paredes altas
    ROOF_HEIGHT_RATIO: 0.04, // Telhado em arco suave e rebaixado
    ROOF_OVERHANG: 0.6,      // Beiral perimetral
  },
} as const;

// ==========================================
// 2. Constantes de Sensores, Anéis e Pêndulos
// ==========================================

export const THERMOMETRY_CONFIG = {
  // Offsets e Folgas Verticais dos Sensores e Cabos
  // SENSOR_BOTTOM_OFFSET_Y: distância do solo/base de concreto até o primeiro sensor mais baixo
  SENSOR_BOTTOM_OFFSET_Y: 2.0,
  // SENSOR_TOP_OFFSET_Y: folga entre o teto/topo da estrutura e o último sensor mais alto
  SENSOR_TOP_OFFSET_Y: 3.0,
  // SENSOR_TOP_ANCHOR_RATIO: proporção da altura onde os cabos se ancoram no teto
  SENSOR_TOP_ANCHOR_RATIO: 0.88,

  // Dimensões do Badge / Pílula 3D
  BADGE: {
    WIDTH: 1.15,
    HEIGHT: 0.46,
    CANVAS_WIDTH: 256,
    CANVAS_HEIGHT: 104,
    CORNER_RADIUS: 46,
    FONT_SIZE: 44,
    INDICATOR_DOT_RADIUS: 14,
    BORDER_WIDTH: 6,
    BG_COLOR: "rgba(10, 12, 18, 0.94)",
  },

  // Proporções de Raio dos Anéis Concêntricos (arcRings) no Silo
  RINGS: {
    INNER_RATIO: 0.45,
    OUTER_RATIO: 0.82,
    ROTATION_OFFSET_PER_RING: Math.PI / 8,
    CIRCLE_SEGMENTS: 48,
    GUIDE_COLOR_RGB: [0.25, 0.75, 1.0] as [number, number, number],
  },

  // Cabos de Aço
  CABLE: {
    COLOR_RGB: [0.55, 0.60, 0.68] as [number, number, number],
  },
} as const;

// ==========================================
// 3. Constantes de Opacidade e Materiais
// ==========================================

export const MATERIAL_CONFIG = {
  SHELL: {
    OPACITY_DEFAULT: 1.0,
    OPACITY_FOCUSED: 0.10, // Apenas a casca do silo selecionado fica translúcida
    OPACITY_UNFOCUSED: 1.0, // Estruturas não selecionadas são 100% opacas
    DIFFUSE_RGB: [0.82, 0.86, 0.92] as [number, number, number],
    SPECULAR_RGB: [0.3, 0.3, 0.35] as [number, number, number],
    EMISSIVE_RGB: [0.16, 0.18, 0.22] as [number, number, number],
  },
  BASE: {
    DIFFUSE_RGB: [0.48, 0.50, 0.55] as [number, number, number],
    SPECULAR_RGB: [0.1, 0.1, 0.1] as [number, number, number],
    EMISSIVE_RGB: [0.12, 0.13, 0.15] as [number, number, number],
  },
  GRAIN: {
    OPACITY: 0.35,
    DIFFUSE_RGB: [0.92, 0.74, 0.42] as [number, number, number],
    SPECULAR_RGB: [0.1, 0.1, 0.05] as [number, number, number],
    EMISSIVE_RGB: [0.22, 0.18, 0.10] as [number, number, number],
    HEIGHT_MAX_RATIO: 0.88,
  },
} as const;

// ==========================================
// 4. Constantes de Câmera e Navegação
// ==========================================

export const CAMERA_CONFIG = {
  // Posição Macro Padrão da Planta
  MACRO: {
    TARGET: new Vector3(0, 3.5, 0),
    RADIUS: 110,
    ALPHA: -Math.PI / 2.3,
    BETA: Math.PI / 3.3,
  },
  // Distância de Foco por Tipo
  FOCUS_RADIUS: {
    SILO: 28,
    WAREHOUSE: 48,
    TOP_VIEW: 35,
  },
  // Dinâmica e Sensibilidade da Câmera
  PHYSICS: {
    INERTIA: 0.72,
    WHEEL_DELTA_PERCENTAGE: 0.04,
    PINCH_DELTA_PERCENTAGE: 0.02,
    PANNING_SENSIBILITY: 100,
    ANGULAR_SENSIBILITY_X: 1600,
    ANGULAR_SENSIBILITY_Y: 1600,
    LOWER_RADIUS_LIMIT: 4,
    UPPER_RADIUS_LIMIT: null, // Sem limite de zoom out
    LOWER_BETA_LIMIT: 0.01,
    UPPER_BETA_LIMIT: Math.PI / 2.06,
  },
  // Transições Cinemáticas
  ANIMATION: {
    DEFAULT_DURATION: 35,
    FAST_DURATION: 20,
    RESET_DURATION: 38,
  },
  // Auto Rotação
  AUTO_ROTATE: {
    SPEED: 0.04,
    WAIT_TIME: 0,
    SPINUP_TIME: 500,
  },
} as const;

// ==========================================
// 5. Constantes de Ambiente e Solo (Alta Visibilidade e Clareza)
// ==========================================

export const ENVIRONMENT_CONFIG = {
  GROUND: {
    WIDTH: 200,
    HEIGHT: 170,
    DIFFUSE_RGB: [0.14, 0.16, 0.20] as [number, number, number],
    SPECULAR_RGB: [0.04, 0.04, 0.05] as [number, number, number],
  },
  GRID: {
    SPACING: 10,
    COLOR_RGB: [0.24, 0.28, 0.36] as [number, number, number],
  },
  LIGHTING: {
    // Luz ambiente superior difusa
    HEMI_MAIN_INTENSITY: 1.15,
    HEMI_GROUND_RGB: [0.55, 0.58, 0.65] as [number, number, number],
    // Luz de preenchimento inferior (elimina sombras escuras sob estruturas)
    HEMI_BOTTOM_INTENSITY: 0.55,
    HEMI_BOTTOM_RGB: [0.42, 0.45, 0.50] as [number, number, number],
    // Luz frontal principal
    DIR_KEY_INTENSITY: 0.85,
    DIR_KEY_DIRECTION: new Vector3(0.8, -1.2, 0.8),
    // Luz traseira de preenchimento
    DIR_FILL_INTENSITY: 0.70,
    DIR_FILL_DIRECTION: new Vector3(-0.8, -1.0, -0.8),
  },
  CLEAR_COLOR_RGB: [0.08, 0.09, 0.13] as [number, number, number],
} as const;
