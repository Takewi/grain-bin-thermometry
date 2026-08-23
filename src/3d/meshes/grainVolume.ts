import {
  Scene,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3,
  type Mesh,
} from "@babylonjs/core";
import { MATERIAL_CONFIG } from "../constants";
import type { StorageType } from "@/types/storage";

export function renderGrainVolume(
  scene: Scene,
  parentPos: Vector3,
  type: StorageType,
  dimensions: { width: number; height: number; depth: number; radius: number },
  fillPercentage: number
): Mesh {
  const { GRAIN } = MATERIAL_CONFIG;
  const ratio = Math.max(0.08, Math.min(1.0, fillPercentage / 100));
  const grainHeight = dimensions.height * ratio * GRAIN.HEIGHT_MAX_RATIO;

  let grainMesh: Mesh;

  if (type === "SILO") {
    grainMesh = MeshBuilder.CreateCylinder(
      "grainVolume",
      {
        height: grainHeight,
        diameter: dimensions.radius * 2 * 0.95,
        tessellation: 32,
      },
      scene
    );
  } else {
    grainMesh = MeshBuilder.CreateBox(
      "grainVolume",
      {
        width: dimensions.width * 0.94,
        depth: dimensions.depth * 0.94,
        height: grainHeight,
      },
      scene
    );
  }

  grainMesh.position = new Vector3(
    parentPos.x,
    parentPos.y + grainHeight / 2 + 0.1,
    parentPos.z
  );

  const mat = new StandardMaterial("grainMat", scene);
  mat.diffuseColor = new Color3(...GRAIN.DIFFUSE_RGB);
  mat.specularColor = new Color3(...GRAIN.SPECULAR_RGB);
  mat.emissiveColor = new Color3(...GRAIN.EMISSIVE_RGB);
  mat.alpha = GRAIN.OPACITY;
  mat.backFaceCulling = false;
  grainMesh.material = mat;
  grainMesh.isPickable = false;

  return grainMesh;
}
