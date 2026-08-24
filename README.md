# 🌾 3D Thermometry & Digital Twin (PoC)

> **Prova de Conceito (PoC) e Teste Prático com Babylon.js** para visualização tridimensional interativa de termometria e volumetria de grãos em silos verticais e armazéns graneleiros.

---

## 🎯 Sobre o Projeto

Este projeto é um **estudo prático e exploratório** desenvolvido para testar a viabilidade técnica, gráfica e de performance da engine **Babylon.js** aplicada ao monitoramento térmico de grãos.

O objetivo principal é validar conceitos de:

- Modelagem paramétrica procedural de estruturas industriais de armazenagem (Silos e Armazéns).
- Posicionamento espacial dinâmico de cabos de termometria (pêndulos) e sensores pontuais.
- Reconstrução topográfica adaptativa da massa de grãos (cones de talude natural e abóbadas longitudinais).
- Geração de **Heatmaps 3D Volumétricos** via **Custom GLSL Raymarching Shaders**.
- Interface HUD responsiva com controles de câmera, tooltips e telemetria.

> [!NOTE]
> **Status Atual:** Esta aplicação é uma **Prova de Conceito (PoC)** construída sobre o formato de dados retornado por uma **API legada de termometria**. No momento, todos os dados estão **mockados** localmente para permitir experimentação rápida de shaders, matemática geométrica e interação 3D sem dependências de infraestrutura externa. Este repositório servirá como base de conhecimento e referência técnica para a futura construção de um software de produção completo e reestruturado.

---

## 🛠️ Stack Tecnológica

