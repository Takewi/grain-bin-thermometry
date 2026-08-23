<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useDigitalTwin } from "@/composables/useDigitalTwin";
import HeaderBar from "@/components/hud/HeaderBar.vue";
import SiloSidebar from "@/components/hud/SiloSidebar.vue";
import ThermalLegend from "@/components/hud/ThermalLegend.vue";
import SensorTooltip from "@/components/hud/SensorTooltip.vue";
import NavigationToolbar from "@/components/hud/NavigationToolbar.vue";

const canvasRef = ref<HTMLCanvasElement | null>(null);

const {
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
} = useDigitalTwin();

onMounted(() => {
  if (canvasRef.value) {
    init(canvasRef.value);
  }
});
</script>

<template>
  <div class="digital-twin-app">
    <!-- Viewport 3D Canvas -->
    <canvas ref="canvasRef" class="render-canvas"></canvas>

    <!-- Overlay HUD Contido nos Limites da Janela -->
    <div class="hud-overlay">
      <!-- Barra Superior Principal -->
      <HeaderBar
        :silos="silosList"
        :selected-silo="selectedStorage"
        @select-silo="selectSiloById"
        @reset-view="resetView"
      />

      <!-- Barra Flutuante de Ferramentas de Câmera 3D e Modo Visual -->
      <NavigationToolbar
        v-if="isLoaded"
        :active-preset="currentCameraPreset"
        :is-auto-rotating="isAutoRotating"
        :visual-mode="visualMode"
        @set-preset="setCameraPreset"
        @set-visual-mode="setVisualMode"
        @zoom-in="zoomIn"
        @zoom-out="zoomOut"
        @toggle-auto-rotate="toggleAutoRotate"
        @reset-view="resetView"
      />

      <!-- Painel Lateral do Silo Selecionado -->
      <SiloSidebar
        v-if="selectedStorage"
        :summary="selectedStorage"
        :detail="selectedDetail"
        :is-loading="isLoadingDetail"
        @close="resetView"
      />

      <!-- Legenda Térmica (Canto Inferior Esquerdo) -->
      <ThermalLegend />

      <!-- Guia Visual de Atalhos (Canto Inferior Direito / Centralizado) -->
      <div v-if="isLoaded && !selectedStorage" class="nav-shortcuts-pill">
        <div class="shortcut-item">
          <span class="mouse-icon">🖱️</span>
          <span><strong>Esq:</strong> Girar</span>
        </div>
        <span class="pill-sep">&bull;</span>
        <div class="shortcut-item">
          <span><strong>Dir:</strong> Mover</span>
        </div>
        <span class="pill-sep">&bull;</span>
        <div class="shortcut-item">
          <span><strong>Scroll:</strong> Zoom</span>
        </div>
        <span class="pill-sep">&bull;</span>
        <div class="shortcut-item">
          <span><strong>2x Clique:</strong> Focar</span>
        </div>
      </div>

      <!-- Tooltip Dinâmico de Sensor ao passar mouse -->
      <SensorTooltip :sensor="hoveredSensor" />

      <!-- Spinner de Carregamento Inicial -->
      <div v-if="!isLoaded" class="loading-overlay">
        <div class="loading-spinner"></div>
        <span>Inicializando Digital Twin 3D...</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.digital-twin-app {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: #0b0c10;
  box-sizing: border-box;
}

.render-canvas {
  width: 100%;
  height: 100%;
  display: block;
  outline: none;
  cursor: grab;
}

.render-canvas:active {
  cursor: grabbing;
}

.hud-overlay {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: hidden;
  box-sizing: border-box;
}

.nav-shortcuts-pill {
  position: absolute;
  bottom: 16px;
  right: 16px;
  max-width: calc(100vw - 260px);
  box-sizing: border-box;
  background: rgba(18, 20, 26, 0.88);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 6px 14px;
  border-radius: 16px;
  font-size: 0.72rem;
  color: #cbd5e1;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.45);
  pointer-events: auto;
  user-select: none;
  display: flex;
  align-items: center;
  gap: 8px;
  animation: fadeIn 0.4s ease;
  z-index: 10;
  white-space: nowrap;
}

.shortcut-item {
  display: flex;
  align-items: center;
  gap: 3px;
}

.mouse-icon {
  font-size: 0.8rem;
}

.pill-sep {
  color: rgba(255, 255, 255, 0.2);
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.loading-overlay {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  background: #0b0c10;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: #94a3b8;
  font-size: 0.9rem;
  z-index: 200;
}

.loading-spinner {
  width: 36px;
  height: 36px;
  border: 3px solid rgba(59, 130, 246, 0.2);
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 768px) {
  .nav-shortcuts-pill {
    display: none;
  }
}
</style>
