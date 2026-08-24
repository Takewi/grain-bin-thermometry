<script setup lang="ts">
import { computed } from "vue";
import type { SensorPickedInfo } from "@/types/storage";
import { getSensorVisualInfo } from "@/3d/utils/colorScale";

const props = defineProps<{
	sensor: SensorPickedInfo | null;
}>();

const visualInfo = computed(() => {
	if (!props.sensor) return null;
	return getSensorVisualInfo(props.sensor.temperature, props.sensor.level);
});

const tooltipPosition = computed(() => {
	if (!props.sensor) return { display: "none" };

	// Offset para o tooltip não ficar diretamente embaixo do cursor
	const left = Math.min(window.innerWidth - 240, props.sensor.screenX + 14);
	const top = Math.min(window.innerHeight - 150, props.sensor.screenY + 14);

	return {
		left: `${left}px`,
		top: `${top}px`,
		display: "block",
	};
});
</script>

<template>
	<div v-if="sensor && visualInfo" class="sensor-tooltip" :style="tooltipPosition">
		<div class="tooltip-header">
			<span class="pendulum-tag" v-if="sensor.isCentral">Pêndulo Central</span>
			<span class="pendulum-tag" v-else>
				Pêndulo {{ sensor.pendulumIndex + 1 }} &bull; Anel {{ sensor.ringIndex || 1 }}
			</span>
			<span class="sensor-seq">Sensor #{{ sensor.sensorIndex }}</span>
		</div>

		<div class="tooltip-body">
			<div class="temp-row">
				<span
					class="temp-value"
					:style="{
						color: visualInfo.hex,
						textShadow: `0 0 10px ${visualInfo.hex}44`,
					}"
				>
					{{ visualInfo.isFaulty ? "ERR" : `${sensor.temperature.toFixed(1)}°C` }}
				</span>
				<span
					class="status-badge"
					:class="visualInfo.status"
					:style="{ borderColor: visualInfo.hex, color: visualInfo.hex }"
				>
					{{ visualInfo.statusLabel }}
				</span>
			</div>

			<div class="level-row">
				<span class="level-label">Posição:</span>
				<span class="level-pill" :class="sensor.level === 'in_grain' ? 'in-grain' : 'out-grain'">
					{{ sensor.level === "in_grain" ? "Imerso no Grão" : "Espaço Livre (Ar)" }}
				</span>
			</div>
		</div>
	</div>
</template>

<style scoped>
.sensor-tooltip {
	position: fixed;
	z-index: 100;
	pointer-events: none;
	background: rgba(15, 17, 23, 0.94);
	backdrop-filter: blur(14px);
	-webkit-backdrop-filter: blur(14px);
	border: 1px solid rgba(255, 255, 255, 0.15);
	border-radius: 8px;
	padding: 10px 14px;
	min-width: 200px;
	box-shadow:
		0 12px 36px rgba(0, 0, 0, 0.6),
		0 0 1px rgba(255, 255, 255, 0.2);
	transition: opacity 0.12s ease;
}

.tooltip-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	border-bottom: 1px solid rgba(255, 255, 255, 0.08);
	padding-bottom: 6px;
	margin-bottom: 8px;
	font-size: 0.72rem;
}

.pendulum-tag {
	font-weight: 600;
	color: #38bdf8;
}

.sensor-seq {
	font-family: "JetBrains Mono", monospace;
	color: #94a3b8;
}

.temp-row {
	display: flex;
	align-items: baseline;
	justify-content: space-between;
	gap: 8px;
	margin-bottom: 6px;
}

.temp-value {
	font-family: "JetBrains Mono", monospace;
	font-size: 1.35rem;
	font-weight: 700;
}

.status-badge {
	font-size: 0.68rem;
	font-weight: 500;
	padding: 2px 6px;
	border-radius: 4px;
	border: 1px solid currentColor;
	background: rgba(0, 0, 0, 0.3);
}

.level-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	font-size: 0.72rem;
	color: #94a3b8;
}

.level-pill {
	padding: 1px 6px;
	border-radius: 3px;
	font-size: 0.68rem;
	font-weight: 500;
}

.level-pill.in-grain {
	background: rgba(245, 158, 11, 0.18);
	color: #fbbf24;
	border: 1px solid rgba(245, 158, 11, 0.3);
}

.level-pill.out-grain {
	background: rgba(148, 163, 184, 0.15);
	color: #cbd5e1;
	border: 1px solid rgba(148, 163, 184, 0.25);
}
</style>