| Tecnologia                                                                                        | Finalidade                                                                     |
| :------------------------------------------------------------------------------------------------ | :----------------------------------------------------------------------------- |
| **[Vue.js 3](https://vuejs.org/)**                                                                | Framework reativo SPA utilizando Composition API e `<script setup>`            |
| **[TypeScript](https://www.typescriptlang.org/)**                                                 | Tipagem estática rigorosa para estruturas de dados, geometria e matemática 3D  |
| **[Vite](https://vitejs.dev/)**                                                                   | Bundler e ambiente de desenvolvimento ultrarrápido                             |
| **[Babylon.js 7+](https://www.babylonjs.com/)**                                                   | Motor de renderização 3D WebGL/WebGPU de alta performance                      |
| **[GLSL (OpenGL Shading Language)](https://www.khronos.org/opengl/wiki/OpenGL_Shading_Language)** | Shaders customizados para Raymarching Volumétrico e interpolação IDW em GPU    |
| **CSS3 Moderno / Glassmorphism**                                                                  | Interface HUD flutuante com blur de fundo, layout flexível e design industrial |

---

## ✨ Funcionalidades e Inovações Gráficas

### 1. 🏗️ Modelagem Paramétrica das Estruturas

- **Silos Metálicos Cilíndricos:** Carcaça com textura de corrugação procedural, anéis de reforço externos (_stiffeners_), teto cônico com beiral e escadas verticais.
- **Armazéns Graneleiros:** Estrutura longitudinal com teto em arco parabólico, textura escura diferenciada, vigas de reforço e paredes perimetrais.
- **Transparência Focada:** Ao selecionar uma estrutura, as demais assumem transparência sutil, destacando o alvo sem perder o contexto do parque fabril.

### 2. 🔌 Pêndulos e Sensores 3D

- **Distribuição Geométrica Adaptativa:** Suporta automaticamente silos com apenas pêndulo central, anéis concêntricos (Anel 1 e Anel 2) ou setores transversais de armazéns.
- **Badges Térmicos Billboard:** Plaquetas 3D orientadas automaticamente para a câmera com leitura de temperatura em tempo real e cores dinâmicas.
- **Detecção de Nível de Grãos:** Identifica o primeiro sensor imerso no grão (`in_grain`), colorindo de cinza sensores que se encontram no espaço livre (ar).
- **Z-Index Prioritário (No-Occlusion):** Sensores e cabos utilizam `renderingGroupId` dedicado para permanecerem visíveis e legíveis através da carcaça e da massa.

### 3. 🎨 Modos de Visualização de Grãos

O operador pode alternar instantaneamente entre dois modos visuais na barra de ferramentas:

- **🌾 Modo Nível (Padrão):** Renderiza o relevo topográfico da massa de grãos em cor sólida e 100% homogênea calculada a partir da temperatura média (`tempMed`) da estrutura.
- **🔥 Modo Heatmap (Raymarching Shader):** Executa integração volumétrica de luz na GPU (_Volume Raymarching_), criando um gradiente térmico contínuo com núcleos quentes autoiluminados (_thermal glow_), sem necessidade de divisões poligonais artificiais.

### 4. 🌡️ Escala Térmica Calibrada

- $\le 18^\circ\text{C}$: **Azul** (Frio / Ideal)
- $18^\circ\text{C} - 22^\circ\text{C}$: **Azul $\rightarrow$ Verde** (Normal)
- $22^\circ\text{C} - 26^\circ\text{C}$: **Verde $\rightarrow$ Amarelo** ($26^\circ\text{C}$ Amarelo puro)
- $26^\circ\text{C} - 30^\circ\text{C}$: **Amarelo $\rightarrow$ Laranja** (Atenção)
- $30^\circ\text{C} - 34^\circ\text{C}$: **Laranja $\rightarrow$ Vermelho** (Alerta)
- $\ge 34^\circ\text{C}$: **Vermelho Crítico** (Risco de Aquecimento)

### 5. 🎮 Navegação e Interatividade

- **Navegação Livre:** Orbitar com botão esquerdo, transladar (_pan_) com botão direito e zoom com scroll do mouse.
- **Duplo Clique:** Foca a câmera no silo ou armazém selecionado e abre os detalhes operacionais.
- **Presets de Câmera:** Atalhos rápidos para visualização Isométrica 3D, Planta Zenital (Superior), Frontal e Lateral.
- **Tooltip Dinâmico:** Passar o mouse sobre qualquer sensor 3D abre um card informativo com pêndulo, índice, leitura precisa, status e profundidade na massa.

---

## 📂 Estrutura de Diretórios

```bash
3d-thermometry/
├── src/
│   ├── 3d/
│   │   ├── constants/          # Constantes geométricas, offsets de sensores e cores
│   │   ├── controllers/        # Controlador de câmera orbital e animações
│   │   ├── meshes/             # Geradores de malha (Silos, Armazéns, Pêndulos, Massa)
│   │   ├── scene/              # Configuração do ambiente, luzes, chão e materiais
│   │   ├── shaders/            # ShaderMaterial GLSL de Raymarching Volumétrico
│   │   ├── textures/           # Geradores procedurais de texturas (corrugação, asfalto)
│   │   └── utils/              # Escalas de cor térmicas e layout da planta
│   ├── components/
│   │   └── hud/                # Componentes Vue da interface (Header, Sidebar, Legenda, Tooltip)
│   ├── composables/            # useDigitalTwin.ts (gerenciamento do ciclo de vida 3D)
│   ├── services/               # Mock data provider baseado na API legada
│   ├── types/                  # Definições TypeScript dos modelos de dados
│   ├── App.vue                 # View principal integrando 3D Canvas e HUD
│   └── main.ts                 # Bootstrap da aplicação
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## 🚀 Como Executar Localmente

### Pré-requisitos

- **Node.js** 18.0.0 ou superior
- **npm** ou **pnpm** / **yarn**

### Instalação e Execução

1. **Clone o repositório:**

   ```bash
   git clone <URL_DO_REPOSITORIO>
   cd 3d-thermometry
   ```

2. **Instale as dependências:**

   ```bash
   npm install
   ```

3. **Inicie o servidor de desenvolvimento:**

   ```bash
   npm run dev
   ```

4. **Acesse no navegador:**
   Abra `http://localhost:5173`

5. **Gere a build de produção:**
   ```bash
   npm run build
   ```
