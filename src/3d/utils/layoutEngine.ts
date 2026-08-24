import { Vector3 } from "@babylonjs/core";
import type { SiloSummary } from "@/types/storage";

export interface PositionedStorage {
	data: SiloSummary;
	position: Vector3;
	dimensions: {
		width: number;
		height: number;
		depth: number;
		radius: number;
	};
}

/**
 * Calcula o layout espacial tridimensional da planta com enquadramento centralizado
 */
export function calculatePlantLayout(items: SiloSummary[]): PositionedStorage[] {
	const silos = items.filter((i) => i.type === "SILO");
	const warehouses = items.filter((i) => i.type === "WAREHOUSE");

	const positioned: PositionedStorage[] = [];

	// Posiciona silos em grid 2 colunas no lado esquerdo
	const siloCols = Math.min(silos.length, 2);
	const siloSpacingX = 16;
	const siloSpacingZ = 18;

	silos.forEach((item, index) => {
		const col = index % siloCols;
		const row = Math.floor(index / siloCols);

		const totalRows = Math.ceil(silos.length / siloCols);
		const x = (col - (siloCols - 1) / 2) * siloSpacingX - 13;
		const z = (row - (totalRows - 1) / 2) * siloSpacingZ;

		const diameter = 10;
		const height = 15;

		positioned.push({
			data: item,
			position: new Vector3(x, 0, z),
			dimensions: {
				width: diameter,
				height,
				depth: diameter,
				radius: diameter / 2,
			},
		});
	});

	// Posiciona armazéns graneleiros no lado direito (dispostos paralelamente ao longo de Z)
	const whSpacingX = 25;

	warehouses.forEach((item, index) => {
		const x = 12 + index * whSpacingX;
		const z = 0;

		const width = 18;
		const height = 7.9; // Altura reduzida em mais 10%
		const depth = 36; // Armazém comprido/profundo

		positioned.push({
			data: item,
			position: new Vector3(x, 0, z),
			dimensions: {
				width,
				height,
				depth,
				radius: Math.min(width, depth) / 2,
			},
		});
	});

	return positioned;
}
