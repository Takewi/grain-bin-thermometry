export interface SensorColorInfo {
  rgb: [number, number, number];
  hex: string;
  isFaulty: boolean;
  status: "faulty" | "cold" | "normal" | "warning" | "critical";
  statusLabel: string;
}

/**
 * Converte valor RGB normalizado (0..1) para Hex String (#RRGGBB)
 */
function rgbToHex(r: number, g: number, b: number): string {
  const to255 = (c: number) =>
    Math.round(Math.max(0, Math.min(1, c)) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${to255(r)}${to255(g)}${to255(b)}`;
}

/**
 * Mapeia uma temperatura em graus Celsius para cor e diagnóstico visual
 */
export function getSensorVisualInfo(
  temp: number,
  _level?: string
): SensorColorInfo {
  // Verificação de erro ou sensor desconectado (> 125°C ou < -40°C ou NaN)
  if (temp > 125 || temp < -40 || isNaN(temp)) {
    const rgb: [number, number, number] = [0.45, 0.48, 0.55];
    return {
      rgb,
      hex: rgbToHex(...rgb),
      isFaulty: true,
      status: "faulty",
      statusLabel: "Sensor com Defeito (> 125°C)",
    };
  }

  // Frio (<= 18°C)
  if (temp <= 18) {
    const rgb: [number, number, number] = [0.12, 0.45, 0.95];
    return {
      rgb,
      hex: rgbToHex(...rgb),
      isFaulty: false,
      status: "cold",
      statusLabel: "Frio / Baixa Atividade",
    };
  }

  // Ideal / Normal (18°C - 26°C): Azul -> Verde Esmeralda
  if (temp <= 26) {
    const t = (temp - 18) / 8;
    const r = 0.12 * (1 - t) + 0.15 * t;
    const g = 0.45 * (1 - t) + 0.85 * t;
    const b = 0.95 * (1 - t) + 0.35 * t;
    const rgb: [number, number, number] = [r, g, b];
    return {
      rgb,
      hex: rgbToHex(...rgb),
      isFaulty: false,
      status: "normal",
      statusLabel: "Temperatura Ideal",
    };
  }

  // Alerta Moderado (26°C - 34°C): Verde -> Amarelo / Âmbar
  if (temp <= 34) {
    const t = (temp - 26) / 8;
    const r = 0.15 * (1 - t) + 0.95 * t;
    const g = 0.85 * (1 - t) + 0.75 * t;
    const b = 0.35 * (1 - t) + 0.10 * t;
    const rgb: [number, number, number] = [r, g, b];
    return {
      rgb,
      hex: rgbToHex(...rgb),
      isFaulty: false,
      status: "warning",
      statusLabel: "Atenção / Aquecimento",
    };
  }

  // Crítico / Ponto de Calor (> 34°C): Âmbar -> Vermelho Intenso
  const t = Math.min((temp - 34) / 10, 1);
  const r = 0.95 * (1 - t) + 0.98 * t;
  const g = 0.75 * (1 - t) + 0.15 * t;
  const b = 0.10 * (1 - t) + 0.12 * t;
  const rgb: [number, number, number] = [r, g, b];

  return {
    rgb,
    hex: rgbToHex(...rgb),
    isFaulty: false,
    status: "critical",
    statusLabel: "Crítico / Foco de Calor",
  };
}
