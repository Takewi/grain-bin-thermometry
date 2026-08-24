export interface SensorColorInfo {
	rgb: [number, number, number];
	hex: string;
	isFaulty: boolean;
	isOutOfGrain?: boolean;
	status: "faulty" | "out_of_grain" | "cold" | "normal" | "warning" | "critical";
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
 * Mapeia uma temperatura em graus Celsius e nível para cor e diagnóstico visual
 */
export function getSensorVisualInfo(temp: number, level?: string): SensorColorInfo {
	// 1. Verificação de erro ou sensor desconectado (> 125°C ou < -40°C ou NaN)
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

	// 2. Sensores fora da massa de grão (bolsão de ar superior) -> Cinza Neutro (#6b7280)
	if (level === "out_of_grain") {
		const rgb: [number, number, number] = [0.42, 0.45, 0.5];
		return {
			rgb,
			hex: rgbToHex(...rgb),
			isFaulty: false,
			isOutOfGrain: true,
			status: "out_of_grain",
			statusLabel: "Fora do Grão (Espaço de Ar)",
		};
	}

	// Frio (<= 18°C): Azul
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

	// Faixa Fria/Ideal (18°C - 22°C): Azul -> Verde
	if (temp <= 22) {
		const t = (temp - 18) / 4;
		const r = 0.12 * (1 - t) + 0.1 * t;
		const g = 0.45 * (1 - t) + 0.75 * t;
		const b = 0.95 * (1 - t) + 0.45 * t;
		const rgb: [number, number, number] = [r, g, b];
		return {
			rgb,
			hex: rgbToHex(...rgb),
			isFaulty: false,
			status: "normal",
			statusLabel: "Temperatura Fria/Ideal",
		};
	}

	// Faixa Normal/Transição (22°C - 26°C): Verde -> Amarelo
	if (temp <= 26) {
		const t = (temp - 22) / 4;
		const r = 0.1 * (1 - t) + 0.95 * t;
		const g = 0.75 * (1 - t) + 0.82 * t;
		const b = 0.45 * (1 - t) + 0.1 * t;
		const rgb: [number, number, number] = [r, g, b];
		return {
			rgb,
			hex: rgbToHex(...rgb),
			isFaulty: false,
			status: "normal",
			statusLabel: "Temperatura Normal",
		};
	}

	// Faixa de Atenção / Aquecimento Inicial (26°C - 30°C): Amarelo -> Laranja
	if (temp <= 30) {
		const t = (temp - 26) / 4;
		const r = 0.95 * (1 - t) + 0.96 * t;
		const g = 0.82 * (1 - t) + 0.48 * t;
		const b = 0.1 * (1 - t) + 0.1 * t;
		const rgb: [number, number, number] = [r, g, b];
		return {
			rgb,
			hex: rgbToHex(...rgb),
			isFaulty: false,
			status: "warning",
			statusLabel: "Atenção / Início de Aquecimento",
		};
	}

	// Faixa de Alerta Elevado (30°C - 34°C): Laranja -> Vermelho
	if (temp <= 34) {
		const t = (temp - 30) / 4;
		const r = 0.96 * (1 - t) + 0.96 * t;
		const g = 0.48 * (1 - t) + 0.18 * t;
		const b = 0.1 * (1 - t) + 0.12 * t;
		const rgb: [number, number, number] = [r, g, b];
		return {
			rgb,
			hex: rgbToHex(...rgb),
			isFaulty: false,
			status: "warning",
			statusLabel: "Alerta / Aquecimento Acelerado",
		};
	}

	// Crítico / Ponto de Calor (> 34°C): Vermelho Intenso
	const t = Math.min((temp - 34) / 8, 1);
	const r = 0.96 * (1 - t) + 0.98 * t;
	const g = 0.18 * (1 - t) + 0.1 * t;
	const b = 0.12 * (1 - t) + 0.1 * t;
	const rgb: [number, number, number] = [r, g, b];

	return {
		rgb,
		hex: rgbToHex(...rgb),
		isFaulty: false,
		status: "critical",
		statusLabel: "Crítico / Foco de Calor",
	};
}

/**
 * Converte uma temperatura contínua em RGB normalizado [0..1] para o Heatmap 3D
 */
export function temperatureToRGB(temp: number): [number, number, number] {
	if (temp <= 18) {
		return [0.12, 0.45, 0.95]; // Azul
	}
	if (temp <= 22) {
		const t = (temp - 18) / 4;
		return [0.12 * (1 - t) + 0.1 * t, 0.45 * (1 - t) + 0.75 * t, 0.95 * (1 - t) + 0.45 * t];
	}
	if (temp <= 26) {
		const t = (temp - 22) / 4;
		return [0.1 * (1 - t) + 0.95 * t, 0.75 * (1 - t) + 0.82 * t, 0.45 * (1 - t) + 0.1 * t];
	}
	if (temp <= 30) {
		const t = (temp - 26) / 4;
		return [0.95 * (1 - t) + 0.96 * t, 0.82 * (1 - t) + 0.48 * t, 0.1 * (1 - t) + 0.1 * t];
	}
	if (temp <= 34) {
		const t = (temp - 30) / 4;
		return [0.96 * (1 - t) + 0.96 * t, 0.48 * (1 - t) + 0.18 * t, 0.1 * (1 - t) + 0.12 * t];
	}
	// Crítico > 34°C
	const t = Math.min((temp - 34) / 8, 1);
	return [0.96 * (1 - t) + 0.98 * t, 0.18 * (1 - t) + 0.1 * t, 0.12 * (1 - t) + 0.1 * t];
}
