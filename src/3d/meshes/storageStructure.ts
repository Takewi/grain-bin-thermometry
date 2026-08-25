import {
	Scene,
	MeshBuilder,
	StandardMaterial,
	Color3,
	Vector2,
	Vector3,
	Vector4,
	Mesh,
} from "@babylonjs/core";
import { STORAGE_GEOMETRY, MATERIAL_CONFIG } from "../constants";
import {
	createSiloMetalTexture,
	createWarehouseWallTexture,
	createDarkWarehouseRoofTexture,
	createConcreteBaseTexture,
	createNameplateTexture,
} from "../textures/proceduralTextures";
import type { PositionedStorage } from "../utils/layoutEngine";

export interface StorageMeshBundle {
	rootMesh: Mesh;
	shellMeshes: Mesh[];
	data: PositionedStorage["data"];
	position: Vector3;
	dimensions: PositionedStorage["dimensions"];
}

export function buildStorageStructure(scene: Scene, item: PositionedStorage): StorageMeshBundle {
	const { data, position, dimensions } = item;
	const root = new Mesh(`storage_root_${data.id}`, scene);
	root.position = position;

	const shellMeshes: Mesh[] = [];
	const { SHELL, BASE } = MATERIAL_CONFIG;

	// ==========================================
	// 1. Materiais Realistas e Homogêneos
	// ==========================================
	// Material da Base de Concreto
	const baseMat = new StandardMaterial(`baseMat_${data.id}`, scene);
	const baseTex = createConcreteBaseTexture(scene, String(data.id));
	baseMat.diffuseTexture = baseTex;
	baseMat.diffuseColor = new Color3(...BASE.DIFFUSE_RGB);
	baseMat.specularColor = new Color3(0.08, 0.08, 0.08);
	baseMat.zOffset = -1;

	// Material Metálico Externo das Paredes
	const shellMat = new StandardMaterial(`shellMat_${data.id}`, scene);
	const shellTex =
		data.type === "SILO"
			? createSiloMetalTexture(scene, String(data.id))
			: createWarehouseWallTexture(scene, String(data.id));
	shellMat.diffuseTexture = shellTex;
	shellMat.diffuseColor = new Color3(...SHELL.DIFFUSE_RGB);
	shellMat.specularColor = new Color3(...SHELL.SPECULAR_RGB);
	shellMat.emissiveColor = new Color3(...SHELL.EMISSIVE_RGB);
	shellMat.specularPower = 32;
	shellMat.backFaceCulling = false;

	// Material do Telhado Metálico (Silo e Armazém Graneleiro unificados com acabamento escuro)
	const roofMat = new StandardMaterial(`roofMat_${data.id}`, scene);
	const roofTex = createDarkWarehouseRoofTexture(scene, String(data.id));
	if (data.type === "SILO") {
		roofTex.uScale = 5;
		roofTex.vScale = 2;
	} else {
		// No armazém, o escalonamento métrico é aplicado diretamente nas coordenadas UV da malha (CreateRibbon)
		roofTex.uScale = 1;
		roofTex.vScale = 1;
	}
	roofMat.diffuseTexture = roofTex;
	roofMat.diffuseColor = new Color3(0.55, 0.58, 0.65); // Tonalidade grafite/aço escuro
	roofMat.emissiveColor = new Color3(0.08, 0.09, 0.12);
	roofMat.specularColor = new Color3(...SHELL.SPECULAR_RGB);
	roofMat.specularPower = 32;
	roofMat.backFaceCulling = false;

	// Material de Aço para Perfis Estruturais
	const steelMat = new StandardMaterial(`steelMat_${data.id}`, scene);
	steelMat.diffuseColor = new Color3(0.35, 0.38, 0.44);
	steelMat.specularColor = new Color3(0.4, 0.45, 0.5);
	steelMat.specularPower = 64;

	// ==========================================
	// 2. Construção Específica por Tipo
	// ==========================================
	const baseExtraDepth = 0.12; // Afunda no chão para eliminar Z-fighting

	if (data.type === "SILO") {
		const { SILO } = STORAGE_GEOMETRY;

		// A. Base de Concreto Sólida
		const baseCylinder = MeshBuilder.CreateCylinder(
			`silo_base_${data.id}`,
			{
				diameter: dimensions.width * SILO.BASE_DIAMETER_SCALE,
				height: SILO.BASE_HEIGHT + baseExtraDepth,
				tessellation: SILO.TESSELLATION,
			},
			scene
		);
		baseCylinder.position = new Vector3(0, (SILO.BASE_HEIGHT - baseExtraDepth) / 2, 0);
		baseCylinder.material = baseMat;
		baseCylinder.parent = root;
		baseCylinder.isPickable = true;

		// B. Corpo Cilíndrico Metálico
		const bodyHeight = dimensions.height - SILO.ROOF_HEIGHT;
		const bodyCylinder = MeshBuilder.CreateCylinder(
			`silo_body_${data.id}`,
			{
				diameter: dimensions.width,
				height: bodyHeight,
				tessellation: SILO.TESSELLATION,
			},
			scene
		);
		bodyCylinder.position = new Vector3(0, SILO.BASE_HEIGHT + bodyHeight / 2, 0);
		bodyCylinder.material = shellMat;
		bodyCylinder.parent = root;
		bodyCylinder.isPickable = true;
		shellMeshes.push(bodyCylinder);

		// C. Anéis Estruturais de Reforço Externo (Colados bem rentes ao cilindro)
		const ringCount = Math.floor(bodyHeight / 2.6);
		for (let i = 1; i <= ringCount; i++) {
			const ringY = SILO.BASE_HEIGHT + (i / (ringCount + 1)) * bodyHeight;
			const stiffener = MeshBuilder.CreateTorus(
				`silo_stiffener_${data.id}_${i}`,
				{
					diameter: dimensions.width + 0.03,
					thickness: 0.035,
					tessellation: 48,
				},
				scene
			);
			stiffener.position = new Vector3(0, ringY, 0);
			stiffener.material = steelMat;
			stiffener.parent = root;
			stiffener.isPickable = true;
			shellMeshes.push(stiffener);
		}

		// D. Teto Cônico
		const roofCone = MeshBuilder.CreateCylinder(
			`silo_roof_${data.id}`,
			{
				diameterTop: SILO.ROOF_TOP_DIAMETER,
				diameterBottom: dimensions.width * SILO.ROOF_BOTTOM_DIAMETER_SCALE,
				height: SILO.ROOF_HEIGHT,
				tessellation: SILO.TESSELLATION,
			},
			scene
		);
		roofCone.position = new Vector3(0, SILO.BASE_HEIGHT + bodyHeight + SILO.ROOF_HEIGHT / 2, 0);
		roofCone.material = roofMat;
		roofCone.parent = root;
		roofCone.isPickable = true;
		shellMeshes.push(roofCone);

		// D.1. Beiral Circular do Teto (Eave Ring)
		const roofEaveRadius = (dimensions.width * SILO.ROOF_BOTTOM_DIAMETER_SCALE) / 2;
		const eaveRing = MeshBuilder.CreateTorus(
			`silo_eave_${data.id}`,
			{
				diameter: roofEaveRadius * 2 * 1.01,
				thickness: 0.09,
				tessellation: 36,
			},
			scene
		);
		eaveRing.position = new Vector3(0, SILO.BASE_HEIGHT + bodyHeight, 0);
		eaveRing.material = steelMat;
		eaveRing.parent = root;
		eaveRing.isPickable = true;
		shellMeshes.push(eaveRing);

		// D.2. Nervuras Radiais 3D no Teto Cônico (16 gomos simétricos em 360°)
		const ribCount = 16;
		const topCapY = SILO.BASE_HEIGHT + bodyHeight + SILO.ROOF_HEIGHT;
		const bottomEaveY = SILO.BASE_HEIGHT + bodyHeight;
		const topRadius = SILO.ROOF_TOP_DIAMETER / 2;

		for (let i = 0; i < ribCount; i++) {
			const angle = (i / ribCount) * Math.PI * 2;
			const x1 = topRadius * Math.cos(angle);
			const z1 = topRadius * Math.sin(angle);
			const x2 = roofEaveRadius * Math.cos(angle);
			const z2 = roofEaveRadius * Math.sin(angle);

			const rib = MeshBuilder.CreateTube(
				`silo_roof_rib_${data.id}_${i}`,
				{
					path: [new Vector3(x1, topCapY - 0.05, z1), new Vector3(x2, bottomEaveY, z2)],
					radius: 0.035,
					tessellation: 8,
				},
				scene
			);
			rib.material = steelMat;
			rib.parent = root;
			rib.isPickable = true;
			shellMeshes.push(rib);
		}

		// E. Capitel Central / Exaustor do Topo
		const capHeight = 0.6;
		const topCap = MeshBuilder.CreateCylinder(
			`silo_cap_${data.id}`,
			{
				diameterTop: 0.7,
				diameterBottom: 0.95,
				height: capHeight,
				tessellation: 24,
			},
			scene
		);
		topCap.position = new Vector3(
			0,
			SILO.BASE_HEIGHT + bodyHeight + SILO.ROOF_HEIGHT + capHeight / 2,
			0
		);
		topCap.material = steelMat;
		topCap.parent = root;
		topCap.isPickable = true;
		shellMeshes.push(topCap);

		// F. Escada Marinheiro com Gaiola de Segurança Estendida até o Topo do Cilindro
		const ladderRadius = dimensions.width / 2 + 0.16;
		const ladderAngle = Math.PI / 4;
		const ladderX = ladderRadius * Math.cos(ladderAngle);
		const ladderZ = ladderRadius * Math.sin(ladderAngle);

		const railOffset = 0.22;
		const leftX = ladderX - railOffset * Math.sin(ladderAngle);
		const leftZ = ladderZ + railOffset * Math.cos(ladderAngle);
		const rightX = ladderX + railOffset * Math.sin(ladderAngle);
		const rightZ = ladderZ - railOffset * Math.cos(ladderAngle);

		const ladderTotalHeight = bodyHeight;
		const ladderCenterY = SILO.BASE_HEIGHT + bodyHeight / 2;

		const railLeft = MeshBuilder.CreateCylinder(
			`ladder_l_${data.id}`,
			{ diameter: 0.045, height: ladderTotalHeight },
			scene
		);
		railLeft.position = new Vector3(leftX, ladderCenterY, leftZ);
		railLeft.material = steelMat;
		railLeft.parent = root;
		railLeft.isPickable = false;
		shellMeshes.push(railLeft);

		const railRight = MeshBuilder.CreateCylinder(
			`ladder_r_${data.id}`,
			{ diameter: 0.045, height: ladderTotalHeight },
			scene
		);
		railRight.position = new Vector3(rightX, ladderCenterY, rightZ);
		railRight.material = steelMat;
		railRight.parent = root;
		railRight.isPickable = false;
		shellMeshes.push(railRight);

		// Degraus
		const rungStep = 0.4;
		const rungCount = Math.floor(bodyHeight / rungStep);
		for (let r = 1; r < rungCount; r++) {
			const rungY = SILO.BASE_HEIGHT + r * rungStep;
			const rung = MeshBuilder.CreateTube(
				`rung_${data.id}_${r}`,
				{
					path: [new Vector3(leftX, rungY, leftZ), new Vector3(rightX, rungY, rightZ)],
					radius: 0.018,
					tessellation: 8,
				},
				scene
			);
			rung.material = steelMat;
			rung.parent = root;
			rung.isPickable = false;
			shellMeshes.push(rung);
		}

		// Aros da Gaiola de Proteção: Cobrem de 2.0m até o topo do cilindro
		const cageRadiusOut = 0.38;
		const cageSegments = 16;
		const cageHoopsY: number[] = [];
		const cageStep = 0.65;
		const startY = SILO.BASE_HEIGHT + 2.0;
		const endY = SILO.BASE_HEIGHT + bodyHeight;

		for (let y = startY; y <= endY + 0.1; y += cageStep) {
			const hoopY = Math.min(y, endY);
			cageHoopsY.push(hoopY);
			const hoopPath: Vector3[] = [];

			for (let s = 0; s <= cageSegments; s++) {
				const phi = (s / cageSegments) * Math.PI;
				const tangFactor = railOffset * Math.cos(phi);
				const normFactor = cageRadiusOut * Math.sin(phi);

				const hx =
					ladderX + tangFactor * -Math.sin(ladderAngle) + normFactor * Math.cos(ladderAngle);
				const hz =
					ladderZ + tangFactor * Math.cos(ladderAngle) + normFactor * Math.sin(ladderAngle);
				hoopPath.push(new Vector3(hx, hoopY, hz));
			}

			const cageHoop = MeshBuilder.CreateTube(
				`cage_hoop_${data.id}_${hoopY.toFixed(2)}`,
				{
					path: hoopPath,
					radius: 0.016,
					tessellation: 8,
				},
				scene
			);
			cageHoop.material = steelMat;
			cageHoop.parent = root;
			cageHoop.isPickable = false;
			shellMeshes.push(cageHoop);
		}

		// 3 Barras Verticais de Sustentação
		if (cageHoopsY.length >= 2) {
			const firstY = cageHoopsY[0];
			const lastY = cageHoopsY[cageHoopsY.length - 1];

			[0.25, 0.5, 0.75].forEach((ratio, barIdx) => {
				const phi = ratio * Math.PI;
				const tangFactor = railOffset * Math.cos(phi);
				const normFactor = cageRadiusOut * Math.sin(phi);

				const bx =
					ladderX + tangFactor * -Math.sin(ladderAngle) + normFactor * Math.cos(ladderAngle);
				const bz =
					ladderZ + tangFactor * Math.cos(ladderAngle) + normFactor * Math.sin(ladderAngle);

				const verticalBar = MeshBuilder.CreateTube(
					`cage_vbar_${data.id}_${barIdx}`,
					{
						path: [new Vector3(bx, firstY, bz), new Vector3(bx, lastY, bz)],
						radius: 0.014,
						tessellation: 6,
					},
					scene
				);
				verticalBar.material = steelMat;
				verticalBar.parent = root;
				verticalBar.isPickable = false;
				shellMeshes.push(verticalBar);
			});
		}

		// G. Placa de Identificação do Silo
		const plaqueMat = new StandardMaterial(`nameplate_mat_${data.id}`, scene);
		plaqueMat.diffuseTexture = createNameplateTexture(scene, data.name, "Silo Metálico");
		plaqueMat.emissiveColor = new Color3(0.55, 0.6, 0.7);
		const plaque = MeshBuilder.CreatePlane(
			`nameplate_${data.id}`,
			{ width: 2.2, height: 0.8 },
			scene
		);
		plaque.position = new Vector3(
			0,
			SILO.BASE_HEIGHT + bodyHeight - 1.2,
			-dimensions.width / 2 - 0.08
		);
		plaque.material = plaqueMat;
		plaque.parent = root;
		plaque.isPickable = true;
		shellMeshes.push(plaque);
	} else {
		// ==========================================
		// ARMAZÉM GRANELEIRO HORIZONTAL
		// ==========================================
		const { WAREHOUSE } = STORAGE_GEOMETRY;

		// A. Base de concreto
		const baseTileScale = 4.0;
		const baseFaceUV: Vector4[] = [
			new Vector4(0, 0, dimensions.width / baseTileScale, 1),
			new Vector4(0, 0, dimensions.width / baseTileScale, 1),
			new Vector4(0, 0, dimensions.depth / baseTileScale, 1),
			new Vector4(0, 0, dimensions.depth / baseTileScale, 1),
			new Vector4(0, 0, dimensions.width / baseTileScale, dimensions.depth / baseTileScale),
			new Vector4(0, 0, dimensions.width / baseTileScale, dimensions.depth / baseTileScale),
		];
		const baseBox = MeshBuilder.CreateBox(
			`wh_base_${data.id}`,
			{
				width: dimensions.width * WAREHOUSE.BASE_SCALE,
				depth: dimensions.depth * WAREHOUSE.BASE_SCALE,
				height: WAREHOUSE.BASE_HEIGHT + baseExtraDepth,
				faceUV: baseFaceUV,
				wrap: true,
			},
			scene
		);
		baseBox.position = new Vector3(0, (WAREHOUSE.BASE_HEIGHT - baseExtraDepth) / 2, 0);
		baseBox.material = baseMat;
		baseBox.parent = root;
		baseBox.isPickable = true;

		// B. Corpo do Galpão
		const bodyHeight = dimensions.height * WAREHOUSE.BODY_HEIGHT_RATIO;
		const wallTileScale = 3.2; // Escala métrica uniforme para todas as paredes
		const bodyFaceUV: Vector4[] = [
			new Vector4(0, 0, dimensions.width / wallTileScale, bodyHeight / wallTileScale), // Back (+Z)
			new Vector4(0, 0, dimensions.width / wallTileScale, bodyHeight / wallTileScale), // Front (-Z)
			new Vector4(0, 0, dimensions.depth / wallTileScale, bodyHeight / wallTileScale), // Right (+X)
			new Vector4(0, 0, dimensions.depth / wallTileScale, bodyHeight / wallTileScale), // Left (-X)
			new Vector4(0, 0, dimensions.width / wallTileScale, dimensions.depth / wallTileScale), // Top (+Y)
			new Vector4(0, 0, dimensions.width / wallTileScale, dimensions.depth / wallTileScale), // Bottom (-Y)
		];
		const bodyBox = MeshBuilder.CreateBox(
			`wh_body_${data.id}`,
			{
				width: dimensions.width,
				depth: dimensions.depth,
				height: bodyHeight,
				faceUV: bodyFaceUV,
				wrap: true,
			},
			scene
		);
		bodyBox.position = new Vector3(0, WAREHOUSE.BASE_HEIGHT + bodyHeight / 2, 0);
		bodyBox.material = shellMat;
		bodyBox.parent = root;
		bodyBox.isPickable = true;
		shellMeshes.push(bodyBox);

		// C. Pilares Estruturais Externos
		const columnCount = Math.max(5, Math.floor(dimensions.depth / 4.2));
		for (let c = 0; c < columnCount; c++) {
			const cz = -dimensions.depth * 0.42 + (c / (columnCount - 1)) * (dimensions.depth * 0.84);
			[-dimensions.width / 2 - 0.15, dimensions.width / 2 + 0.15].forEach((cx, colIdx) => {
				const pillar = MeshBuilder.CreateBox(
					`wh_pillar_${data.id}_${c}_${colIdx}`,
					{ width: 0.3, depth: 0.5, height: bodyHeight + 0.2 },
					scene
				);
				pillar.position = new Vector3(cx, WAREHOUSE.BASE_HEIGHT + bodyHeight / 2, cz);
				pillar.material = steelMat;
				pillar.parent = root;
				pillar.isPickable = true;
				shellMeshes.push(pillar);
			});
		}

		// D. Telhado em Arco Parabólico Completo que cobre 100% do Topo
		const roofOverhang = WAREHOUSE.ROOF_OVERHANG || 0.6;
		const roofWidth = dimensions.width + roofOverhang * 2;
		const roofDepth = dimensions.depth + roofOverhang * 2;
		const roofHeight = Math.max(1.2, dimensions.height * 0.13); // Altura baixa, elegante e proporcional
		const baseY = WAREHOUSE.BASE_HEIGHT + bodyHeight;

		const numX = 24;
		const numZ = 12;
		const pathArray: Vector3[][] = [];
		const roofTileScaleX = 5.0; // 5.0m por repetição de chapa na largura (textura mais ampla e rústica como a do silo)
		const roofTileScaleZ = 5.0; // 5.0m por repetição no comprimento
		const roofUvs: Vector2[] = [];

		for (let j = 0; j <= numZ; j++) {
			const z = -roofDepth / 2 + (j / numZ) * roofDepth;
			const path: Vector3[] = [];
			const v = (j / numZ) * (roofDepth / roofTileScaleZ);
			for (let i = 0; i <= numX; i++) {
				const x = -roofWidth / 2 + (i / numX) * roofWidth;
				const u = x / (roofWidth / 2); // De -1 a +1
				const y = baseY + roofHeight * (1 - u * u); // Arco suave parabólico cobrindo 100% da largura
				path.push(new Vector3(x, y, z));
				roofUvs.push(new Vector2((i / numX) * (roofWidth / roofTileScaleX), v));
			}
			pathArray.push(path);
		}

		const roofArch = MeshBuilder.CreateRibbon(
			`wh_roof_${data.id}`,
			{
				pathArray,
				uvs: roofUvs,
				sideOrientation: Mesh.DOUBLESIDE,
			},
			scene
		);
		roofArch.material = roofMat;
		roofArch.parent = root;
		roofArch.isPickable = true;
		shellMeshes.push(roofArch);

		// D.1. Oitões de Fechamento Frontal e Traseiro do Arco (Tympana)
		[-roofDepth / 2, roofDepth / 2].forEach((gz, gIdx) => {
			const gablePaths: Vector3[][] = [[], []];
			for (let i = 0; i <= numX; i++) {
				const x = -roofWidth / 2 + (i / numX) * roofWidth;
				const u = x / (roofWidth / 2);
				const yTop = baseY + roofHeight * (1 - u * u);
				gablePaths[0].push(new Vector3(x, baseY, gz));
				gablePaths[1].push(new Vector3(x, yTop, gz));
			}

			// Projeção UV métrica plana que alinha perfeitamente com a fachada do armazém
			const gableUvs: Vector2[] = [];
			for (let i = 0; i <= numX; i++) {
				const x = -roofWidth / 2 + (i / numX) * roofWidth;
				const uvX = (x + dimensions.width / 2) / wallTileScale;
				gableUvs.push(new Vector2(uvX, 0));
			}
			for (let i = 0; i <= numX; i++) {
				const x = -roofWidth / 2 + (i / numX) * roofWidth;
				const u = x / (roofWidth / 2);
				const yTop = baseY + roofHeight * (1 - u * u);
				const uvX = (x + dimensions.width / 2) / wallTileScale;
				gableUvs.push(new Vector2(uvX, (yTop - baseY) / wallTileScale));
			}

			const gable = MeshBuilder.CreateRibbon(
				`wh_gable_${data.id}_${gIdx}`,
				{
					pathArray: gablePaths,
					uvs: gableUvs,
					sideOrientation: Mesh.DOUBLESIDE,
				},
				scene
			);
			gable.material = shellMat;
			gable.parent = root;
			gable.isPickable = true;
			shellMeshes.push(gable);
		});

		// D.2. Nervuras Estruturais Arqueadas 3D (Vigas em Arco correspondentes aos pilares, similar às nervuras do silo)
		for (let c = 0; c < columnCount; c++) {
			const cz = -dimensions.depth * 0.42 + (c / (columnCount - 1)) * (dimensions.depth * 0.84);
			const ribPoints: Vector3[] = [];
			const ribSegs = 20;
			for (let s = 0; s <= ribSegs; s++) {
				const rx = -roofWidth / 2 + (s / ribSegs) * roofWidth;
				const ru = rx / (roofWidth / 2);
				const ry = baseY + roofHeight * (1 - ru * ru) + 0.04;
				ribPoints.push(new Vector3(rx, ry, cz));
			}
			const roofRib = MeshBuilder.CreateTube(
				`wh_roof_rib_${data.id}_${c}`,
				{
					path: ribPoints,
					radius: 0.055,
					tessellation: 12,
				},
				scene
			);
			roofRib.material = steelMat;
			roofRib.parent = root;
			roofRib.isPickable = true;
			shellMeshes.push(roofRib);
		}

		// D.3. Perfis de Beiral/Arremate Lateral
		[-roofWidth / 2, roofWidth / 2].forEach((ex, eIdx) => {
			const eaveFascia = MeshBuilder.CreateBox(
				`wh_eave_fascia_${data.id}_${eIdx}`,
				{
					width: 0.12,
					depth: roofDepth,
					height: 0.16,
				},
				scene
			);
			eaveFascia.position = new Vector3(ex, baseY + 0.08, 0);
			eaveFascia.material = steelMat;
			eaveFascia.parent = root;
			eaveFascia.isPickable = true;
			shellMeshes.push(eaveFascia);
		});

		// E. Barra Superior / Lanternim de Ventilação Central (Estende até as pontas sem deixar borda)
		const ventMonitor = MeshBuilder.CreateBox(
			`wh_vent_${data.id}`,
			{
				width: 1.2,
				depth: roofDepth,
				height: 0.22,
			},
			scene
		);
		ventMonitor.position = new Vector3(0, baseY + roofHeight + 0.11, 0);
		ventMonitor.material = steelMat;
		ventMonitor.parent = root;
		ventMonitor.isPickable = true;
		shellMeshes.push(ventMonitor);

		// F. Placa de Identificação Centralizada na Fachada (Sem Porta)
		const plaqueMat = new StandardMaterial(`wh_plaque_mat_${data.id}`, scene);
		plaqueMat.diffuseTexture = createNameplateTexture(scene, data.name, "Armazém Graneleiro");
		plaqueMat.emissiveColor = new Color3(0.55, 0.6, 0.7);
		const plaque = MeshBuilder.CreatePlane(
			`wh_plaque_${data.id}`,
			{ width: 3.2, height: 1.1 },
			scene
		);
		plaque.position = new Vector3(
			0,
			WAREHOUSE.BASE_HEIGHT + bodyHeight / 2,
			-dimensions.depth / 2 - 0.12
		);
		plaque.material = plaqueMat;
		plaque.parent = root;
		plaque.isPickable = true;
		shellMeshes.push(plaque);
	}

	const meta = { data, position, dimensions, root, shellMeshes };
	root.metadata = meta;
	shellMeshes.forEach((m) => (m.metadata = meta));

	return {
		rootMesh: root,
		shellMeshes,
		data,
		position,
		dimensions,
	};
}
