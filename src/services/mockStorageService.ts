import type {
	SiloSummary,
	StorageDetail,
	SensorReading,
	ArcRingSector,
	LevelMap,
} from "@/types/storage";

export const MOCK_SILOS: SiloSummary[] = [
	{
		id: 101,
		type: "SILO",
		name: "Silo Metálico 01",
		product: "Soja em Grãos",
		tempMax: 31.8,
		tempMed: 23.4,
		tempMin: 18.2,
		capacity: 5000,
		volume: 6250,
		quantity: 4150,
		devices: [
			{
				id: 1,
				deviceType: "TERMOMULTIPLEX",
				name: "TMX-01",
				comm: "tcp",
				address: "192.168.1.101",
				pendulums: 13,
			},
			{
				id: 2,
				deviceType: "AERATION_MODULE",
				name: "MOD-AER-01",
				comm: "rtu",
				address: "01",
				pendulums: 0,
			},
			{
				id: 3,
				deviceType: "GASMETER",
				name: "CO2-01",
				comm: "tcp",
				address: "192.168.1.105",
				pendulums: 0,
			},
		],
		aeration: {
			modes: ["CONVENIENCE", "SELF_COOLING"],
			sectors_state: {
				"1": {
					state: "ACTIVATED",
					aerators: [
						{
							id: 11,
							order: 1,
							actuation_confirmation_delay: 5,
							eletric: { voltage: 380, power: 15.0, current: 28.4 },
							last_event: {
								event_type: "ACTIVATED",
								user: "Sistema Auto (Termometria)",
								created_at: "2026-08-22T14:30:00Z",
							},
						},
					],
				},
				"2": {
					state: "DEACTIVATED",
					aerators: [
						{
							id: 12,
							order: 2,
							actuation_confirmation_delay: 5,
							eletric: { voltage: 380, power: 15.0, current: 0.0 },
							last_event: {
								event_type: "DEACTIVATED",
								user: "Operador Silo",
								created_at: "2026-08-22T08:00:00Z",
							},
						},
					],
				},
			},
		},
	},
	{
		id: 102,
		type: "SILO",
		name: "Silo Metálico 02 (Alerta Térmico)",
		product: "Milho Transgênico",
		tempMax: 38.6,
		tempMed: 28.9,
		tempMin: 21.0,
		capacity: 5000,
		volume: 6250,
		quantity: 4800,
		devices: [
			{
				id: 4,
				deviceType: "TERMOMULTIPLEX",
				name: "TMX-02",
				comm: "tcp",
				address: "192.168.1.102",
				pendulums: 13,
			},
			{
				id: 5,
				deviceType: "AERATION_MODULE",
				name: "MOD-AER-02",
				comm: "rtu",
				address: "02",
				pendulums: 0,
			},
		],
		aeration: {
			modes: ["SELF_COOLING", "SELF_DRYING"],
			sectors_state: {
				"1": {
					state: "ACTIVATED",
					aerators: [
						{
							id: 21,
							order: 1,
							actuation_confirmation_delay: 5,
							eletric: { voltage: 380, power: 22.0, current: 41.2 },
							last_event: {
								event_type: "ACTIVATED",
								user: "Auto Alarme Foco Calor",
								created_at: "2026-08-22T17:15:00Z",
							},
						},
					],
				},
			},
		},
	},
	{
		id: 103,
		type: "SILO",
		name: "Silo Metálico 03",
		product: "Trigo Especial",
		tempMax: 22.5,
		tempMed: 19.1,
		tempMin: 15.4,
		capacity: 3500,
		volume: 4375,
		quantity: 2100,
		devices: [
			{
				id: 6,
				deviceType: "DIGIPLEX",
				name: "DPX-03",
				comm: "tcp",
				address: "192.168.1.103",
				pendulums: 9,
			},
		],
		aeration: {
			modes: ["SELF_CONSERVATION"],
			sectors_state: {
				"1": {
					state: "DEACTIVATED",
					aerators: [
						{
							id: 31,
							order: 1,
							actuation_confirmation_delay: 5,
							eletric: { voltage: 380, power: 11.0, current: 0.0 },
							last_event: {
								event_type: "DEACTIVATED",
								user: "Operador",
								created_at: "2026-08-21T18:00:00Z",
							},
						},
					],
				},
			},
		},
	},
	{
		id: 104,
		type: "SILO",
		name: "Silo Metálico 04",
		product: "Soja Desativada",
		tempMax: 27.0,
		tempMed: 22.2,
		tempMin: 18.0,
		capacity: 5000,
		volume: 6250,
		quantity: 3200,
		devices: [
			{
				id: 7,
				deviceType: "TERMOMULTIPLEX",
				name: "TMX-04",
				comm: "tcp",
				address: "192.168.1.104",
				pendulums: 13,
			},
		],
		aeration: {
			modes: ["MANUAL"],
			sectors_state: {
				"1": { state: "DEACTIVATED" },
			},
		},
	},
	{
		id: 201,
		type: "WAREHOUSE",
		name: "Graneleiro Sul 01",
		product: "Soja Granel Safra 2026",
		tempMax: 30.2,
		tempMed: 23.9,
		tempMin: 17.5,
		capacity: 25000,
		volume: 31250,
		quantity: 19800,
		devices: [
			{
				id: 8,
				deviceType: "TERMOMULTIPLEX",
				name: "TMX-GH-01",
				comm: "tcp",
				address: "192.168.1.201",
				pendulums: 24,
			},
			{
				id: 9,
				deviceType: "AERATION_MODULE",
				name: "MOD-AER-GH1",
				comm: "tcp",
				address: "192.168.1.202",
				pendulums: 0,
			},
		],
		aeration: {
			modes: ["CO2_AERATION", "SELF_COOLING"],
			sectors_state: {
				"1": { state: "ACTIVATED" },
				"2": { state: "ACTIVATED" },
				"3": { state: "DEACTIVATED" },
				"4": { state: "DEACTIVATED" },
			},
		},
	},
	{
		id: 202,
		type: "WAREHOUSE",
		name: "Graneleiro Norte 02",
		product: "Milho em Grãos",
		tempMax: 28.4,
		tempMed: 22.0,
		tempMin: 16.9,
		capacity: 25000,
		volume: 31250,
		quantity: 14500,
		devices: [
			{
				id: 10,
				deviceType: "TERMOMULTIPLEX",
				name: "TMX-GH-02",
				comm: "tcp",
				address: "192.168.1.203",
				pendulums: 24,
			},
		],
		aeration: {
			modes: ["MANUAL"],
			sectors_state: {
				"1": { state: "DEACTIVATED" },
				"2": { state: "DEACTIVATED" },
			},
		},
	},
];

