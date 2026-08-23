import { Scene, DynamicTexture } from "@babylonjs/core";

/**
 * Gera textura metálica ondulada (chapa de aço galvanizado) homogênea e uniforme em 360°
 */
export function createSiloMetalTexture(scene: Scene, id: string): DynamicTexture {
  const width = 512;
  const height = 512;
  const texture = new DynamicTexture(`silo_metal_tex_${id}`, { width, height }, scene, false);
  const ctx = texture.getContext() as CanvasRenderingContext2D;

  // Fundo metálico base 100% homogêneo (sem gradientes assimétricos no eixo X)
  ctx.fillStyle = "#8e97a3";
  ctx.fillRect(0, 0, width, height);

  // Nervuras horizontais perfeitamente circulares e uniformes
  const ridgeHeight = 16;
  for (let y = 0; y < height; y += ridgeHeight) {
    // Sombra sutil da nervura
    ctx.fillStyle = "rgba(45, 50, 60, 0.22)";
    ctx.fillRect(0, y, width, 2);

    // Corpo suave da nervura
    ctx.fillStyle = "rgba(165, 175, 188, 0.35)";
    ctx.fillRect(0, y + 2, width, 6);

    // Destaque de luz no topo da nervura
    ctx.fillStyle = "rgba(255, 255, 255, 0.28)";
    ctx.fillRect(0, y + 2, width, 2);

    // Emenda de chapa a cada 64px
    if (y % 64 === 0) {
      ctx.fillStyle = "rgba(35, 40, 50, 0.35)";
      ctx.fillRect(0, y - 1, width, 2);
      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      ctx.fillRect(0, y + 1, width, 1);

      // Rebites distribuídos uniformemente
      for (let x = 8; x < width; x += 16) {
        ctx.fillStyle = "rgba(30, 35, 45, 0.5)";
        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
        ctx.beginPath();
        ctx.arc(x - 0.5, y - 0.5, 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Micro-granulação metálica fina
  ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
  for (let i = 0; i < 400; i++) {
    const rx = Math.random() * width;
    const ry = Math.random() * height;
    ctx.fillRect(rx, ry, 1, 1);
  }

  texture.uScale = 1; // 1 volta exata e perfeita em torno do cilindro
  texture.vScale = 4;
  texture.wrapU = 1;
  texture.wrapV = 1;
  texture.update();
  return texture;
}

/**
 * Gera textura de painéis industriais verticais para o Armazém Graneleiro
 */
export function createWarehouseWallTexture(scene: Scene, id: string): DynamicTexture {
  const width = 512;
  const height = 512;
  const texture = new DynamicTexture(`wh_wall_tex_${id}`, { width, height }, scene, false);
  const ctx = texture.getContext() as CanvasRenderingContext2D;

  // Fundo metálico base
  ctx.fillStyle = "#8a939e";
  ctx.fillRect(0, 0, width, height);

  // Frisos trapezoidais verticais uniformes
  const panelWidth = 32;
  for (let x = 0; x < width; x += panelWidth) {
    ctx.fillStyle = "rgba(40, 45, 55, 0.25)";
    ctx.fillRect(x, 0, 3, height);

    ctx.fillStyle = "rgba(160, 170, 185, 0.3)";
    ctx.fillRect(x + 3, 0, 14, height);

    ctx.fillStyle = "rgba(255, 255, 255, 0.22)";
    ctx.fillRect(x + 17, 0, 3, height);
  }

  texture.uScale = 4;
  texture.vScale = 2;
  texture.update();
  return texture;
}

/**
 * Gera textura de telhado industrial trapezoidal uniforme
 */
export function createRoofMetalTexture(scene: Scene, id: string): DynamicTexture {
  const width = 512;
  const height = 512;
  const texture = new DynamicTexture(`roof_tex_${id}`, { width, height }, scene, false);
  const ctx = texture.getContext() as CanvasRenderingContext2D;

  ctx.fillStyle = "#8a939e";
  ctx.fillRect(0, 0, width, height);

  const step = 20;
  for (let x = 0; x < width; x += step) {
    ctx.fillStyle = "rgba(35, 40, 50, 0.3)";
    ctx.fillRect(x, 0, 2, height);
    ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
    ctx.fillRect(x + 2, 0, 2, height);
  }

  texture.uScale = 4;
  texture.vScale = 4;
  texture.update();
  return texture;
}

/**
 * Gera textura de concreto uniforme para as bases
 */
export function createConcreteBaseTexture(scene: Scene, id: string): DynamicTexture {
  const width = 256;
  const height = 256;
  const texture = new DynamicTexture(`concrete_tex_${id}`, { width, height }, scene, false);
  const ctx = texture.getContext() as CanvasRenderingContext2D;

  ctx.fillStyle = "#636972";
  ctx.fillRect(0, 0, width, height);

  // Ruído sutil de agregados
  for (let i = 0; i < 800; i++) {
    const rx = Math.random() * width;
    const ry = Math.random() * height;
    const isLight = Math.random() > 0.5;
    ctx.fillStyle = isLight ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.08)";
    ctx.fillRect(rx, ry, Math.random() * 2 + 1, Math.random() * 2 + 1);
  }

  texture.uScale = 2;
  texture.vScale = 1;
  texture.update();
  return texture;
}

/**
 * Cria a textura da placa com o nome da estrutura com auto-ajuste de fonte para caber perfeitamente
 */
export function createNameplateTexture(scene: Scene, name: string, type: string): DynamicTexture {
  const width = 512;
  const height = 186; // Proporção 2.75 : 1 (compatível com 2.2m x 0.8m)
  const texture = new DynamicTexture(`nameplate_tex_${name}`, { width, height }, scene, false);
  const ctx = texture.getContext() as CanvasRenderingContext2D;

  // Fundo dark glassmorphism
  ctx.fillStyle = "rgba(15, 23, 42, 0.96)";
  ctx.fillRect(0, 0, width, height);

  // Moldura ciano
  ctx.lineWidth = 6;
  ctx.strokeStyle = "#38bdf8";
  ctx.strokeRect(6, 6, width - 12, height - 12);

  // Faixa de cabeçalho
  ctx.fillStyle = "#0284c7";
  ctx.fillRect(10, 10, width - 20, 36);

  ctx.font = "bold 20px 'Inter', sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(type.toUpperCase(), width / 2, 28);

  // Auto-ajuste inteligente de tamanho de fonte para caber perfeitamente com margem
  const maxTextWidth = width - 48;
  let fontSize = 48;
  ctx.font = `bold ${fontSize}px 'JetBrains Mono', monospace`;
  while (ctx.measureText(name).width > maxTextWidth && fontSize > 16) {
    fontSize -= 2;
    ctx.font = `bold ${fontSize}px 'JetBrains Mono', monospace`;
  }

  ctx.fillStyle = "#f8fafc";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(name, width / 2, 114);

  texture.update();
  return texture;
}
