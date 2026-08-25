<script setup lang="ts">
import { ref, computed } from "vue";
import type { SiloSummary, StorageDetail } from "@/types/storage";
import { getSensorVisualInfo } from "@/3d/utils/colorScale";
import { ChevronDown, ChevronUp, X } from "lucide-vue-next";

const props = defineProps<{
	summary: SiloSummary;
	detail: StorageDetail | null;
	isLoading: boolean;
}>();

defineEmits<{
	(e: "close"): void;
}>();

const isMinimized = ref(false);

function toggleMinimize() {
	isMinimized.value = !isMinimized.value;
}

const maxTempVisual = computed(() => getSensorVisualInfo(props.summary.tempMax));
const medTempVisual = computed(() => getSensorVisualInfo(props.summary.tempMed));
const minTempVisual = computed(() => getSensorVisualInfo(props.summary.tempMin));

const fillPercentage = computed(() => {
	if (props.detail?.levelMaps[0]?.porcentagem !== undefined) {
		return props.detail.levelMaps[0].porcentagem;
	}
	return Math.round((props.summary.quantity / props.summary.capacity) * 100);
});
</script>

<template>
	<aside class="silo-sidebar" :class="{ 'is-minimized': isMinimized }">
		<!-- Alça visual para mobile (toque para expandir/minimizar) -->
		<div class="mobile-handle-bar" @click="toggleMinimize">
			<div class="handle-pill"></div>
		</div>

		<!-- Cabeçalho do Silo -->
		<div class="sidebar-header" :class="{ clickable: isMinimized }" @click="isMinimized ? toggleMinimize() : null">
			<div class="title-group">
				<div class="title-top-row">
					<span class="type-tag" :class="summary.type.toLowerCase()">
						{{ summary.type === "SILO" ? "Silo Metálico" : "Armazém Graneleiro" }}
					</span>
					<span class="product-badge">{{ summary.product }}</span>
				</div>

				<div class="title-main-row">
					<h2 class="silo-name">{{ summary.name }}</h2>

					<!-- Indicadores Rápidos quando Minimizado -->
					<div v-if="isMinimized" class="minimized-quick-stats">
						<span class="quick-kpi" :style="{ color: maxTempVisual.hex }">
							{{ summary.tempMax.toFixed(1) }}°C
						</span>
						<span class="quick-sep">&bull;</span>
						<span class="quick-kpi fill-kpi">
							{{ fillPercentage }}%
						</span>
					</div>
				</div>
			</div>

			<div class="header-actions">
				<button
					class="btn-action btn-minimize"
					@click.stop="toggleMinimize"
					:title="isMinimized ? 'Expandir painel de informações' : 'Minimizar painel'"
				>
					<ChevronUp v-if="isMinimized" class="action-icon" :size="16" />
					<ChevronDown v-else class="action-icon" :size="16" />
				</button>
				<button
					class="btn-action btn-close"
					@click.stop="$emit('close')"
					title="Fechar e voltar à visão geral"
				>
					<X class="action-icon" :size="16" />
				</button>
			</div>
		</div>

		<div v-show="!isMinimized" class="sidebar-scroll-content">
			<!-- Cards de Temperatura -->
			<section class="section-card">
				<h3 class="section-title">Termometria Geral</h3>
				<div class="temp-grid">
					<div class="temp-card">
						<span class="temp-label">Mínima</span>
						<span class="temp-val" :style="{ color: minTempVisual.hex }">
							{{ summary.tempMin.toFixed(1) }}°C
						</span>
					</div>

					<div class="temp-card">
						<span class="temp-label">Média</span>
						<span class="temp-val" :style="{ color: medTempVisual.hex }">
							{{ summary.tempMed.toFixed(1) }}°C
						</span>
					</div>

					<div class="temp-card" :class="{ alert: summary.tempMax > 34 }">
						<span class="temp-label">Máxima</span>
						<span class="temp-val" :style="{ color: maxTempVisual.hex }">
							{{ summary.tempMax.toFixed(1) }}°C
						</span>
					</div>
				</div>
			</section>

			<!-- Ocupação & Capacidade -->
			<section class="section-card">
				<div class="flex-between">
					<h3 class="section-title">Ocupação da Massa</h3>
					<span class="fill-percent">{{ fillPercentage }}%</span>
				</div>

				<div class="progress-bar-bg">
					<div class="progress-bar-fill" :style="{ width: `${fillPercentage}%` }"></div>
				</div>

				<div class="capacity-details">
					<div>
						<span class="meta-label">Estoque Atual</span>
						<span class="meta-val">{{ summary.quantity.toLocaleString("pt-BR") }} T</span>
					</div>
					<div>
						<span class="meta-label">Capacidade</span>
						<span class="meta-val">{{ summary.capacity.toLocaleString("pt-BR") }} T</span>
					</div>
					<div>
						<span class="meta-label">Volume</span>
						<span class="meta-val">{{ summary.volume.toLocaleString("pt-BR") }} m³</span>
					</div>
				</div>
			</section>

			<!-- Detalhes do Produto / Termometria (quando carregado) -->
			<section class="section-card" v-if="detail">
				<h3 class="section-title">Qualidade do Grão</h3>
				<div class="meta-grid">
					<div class="meta-item">
						<span class="meta-label">Umidade</span>
						<span class="meta-val highlight">{{ detail.produto.umidade }}%</span>
					</div>
					<div class="meta-item">
						<span class="meta-label">Densidade</span>
						<span class="meta-val">{{ detail.produto.densidade }} kg/L</span>
					</div>
					<div class="meta-item" v-if="detail.produto.variedade">
						<span class="meta-label">Variedade</span>
						<span class="meta-val">{{ detail.produto.variedade }}</span>
					</div>
					<div class="meta-item" v-if="detail.produto.safra">
						<span class="meta-label">Safra</span>
						<span class="meta-val">{{ detail.produto.safra }}</span>
					</div>
				</div>
				<div class="reading-time">
					<span>Última Leitura: {{ detail.data_leitura }}</span>
				</div>
			</section>
		</div>
	</aside>
