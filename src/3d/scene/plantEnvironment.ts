import {
	Scene,
	MeshBuilder,
	StandardMaterial,
	Color3,
	HemisphericLight,
	DirectionalLight,
	Vector3,
	type Mesh,
} from "@babylonjs/core";
import { ENVIRONMENT_CONFIG } from "../constants";

export interface EnvironmentBundle {
	ground: Mesh;
	gridMesh: Mesh;
	hemiMain: HemisphericLight;
	hemiBottom: HemisphericLight;
	dirKey: DirectionalLight;
	dirFill: DirectionalLight;
}

/**
 * Constrói o ambiente da planta com iluminação omnidirecional de alta visibilidade
 */
export function setupPlantEnvironment(scene: Scene): EnvironmentBundle {
	const { GROUND, GRID, LIGHTING, CLEAR_COLOR_RGB } = ENVIRONMENT_CONFIG;

	scene.clearColor = new Color3(...CLEAR_COLOR_RGB).toColor4(1.0);
	scene.ambientColor = new Color3(0.55, 0.58, 0.65);

	// Configuração de Rendering Groups para sobreposição absoluta da termometria:
	// Grupo 0: Estruturas 3D (Silos, Armazéns, Piso, Relevo do Grão)
	// Grupo 1: Cabos e Guias de Anéis de Termometria (desenhados sobre o grupo 0)
	// Grupo 2: Badges e Pílulas de Sensores (sempre visíveis no topo absoluto da cena)
	scene.setRenderingAutoClearDepthStencil(1, true, false, false);
	scene.setRenderingAutoClearDepthStencil(2, false, false, false);

	// 1. Iluminação Hemisférica Principal (Topo -> Base)
	const hemiMain = new HemisphericLight("hemiMain", new Vector3(0, 1, 0), scene);
	hemiMain.intensity = LIGHTING.HEMI_MAIN_INTENSITY;
	hemiMain.groundColor = new Color3(...LIGHTING.HEMI_GROUND_RGB);

	// 2. Iluminação Hemisférica de Rebatimento (Base -> Topo)
	// Garante que a parte inferior dos silos, telhados e sensores nunca fiquem escuros
	const hemiBottom = new HemisphericLight("hemiBottom", new Vector3(0, -1, 0), scene);
	hemiBottom.intensity = LIGHTING.HEMI_BOTTOM_INTENSITY;
	hemiBottom.groundColor = new Color3(...LIGHTING.HEMI_BOTTOM_RGB);

	// 3. Luz Direcional Frontal (Key Light)
	const dirKey = new DirectionalLight("dirKey", LIGHTING.DIR_KEY_DIRECTION, scene);
	dirKey.position = new Vector3(-30, 50, -30);
	dirKey.intensity = LIGHTING.DIR_KEY_INTENSITY;

	// 4. Luz Direcional Traseira de Preenchimento (Fill Light)
	// Elimina pontos escuros nas faces de trás dos silos e armazéns
	const dirFill = new DirectionalLight("dirFill", LIGHTING.DIR_FILL_DIRECTION, scene);
	dirFill.position = new Vector3(30, 45, 30);
	dirFill.intensity = LIGHTING.DIR_FILL_INTENSITY;

	// 5. Piso da Planta
	const ground = MeshBuilder.CreateGround(
		"plantGround",
		{ width: GROUND.WIDTH, height: GROUND.HEIGHT },
		scene
	);
	const groundMat = new StandardMaterial("groundMat", scene);
	groundMat.diffuseColor = new Color3(...GROUND.DIFFUSE_RGB);
	groundMat.specularColor = new Color3(...GROUND.SPECULAR_RGB);
	groundMat.zOffset = 2; // Garante que o chão fique sempre no fundo do depth buffer
	ground.material = groundMat;
	ground.isPickable = true;

	// 6. Grid Visual de Orientação no Solo
	const gridLines: Vector3[][] = [];
	const halfW = GROUND.WIDTH / 2 - 10;
	const halfH = GROUND.HEIGHT / 2 - 10;

	for (let x = -halfW; x <= halfW; x += GRID.SPACING) {
		gridLines.push([new Vector3(x, 0.02, -halfH), new Vector3(x, 0.02, halfH)]);
	}
	for (let z = -halfH; z <= halfH; z += GRID.SPACING) {
		gridLines.push([new Vector3(-halfW, 0.02, z), new Vector3(halfW, 0.02, z)]);
	}

	const gridMesh = MeshBuilder.CreateLineSystem("groundGrid", { lines: gridLines }, scene);
	gridMesh.color = new Color3(...GRID.COLOR_RGB);
	gridMesh.isPickable = false;

	return {
		ground,
		gridMesh,
		hemiMain,
		hemiBottom,
		dirKey,
		dirFill,
	};
}
