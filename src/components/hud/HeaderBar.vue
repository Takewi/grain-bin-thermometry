<script setup lang="ts">
import { computed } from "vue";
import type { SiloSummary } from "@/types/storage";

const props = defineProps<{
	silos: SiloSummary[];
	selectedSilo: SiloSummary | null;
}>();

const emit = defineEmits<{
	(e: "select-silo", id: number): void;
	(e: "reset-view"): void;
}>();

// Métricas agregadas da planta
const totalCapacity = computed(() => props.silos.reduce((sum, s) => sum + s.capacity, 0));

const totalStock = computed(() => props.silos.reduce((sum, s) => sum + s.quantity, 0));

const hotspotCount = computed(() => props.silos.filter((s) => s.tempMax > 34).length);

function onDropdownChange(e: Event) {
	const target = e.target as HTMLSelectElement;
	const val = Number(target.value);
	if (val === 0) {
		emit("reset-view");
	} else {
		emit("select-silo", val);
	}
}
</script>

<template>
	<header class="plant-header">
		<div class="header-left">
			<div class="brand">
				<div class="brand-logo">
					<span class="logo-cube"></span>
				</div>
				<div class="brand-titles">
					<h1 class="app-title">3D</h1>
					<span class="app-subtitle">Termometria & Armazenagem</span>
				</div>
			</div>

			<!-- Seletor Rápido de Silo -->
			<div class="silo-selector-box">
				<select :value="selectedSilo?.id || 0" @change="onDropdownChange" class="silo-select">
					<option :value="0">📍 Visão Geral (Macro)</option>
					<option v-for="s in silos" :key="s.id" :value="s.id">
						{{ s.name }} ({{ s.type === "SILO" ? "Silo" : "Armazém" }})
					</option>
				</select>
			</div>
		</div>

		<!-- KPIs Rápidos da Planta -->
		<div class="header-center">
			<div class="kpi-pill">
				<span class="kpi-label">Estoque Total</span>
				<span class="kpi-val">
					{{ (totalStock / 1000).toFixed(1) }}k / {{ (totalCapacity / 1000).toFixed(1) }}k T
				</span>
			</div>

			<div class="kpi-pill" :class="{ 'has-alert': hotspotCount > 0 }">
				<span class="kpi-label">Alertas Térmicos</span>
				<span class="kpi-val" :class="hotspotCount > 0 ? 'highlight-red' : 'highlight-green'">
					{{ hotspotCount > 0 ? `${hotspotCount} Foco` : "0 Alertas" }}
				</span>
			</div>
		</div>

		<!-- Ação de Voltar / Reset -->
		<div class="header-right">
			<button v-if="selectedSilo" class="btn-reset-view" @click="$emit('reset-view')">
				<span class="btn-icon">⬅</span>
				<span class="btn-text">Visão Geral</span>
			</button>
			<div v-else class="view-indicator">
				<span class="live-dot"></span>
				<span class="indicator-text">Interativo 3D</span>
			</div>
		</div>
	</header>
</template>

<style scoped>
.plant-header {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	max-width: 100vw;
	box-sizing: border-box;
	padding: 10px 16px;
	background: rgba(15, 17, 23, 0.9);
	backdrop-filter: blur(14px);
	-webkit-backdrop-filter: blur(14px);
	border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: 12px;
	color: #ffffff;
	box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
	pointer-events: auto;
	z-index: 30;
	overflow: hidden;
}

.header-left {
	display: flex;
	align-items: center;
	gap: 14px;
	min-width: 0;
	flex-shrink: 1;
}

.brand {
	display: flex;
	align-items: center;
	gap: 8px;
	flex-shrink: 0;
}