</template>

<style scoped>
.silo-sidebar {
	position: absolute;
	top: 64px;
	right: 16px;
	width: min(350px, calc(100vw - 32px));
	max-height: calc(100vh - 80px);
	box-sizing: border-box;
	background: rgba(18, 20, 26, 0.92);
	backdrop-filter: blur(16px);
	-webkit-backdrop-filter: blur(16px);
	border: 1px solid rgba(255, 255, 255, 0.12);
	border-radius: 12px;
	display: flex;
	flex-direction: column;
	color: #f1f5f9;
	box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6);
	pointer-events: auto;
	z-index: 30;
	overflow: hidden;
	transition: max-height 0.28s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease, transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
	animation: slideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.silo-sidebar.is-minimized {
	max-height: 64px;
	box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
}

@keyframes slideIn {
	from {
		opacity: 0;
		transform: translateY(-8px) scale(0.98);
	}
	to {
		opacity: 1;
		transform: translateY(0) scale(1);
	}
}

.mobile-handle-bar {
	display: none;
	width: 100%;
	height: 12px;
	align-items: center;
	justify-content: center;
	cursor: pointer;
	padding-top: 4px;
}

.handle-pill {
	width: 36px;
	height: 4px;
	background: rgba(255, 255, 255, 0.25);
	border-radius: 2px;
	transition: background 0.15s;
}

.mobile-handle-bar:hover .handle-pill {
	background: rgba(255, 255, 255, 0.45);
}

.sidebar-header {
	padding: 12px 14px;
	border-bottom: 1px solid rgba(255, 255, 255, 0.08);
	display: flex;
	justify-content: space-between;
	align-items: center;
	background: rgba(255, 255, 255, 0.02);
	user-select: none;
	transition: background 0.15s ease;
}

.sidebar-header.clickable {
	cursor: pointer;
}

.sidebar-header.clickable:hover {
	background: rgba(255, 255, 255, 0.05);
}

.silo-sidebar.is-minimized .sidebar-header {
	border-bottom: none;
}

.title-group {
	display: flex;
	flex-direction: column;
	gap: 3px;
	min-width: 0;
	flex: 1;
}

.title-top-row {
	display: flex;
	align-items: center;
	gap: 6px;
}

.type-tag {
	font-size: 0.65rem;
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.05em;
	padding: 2px 6px;
	border-radius: 4px;
	width: fit-content;
}

.type-tag.silo {
	background: rgba(56, 189, 248, 0.15);
	color: #38bdf8;
	border: 1px solid rgba(56, 189, 248, 0.3);
}

.type-tag.warehouse {
	background: rgba(168, 85, 247, 0.15);
	color: #c084fc;
	border: 1px solid rgba(168, 85, 247, 0.3);
}

.product-badge {
	font-size: 0.72rem;
	color: #94a3b8;
}

.title-main-row {
	display: flex;
	align-items: center;
	gap: 10px;
	flex-wrap: wrap;
}

