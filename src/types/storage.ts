// ==========================================
// Tipos e Interfaces da Planta e Termometria
// Baseado em .brainstorm/example.ts
// ==========================================

export type StorageType = "SILO" | "WAREHOUSE";
export type CommProtocol = "tcp" | "rtu";
export type DeviceType = "DIGIPLEX" | "AERATION_MODULE" | "GASMETER" | "TERMOMULTIPLEX";

export interface SiloDevice {
	id: number;
	deviceType: DeviceType;
	name: string;
	comm: CommProtocol;
	address: string;
	pendulums: number;
}

export interface AeratorElectric {
	voltage: number;
	power: number;
	current: number;
}

export interface AeratorLastEvent {
	event_type: "DEACTIVATED" | "ACTIVATED" | "ACTIVATING_ERROR" | string;
	user?: string;
	created_at: string;
}

export interface Aerator {
	id: number;
	order: number;
	actuation_confirmation_delay: number;
	eletric: AeratorElectric;
	last_event: AeratorLastEvent;
}

export interface SectorState {
	state: "ACTIVATED" | "DEACTIVATED" | string;
	aerators?: Aerator[];
}

export interface SiloAeration {
	modes: Array<
		| "MANUAL"
		| "CONVENIENCE"
		| "SELF_DRYING"
		| "SELF_CONSERVATION"
		| "SELF_COOLING"
		| "CO2_AERATION"
		| string
	>;
	sectors_state: Record<string, SectorState>; // ex: { "1": { state: "DEACTIVATED", aerators: [...] } }
}

export interface SiloSummary {
	id: number;
	type: StorageType;
	name: string;
	product: string;
	tempMax: number;
	tempMed: number;
	tempMin: number;
	capacity: number;
	volume: number;
	quantity: number;
	devices: SiloDevice[];
	aeration: SiloAeration;
}

export interface SensorReading {
	temperature: number;
	level: "not computed" | "in_grain" | "out_of_grain" | string;
}

export interface ArcRingSector {
	sector: number;
	pendulums: SensorReading[][]; // Array de pêndulos (cada pêndulo é uma lista de sensores verticais)
}

export interface LevelMap {
	centralPendulum?: SensorReading[]; // Pêndulo central (presente em Silos, ausente em Armazéns Graneleiros)
	arcRings: ArcRingSector[];
	data_nivel: string;
	toneladas: number;
	porcentagem: number;
}

export interface StorageProductInfo {
	produto: string;
	umidade: number;
	densidade: number;
	variedade?: string;
	safra?: string;
}

export interface StorageDetail {
	id: number;
	tipo: StorageType;
	data: string;
	data_leitura: string;
	produto: StorageProductInfo;
	levelMaps: LevelMap[];
	capacidade: number;
	dimensao: number;
}

// Informações adicionais para interação 3D e Tooltip
export interface SensorPickedInfo {
	pendulumIndex: number;
	sensorIndex: number;
	ringIndex?: number;
	sectorIndex?: number;
	isCentral: boolean;
	temperature: number;
	level: string;
	screenX: number;
	screenY: number;
}