.brand-logo {
	width: 28px;
	height: 28px;
	border-radius: 6px;
	background: linear-gradient(135deg, #3b82f6, #06b6d4);
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 0 12px rgba(59, 130, 246, 0.35);
}

.logo-cube {
	width: 12px;
	height: 12px;
	border: 2px solid #ffffff;
	border-radius: 2px;
	transform: rotate(45deg);
}

.brand-titles {
	display: flex;
	flex-direction: column;
}

.app-title {
	font-size: 0.95rem;
	font-weight: 700;
	letter-spacing: -0.01em;
	margin: 0;
	white-space: nowrap;
	background: linear-gradient(90deg, #ffffff, #cbd5e1);
	-webkit-background-clip: text;
	-webkit-text-fill-color: transparent;
}

.app-subtitle {
	font-size: 0.64rem;
	color: #94a3b8;
	white-space: nowrap;
}

.silo-selector-box {
	min-width: 0;
	flex-shrink: 1;
}

.silo-select {
	background: rgba(255, 255, 255, 0.06);
	border: 1px solid rgba(255, 255, 255, 0.14);
	color: #f1f5f9;
	border-radius: 6px;
	padding: 5px 10px;
	font-size: 0.78rem;
	outline: none;
	cursor: pointer;
	max-width: 220px;
	text-overflow: ellipsis;
	overflow: hidden;
	white-space: nowrap;
	transition: all 0.15s;
}

.silo-select:hover {
	background: rgba(255, 255, 255, 0.1);
	border-color: rgba(255, 255, 255, 0.25);
}

.silo-select option {
	background: #1e222d;
	color: #f1f5f9;
}

.header-center {
	display: flex;
	align-items: center;
	gap: 8px;
	flex-shrink: 0;
}

.kpi-pill {
	background: rgba(255, 255, 255, 0.04);
	border: 1px solid rgba(255, 255, 255, 0.08);
	border-radius: 6px;
	padding: 3px 8px;
	display: flex;
	flex-direction: column;
	align-items: center;
}

.kpi-pill.has-alert {
	border-color: rgba(239, 68, 68, 0.4);
	background: rgba(239, 68, 68, 0.08);
}

.kpi-label {
	font-size: 0.58rem;
	text-transform: uppercase;
	color: #94a3b8;
}

.kpi-val {
	font-family: "JetBrains Mono", monospace;
	font-size: 0.75rem;
	font-weight: 600;
	color: #e2e8f0;
	white-space: nowrap;
}

.highlight-green {
	color: #4ade80;
}

.highlight-red {
	color: #f87171;
}

.header-right {
	display: flex;
	align-items: center;
	flex-shrink: 0;
}

.btn-reset-view {
	background: linear-gradient(135deg, #2563eb, #1d4ed8);
	color: #ffffff;
	border: none;
	padding: 5px 12px;
	border-radius: 6px;
	font-size: 0.78rem;
	font-weight: 600;
	cursor: pointer;
	display: flex;
	align-items: center;
	gap: 6px;
	box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35);
	transition: all 0.15s;
	white-space: nowrap;
}

.btn-reset-view:hover {
	background: linear-gradient(135deg, #3b82f6, #2563eb);
	transform: translateY(-1px);
}

.btn-icon {
	font-size: 0.85rem;
}

.view-indicator {
	display: flex;
	align-items: center;
	gap: 6px;
	font-size: 0.72rem;
	color: #94a3b8;
	white-space: nowrap;
}

.live-dot {
	width: 7px;
	height: 7px;
	border-radius: 50%;
	background: #22c55e;
	box-shadow: 0 0 6px #22c55e;
	animation: pulse 2s infinite;
}

@keyframes pulse {
	0%,
	100% {
		opacity: 1;
		transform: scale(1);
	}
	50% {
		opacity: 0.5;
		transform: scale(0.85);
	}
}

/* Responsividade para telas menores e redimensionamento */
@media (max-width: 1024px) {
	.app-subtitle {
		display: none;
	}
	.silo-select {
		max-width: 160px;
	}
}

@media (max-width: 820px) {
	.header-center {
		display: none;
	}
	.indicator-text {
		display: none;
	}
}
</style>