.silo-name {
	font-size: 1.05rem;
	font-weight: 700;
	margin: 0;
	color: #ffffff;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.minimized-quick-stats {
	display: flex;
	align-items: center;
	gap: 6px;
	font-size: 0.8rem;
	font-weight: 600;
	background: rgba(0, 0, 0, 0.35);
	padding: 2px 8px;
	border-radius: 12px;
	border: 1px solid rgba(255, 255, 255, 0.08);
}

.quick-kpi {
	font-family: "JetBrains Mono", monospace;
}

.quick-kpi.fill-kpi {
	color: #f59e0b;
}

.quick-sep {
	color: rgba(255, 255, 255, 0.2);
}

.header-actions {
	display: flex;
	align-items: center;
	gap: 6px;
	margin-left: 8px;
}

.btn-action {
	background: rgba(255, 255, 255, 0.08);
	border: 1px solid rgba(255, 255, 255, 0.12);
	color: #cbd5e1;
	width: 28px;
	height: 28px;
	border-radius: 6px;
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;
	transition: all 0.15s ease;
	padding: 0;
}

.btn-action:hover {
	background: rgba(255, 255, 255, 0.2);
	color: #ffffff;
	border-color: rgba(255, 255, 255, 0.25);
}

.action-icon {
	display: block;
}

.sidebar-scroll-content {
	padding: 14px;
	overflow-y: auto;
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.section-card {
	background: rgba(255, 255, 255, 0.03);
	border: 1px solid rgba(255, 255, 255, 0.06);
	border-radius: 8px;
	padding: 12px;
}

.section-title {
	font-size: 0.72rem;
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.06em;
	color: #94a3b8;
	margin: 0 0 10px 0;
}

.flex-between {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 6px;
}

.fill-percent {
	font-family: "JetBrains Mono", monospace;
	font-size: 0.9rem;
	font-weight: 700;
	color: #f59e0b;
}

.progress-bar-bg {
	width: 100%;
	height: 6px;
	background: rgba(255, 255, 255, 0.1);
	border-radius: 3px;
	overflow: hidden;
	margin-bottom: 10px;
}

.progress-bar-fill {
	height: 100%;
	background: linear-gradient(90deg, #f59e0b, #eab308);
	border-radius: 3px;
	transition: width 0.4s ease;
}

.capacity-details {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: 8px;
	text-align: center;
	background: rgba(0, 0, 0, 0.2);
	padding: 8px;
	border-radius: 6px;
}

.meta-label {
	display: block;
	font-size: 0.65rem;
	color: #94a3b8;
}

.meta-val {
	font-family: "JetBrains Mono", monospace;
	font-size: 0.85rem;
	font-weight: 600;
	color: #e2e8f0;
}

.meta-val.highlight {
	color: #38bdf8;
}

.temp-grid {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: 8px;
}

.temp-card {
	background: rgba(0, 0, 0, 0.25);
	border: 1px solid rgba(255, 255, 255, 0.05);
	border-radius: 6px;
	padding: 8px;
	text-align: center;
}

.temp-card.alert {
	border-color: rgba(248, 59, 59, 0.4);
	background: rgba(248, 59, 59, 0.1);
}

.temp-label {
	display: block;
	font-size: 0.65rem;
	color: #94a3b8;
	margin-bottom: 2px;
}

.temp-val {
	font-family: "JetBrains Mono", monospace;
	font-size: 1.05rem;
	font-weight: 700;
}

.meta-grid {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 8px;
	margin-bottom: 8px;
}

.meta-item {
	background: rgba(0, 0, 0, 0.2);
	padding: 6px 8px;
	border-radius: 6px;
}

.reading-time {
	font-size: 0.68rem;
	color: #64748b;
	text-align: right;
	border-top: 1px solid rgba(255, 255, 255, 0.04);
	padding-top: 6px;
}

/* ==========================================
   Comportamento Responsivo para Mobile
   ========================================== */
@media (max-width: 768px) {
	.silo-sidebar {
		top: auto;
		bottom: 16px;
		left: 16px;
		right: 16px;
		width: auto;
		max-width: calc(100vw - 32px);
		margin: 0 auto;
		max-height: min(52vh, 380px);
		border-radius: 14px;
		box-shadow: 0 12px 36px rgba(0, 0, 0, 0.7);
	}

	.silo-sidebar.is-minimized {
		max-height: 56px;
	}

	.mobile-handle-bar {
		display: flex;
	}

	.sidebar-header {
		padding: 6px 12px 10px 12px;
	}

	.silo-sidebar.is-minimized .sidebar-header {
		padding: 4px 12px 8px 12px;
	}

	.btn-action {
		width: 32px;
		height: 32px;
	}
}
</style>
