# ⚡ Pokémon TCG Battle Arena (Standalone)

Una plataforma web completa e interactiva para jugar al **Pokémon Trading Card Game (TCG)** en tiempo real, desarrollada con **.NET 8** (SignalR, Game Engine) y **Angular 18** (Stand-alone components, Canvas/CSS 3D Holo Cards).

---

## 🚀 Características Principales

- **⚔️ Duelos 1 vs 1 Multijugador en Tiempo Real:** Creación de salas privadas con códigos únicos compartibles para jugar entre dos navegadores o dispositivos.
- **🤖 IA Táctica con Profesores Pokémon:** Oponente inteligente automatizado que evalúa jugadas en 5 fases (jugar básicos a la banca, evolucionar, cartas de entrenador, unir energías y calcular ataques óptimos).
- **🧑‍🏫 12 Profesores Pokémon Aleatorios:** Enfrenta a Oak, Elm, Birch, Rowan, Juniper, Sycamore, Kukui, Magnolia, Sada, Turo, Sonia o Laventon con sus sprites oficiales.
- **🎴 Experiencia Visual PTCGO:**
  - Tablero reglamentario con Puesto Activo, Banca de 5 puestos, Mazo 3D, Pozo de Descarte, Zona de Estadio y 6 Premios.
  - Cartas con inclinación tridimensional reactiva al cursor y efectos de brillo holográfico.
  - Contador de daño flotante, estados alterados y badges de energía interactivos.
  - Modal dinámico de victoria/derrota con transparencia completa sobre el tablero.
- **🛡️ Autenticación Autónoma:** Sistema JWT integrado y ligero, sin dependencias de bases de datos externas pesadas.

---

## 🎮 Cuentas de Prueba Preconfiguradas

La pantalla de bienvenida incluye **botones de acceso rápido de 1 clic** para entrar de inmediato como Jugador 1 o Jugador 2:

| Jugador | Usuario | Contraseña | Entrenador por Defecto |
|---|---|---|---|
| **Jugador 1** | `JugadorPokemon` | `Susanita2014` | Red (Rojo) |
| **Jugador 2** | `JugadorPokemon2` | `Susanita2014` | Blue (Azul) |

*💡 Consejo para probar el multijugador:* Abre una ventana normal como **Jugador 1**, crea una sala privada y copia el código. Luego abre una ventana de incógnito como **Jugador 2**, únete con el código y comienza el combate.

---

## 🛠️ Requisitos Previos

- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- [Node.js](https://nodejs.org/) (versión 18 o 20 LTS)
- NPM (incluido con Node)

---

## 📦 Instrucciones de Ejecución

### 1. Iniciar el Backend (.NET 8)

Abre una terminal en la carpeta `backend`:

```bash
cd backend
dotnet run
```

El backend iniciará en `http://localhost:5082` con SignalR listo en `/api/hubs/pokemon` y `/gameHub`.

### 2. Iniciar el Frontend (Angular 18)

Abre una segunda terminal en la carpeta `frontend`:

```bash
cd frontend
npm install
npm start
```

Navega en tu explorador a: `http://localhost:4200`

---

## 📂 Estructura del Proyecto

```
PokemonTCGLearn/
├── backend/
│   ├── Controllers/          # Endpoints de Autenticación y Cartas
│   ├── Data/                 # cards_fallback.json con base de datos de cartas
│   ├── Game/
│   │   ├── Engine/           # GameEngine, AssistantEngine, EnergyEngine, TrainerEffect
│   │   └── Models/           # GameState, PlayerState, GameView, CardModels
│   ├── Hubs/                 # SignalR GameHub (partidas, emparejamiento, bots)
│   ├── Services/             # AuthService (JWT), CardService, GameStore
│   └── Program.cs
│
└── frontend/
    └── src/
        ├── app/
        │   ├── components/   # Pantalla de Login temática Pokémon
        │   ├── guards/       # AuthGuard para protección de rutas
        │   ├── pages/        # Tablero de juego Pokémon (pokemon-game.component.ts)
        │   └── services/     # Clientes de SignalR y Autenticación
        └── assets/           # Cartas e imágenes de entrenadores
```

---

## 📜 Licencia & Créditos

Este proyecto es para fines educativos y recreativos. Las ilustraciones y nombres de Pokémon son marcas registradas de Nintendo, Game Freak y The Pokémon Company.
