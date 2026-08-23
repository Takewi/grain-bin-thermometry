import { ref, onBeforeUnmount } from "vue";
import {
  Engine,
  Scene,
  Vector3,
  StandardMaterial,
  Mesh,
  PointerEventTypes,
} from "@babylonjs/core";
import { calculatePlantLayout } from "@/3d/utils/layoutEngine";
import { buildStorageStructure, type StorageMeshBundle } from "@/3d/meshes/storageStructure";
import {
  renderThermometry,
  clearSensorBadgeCache,
  type PendulumVisualizerInstance,
  type SensorInstanceMetadata,
} from "@/3d/meshes/pendulumMesh";
import {
  renderGrainVolume,
  applyGrainVolumeMode,
  type GrainVisualMode,
} from "@/3d/meshes/grainVolume";
export type { GrainVisualMode };
import { setupPlantEnvironment } from "@/3d/scene/plantEnvironment";
import { CameraController, type CameraPresetType } from "@/3d/controllers/cameraController";
export type { CameraPresetType };
import { MATERIAL_CONFIG } from "@/3d/constants";
import { getSilos, getStorageDetail } from "@/services/mockStorageService";
import type {
  SiloSummary,
  StorageDetail,
  SensorPickedInfo,
} from "@/types/storage";

export function useDigitalTwin() {
  const isLoaded = ref(false);
  const isLoadingDetail = ref(false);
  const isAutoRotating = ref(false);
  const currentCameraPreset = ref<CameraPresetType>("iso");
  const visualMode = ref<GrainVisualMode>("heatmap");
  const silosList = ref<SiloSummary[]>([]);
  const selectedStorage = ref<SiloSummary | null>(null);
  const selectedDetail = ref<StorageDetail | null>(null);
  const hoveredSensor = ref<SensorPickedInfo | null>(null);

  let engine: Engine | null = null;
  let scene: Scene | null = null;
  let cameraController: CameraController | null = null;
  let isPointerDragging = false;

  let currentThermo: PendulumVisualizerInstance | null = null;
  let currentGrainMesh: Mesh | null = null;
  const storageBundles: StorageMeshBundle[] = [];

  async function init(canvas: HTMLCanvasElement) {
    if (!canvas) return;

    engine = new Engine(canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
      antialias: false,
    });

    scene = new Scene(engine);

    // 1. Configura Ambiente (Luzes, Piso, Grid)
    setupPlantEnvironment(scene);

    // 2. Inicializa Controller Desacoplado da Câmera
    cameraController = new CameraController(scene, canvas);

    // 3. Constrói Layout Espacial das Estruturas da Planta
    try {
      const silos = await getSilos();
      silosList.value = silos;
      const layout = calculatePlantLayout(silos);

      layout.forEach((item) => {
        const bundle = buildStorageStructure(scene!, item);
        storageBundles.push(bundle);
      });
    } catch (err) {
      console.error("Falha ao inicializar silos da planta:", err);
    }

    // 4. Configura Eventos de Ponteiro (Seleção, Hover e Foco)
    setupPointerEvents();

    // 5. Render Loop Contínuo
    engine.runRenderLoop(() => {
      scene?.render();
    });

    window.addEventListener("resize", handleResize);
    isLoaded.value = true;
  }

  function setupPointerEvents() {
    if (!scene) return;

    scene.onPointerObservable.add((pointerInfo) => {
      switch (pointerInfo.type) {
        case PointerEventTypes.POINTERDOWN: {
          isPointerDragging = true;

          // Se o usuário interagir com clique esquerdo, para a auto-rotação
          if (isAutoRotating.value && pointerInfo.event.button === 0) {
            setAutoRotate(false);
          }

          // EXCLUSIVO BOTÃO ESQUERDO (button === 0): Botão direito/meio não seleciona storage
          if (pointerInfo.event.button === 0) {
            const pick = pointerInfo.pickInfo;
            if (pick?.hit && pick.pickedMesh) {
              let targetMesh: Mesh | null = pick.pickedMesh as Mesh;
              while (targetMesh && !targetMesh.metadata?.data) {
                targetMesh = targetMesh.parent as Mesh | null;
              }

              if (targetMesh && targetMesh.metadata?.data) {
                const bundle = storageBundles.find(
                  (b) => b.data.id === targetMesh!.metadata.data.id
                );
                if (bundle) {
                  selectStorage(bundle);
                }
              }
            }
          }
          break;
        }

        case PointerEventTypes.POINTERUP: {
          isPointerDragging = false;
          break;
        }

        // Duplo Clique: Centralização inteligente da câmera
        case PointerEventTypes.POINTERDOUBLETAP: {
          const pick = pointerInfo.pickInfo;
          if (pick?.hit && pick.pickedPoint && cameraController) {
            if (pick.pickedMesh?.name === "plantGround") {
              cameraController.animateTo({
                target: new Vector3(pick.pickedPoint.x, 3, pick.pickedPoint.z),
              });
            }
          }
          break;
        }

        // Hover do Mouse nos Badges de Temperatura
        case PointerEventTypes.POINTERMOVE: {
          if (isPointerDragging) {
            if (hoveredSensor.value) hoveredSensor.value = null;
            return;
          }

          const pick = pointerInfo.pickInfo;
          if (
            pick?.hit &&
            pick.pickedMesh &&
            pick.pickedMesh.metadata?.isSensorBadge &&
            pick.pickedMesh.metadata?.sensorMeta
          ) {
            const meta = pick.pickedMesh.metadata.sensorMeta as SensorInstanceMetadata;
            const evt = pointerInfo.event as MouseEvent;
            hoveredSensor.value = {
              pendulumIndex: meta.pendulumIndex,
              sensorIndex: meta.sensorIndex,
              ringIndex: meta.ringIndex,
              sectorIndex: meta.sectorNumber,
              isCentral: meta.isCentral,
              temperature: meta.reading.temperature,
              level: meta.reading.level,
              screenX: evt.clientX,
              screenY: evt.clientY,
            };
            return;
          }

          if (hoveredSensor.value) {
            hoveredSensor.value = null;
          }
          break;
        }
      }
    });
  }

  async function selectStorage(bundle: StorageMeshBundle) {
    if (selectedStorage.value?.id === bundle.data.id && selectedDetail.value) {
      return;
    }

    selectedStorage.value = bundle.data;
    isLoadingDetail.value = true;

    // Foca a câmera no silo usando o CameraController
    if (cameraController) {
      cameraController.focusOnStorage(
        bundle.position,
        bundle.dimensions.height,
        bundle.data.type
      );
      isAutoRotating.value = cameraController.isAutoRotating;
    }

    // Ajusta opacidade da carcaça: SOMENTE a estrutura selecionada fica translúcida
    const { SHELL } = MATERIAL_CONFIG;
    storageBundles.forEach((b) => {
      const isCurrent = b.data.id === bundle.data.id;
      const targetAlpha = isCurrent ? SHELL.OPACITY_FOCUSED : 1.0;
      const targetMode = isCurrent
        ? StandardMaterial.MATERIAL_ALPHABLEND
        : StandardMaterial.MATERIAL_OPAQUE;

      b.shellMeshes.forEach((mesh) => {
        const mat = mesh.material as StandardMaterial;
        if (mat && mat.alpha !== targetAlpha) {
          mat.alpha = targetAlpha;
          mat.transparencyMode = targetMode;
        }
      });
    });

    // Limpa termometria anterior
    currentThermo?.dispose();
    currentThermo = null;
    currentGrainMesh?.dispose();
    currentGrainMesh = null;

    try {
      const detail = await getStorageDetail(bundle.data.id);
      selectedDetail.value = detail;

      if (scene) {
        // 1. Renderiza anéis e badges 3D
        currentThermo = renderThermometry(
          scene,
          detail,
          bundle.position,
          bundle.data.type,
          bundle.dimensions
        );

        // 2. Renderiza massa de grão adaptativa com topografia em cone/onda baseada nos sensores
        const fillPercentage = detail.levelMaps[0]?.porcentagem || 0;
        currentGrainMesh = renderGrainVolume(
          scene,
          bundle.position,
          bundle.data.type,
          bundle.dimensions,
          fillPercentage,
          detail.levelMaps[0],
          visualMode.value,
          bundle.data.tempMed
        );
      }
    } catch (err) {
      console.error("Erro ao carregar detalhes do silo:", err);
    } finally {
      isLoadingDetail.value = false;
    }
  }

  function selectSiloById(id: number) {
    const bundle = storageBundles.find((b) => b.data.id === id);
    if (bundle) {
      selectStorage(bundle);
    }
  }

  function resetView() {
    selectedStorage.value = null;
    selectedDetail.value = null;
    hoveredSensor.value = null;
    currentCameraPreset.value = "iso";

    currentThermo?.dispose();
    currentThermo = null;
    currentGrainMesh?.dispose();
    currentGrainMesh = null;

    // Restaura opacidade original das estruturas
    const { SHELL } = MATERIAL_CONFIG;
    storageBundles.forEach((b) => {
      b.shellMeshes.forEach((mesh) => {
        const mat = mesh.material as StandardMaterial;
        if (mat) {
          mat.alpha = SHELL.OPACITY_DEFAULT;
          mat.transparencyMode = StandardMaterial.MATERIAL_OPAQUE;
        }
      });
    });

    // Reseta câmera para visão panorâmica macro
    cameraController?.resetToMacro();
  }

  function setCameraPreset(preset: CameraPresetType) {
    currentCameraPreset.value = preset;
    const isFocused = !!selectedStorage.value;
    const type = selectedStorage.value?.type;
    cameraController?.setPreset(preset, isFocused, type);
  }

  function zoomIn() {
    cameraController?.zoomIn();
  }

  function zoomOut() {
    cameraController?.zoomOut();
  }

  function setAutoRotate(active: boolean) {
    isAutoRotating.value = active;
    cameraController?.setAutoRotate(active);
  }

  function toggleAutoRotate() {
    cameraController?.toggleAutoRotate();
    isAutoRotating.value = cameraController?.isAutoRotating ?? false;
  }

  function setVisualMode(mode: GrainVisualMode) {
    visualMode.value = mode;
    if (currentGrainMesh) {
      applyGrainVolumeMode(currentGrainMesh, mode, selectedStorage.value?.tempMed);
    }
  }

  function handleResize() {
    engine?.resize();
  }

  onBeforeUnmount(() => {
    window.removeEventListener("resize", handleResize);
    clearSensorBadgeCache();
    currentThermo?.dispose();
    currentGrainMesh?.dispose();
    scene?.dispose();
    engine?.dispose();
  });

  return {
    init,
    resetView,
    selectSiloById,
    setCameraPreset,
    zoomIn,
    zoomOut,
    toggleAutoRotate,
    isAutoRotating,
    currentCameraPreset,
    visualMode,
    setVisualMode,
    silosList,
    selectedStorage,
    selectedDetail,
    hoveredSensor,
    isLoadingDetail,
    isLoaded,
  };
}
