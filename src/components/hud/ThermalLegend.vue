<template>
  <div class="thermal-legend-card">
    <div class="legend-header">
      <span class="legend-title">Escala Térmica (°C)</span>
    </div>

    <!-- Barra de Gradiente Contínuo -->
    <div class="gradient-bar"></div>

    <!-- Marcadores de Faixas Térmicas -->
    <div class="legend-scale-labels">
      <span>&le; 18°</span>
      <span>22°</span>
      <span>26°</span>
      <span>30°</span>
      <span>&ge; 34°</span>
    </div>

    <!-- Indicadores de Status -->
    <div class="status-legend-group">
      <div class="legend-status-item">
        <span class="out-grain-dot"></span>
        <span class="status-text">Fora do Grão (Ar)</span>
      </div>
      <div class="legend-status-item">
        <span class="faulty-dot"></span>
        <span class="status-text">Defeito (&gt; 125°C)</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.thermal-legend-card {
  position: absolute;
  bottom: 16px;
  left: 16px;
  max-width: calc(100vw - 32px);
  box-sizing: border-box;
  background: rgba(18, 20, 26, 0.90);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 10px 14px;
  color: #f1f5f9;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.4);
  pointer-events: auto;
  min-width: 200px;
  z-index: 20;
}

.legend-header {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #94a3b8;
  margin-bottom: 8px;
}

.gradient-bar {
  height: 8px;
  border-radius: 4px;
  background: linear-gradient(
    to right,
    #1e70f5 0%,
    #26d07c 35%,
    #f2bd1d 70%,
    #f83b3b 100%
  );
  margin-bottom: 4px;
  box-shadow: 0 0 10px rgba(38, 208, 124, 0.2);
}

.legend-scale-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.7rem;
  font-family: "JetBrains Mono", monospace;
  color: #cbd5e1;
  margin-bottom: 8px;
}

.status-legend-group {
  display: flex;
  align-items: center;
  gap: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  padding-top: 6px;
  font-size: 0.7rem;
  color: #94a3b8;
}

.legend-status-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.out-grain-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #6b7280;
  border: 1px solid #9ca3af;
  display: inline-block;
}

.faulty-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #717c91;
  border: 1px solid #ef4444;
  display: inline-block;
}

.status-text {
  font-family: "Inter", sans-serif;
}
</style>
