# ⚡ Pokémon TCG Battle Arena (Standalone)

Una plataforma web interactiva y moderna para jugar al **Pokémon Trading Card Game (TCG)** en tiempo real, desarrollada con **.NET 8** (SignalR, Game Engine) y **Angular 18** (Componentes Standalone, Canvas y CSS 3D Tilt Cards).

---

## ⚖️ Aviso Legal, Derechos de Autor y Términos de Uso

> [!IMPORTANT]
> ### 🛑 DECLARACIÓN DE DERECHOS Y USO NO COMERCIAL
> 
> 1. **Todos los derechos reservados:** Todos los nombres, personajes, marcas comerciales, logotipos, diseños de cartas, mecánicas de juego, tipos de energía, efectos de sonido e ilustraciones relacionadas con **Pokémon** son propiedad intelectual y derechos de autor exclusivos de **Nintendo Co., Ltd.**, **Game Freak Inc.**, **Creatures Inc.** y **The Pokémon Company / The Pokémon Company International**.
> 
> 2. **Finalidad Estrictamente Educativa y Demostrativa:** Este repositorio ha sido creado **únicamente con fines educativos, de investigación y demostración técnica** de desarrollo fullstack (arquitectura orientada a eventos con SignalR, renderizado CSS 3D en Angular y lógica determinista de IA).
> 
> 3. **Prohibido el Uso Comercial:** Este software es **100% gratuito y sin fines de lucro**. Queda **terminantemente prohibido** su uso, venta, redistribución o despliegue con fines comerciales, de monetización, publicidad o lucro de cualquier índole.
> 
> 4. **Descargo de Responsabilidad ("AS IS"):** Este proyecto se distribuye bajo la premisa de software libre y experimental **"TAL CUAL" ("AS IS")**, sin garantías de ningún tipo, expresas o implícitas. Los autores y contribuidores no asumen ninguna responsabilidad derivada del uso o mal uso de este código.
> 
> 5. **Sin Afiliación:** Este proyecto es una creación independiente de la comunidad y **NO** está afiliado, patrocinado, respaldado ni aprobado de ninguna manera por Nintendo, The Pokémon Company o Game Freak.

---

## 🚀 Características del Proyecto

- **⚔️ Duelos 1 vs 1 Multijugador en Tiempo Real:** Genera un código de sala y compártelo para combatir contra otro jugador en vivo.
- **🤖 IA Táctica con Profesores Pokémon:** Oponente inteligente automatizado que evalúa jugadas en 5 fases (banca, evolución, entrenadores, energías y cálculo de ataque óptimo).
- **🧑‍🏫 12 Profesores Pokémon Aleatorios:** Combate contra Oak, Elm, Birch, Rowan, Juniper, Sycamore, Kukui, Magnolia, Sada, Turo, Sonia o Laventon con sus sprites oficiales.
- **🎴 Tablero Reglamentario PTCGO:**
  - Puesto Activo, Banca de 5 puestos, Mazo 3D interactivo, Pozo de Descarte y 6 Premios.
  - Cartas con inclinación tridimensional reactiva al movimiento del cursor (`tilt`) y capas holográficas.
  - Contador de daño dinámico flotante, estados alterados y badges de energía.
  - Modal de victoria/derrota con transparencia completa sobre el tablero.
- **🛡️ Autenticación Autónoma:** Servicio JWT ligero en memoria, sin necesidad de instalar bases de datos externas (SQL Server ni PostgreSQL).

---

## 🎮 Cuentas de Prueba Preconfiguradas

La pantalla de bienvenida incluye **botones de acceso rápido de 1 clic** para entrar de inmediato como Jugador 1 o Jugador 2:

| Jugador | Usuario | Contraseña Autogenerada | Entrenador por Defecto |
|---|---|---|---|
| **Jugador 1** | `JugadorPokemon` | `Pk!Arena#2026$Demo` | Red (Rojo) |
| **Jugador 2** | `JugadorPokemon2` | `Pk!Arena#2026$Demo` | Blue (Azul) |

*💡 Consejo para probar el multijugador en un solo equipo:*
1. Abre una ventana normal en tu navegador e ingresa como **Jugador 1**. Crea una sala y copia el código de sala.
2. Abre una ventana de **incógnito** (o un segundo navegador), ingresa como **Jugador 2** y usa la opción *"Unirse a Sala"* pegando el código.

---

## 🛠️ Requisitos Previos

- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- [Node.js](https://nodejs.org/) (versión 18 o 20 LTS recomendada)
- NPM (incluido con Node)

---

## 📦 Instrucciones de Instalación y Ejecución

### Paso 1: Clonar el repositorio

```bash
git clone https://github.com/TU_USUARIO/PokemonTCGLearn.git
cd PokemonTCGLearn
```

### Paso 2: Iniciar el Backend (.NET 8)

Abre una terminal y dirígete a la carpeta `backend`:

```bash
cd backend
dotnet run
```

El servidor iniciará en: `http://localhost:5082`  
Endpoints disponibles:
- `http://localhost:5082/` (Estado del servidor)
- `http://localhost:5082/api/auth/login` (Autenticación JWT)
- `http://localhost:5082/api/cards/starter` (Mazo inicial reglamentario)
- `http://localhost:5082/api/hubs/pokemon` (SignalR WebSocket Hub)

### Paso 3: Iniciar el Frontend (Angular 18)

Abre una segunda terminal y dirígete a la carpeta `frontend`:

```bash
cd frontend
npm install
npm start
```

Abre tu navegador en: **`http://localhost:4200`**

---

## 📂 Estructura del Código

```
PokemonTCGLearn/
├── PokemonTCGLearn.slnx       # Solución .NET (Visual Studio / VS Code / Rider)
├── README.md                  # Documentación y términos legales
├── .gitignore                 # Exclusión de binarios y dependencias
│
├── backend/                   # Proyecto .NET 8 (PokemonTCGLearn.API)
│   ├── Controllers/          # AuthController y CardsController
│   ├── Data/                 # cards_fallback.json con la base de datos de cartas
│   ├── Game/
│   │   ├── Engine/           # GameEngine (5 fases), AssistantEngine, EnergyEngine
│   │   └── Models/           # GameState, GameView, CardModels, Actions
│   ├── Hubs/                 # SignalR GameHub (multijugador y bots IA)
│   ├── Services/             # AuthService (JWT), CardService, GameStore
│   └── Program.cs            # Configuración limpia de ASP.NET Core
│
└── frontend/                  # Proyecto Angular 18 Standalone
    ├── src/
    │   ├── app/
    │   │   ├── components/   # Pantalla de Login temática Pokémon
    │   │   ├── guards/       # AuthGuard para control de acceso
    │   │   ├── pages/        # Tablero de juego interactivo (pokemon-game.component.ts)
    │   │   └── services/     # Clientes de SignalR y Autenticación
    │   └── assets/           # Cartas en alta resolución y sprites de entrenadores
    ├── angular.json
    └── package.json
```
