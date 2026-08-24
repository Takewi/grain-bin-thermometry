<script setup lang="ts">
import type { CameraPresetType } from "@/composables/useDigitalTwin";
import type { GrainVisualMode } from "@/3d/meshes/grainVolume";

defineProps<{
	activePreset: CameraPresetType;
	isAutoRotating: boolean;
	visualMode?: GrainVisualMode;
}>();

defineEmits<{
	(e: "set-preset", preset: CameraPresetType): void;
	(e: "set-visual-mode", mode: GrainVisualMode): void;
	(e: "zoom-in"): void;
	(e: "zoom-out"): void;
	(e: "toggle-auto-rotate"): void;
	(e: "reset-view"): void;
}>();
</script>

<template>
	<div class="nav-toolbar-container">
		<div class="nav-toolbar">
			<!-- Presets de Câmera -->
			<div class="nav-group">
				<button
					class="nav-btn"
					:class="{ active: activePreset === 'iso' }"
					@click="$emit('set-preset', 'iso')"
					title="Vista Isométrica 3D"
				>
					<span class="btn-icon">🧊</span>
					<span class="btn-label">3D</span>
				</button>

				<button
					class="nav-btn"
					:class="{ active: activePreset === 'top' }"
					@click="$emit('set-preset', 'top')"
					title="Planta Superior (Vista Zenital)"
				>
					<span class="btn-icon">📐</span>
					<span class="btn-label">Planta</span>
				</button>

				<button
					class="nav-btn"
					:class="{ active: activePreset === 'front' }"
					@click="$emit('set-preset', 'front')"
					title="Vista Frontal"
				>
					<span class="btn-icon">🏛️</span>
					<span class="btn-label">Frontal</span>
				</button>

				<button
					class="nav-btn"
					:class="{ active: activePreset === 'side' }"
					@click="$emit('set-preset', 'side')"
					title="Vista Lateral"
				>
					<span class="btn-icon">🏢</span>
					<span class="btn-label">Lateral</span>
				</button>
			</div>

			<div class="nav-divider"></div>

			<!-- Alternador de Visualização: Nível vs Heatmap Leve vs Volumétrico -->
			<div class="nav-group mode-toggle-group">
				<button
					class="nav-btn"
					:class="{ active: (visualMode || 'level') === 'level' }"
					@click="$emit('set-visual-mode', 'level')"
					title="Modo Nível: Exibe a massa de grãos com relevo na cor da temperatura média"
				>
					<span class="btn-icon">🌾</span>
					<span class="btn-label">Nível</span>
				</button>

				<button
					class="nav-btn"
					:class="{ active: visualMode === 'heatmap_fast' }"
					@click="$emit('set-visual-mode', 'heatmap_fast')"
					title="Heatmap Leve: Mapa de calor por vértices ultrarrápido (Zero custo GPU, 60 FPS garantido)"
				>
					<span class="btn-icon">⚡</span>
					<span class="btn-label">Heatmap Leve</span>
				</button>

				<button
					class="nav-btn"
					:class="{ active: visualMode === 'heatmap_volumetric' }"
					@click="$emit('set-visual-mode', 'heatmap_volumetric')"
					title="Heatmap Volumétrico: Raymarching 3D contínuo via Shader de alta fidelidade"
				>
					<span class="btn-icon">🔥</span>
					<span class="btn-label">Volumétrico</span>
				</button>
			</div>

			<div class="nav-divider"></div>

			<!-- Controles de Zoom Livre -->
			<div class="nav-group">
				<button class="nav-btn icon-only" @click="$emit('zoom-in')" title="Aproximar Zoom (+)">
					<span class="btn-symbol">&plus;</span>
				</button>

				<button class="nav-btn icon-only" @click="$emit('zoom-out')" title="Afastar Zoom Livre (-)">
					<span class="btn-symbol">&minus;</span>
				</button>
			</div>

			<div class="nav-divider"></div>

			<!-- Auto Rotação & Reset -->
			<div class="nav-group">
				<button
					class="nav-btn icon-only"
					:class="{ active: isAutoRotating }"
					@click="$emit('toggle-auto-rotate')"
					title="Auto-Rotação da Câmera (Turntable)"
				>
					<span class="btn-icon">🔄</span>
				</button>

				<button
					class="nav-btn icon-only"
					@click="$emit('reset-view')"
					title="Centralizar Visão Geral da Planta"
				>
					<span class="btn-icon">🏠</span>
				</button>
			</div>
		</div>
	</div>
</template>

<style scoped>
.nav-toolbar-container {
	position: absolute;
	top: 58px;
	left: 16px;
	pointer-events: auto;
	z-index: 20;
	max-width: calc(100vw - 32px);
	box-sizing: border-box;
}

.nav-toolbar {
	background: rgba(18, 20, 26, 0.88);
	backdrop-filter: blur(14px);
	-webkit-backdrop-filter: blur(14px);
	border: 1px solid rgba(255, 255, 255, 0.12);
	border-radius: 8px;
	padding: 4px 6px;
	display: flex;
	align-items: center;
	gap: 3px;
	box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
}

.nav-group {
	display: flex;
	align-items: center;
	gap: 2px;
}

.nav-divider {
	width: 1px;
	height: 18px;
	background: rgba(255, 255, 255, 0.1);
	margin: 0 3px;
}

.nav-btn {
	background: transparent;
	border: 1px solid transparent;
	color: #cbd5e1;
	padding: 4px 8px;
	border-radius: 5px;
	cursor: pointer;
	display: flex;
	align-items: center;
	gap: 4px;
	font-size: 0.72rem;
	font-weight: 500;
	transition: all 0.15s ease;
	user-select: none;
}

.nav-btn.icon-only {
	padding: 4px 7px;
}

.nav-btn:hover {
	background: rgba(255, 255, 255, 0.08);
	color: #ffffff;
}

.nav-btn.active {
	background: rgba(59, 130, 246, 0.22);
	border-color: rgba(59, 130, 246, 0.5);
	color: #60a5fa;
	box-shadow: 0 0 8px rgba(59, 130, 246, 0.25);
}

.btn-icon {
	font-size: 0.8rem;
}

.btn-symbol {
	font-size: 0.95rem;
	font-weight: 700;
	line-height: 1;
}

.btn-label {
	font-family: "Inter", sans-serif;
}

@media (max-width: 640px) {
	.btn-label {
		display: none;
	}
}
</style>
