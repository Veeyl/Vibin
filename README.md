# REDLINE / — The Supercar Atlas

An immersive, dark-aesthetic 3D supercar experience built with **Three.js** and **Vite**.

![REDLINE 3D Supercar Experience](public/favicon.svg)

## Features

- **Real-Time 3D Ferrari 458 Italia**: Full PBR materials (clearcoat car paint, metallic rims, transparent glass) with an AgX tone-mapping pipeline and bloom post-processing.
- **Cinematic Camera Choreography**: Camera smoothly dollies and transitions between 6 tailored angles as you scroll through chapters (Ignition, Anatomy, Atelier, Legends, Velocity, Finish).
- **Interactive Atelier (Configurator)**:
  - 7 factory-inspired exterior colors (Rosso Corsa, Giallo Modena, Arancio Borealis, Blu Pozzi, Verde Abetone, Bianco Avus, Nero Daytona).
  - 3 rim finishes (Argento, Grafite, Oro).
  - Clear and Smoked glass tints.
  - Interactive 360° click-and-drag rotation stage.
- **Scroll Speed HUD**: Scrolling accelerates the car in real time; the HUD calculates km/h velocity, simulated gear changes, tachometer RPM bar, and high-speed motion streaks (scrolling up reverses the car).
- **Interactive Preloader**: Revving tachometer dial streaming the 3D model assets into memory.
- **Responsive & Accessible**: Adapts camera FOV and layouts for mobile/tablet, respects `prefers-reduced-motion`.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- npm

### Installation & Development

```bash
# Install dependencies
npm install

# Start local dev server
npm run dev
```

Open your browser at `http://localhost:5173`.

### Production Build

```bash
npm run build
npm run preview
```

## Tech Stack

- **Three.js** (WebGL 3D engine, GLTFLoader, DRACOLoader, EffectComposer)
- **Vite** (Build tooling and dev server)
- **Vanilla CSS** (No framework dependencies, modern CSS variables, fluid clamp typography)
- **Google Fonts** (Unbounded, Archivo, JetBrains Mono)