export function generateSiloDetail(summary: SiloSummary): StorageDetail {
	const isWarehouse = summary.type === "WAREHOUSE";
	// Quantidade de sensores por pêndulo: 4 no armazém graneleiro (menor altura), 8 no silo
	const numSensorsPerPendulum = isWarehouse ? 4 : 8;
	const isHotspotSilo = summary.id === 102;

	// Função auxiliar para gerar leituras de sensores verticais (índice 0 no topo até N-1 na base)
	const generateSensors = (
		baseTemp: number,
		inGrainStartIndex: number = 2,
		hotspot: boolean = false,
		faultProne: boolean = false
	): SensorReading[] => {
		// Garante obrigatoriamente que no mínimo os 2 primeiros sensores do topo (índices 0 e 1) estejam fora da massa de grão
		const effectiveStart = Math.max(2, inGrainStartIndex);

		return Array.from({ length: numSensorsPerPendulum }, (_, idx) => {
			const inGrain = idx >= effectiveStart;

			// Simula sensor com defeito ocasional (> 125°C) no silo de teste
			if (faultProne && idx === 3) {
				return { temperature: 138.5, level: inGrain ? "in_grain" : "out_of_grain" };
			}

			// Sensores fora do grão medem o ar superior (mais frio e com oscilação ambiente)
			// Sensores dentro da massa de grão acumulam calor e gradiente biológico
			const verticalGradient = (idx / (numSensorsPerPendulum - 1)) * 2.8;
			const noise = (Math.sin(idx * 1.5) + (Math.random() - 0.5)) * 0.8;
			let temp = inGrain ? baseTemp + verticalGradient + noise : baseTemp - 3.5 + noise * 0.5;

			if (hotspot && inGrain && idx >= 3 && idx <= 5) {
				temp += 8.5; // Ponto de aquecimento no meio da massa
			}

			temp = Math.max(14, Math.min(48, Number(temp.toFixed(1))));

			return {
				temperature: temp,
				level: inGrain ? "in_grain" : "out_of_grain",
			};
		});
	};

	// Nível base relativo à ocupação
	const fillRatio = summary.quantity / summary.capacity;
	const baseStart = fillRatio > 0.75 ? 2 : fillRatio > 0.5 ? 3 : 4;

	// Pêndulo central (pico do cone / montanha de grãos no silo)
	const centralPendulum = isWarehouse
		? undefined
		: generateSensors(summary.tempMed, baseStart, isHotspotSilo, false);

	// Mapeamento dos anéis e setores
	let arcRings: ArcRingSector[] = [];

	if (isWarehouse) {
		// Graneleiro: 4 setores transversais ao longo de Z, com cristas/ondas no centro e talude nas bordas
		arcRings = [
			{
				sector: 1, // Entrada frontal: rampa suave
				pendulums: [
					generateSensors(summary.tempMin + 0.5, 3),
					generateSensors(summary.tempMed - 0.8, 2),
					generateSensors(summary.tempMed, 2),
					generateSensors(summary.tempMin + 1.2, 2),
					generateSensors(summary.tempMed, 2),
					generateSensors(summary.tempMed - 0.5, 3),
				],
			},
			{
				sector: 2, // Crista de descarga 1 (pico da montanha de grão)
				pendulums: [
					generateSensors(summary.tempMed + 0.4, 3),
					generateSensors(summary.tempMax - 1.5, 2),
					generateSensors(summary.tempMed + 1.0, 2),
					generateSensors(summary.tempMed, 2),
					generateSensors(summary.tempMin + 0.9, 2),
					generateSensors(summary.tempMed, 3),
				],
			},
			{
				sector: 3, // Vale intermediário
				pendulums: [
					generateSensors(summary.tempMed, 3),
					generateSensors(summary.tempMed - 1.0, 2),
					generateSensors(summary.tempMin + 1.5, 2),
					generateSensors(summary.tempMed + 0.2, 2),
					generateSensors(summary.tempMed - 0.4, 2),
					generateSensors(summary.tempMin + 0.8, 3),
				],
			},
			{
				sector: 4, // Crista traseira
				pendulums: [
					generateSensors(summary.tempMin + 0.3, 3),
					generateSensors(summary.tempMed + 0.5, 2),
					generateSensors(summary.tempMed, 2),
					generateSensors(summary.tempMin + 1.0, 2),
					generateSensors(summary.tempMed - 0.6, 2),
					generateSensors(summary.tempMin + 0.4, 3),
				],
			},
		];
	} else {
		// Silo Cilíndrico: Cone natural (Centro = mais alto [baseStart], Anel Interno [baseStart ou +1], Anel Externo = mais baixo [+1 ou +2])
		arcRings = [
			{
				sector: 1, // Anel Interno (Raio ~45%)
				pendulums: [
					generateSensors(summary.tempMed - 0.5, baseStart, isHotspotSilo),
					generateSensors(summary.tempMed + 0.2, baseStart + 1, false),
					generateSensors(summary.tempMed + 0.8, baseStart, isHotspotSilo, isHotspotSilo),
					generateSensors(summary.tempMed - 0.2, baseStart + 1, false),
				],
			},
			{
				sector: 2, // Anel Externo (Raio ~80% - talude descendo em direção à parede)
				pendulums: [
					generateSensors(summary.tempMin + 0.5, baseStart + 1, false),
					generateSensors(summary.tempMed - 0.4, baseStart + 1, false),
					generateSensors(summary.tempMax - 1.2, baseStart + 2, isHotspotSilo),
					generateSensors(summary.tempMax, baseStart + 2, isHotspotSilo),
					generateSensors(summary.tempMed + 0.6, baseStart + 2, false),
					generateSensors(summary.tempMed, baseStart + 1, false),
					generateSensors(summary.tempMin + 1.1, baseStart + 1, false),
					generateSensors(summary.tempMin + 0.3, baseStart + 2, false),
				],
			},
		];
	}

	const fillPercentage = Math.round((summary.quantity / summary.capacity) * 100);

	const levelMaps: LevelMap[] = [
		{
			centralPendulum,
			arcRings,
			data_nivel: "22/08/2026 20:30:00",
			toneladas: summary.quantity,
			porcentagem: fillPercentage,
		},
	];

	return {
		id: summary.id,
		tipo: summary.type,
		data: new Date().toISOString(),
		data_leitura: "22/08/2026 20:45:12",
		capacidade: summary.capacity,
		dimensao: isWarehouse ? 28 : 14,
		produto: {
			produto: summary.product,
			umidade: isHotspotSilo ? 14.8 : 12.6,
			densidade: 0.77,
			variedade: summary.product.includes("Soja") ? "TMG 7062 IPRO" : "DKB 390 PRO3",
			safra: "2025/2026",
		},
		levelMaps,
	};
}

// API simulada para listagem geral
export async function getSilos(): Promise<SiloSummary[]> {
	return new Promise((resolve) => {
		setTimeout(() => {
			resolve(MOCK_SILOS);
		}, 150);
	});
}

// API simulada para detalhe de silo/termometria
export async function getStorageDetail(id: number): Promise<StorageDetail> {
	return new Promise((resolve, reject) => {
		setTimeout(() => {
			const found = MOCK_SILOS.find((s) => s.id === id);
			if (!found) {
				reject(new Error(`Silo com ID ${id} não foi encontrado na planta.`));
				return;
			}
			resolve(generateSiloDetail(found));
		}, 200);
	});
}
