import { Component, OnDestroy, OnInit, AfterViewChecked, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { GameService } from './services/game.service';
import { CardService } from './services/card.service';
import { AuthService } from '../../services/auth.service';
import { GameView, LegalMove, CardView, GameCard } from './models/game';
import { CardComponent } from './card/card.component';
import { energyInfo } from './energy.util';
import { PTCGO_ASSETS } from './ptcgo-assets';
import { TrainerProfile, POKEMON_TRAINERS, POKEMON_PROFESSORS, getRandomTrainer, getRandomProfessor, getTrainerForUser, findTrainerByName, findProfessorByNameOrId } from './trainers.data';

export interface StreamChatMessage {
  id: string;
  sender: 'player' | 'opp' | 'stream' | 'prize' | 'rotom';
  senderName: string;
  avatar: string;
  text: string;
  badgeClass: string;
}

@Component({
  selector: 'app-pokemon-game',
  standalone: true,
  imports: [CommonModule, FormsModule, CardComponent],
  template: `
    <div class="ptcgo-viewport" *ngIf="view">
      <!-- TOP HUD / HEADER BAR -->
      <header class="ptcgo-top-hud">
        <!-- Opponent Profile Pill (Top-Left) -->
        <div class="profile-pill opponent-pill" *ngIf="view.phase !== 'WaitingForOpponent'">
          <div class="avatar-box">
            <img [src]="opponentAvatarUrl" class="avatar-svg trainer-avatar-board" [alt]="view.opponent?.name || 'Rival'" />
          </div>
          <div class="profile-meta">
            <div class="meta-counters">
              <span class="counter-badge deck-badge" title="Mazo rival">
                <span class="badge-icon">🎴</span> {{ view.opponent?.deckCount ?? 0 }}
              </span>
              <span class="counter-badge hand-badge" title="Mano rival">
                <span class="badge-icon">✋</span> {{ view.opponent?.handCount ?? 0 }}
              </span>
            </div>
            <span class="player-name-tag">{{ view.opponent?.name || 'Rival' }}</span>
          </div>
        </div>

        <!-- Opponent Waiting Placeholder when in WaitingForOpponent -->
        <div class="profile-pill opponent-pill waiting-pill" *ngIf="view.phase === 'WaitingForOpponent'">
          <div class="avatar-box waiting-avatar">⏳</div>
          <div class="profile-meta">
            <span class="player-name-tag text-amber">Esperando Jugador 2...</span>
            <span class="waiting-subtext">Sala Abierta</span>
          </div>
        </div>

        <!-- Center Turn Announcer & Room Code -->
        <div class="hud-center-zone">
          <div class="turn-indicator-pill" [class.my-turn]="isMyTurn()" *ngIf="view.phase === 'ActiveTurn'">
            <span class="turn-round-tag">Ronda {{ view.turnNumber }}</span>
            <span class="turn-text my-turn-text" *ngIf="isMyTurn()">¡ES TU TURNO!</span>
            <span class="turn-text opp-turn-text" *ngIf="!isMyTurn()">Turno de {{ currentPlayerName() }}</span>
          </div>

          <div class="turn-indicator-pill waiting-turn-pill" *ngIf="view.phase === 'WaitingForOpponent'">
            <span class="turn-round-tag bg-amber">SALA PRIVADA</span>
            <span class="turn-text">Esperando al Rival...</span>
          </div>

          <div class="room-code-pill" (click)="copyGameId()" title="Clic para copiar código de sala">
            <span class="room-label">SALA</span>
            <span class="room-val">{{ view.id }}</span>
            <span class="room-icon">{{ copiedId ? '¡Copiado!' : '📋' }}</span>
          </div>
        </div>

        <!-- Top-Right System Controls -->
        <div class="hud-right-zone">
          <button
            class="ptcgo-icon-btn btn-rules-toggle"
            (click)="toggleRulesModal()"
            title="📖 Reglas Oficiales y Cómo Ganar"
          >
            📖
          </button>
          <button
            class="ptcgo-icon-btn btn-assistant-toggle"
            [class.active]="rotomOpen"
            (click)="toggleRotom()"
            title="Rotom-Dex Asistente de Batalla"
          >
            🤖
            <span class="btn-badge" *ngIf="isMyTurn() && view.legalMoves?.length">{{ view.legalMoves.length }}</span>
          </button>
          <button class="ptcgo-icon-btn" (click)="leave()" title="Salir al Vestíbulo">
            ⏏️
          </button>
        </div>
      </header>

      <!-- WAITING SCREEN MODAL -->
      <section class="screen-waiting glass-panel" *ngIf="view.phase === 'WaitingForOpponent'">
        <div class="waiting-card">
          <div class="spinning-pokeball">
            <div class="pb-top"></div>
            <div class="pb-band"></div>
            <div class="pb-center"></div>
            <div class="pb-bottom"></div>
          </div>
          <h2>Sala Creada • Esperando al Rival</h2>
          <p class="waiting-creator-tag">
            <img [src]="playerAvatarUrl" class="mini-trainer-avatar" alt="" />
            Tú estás en la sala como: <b>{{ view.me?.name || currentTrainer.name }}</b>
          </p>
          <p class="waiting-desc">
            Comparte este código de sala con tu oponente para que ingrese desde <b>"Unirse a Sala"</b> (ej. con el usuario <b>JugadorPokemon2</b>):
          </p>
          
          <div class="room-code-box" (click)="copyGameId()" title="Haz clic para copiar el código">
            <span class="code-label">CÓDIGO DE SALA</span>
            <span class="code-text">{{ view.id }}</span>
            <button class="btn-copy">{{ copiedId ? '✓ ¡Código Copiado!' : '📋 Copiar Código' }}</button>
          </div>

          <div class="waiting-actions">
            <button class="btn-cancel-waiting" (click)="leave()">
              ✖ Cancelar Sala y Volver al Vestíbulo
            </button>
          </div>

          <p class="waiting-tip" *ngIf="waiting">🔎 Buscando rival automáticamente en emparejamiento rápido…</p>
        </div>
      </section>

      <!-- GAME OVER MODAL (TRANSPARENT BACKDROP OVER THE ENTIRE BOARD) -->
      <div class="gameover-modal-backdrop" *ngIf="view.phase === 'GameOver' && !peekBoard">
        <div class="gameover-modal-card" [class.is-winner]="isMeWinner()" [class.is-loser]="!isMeWinner()" (click)="$event.stopPropagation()">
          <div class="modal-ambient-glow"></div>

          <!-- Trophy / Winner Emblem -->
          <div class="trophy-badge-container">
            <div class="trophy-halo"></div>
            <div class="trophy-icon-wrap" *ngIf="isMeWinner()">
              <!-- Glorious Victory Trophy -->
              <svg class="winner-svg-trophy" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M6 9C6 11.2091 7.79086 13 10 13H14C16.2091 13 18 11.2091 18 9V4H6V9Z" fill="url(#goldGrad)" stroke="#f59e0b" stroke-width="1.5" stroke-linejoin="round"/>
                <path d="M6 5H4C2.89543 5 2 5.89543 2 7C2 8.65685 3.34315 10 5 10H6" stroke="#fbbf24" stroke-width="1.5" stroke-linecap="round"/>
                <path d="M18 5H20C21.1046 5 22 5.89543 22 7C22 8.65685 20.6569 10 19 10H18" stroke="#fbbf24" stroke-width="1.5" stroke-linecap="round"/>
                <path d="M12 13V18" stroke="#f59e0b" stroke-width="2" stroke-linecap="round"/>
                <path d="M8 21H16" stroke="#f59e0b" stroke-width="2" stroke-linecap="round"/>
                <defs>
                  <linearGradient id="goldGrad" x1="6" y1="4" x2="18" y2="13" gradientUnits="userSpaceOnUse">
                    <stop stop-color="#fef08a"/>
                    <stop offset="0.5" stop-color="#f59e0b"/>
                    <stop offset="1" stop-color="#b45309"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div class="trophy-icon-wrap" *ngIf="!isMeWinner()">
              <!-- Battle Result Emblem -->
              <svg class="winner-svg-trophy" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M6 9C6 11.2091 7.79086 13 10 13H14C16.2091 13 18 11.2091 18 9V4H6V9Z" fill="url(#silverGrad)" stroke="#38bdf8" stroke-width="1.5" stroke-linejoin="round"/>
                <path d="M6 5H4C2.89543 5 2 5.89543 2 7C2 8.65685 3.34315 10 5 10H6" stroke="#38bdf8" stroke-width="1.5" stroke-linecap="round"/>
                <path d="M18 5H20C21.1046 5 22 5.89543 22 7C22 8.65685 20.6569 10 19 10H18" stroke="#38bdf8" stroke-width="1.5" stroke-linecap="round"/>
                <path d="M12 13V18" stroke="#38bdf8" stroke-width="2" stroke-linecap="round"/>
                <path d="M8 21H16" stroke="#38bdf8" stroke-width="2" stroke-linecap="round"/>
                <defs>
                  <linearGradient id="silverGrad" x1="6" y1="4" x2="18" y2="13" gradientUnits="userSpaceOnUse">
                    <stop stop-color="#e0f2fe"/>
                    <stop offset="0.5" stop-color="#38bdf8"/>
                    <stop offset="1" stop-color="#0284c7"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>

          <!-- Status Pill -->
          <div class="gameover-pill winner-pill" *ngIf="isMeWinner()">
            <span class="pill-sparkle">✨</span> ¡VICTORIA ÉPICA! <span class="pill-sparkle">✨</span>
          </div>
          <div class="gameover-pill loser-pill" *ngIf="!isMeWinner()">
            FIN DEL COMBATE
          </div>

          <!-- Winner Headline -->
          <h2 class="winner-title">¡{{ winnerName() }} se lleva la Victoria!</h2>

          <!-- Reason Box -->
          <div class="winner-reason-card">
            <svg class="reason-icon" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
            </svg>
            <span class="winner-reason-text">{{ reasonLabel() }}</span>
          </div>

          <!-- Action Buttons -->
          <div class="gameover-actions">
            <button class="btn-lobby-return" (click)="leave()">
              <svg viewBox="0 0 20 20" fill="currentColor" class="btn-home-svg">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/>
              </svg>
              <span>Volver al Vestíbulo</span>
            </button>
            <button class="btn-inspect-board" (click)="peekBoard = true" title="Ver el estado final del tablero">
              <svg viewBox="0 0 20 20" fill="currentColor" class="btn-inspect-svg">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd"/>
              </svg>
              <span>Ver Tablero</span>
            </button>
          </div>
        </div>
      </div>

      <!-- FLOATING RE-OPEN PILL WHEN USER MINIMIZES TO PEEK AT THE BOARD -->
      <div class="gameover-minimized-banner" *ngIf="view.phase === 'GameOver' && peekBoard">
        <div class="minimized-info">
          <span class="minimized-trophy">🏆</span>
          <span class="minimized-text"><b>¡{{ winnerName() }} se lleva la Victoria!</b> ({{ reasonLabel() }})</span>
        </div>
        <div class="minimized-buttons">
          <button class="btn-mini-show" (click)="peekBoard = false">Ver Resultado</button>
          <button class="btn-mini-leave" (click)="leave()">Volver al Vestíbulo</button>
        </div>
      </div>

      <!-- MAIN TWO-COLUMN BATTLE LAYOUT: ARENA + RIGHT LIVE STREAM CHAT/GUIDE -->
      <div class="ptcgo-battle-layout" *ngIf="view.phase !== 'WaitingForOpponent'">
        <!-- LEFT: COMPACT ARENA STAGE (Playmat + Hand) -->
        <main class="ptcgo-arena-stage">
        <!-- OPPONENT HAND (Top Edge of Mat) -->
        <div class="opp-hand-rack">
          <div class="opp-hand-card" *ngFor="let i of getCardsArray(view.opponent?.handCount ?? 0)">
            <div class="mini-card-back"></div>
          </div>
        </div>

        <!-- PLAYMAT BOARD -->
        <div class="ptcgo-playmat-board">
          <!-- UPPER HALF: OPPONENT CRIMSON ARENA -->
          <div class="field-half opp-half">
            <!-- Opponent Left Dock: Discard / Stadium & Deck Stack -->
            <div class="dock-zone dock-left">
              <!-- Opponent Stadium / Item Slot -->
              <div class="stadium-slot" title="Estadio / Jugadas del rival">
                <div class="slot-placeholder">
                  <span class="slot-lbl">Estadio</span>
                </div>
              </div>

              <!-- Opponent Face-Down Deck Stack -->
              <div class="deck-zone" [title]="'Mazo de ' + (view.opponent?.name || 'Rival') + ': Si no puede robar al inicio de su turno, pierde.'">
                <div class="deck-stack-3d">
                  <div class="deck-shadow"></div>
                  <div class="deck-card-back opp-deck-back">
                    <span class="deck-num-overlay">{{ view.opponent?.deckCount ?? 0 }}</span>
                  </div>
                </div>
                <span class="dock-meta-tag opp-deck-tag">Mazo: {{ view.opponent?.deckCount ?? 0 }}</span>
              </div>
            </div>

            <!-- Opponent Center: Bench Tray -->
            <div class="center-bench-container">
              <div class="bench-tray opp-bench-tray">
                <div class="bench-slot" *ngFor="let slot of [0,1,2,3,4]">
                  <app-card
                    *ngIf="view.opponent?.bench?.[slot]"
                    [card]="view.opponent!.bench[slot]!"
                    (click)="inspectCard(view.opponent!.bench[slot]!)"
                  ></app-card>
                  <div class="empty-bench-placeholder" *ngIf="!view.opponent?.bench?.[slot]">
                    <span>Banca</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Opponent Right Dock: 3D Deck Box, 6 Prizes, GX Marker -->
            <div class="dock-zone dock-right">
              <!-- Opponent 3D Deck Box (Dual Lightning/Darkness) -->
              <div class="deckbox-3d opp-deckbox" title="Caja de Mazo del Rival">
                <div class="deckbox-top"></div>
                <div class="deckbox-front">
                  <div class="split-side yellow-side">⚡</div>
                  <div class="split-side dark-side">🌑</div>
                </div>
              </div>

              <!-- Opponent Prize Cards with Visual Slot Grid -->
              <div class="ptcgo-prizes-zone opp-prizes-zone" [title]="'Cartas de Premio de ' + (view.opponent?.name || 'Rival') + ' (Empieza con 6). Si toma sus 6 premios, gana la partida.'">
                <div class="prize-zone-header">
                  <span class="prize-tag opp-prize-tag">PREMIOS {{ (view.opponent?.name || 'RIVAL') | uppercase }}</span>
                  <span class="prize-taken-info">{{ 6 - (view.opponent?.prizesCount ?? 0) }}/6 tomados</span>
                </div>
                <div class="prize-cards-stack">
                  <div class="prize-card-back opp-prize" *ngFor="let p of getCardsArray(view.opponent?.prizesCount ?? 0)" title="Premio pendiente"></div>
                  <div class="prize-card-empty opp-empty-slot" *ngFor="let p of getCardsArray(6 - (view.opponent?.prizesCount ?? 0))" [title]="'¡Premio tomado por ' + (view.opponent?.name || 'el rival') + '!'">🏆</div>
                </div>
                <div class="prize-counter-num">{{ view.opponent?.prizesCount ?? 0 }}</div>
                <span class="prize-footer-hint">Faltan {{ view.opponent?.prizesCount ?? 0 }} para ganar</span>
              </div>

              <!-- Opponent GX Tag Team Marker -->
              <div class="gx-marker-box">
                <img [src]="assets.gxMarkerSvg" alt="GX TAG TEAM" class="gx-marker-img" />
              </div>
            </div>
          </div>

          <!-- CENTER ARENA POKÉBALL (Bisecting the Midline) -->
          <div class="center-pokeball-arena">
            <div class="pokeball-disc">
              <!-- Top Half (Red - Opponent Active) -->
              <div class="pb-half pb-top-half">
                <div class="pb-inset-arc pb-top-arc"></div>
                
                <!-- Opponent Active Card Spot -->
                <div class="active-spot-frame opp-active-frame">
                  <app-card
                    *ngIf="view.opponent?.active as oppActive"
                    [card]="oppActive"
                    [isActive]="true"
                    (click)="inspectCard(oppActive)"
                  ></app-card>
                  <div class="active-empty-label" *ngIf="!view.opponent?.active">
                    <span>Sin Activo</span>
                  </div>
                </div>

                <!-- Opponent Condition Coin -->
                <div class="condition-coin opp-coin" title="Marcador de condición">
                  <img [src]="assets.coins.burn" class="coin-svg" alt="Quemado" />
                </div>
              </div>

              <!-- Center Midline Divider & Core Button -->
              <div class="pb-midline-strip">
                <div class="pb-core-button">
                  <div class="pb-core-inner"></div>
                </div>
              </div>

              <!-- Bottom Half (Silver - Player Active) -->
              <div class="pb-half pb-bottom-half">
                <div class="pb-inset-arc pb-bottom-arc"></div>

                <!-- Player Active Card Spot -->
                <div class="active-spot-frame player-active-frame">
                  <app-card
                    *ngIf="view.me?.active as myActive"
                    [card]="myActive"
                    [isActive]="true"
                    [isPlayable]="isCardPlayable(myActive)"
                    (click)="onFieldCardClick(myActive)"
                  ></app-card>
                  <div class="active-empty-label player-empty-label" *ngIf="!view.me?.active">
                    <span>Sin Activo</span>
                  </div>
                </div>

                <!-- Player Condition Coin -->
                <div class="condition-coin player-coin" title="Marcador de condición">
                  <img [src]="assets.coins.poison" class="coin-svg" alt="Veneno" />
                </div>
              </div>
            </div>
          </div>

          <!-- LOWER HALF: PLAYER SAPPHIRE BLUE ARENA -->
          <div class="field-half player-half">
            <!-- Player Left Dock: 3D Deck Box, GX Marker, 6 Prizes -->
            <div class="dock-zone dock-left">
              <!-- Player 3D Deck Box (Sun & Moon Guardians Rising) -->
              <div class="deckbox-3d player-deckbox" title="Caja de Mazo Alola Guardians Rising">
                <div class="deckbox-top"></div>
                <div class="deckbox-front guardians-front">
                  <span class="db-brand">POKÉMON</span>
                  <span class="db-title">SUN & MOON</span>
                  <span class="db-sub">GUARDIANS RISING</span>
                </div>
              </div>

              <!-- Player GX Tag Team Marker -->
              <div class="gx-marker-box">
                <img [src]="assets.gxMarkerSvg" alt="GX TAG TEAM" class="gx-marker-img" />
              </div>

              <!-- Player Prize Cards with Glowing Gold Count & Visual Slot Grid -->
              <div class="ptcgo-prizes-zone player-prizes-zone" title="Tus Cartas de Premio (Inicias con 6). ¡Por cada K.O. al rival tomas 1 premio; al tomar los 6 ganas la partida!">
                <div class="prize-zone-header">
                  <span class="prize-tag player-prize-tag">TUS PREMIOS</span>
                  <span class="prize-taken-info player-taken-info">{{ 6 - (view.me?.prizesCount ?? 0) }}/6 tomados</span>
                </div>
                <div class="prize-cards-stack">
                  <div class="prize-card-back player-prize" *ngFor="let p of getCardsArray(view.me?.prizesCount ?? 0)" title="Premio pendiente por tomar"></div>
                  <div class="prize-card-empty player-empty-slot" *ngFor="let p of getCardsArray(6 - (view.me?.prizesCount ?? 0))" title="¡Premio tomado!">⭐</div>
                </div>
                <div class="prize-counter-num player-counter-num">{{ view.me?.prizesCount ?? 0 }}</div>
                <span class="prize-footer-hint player-footer-hint">Faltan {{ view.me?.prizesCount ?? 0 }} para ganar</span>
              </div>
            </div>

            <!-- Player Center: Bench Tray -->
            <div class="center-bench-container">
              <div class="bench-tray player-bench-tray">
                <div class="bench-slot" *ngFor="let slot of [0,1,2,3,4]">
                  <app-card
                    *ngIf="view.me?.bench?.[slot]"
                    [card]="view.me!.bench[slot]!"
                    [isPlayable]="isCardPlayable(view.me!.bench[slot]!)"
                    (click)="onFieldCardClick(view.me!.bench[slot]!)"
                  ></app-card>
                  <div class="empty-bench-placeholder" *ngIf="!view.me?.bench?.[slot]">
                    <span>Banca {{ slot + 1 }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Player Right Dock: Deck Stack, Discard Pile & DONE Button -->
            <div class="dock-zone dock-right">
              <!-- Player Face-Down Deck Stack -->
              <div class="deck-zone" title="Tu Mazo de 60 cartas. Si te quedas sin cartas al inicio de tu turno, pierdes.">
                <div class="deck-stack-3d">
                  <div class="deck-shadow"></div>
                  <div class="deck-card-back player-deck-back">
                    <span class="deck-num-overlay">{{ view.me?.deckCount ?? 0 }}</span>
                  </div>
                </div>
                <span class="dock-meta-tag player-deck-tag">Mazo: {{ view.me?.deckCount ?? 0 }}</span>
              </div>

              <!-- Player Discard Pile -->
              <div class="discard-zone" title="Tus Descartes">
                <div class="discard-box" *ngIf="view.me?.discardCount">
                  <span class="discard-icon">🗑️</span>
                  <span class="discard-count">{{ view.me?.discardCount ?? 0 }}</span>
                </div>
                <div class="discard-empty" *ngIf="!view.me?.discardCount">
                  <span>Descartes</span>
                </div>
              </div>

              <!-- GLOSSY 3D GREEN "DONE" BUTTON -->
              <div class="done-action-box">
                <button
                  class="btn-ptcgo-done"
                  [disabled]="!isMyTurn()"
                  (click)="onDoneClick()"
                  title="Finalizar turno actual"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- PLAYER HAND (Bottom of Screen, overlapping lower board rim) -->
        <div class="player-hand-shelf" *ngIf="view.me?.hand">
          <div class="hand-cards-fan">
            <div
              class="hand-card-wrapper"
              *ngFor="let c of view.me!.hand; let i = index"
              (click)="onHandCardClick(c)"
            >
              <app-card [card]="c" [isPlayable]="isCardPlayable(c)"></app-card>
            </div>
          </div>
        </div>

        <!-- PLAYER PROFILE CARD (Bottom-Right) -->
        <div class="profile-pill player-pill" *ngIf="view.me">
          <div class="profile-meta">
            <span class="player-name-tag">{{ view.me.name || currentTrainer.name }}</span>
            <div class="meta-counters">
              <span class="counter-badge deck-badge" title="Cartas restantes en tu mazo">
                <span class="badge-icon">🎴</span> {{ view.me.deckCount }}
              </span>
              <span class="counter-badge prize-badge" title="Tus premios restantes">
                <span class="badge-icon">🏆</span> {{ view.me.prizesCount }}
              </span>
            </div>
          </div>
          <div class="avatar-box">
            <img [src]="playerAvatarUrl" class="avatar-svg trainer-avatar-board" alt="Tú" />
          </div>
        </div>
      </main>

      <!-- RIGHT SIDEBAR: LIVE STREAM CHAT & DYNAMIC GUIDANCE (Like a Live Broadcast Chat) -->
      <aside class="live-stream-sidebar glass-panel">
        <!-- STREAM HEADER -->
        <div class="stream-header">
          <div class="stream-live-tag">
            <span class="pulse-dot"></span>
            <span>EN VIVO · POKÉMON LIVE</span>
          </div>
          <div class="stream-header-actions">
            <button class="btn-stream-rules" (click)="toggleRulesModal()" title="Ver Reglamento Oficial">
              📖 Reglas
            </button>
          </div>
        </div>

        <!-- DYNAMIC TURN & RULES GUIDANCE CARD ("¿Qué está sucediendo y qué hago ahora?") -->
        <div class="guidance-card" [class.turn-mine]="isMyTurn()" [class.turn-opp]="!isMyTurn()">
          <div class="guidance-head">
            <div class="guidance-badge">
              <span class="gb-icon">{{ isMyTurn() ? '🟢' : '⏳' }}</span>
              <span class="gb-title">{{ isMyTurn() ? '¡TU TURNO!' : 'TURNO DE ' + currentPlayerName().toUpperCase() }}</span>
            </div>
            <span class="gb-prize-counter" title="Premios tomados">
              🏆 Premios: {{ 6 - (view.me?.prizesCount ?? 0) }}/6
            </span>
          </div>

          <!-- Paso a Paso si es tu turno -->
          <div class="guidance-body" *ngIf="isMyTurn()">
            <div class="guidance-step" [class.done]="view.me?.energyAttachedThisTurn" [class.actionable]="canAttachEnergy()">
              <span class="step-num">{{ view.me?.energyAttachedThisTurn ? '✓' : '1' }}</span>
              <div class="step-detail">
                <b>Adjuntar Energía (1 por turno):</b>
                <p *ngIf="!view.me?.energyAttachedThisTurn && canAttachEnergy()">
                  Haz clic en una Energía de tu mano y luego en el Pokémon al que deseas dársela.
                </p>
                <p *ngIf="view.me?.energyAttachedThisTurn" class="text-done">
                  Ya adjuntaste 1 energía este turno.
                </p>
                <p *ngIf="!view.me?.energyAttachedThisTurn && !canAttachEnergy()" class="text-muted">
                  No tienes cartas de Energía en tu mano.
                </p>
              </div>
            </div>

            <div class="guidance-step" [class.actionable]="canPlayBasicToBench()">
              <span class="step-num">2</span>
              <div class="step-detail">
                <b>Bajar Pokémon a la Banca:</b>
                <p *ngIf="canPlayBasicToBench()">
                  Haz clic en un Pokémon Básico de tu mano para colocarlo en tu banca.
                </p>
                <p *ngIf="!canPlayBasicToBench()" class="text-muted">
                  Sin Pokémon Básicos en mano o banca llena (máx 5).
                </p>
              </div>
            </div>

            <div class="guidance-step" [class.actionable]="canPlayTrainer()">
              <span class="step-num">3</span>
              <div class="step-detail">
                <b>Jugar Entrenador / Poción:</b>
                <p *ngIf="canPlayTrainer()">
                  Haz clic en una carta de Entrenador (Poción, etc.) para curar o buscar cartas.
                </p>
                <p *ngIf="!canPlayTrainer()" class="text-muted">
                  No tienes entrenadores disponibles.
                </p>
              </div>
            </div>

            <div class="guidance-step attack-step" [class.ready-attack]="canAttack()">
              <span class="step-num">4</span>
              <div class="step-detail">
                <b>Atacar al Rival:</b>
                <p *ngIf="canAttack()">
                  ⚡ ¡Tienes energía suficiente! Haz clic en tu Activo para atacar. <i>(⚠️ Atacar finalizará tu turno)</i>.
                </p>
                <p *ngIf="!canAttack()" class="text-muted">
                  Tu Pokémon Activo necesita más energía adjunta para poder atacar.
                </p>
              </div>
            </div>

            <div class="guidance-step pass-step">
              <span class="step-num">5</span>
              <div class="step-detail">
                <b>Terminar Turno:</b>
                <p>
                  Si no vas a atacar ni jugar más cartas, pulsa el botón verde <b>"Done"</b>.
                </p>
              </div>
            </div>
          </div>

          <!-- Mensaje si es el turno del Rival -->
          <div class="guidance-body opp-waiting" *ngIf="!isMyTurn()">
            <div class="opp-waiting-box">
              <span class="spinner-icon">⏳</span>
              <div>
                <b>{{ currentPlayerName() }} está jugando su turno...</b>
                <p>Observa el chat abajo para ver en tiempo real cada carta y ataque que realiza.</p>
              </div>
            </div>
          </div>

          <!-- Recordatorio de la Regla de Oro (Premios) -->
          <div class="guidance-rule-hint" (click)="toggleRulesModal()">
            <span class="grh-icon">🎯</span>
            <span class="grh-text">
              <b>Regla de Victoria:</b> Ganas al tomar tus <b>6 Premios</b> (tomas 1 por cada K.O. que logres). <u>Ver reglas 📖</u>
            </span>
          </div>
        </div>

        <!-- LIVE CHAT STREAM FEED (Like Twitch / YouTube Live Chat) -->
        <div class="stream-chat-feed">
          <div class="chat-feed-bar">
            <span class="cf-badge">💬 CHAT EN VIVO</span>
            <span class="cf-counter">{{ liveChatMessages.length }} jugadas</span>
          </div>

          <div class="chat-messages-container" #chatScroll>
            <div
              class="chat-bubble-row"
              *ngFor="let msg of liveChatMessages"
              [ngClass]="msg.badgeClass"
            >
              <div class="bubble-avatar">
                <img *ngIf="isAvatarUrl(msg.avatar); else textAvatar" [src]="msg.avatar" class="bubble-avatar-img" [alt]="msg.senderName" />
                <ng-template #textAvatar>{{ msg.avatar }}</ng-template>
              </div>
              <div class="bubble-content">
                <div class="bubble-header">
                  <span class="bubble-author">{{ msg.senderName }}</span>
                  <span class="bubble-tag" *ngIf="msg.sender === 'prize'">🏆 ¡PREMIO!</span>
                  <span class="bubble-tag ko-tag" *ngIf="msg.sender === 'rotom'">💥 K.O.</span>
                </div>
                <div class="bubble-text">{{ msg.text }}</div>
              </div>
            </div>

            <div class="chat-empty-feed" *ngIf="!liveChatMessages.length">
              <span>Esperando jugadas en la partida...</span>
            </div>
          </div>
        </div>
      </aside>
    </div> <!-- end .ptcgo-battle-layout -->

      <!-- CONTEXTUAL CARD ACTIONS POPUP -->
      <div class="context-actions-backdrop" *ngIf="activeCardMoves.length" (click)="clearCardMoves()">
        <div class="context-actions-modal" (click)="$event.stopPropagation()">
          <div class="cam-header">
            <h4>Acciones con {{ activeCardTarget?.name }}</h4>
            <button class="btn-cam-close" (click)="clearCardMoves()">✕</button>
          </div>
          <div class="cam-list">
            <button
              class="btn-cam-move"
              *ngFor="let m of activeCardMoves"
              (click)="executeCardMove(m)"
            >
              <span class="cam-icon">{{ getMoveIcon(m.type) }}</span>
              <div class="cam-details">
                <span class="cam-label">{{ m.label }}</span>
                <span class="cam-sub" *ngIf="m.detail">{{ m.detail }}</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      <!-- ROTOM-DEX ASSISTANT DRAWER -->
      <aside class="rotom-drawer" [class.drawer-open]="rotomOpen">
        <div class="rotom-drawer-header">
          <div class="rd-avatar">⚡🤖</div>
          <div class="rd-title-group">
            <h3>Rotom-Dex Asistente</h3>
            <p *ngIf="isMyTurn()">¡Tu turno! Estas son tus sugerencias y jugadas:</p>
            <p *ngIf="!isMyTurn()">Esperando el turno del rival…</p>
          </div>
          <button class="btn-drawer-close" (click)="rotomOpen = false">✕</button>
        </div>

        <div class="rotom-drawer-body">
          <!-- Strategy Suggestions -->
          <div class="drawer-section" *ngIf="view.suggestions?.length">
            <h4 class="section-title">💡 Consejos de Estrategia</h4>
            <div class="tip-card" *ngFor="let s of view.suggestions">
              {{ s }}
            </div>
          </div>

          <!-- All Legal Moves List -->
          <div class="drawer-section" *ngIf="isMyTurn()">
            <h4 class="section-title">⚡ Todas las Jugadas Legales ({{ view.legalMoves ? view.legalMoves.length : 0 }})</h4>
            <div class="no-moves-notice" *ngIf="!view.legalMoves || view.legalMoves.length === 0">
              No tienes movimientos pendientes. Puedes pulsar <b>"Done"</b> para finalizar.
            </div>

            <div class="moves-list" *ngIf="view.legalMoves?.length">
              <button
                class="btn-move-item"
                *ngFor="let m of view.legalMoves"
                [class.btn-attack]="m.type.toLowerCase() === 'attack'"
                [class.btn-energy]="m.type.toLowerCase() === 'attach' || m.type.toLowerCase() === 'attachenergy'"
                [class.btn-evolve]="m.type.toLowerCase() === 'evolve'"
                [class.btn-bench]="m.type.toLowerCase() === 'play' || m.type.toLowerCase() === 'playbasictobench'"
                [class.btn-trainer]="m.type.toLowerCase() === 'trainer' || m.type.toLowerCase() === 'playitem' || m.type.toLowerCase() === 'playsupporter'"
                [class.btn-retreat]="m.type.toLowerCase() === 'retreat'"
                [class.btn-pass]="m.type.toLowerCase() === 'pass' || m.type.toLowerCase() === 'endturn'"
                (click)="doMove(m)"
              >
                <span class="m-icon">{{ getMoveIcon(m.type) }}</span>
                <div class="m-info">
                  <span class="m-name">{{ m.label }}</span>
                  <span class="m-desc" *ngIf="m.detail">{{ m.detail }}</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </aside>

      <!-- ERROR ALERT -->
      <div class="ptcgo-alert-error" *ngIf="error">
        ⚠️ {{ error }}
      </div>

      <!-- BATTLE LOG HISTORY MODAL (Historial Completo de Jugadas) -->
      <div class="history-modal-backdrop" *ngIf="historyModalOpen" (click)="toggleHistoryModal()">
        <div class="history-modal glass-panel" (click)="$event.stopPropagation()">
          <div class="history-modal-header">
            <h3>📜 Historial Completo de la Batalla</h3>
            <span class="history-count-badge">{{ view.log ? view.log.length : 0 }} acciones</span>
            <button class="btn-close-modal" (click)="toggleHistoryModal()">✕</button>
          </div>
          <div class="history-modal-body">
            <div class="history-item" *ngFor="let line of view.log; let idx = index">
              <span class="history-idx">#{{ idx + 1 }}</span>
              <span class="history-line">{{ line }}</span>
            </div>
            <div class="history-empty" *ngIf="!view.log?.length">
              <span>Aún no hay acciones registradas en esta partida.</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- =========================================================================
         POKÉMON TCG LOBBY (VESTÍBULO PRINCIPAL)
         ========================================================================= -->
    <div class="lobby-viewport" *ngIf="!view">
      <!-- LOBBY HEADER -->
      <header class="lobby-header glass-panel">
        <div class="lobby-brand">
          <div class="lobby-pokeball-icon">
            <div class="pb-top"></div>
            <div class="pb-band"></div>
            <div class="pb-center"></div>
            <div class="pb-bottom"></div>
          </div>
          <div class="brand-text">
            <h1 class="brand-title">POKÉMON TCG LIVE</h1>
            <span class="brand-subtitle">Vestíbulo de Entrenadores • VORTEX ARENA</span>
          </div>
        </div>

        <div class="lobby-user-bar">
          <!-- Trainer Profile Badge -->
          <div class="trainer-profile-pill" (click)="toggleTrainerModal()" title="Haz clic para elegir o cambiar de Entrenador Pokémon">
            <div class="trainer-avatar-box">
              <img [src]="currentTrainer.avatar" class="trainer-avatar-img" [alt]="currentTrainer.name" />
            </div>
            <div class="trainer-info">
              <span class="trainer-label">{{ currentTrainer.title }}</span>
              <div class="trainer-name-row">
                <span class="trainer-name-text">{{ currentTrainer.name }}</span>
                <button class="btn-reroll-trainer" (click)="randomizeTrainer($event)" title="Cambiar a Entrenador Pokémon Aleatorio (🎲)">
                  🎲
                </button>
              </div>
            </div>
            <span class="status-indicator-badge" title="Conectado">
              <span class="status-dot"></span> En línea
            </span>
          </div>

          <!-- Lobby Action Buttons -->
          <button class="lobby-btn btn-glass btn-rules" (click)="toggleRulesModal()" title="Guía oficial y reglas de combate">
            <div class="lobby-btn-icon-wrap icon-rules">
              <svg class="btn-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                <line x1="8" y1="7" x2="16" y2="7"/>
                <line x1="8" y1="11" x2="14" y2="11"/>
              </svg>
            </div>
            <div class="lobby-btn-content">
              <span class="lobby-btn-title">Reglas</span>
              <span class="lobby-btn-sub">Oficiales</span>
            </div>
          </button>

          <button class="lobby-btn btn-glass btn-deck" (click)="openDeckModal()" title="Ver las 60 cartas de tu mazo inicial">
            <div class="lobby-btn-icon-wrap icon-deck">
              <svg class="btn-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="5" width="13" height="16" rx="2.5"/>
                <path d="M7 2.5h10A2.5 2.5 0 0 1 19.5 5v13.5"/>
                <circle cx="9.5" cy="13" r="2.5"/>
              </svg>
            </div>
            <div class="lobby-btn-content">
              <span class="lobby-btn-title">Mi Mazo</span>
              <span class="lobby-btn-sub">60 Cartas</span>
            </div>
          </button>

          <button class="lobby-btn btn-danger-glass" *ngIf="isPokemonRole" (click)="logout()" title="Cerrar sesión de juego">
            <div class="lobby-btn-icon-wrap icon-logout">
              <svg class="btn-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </div>
            <div class="lobby-btn-content">
              <span class="lobby-btn-title">Salir</span>
              <span class="lobby-btn-sub">Cerrar Sesión</span>
            </div>
          </button>

          <button class="lobby-btn btn-primary-glass" *ngIf="!isPokemonRole" (click)="leaveToHome()" title="Volver al menú principal de VORTEX">
            <div class="lobby-btn-icon-wrap icon-home">
              <svg class="btn-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            <div class="lobby-btn-content">
              <span class="lobby-btn-title">VORTEX</span>
              <span class="lobby-btn-sub">Menú Principal</span>
            </div>
          </button>
        </div>
      </header>

      <!-- WAITING QUEUE OVERLAY (IF WAITING FOR OPPONENT IN LOBBY) -->
      <div class="lobby-waiting-banner glass-panel" *ngIf="waiting">
        <div class="mini-spinner-pokeball">
          <div class="pb-top"></div>
          <div class="pb-band"></div>
          <div class="pb-center"></div>
          <div class="pb-bottom"></div>
        </div>
        <div class="waiting-banner-info">
          <h3>Buscando oponente en línea...</h3>
          <p>Esperando a que otro entrenador se una al emparejamiento rápido.</p>
        </div>
        <button class="btn-secondary-glow btn-sm" (click)="cancelWaiting()">
          ✖️ Cancelar Búsqueda
        </button>
      </div>

      <!-- ERROR BANNER -->
      <div class="lobby-error-banner" *ngIf="error">
        <span>⚠️ {{ error }}</span>
        <button class="btn-close-toast" (click)="error = ''">✕</button>
      </div>

      <!-- MAIN LOBBY STAGE -->
      <main class="lobby-main-content">
        <!-- FEATURED HERO CARD: IA PRACTICE -->
        <section class="lobby-hero-card glass-panel">
          <div class="hero-left">
            <span class="hero-tag">⚡ MODO RECOMENDADO • PARTIDA INMEDIATA</span>
            <h2 class="hero-title">Duelo vs {{ currentProfessor.name }} (IA)</h2>
            <p class="hero-desc">
              Juega una partida completa 1 vs 1 con tus 60 cartas importadas. Tu rival de la Academia Pokémon tomará decisiones tácticas en tiempo real: colocará Pokémon, evolucionará, unirá energías y ejecutará ataques.
            </p>
            <div class="hero-perks">
              <span class="perk-pill">🤖 IA Táctica</span>
              <span class="perk-pill">🎴 Mazo Completo de 60</span>
              <span class="perk-pill">🏆 6 Premios Reglamentarios</span>
              <span class="perk-pill">⏱️ Sin Tiempos de Espera</span>
            </div>
            <div class="hero-actions">
              <button class="btn-hero-play btn-primary-glow" (click)="quickPractice()" [disabled]="starting">
                ⚔️ {{ starting ? 'Iniciando Partida...' : 'Iniciar Duelo contra ' + currentProfessor.name }}
              </button>
            </div>
          </div>
          <div class="hero-right">
            <div class="bot-showcase">
              <div class="bot-avatar-ring">
                <img [src]="currentProfessor.avatar" [alt]="currentProfessor.name" class="bot-avatar-img" />
              </div>
              <span class="bot-name">{{ currentProfessor.name }} (IA)</span>
              <span class="bot-rank">{{ currentProfessor.title }}</span>
              <div class="bot-deck-icons">
                <span class="bot-type-icon yellow" title="Eléctrico">⚡</span>
                <span class="bot-type-icon purple" title="Psíquico">👁️</span>
                <span class="bot-type-icon dark" title="Oscuro">🌑</span>
              </div>
            </div>
          </div>
        </section>

        <!-- MULTIPLAYER MODES SECTION -->
        <section class="lobby-multiplayer-grid">
          <!-- Card 1: Quick Match -->
          <div class="mode-card glass-panel">
            <div class="mode-header">
              <span class="mode-icon-circle bg-lightning">⚡</span>
              <div>
                <h3 class="mode-title">Emparejamiento Rápido</h3>
                <span class="mode-subtitle">PvP Automático</span>
              </div>
            </div>
            <p class="mode-desc">
              Entra a la cola pública. Te emparejaremos automáticamente con el primer entrenador disponible.
            </p>
            <div class="mode-action">
              <button class="btn-mode-cta btn-secondary-glow" (click)="startQuickMatch()" [disabled]="waiting || starting">
                ⚡ {{ waiting ? 'Buscando...' : 'Buscar Oponente' }}
              </button>
            </div>
          </div>

          <!-- Card 2: Create Private Room -->
          <div class="mode-card glass-panel">
            <div class="mode-header">
              <span class="mode-icon-circle bg-trophy">🏆</span>
              <div>
                <h3 class="mode-title">Crear Sala Privada</h3>
                <span class="mode-subtitle">Invitar a un Colega</span>
              </div>
            </div>
            <p class="mode-desc">
              Genera una sala con código único y compártelo para que tu contrincante ingrese directamente.
            </p>
            <div class="mode-action">
              <button class="btn-mode-cta btn-secondary-glow" (click)="startCreateGame()" [disabled]="waiting || starting">
                ➕ Crear Nueva Sala
              </button>
            </div>
          </div>

          <!-- Card 3: Join Private Room -->
          <div class="mode-card glass-panel">
            <div class="mode-header">
              <span class="mode-icon-circle bg-key">🔑</span>
              <div>
                <h3 class="mode-title">Unirse a Sala</h3>
                <span class="mode-subtitle">Tengo un Código</span>
              </div>
            </div>
            <p class="mode-desc">
              Ingresa el código alfanumérico proporcionado por el creador de la sala para unirte a su partida.
            </p>
            <div class="mode-action">
              <div class="mode-input-group">
                <input 
                  type="text" 
                  class="room-input" 
                  [(ngModel)]="joinGameCode" 
                  placeholder="Código de Sala (ej. 8a3f9...)" 
                  maxlength="50"
                  (keyup.enter)="startJoinGame()"
                />
                <button class="btn-join-cta" (click)="startJoinGame()" [disabled]="!joinGameCode.trim() || starting">
                  🔗 Unirse
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <!-- DECK PREVIEW MODAL -->
      <div class="deck-modal-backdrop" *ngIf="deckModalOpen" (click)="deckModalOpen = false">
        <div class="deck-modal glass-panel" (click)="$event.stopPropagation()">
          <div class="deck-modal-header">
            <div class="deck-modal-title">
              <h3>🎴 Mazo Oficial de Juego (60 Cartas)</h3>
              <span class="deck-count-badge">{{ deckCards.length }} cartas cargadas</span>
            </div>
            <button class="btn-close-modal" (click)="deckModalOpen = false">✖</button>
          </div>

          <div class="deck-filter-tabs">
            <button class="deck-tab" [class.active]="deckFilter === 'all'" (click)="deckFilter = 'all'">
              Todas ({{ deckCards.length }})
            </button>
            <button class="deck-tab" [class.active]="deckFilter === 'pokemon'" (click)="deckFilter = 'pokemon'">
              Pokémon ({{ countCategory('pokemon') }})
            </button>
            <button class="deck-tab" [class.active]="deckFilter === 'trainer'" (click)="deckFilter = 'trainer'">
              Entrenadores ({{ countCategory('trainer') }})
            </button>
            <button class="deck-tab" [class.active]="deckFilter === 'energy'" (click)="deckFilter = 'energy'">
              Energías ({{ countCategory('energy') }})
            </button>
          </div>

          <div class="deck-cards-grid" *ngIf="!deckLoading">
            <div class="deck-card-tile" *ngFor="let card of filteredDeckCards" (click)="inspectDeckCard(card)">
              <div class="tile-img-box">
                <img [src]="card.imageSmall || card.imageLarge" [alt]="card.name" class="tile-img" loading="lazy" />
              </div>
              <div class="tile-info">
                <span class="tile-name">{{ card.name }}</span>
                <span class="tile-sub">{{ card.supertype }} • {{ card.subtypes?.join(', ') || card.types?.join(', ') || '' }}</span>
              </div>
            </div>
          </div>

          <div class="deck-loading-state" *ngIf="deckLoading">
            <div class="mini-spinner-pokeball">
              <div class="pb-top"></div>
              <div class="pb-band"></div>
              <div class="pb-center"></div>
              <div class="pb-bottom"></div>
            </div>
            <span>Cargando catálogo del mazo...</span>
          </div>
        </div>
      </div>
    </div>

    <!-- CARD DETAIL INSPECTION MODAL (GLOBAL) -->
    <div class="card-inspect-backdrop" *ngIf="selectedCard" (click)="closeInspect()">
      <div class="card-inspect-modal" (click)="$event.stopPropagation()">
        <button class="btn-close-inspect" (click)="closeInspect()">✕</button>
        <div class="inspect-body">
          <div class="inspect-card-preview">
            <app-card [card]="selectedCard"></app-card>
          </div>
          <div class="inspect-info">
            <div class="inspect-header">
              <h2>{{ selectedCard.name }}</h2>
              <span class="inspect-type-tag" [style.background]="energyInfo(selectedCard.types[0] || '').color">
                {{ selectedCard.supertype }} · {{ selectedCard.subtypes.join(', ') }}
              </span>
            </div>

            <div class="inspect-section" *ngIf="selectedCard.hp != null">
              <h4>Puntos de Salud</h4>
              <div class="hp-stat-bar">
                <div class="hp-bar-fill" [style.width.%]="(selectedCard.remainingHp / selectedCard.hp) * 100"></div>
              </div>
              <p>{{ selectedCard.remainingHp }} / {{ selectedCard.hp }} PS</p>
            </div>

            <div class="inspect-section" *ngIf="selectedCard.attacks?.length">
              <h4>Ataques</h4>
              <div class="inspect-attack" *ngFor="let a of selectedCard.attacks">
                <div class="ia-head">
                  <b>{{ a.name }}</b>
                  <span class="ia-dmg" *ngIf="a.damage">{{ a.damage }} daño</span>
                </div>
                <p *ngIf="a.text">{{ a.text }}</p>
              </div>
            </div>

            <div class="inspect-section" *ngIf="selectedCard.rules?.length">
              <h4>Efectos y Reglas</h4>
              <p *ngFor="let r of selectedCard.rules">{{ r }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- TRAINER SELECTOR MODAL (GLOBAL) -->
    <div class="rules-modal-backdrop trainer-modal-backdrop" *ngIf="trainerModalOpen" (click)="toggleTrainerModal()">
      <div class="rules-modal trainer-modal glass-panel" (click)="$event.stopPropagation()">
        <div class="rules-modal-header">
          <h3>🧢 Elige tu Entrenador Pokémon</h3>
          <button class="btn-close-modal" (click)="toggleTrainerModal()">✕</button>
        </div>
        <div class="trainer-modal-intro">
          <p>Selecciona tu personaje oficial de Pokémon para representarte en el vestíbulo y las partidas multijugador.</p>
          <button class="btn-random-trainer" (click)="randomizeTrainer()">
            🎲 Entrenador Aleatorio
          </button>
        </div>
        <div class="trainer-grid">
          <div 
            class="trainer-card" 
            *ngFor="let t of allTrainers"
            [class.active]="t.id === currentTrainer.id"
            (click)="selectTrainer(t)"
          >
            <div class="trainer-card-img-wrap">
              <img [src]="t.avatar" class="trainer-card-img" [alt]="t.name" />
            </div>
            <div class="trainer-card-details">
              <span class="trainer-card-name">{{ t.name }}</span>
              <span class="trainer-card-title">{{ t.title }}</span>
              <span class="trainer-card-region">📍 {{ t.region }}</span>
            </div>
            <span class="trainer-selected-tag" *ngIf="t.id === currentTrainer.id">✓ Activo</span>
          </div>
        </div>
      </div>
    </div>

    <!-- RULES MODAL (GLOBAL) -->
    <div class="rules-modal-backdrop" *ngIf="rulesModalOpen" (click)="toggleRulesModal()">
      <div class="rules-modal glass-panel" (click)="$event.stopPropagation()">
        <div class="rules-modal-header">
          <h3>📖 Reglas Oficiales y Cómo Ganar</h3>
          <button class="btn-close-modal" (click)="toggleRulesModal()">✕</button>
        </div>
        <div class="rules-modal-body">
          <div class="rule-box gold-rule-box">
            <h4>🏆 Las 3 Formas de Ganar la Partida</h4>
            <div class="win-cond-item">
              <span class="wc-num">1</span>
              <div>
                <b>Tomar tus 6 Cartas de Premio:</b>
                <p>Inicias con 6 premios boca abajo. Cada vez que dejas Fuera de Combate a un Pokémon rival, tomas 1 premio (o 2 si es Pokémon-ex). ¡Quien tome sus 6 premios primero, gana inmediatamente!</p>
              </div>
            </div>
            <div class="win-cond-item">
              <span class="wc-num">2</span>
              <div>
                <b>Dejar al Rival sin Pokémon:</b>
                <p>Si vences al Pokémon Activo del rival y este no tiene ningún Pokémon en su banca para sustituirlo, ganas la partida al instante.</p>
              </div>
            </div>
            <div class="win-cond-item">
              <span class="wc-num">3</span>
              <div>
                <b>Agotamiento del Mazo (Deckout):</b>
                <p>Si al comienzo del turno de un jugador este debe robar una carta de su mazo y no le queda ninguna (0 cartas), pierde la partida.</p>
              </div>
            </div>
          </div>

          <div class="rule-box">
            <h4>⚡ Lo que puedes hacer en tu turno</h4>
            <ul class="rule-bullets">
              <li><b>Adjuntar Energía:</b> Solo 1 carta de energía por turno a cualquiera de tus Pokémon (Activo o Banca).</li>
              <li><b>Pokémon a la Banca:</b> Puedes bajar Pokémon Básicos de tu mano a la banca (hasta un máximo de 5).</li>
              <li><b>Evolucionar:</b> Puedes evolucionar si el Pokémon base lleva al menos 1 turno en juego.</li>
              <li><b>Retirar Pokémon:</b> Puedes cambiar tu Pokémon Activo pagando su coste en energías adjuntas (1 vez por turno).</li>
              <li><b>Jugar Entrenadores:</b> Los Objetos son ilimitados; los Partidarios (Supporters) son máximo 1 por turno.</li>
              <li><b>Atacar:</b> Causa daño según las energías requeridas y <b>finaliza automáticamente tu turno</b>.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      min-height: 100vh;
      user-select: none;
    }

    /* =========================================================================
       VESTÍBULO PRINCIPAL / LOBBY VIEWPORT
       ========================================================================= */
    .lobby-viewport {
      min-height: 100vh;
      width: 100%;
      background: radial-gradient(circle at 50% 15%, #1e293b 0%, #0f172a 60%, #020617 100%);
      color: #f8fafc;
      font-family: 'Outfit', sans-serif;
      display: flex;
      flex-direction: column;
      position: relative;
    }

    .lobby-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 28px;
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(16px);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      position: sticky;
      top: 0;
      z-index: 50;
      flex-wrap: wrap;
      gap: 12px;
    }

    .lobby-brand {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .lobby-pokeball-icon {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      position: relative;
      overflow: hidden;
      border: 2.5px solid #fff;
      box-shadow: 0 0 14px rgba(56, 189, 248, 0.5);
      animation: rotateSlow 12s linear infinite;
    }
    .lobby-pokeball-icon .pb-top { height: 50%; background: #ef4444; }
    .lobby-pokeball-icon .pb-band { position: absolute; top: 44%; left: 0; right: 0; height: 12%; background: #1e293b; z-index: 2; }
    .lobby-pokeball-icon .pb-center { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 12px; height: 12px; background: #fff; border: 2.5px solid #1e293b; border-radius: 50%; z-index: 3; }
    .lobby-pokeball-icon .pb-bottom { height: 50%; background: #f8fafc; }

    @keyframes rotateSlow {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .brand-title {
      font-size: 18px;
      font-weight: 900;
      letter-spacing: 1px;
      margin: 0;
      background: linear-gradient(135deg, #fde047 0%, #38bdf8 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .brand-subtitle {
      font-size: 11px;
      font-weight: 600;
      color: #94a3b8;
      display: block;
      letter-spacing: 0.5px;
    }

    .lobby-user-bar {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .trainer-profile-pill {
      display: flex;
      align-items: center;
      gap: 12px;
      background: rgba(30, 41, 59, 0.75);
      border: 1.5px solid rgba(56, 189, 248, 0.35);
      padding: 4px 18px 4px 6px;
      border-radius: 999px;
      cursor: pointer;
      transition: all 0.2s ease;
      backdrop-filter: blur(10px);
    }
    .trainer-profile-pill:hover {
      background: rgba(56, 189, 248, 0.15);
      border-color: #38bdf8;
      box-shadow: 0 0 18px rgba(56, 189, 248, 0.35);
      transform: translateY(-1px);
    }

    .trainer-avatar-box {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(56, 189, 248, 0.35), rgba(15, 23, 42, 0.95));
      border: 2px solid #38bdf8;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      flex-shrink: 0;
      box-shadow: 0 0 14px rgba(56, 189, 248, 0.45);
    }

    .trainer-avatar-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      image-rendering: pixelated;
      transform: scale(1.65);
      transform-origin: center 22%;
    }

    .trainer-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .trainer-label {
      font-size: 10px;
      font-weight: 700;
      color: #38bdf8;
      text-transform: uppercase;
      letter-spacing: 0.6px;
    }

    .trainer-name-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .trainer-name-text {
      color: #f8fafc;
      font-family: inherit;
      font-size: 15px;
      font-weight: 800;
      letter-spacing: 0.3px;
    }

    .btn-reroll-trainer {
      background: rgba(255, 255, 255, 0.12);
      border: 1px solid rgba(255, 255, 255, 0.25);
      border-radius: 6px;
      font-size: 13px;
      cursor: pointer;
      padding: 2px 6px;
      line-height: 1.2;
      transition: all 0.2s ease;
    }
    .btn-reroll-trainer:hover {
      background: rgba(56, 189, 248, 0.35);
      border-color: #38bdf8;
      transform: scale(1.2) rotate(15deg);
    }

    .status-indicator-badge {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 11px;
      color: #4ade80;
      font-weight: 600;
      background: rgba(74, 222, 128, 0.1);
      padding: 3px 8px;
      border-radius: 999px;
    }
    .status-dot {
      width: 6px;
      height: 6px;
      background: #4ade80;
      border-radius: 50%;
      box-shadow: 0 0 6px #4ade80;
    }

    .lobby-btn {
      min-height: 68px;
      padding: 4px 18px 4px 6px;
      border-radius: 999px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 12px;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      backdrop-filter: blur(10px);
      box-sizing: border-box;
      border: 1.5px solid rgba(255, 255, 255, 0.15);
      background: rgba(30, 41, 59, 0.75);
    }

    .lobby-btn-icon-wrap {
      width: 52px;
      height: 52px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: all 0.25s ease;
    }
    .lobby-btn:hover .lobby-btn-icon-wrap {
      transform: scale(1.08);
    }
    .btn-svg-icon {
      width: 24px;
      height: 24px;
      display: block;
    }

    .lobby-btn-content {
      display: flex;
      flex-direction: column;
      text-align: left;
      gap: 2px;
    }
    .lobby-btn-title {
      font-size: 14px;
      font-weight: 800;
      letter-spacing: 0.3px;
      line-height: 1.2;
      color: #f8fafc;
    }
    .lobby-btn-sub {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      line-height: 1;
    }

    /* Reglas */
    .btn-rules {
      border-color: rgba(234, 179, 8, 0.35);
    }
    .btn-rules:hover {
      background: rgba(234, 179, 8, 0.15);
      border-color: #eab308;
      box-shadow: 0 0 18px rgba(234, 179, 8, 0.35);
      transform: translateY(-1px);
    }
    .icon-rules {
      background: radial-gradient(circle, rgba(234, 179, 8, 0.35), rgba(15, 23, 42, 0.95));
      border: 1.5px solid #eab308;
      color: #fde047;
      box-shadow: 0 0 10px rgba(234, 179, 8, 0.3);
    }
    .btn-rules .lobby-btn-sub {
      color: #fde047;
    }

    /* Mi Mazo */
    .btn-deck {
      border-color: rgba(168, 85, 247, 0.35);
    }
    .btn-deck:hover {
      background: rgba(168, 85, 247, 0.15);
      border-color: #a855f7;
      box-shadow: 0 0 18px rgba(168, 85, 247, 0.35);
      transform: translateY(-1px);
    }
    .icon-deck {
      background: radial-gradient(circle, rgba(168, 85, 247, 0.35), rgba(15, 23, 42, 0.95));
      border: 1.5px solid #a855f7;
      color: #d8b4fe;
      box-shadow: 0 0 10px rgba(168, 85, 247, 0.3);
    }
    .btn-deck .lobby-btn-sub {
      color: #d8b4fe;
    }

    /* Cerrar Sesión */
    .btn-danger-glass {
      border-color: rgba(239, 68, 68, 0.35);
      color: #fca5a5;
    }
    .btn-danger-glass:hover {
      background: rgba(239, 68, 68, 0.18);
      border-color: #ef4444;
      box-shadow: 0 0 18px rgba(239, 68, 68, 0.35);
      transform: translateY(-1px);
    }
    .icon-logout {
      background: radial-gradient(circle, rgba(239, 68, 68, 0.35), rgba(15, 23, 42, 0.95));
      border: 1.5px solid #ef4444;
      color: #fca5a5;
      box-shadow: 0 0 10px rgba(239, 68, 68, 0.3);
    }
    .btn-danger-glass .lobby-btn-sub {
      color: #f87171;
    }

    /* Volver a VORTEX */
    .btn-primary-glass {
      border-color: rgba(56, 189, 248, 0.35);
      color: #7dd3fc;
    }
    .btn-primary-glass:hover {
      background: rgba(56, 189, 248, 0.18);
      border-color: #38bdf8;
      box-shadow: 0 0 18px rgba(56, 189, 248, 0.35);
      transform: translateY(-1px);
    }
    .icon-home {
      background: radial-gradient(circle, rgba(56, 189, 248, 0.35), rgba(15, 23, 42, 0.95));
      border: 1.5px solid #38bdf8;
      color: #7dd3fc;
      box-shadow: 0 0 10px rgba(56, 189, 248, 0.3);
    }
    .btn-primary-glass .lobby-btn-sub {
      color: #38bdf8;
    }

    .lobby-main-content {
      max-width: 1140px;
      margin: 0 auto;
      padding: 32px 20px 60px;
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 28px;
    }

    /* LOBBY HERO CARD (VS KENDALL) */
    .lobby-hero-card {
      display: grid;
      grid-template-columns: 1fr 280px;
      gap: 32px;
      padding: 32px 36px;
      background: linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.85) 100%);
      border: 1px solid rgba(56, 189, 248, 0.3);
      border-radius: 24px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5), 0 0 30px rgba(56, 189, 248, 0.12);
      position: relative;
      overflow: hidden;
    }
    .lobby-hero-card::before {
      content: '';
      position: absolute;
      top: -100px;
      left: -100px;
      width: 300px;
      height: 300px;
      background: radial-gradient(circle, rgba(56, 189, 248, 0.15) 0%, transparent 70%);
      pointer-events: none;
    }

    .hero-tag {
      font-size: 11px;
      font-weight: 800;
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.12);
      border: 1px solid rgba(56, 189, 248, 0.3);
      padding: 4px 12px;
      border-radius: 999px;
      display: inline-block;
      margin-bottom: 12px;
      letter-spacing: 0.5px;
    }

    .hero-title {
      font-size: 28px;
      font-weight: 900;
      color: #f8fafc;
      margin: 0 0 10px;
      letter-spacing: -0.5px;
    }

    .hero-desc {
      font-size: 14.5px;
      color: #94a3b8;
      line-height: 1.6;
      margin: 0 0 20px;
      max-width: 640px;
    }

    .hero-perks {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 24px;
    }

    .perk-pill {
      font-size: 12px;
      font-weight: 700;
      color: #cbd5e1;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      padding: 5px 12px;
      border-radius: 8px;
    }

    .btn-hero-play {
      font-size: 16px;
      font-weight: 800;
      padding: 14px 32px;
      border-radius: 12px;
      background: linear-gradient(135deg, #0284c7 0%, #2563eb 100%);
      border: 1px solid #60a5fa;
      color: #fff;
      cursor: pointer;
      box-shadow: 0 8px 24px rgba(37, 99, 235, 0.4);
      transition: all 0.2s ease;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .btn-hero-play:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 12px 30px rgba(37, 99, 235, 0.6);
      background: linear-gradient(135deg, #0369a1 0%, #1d4ed8 100%);
    }

    .bot-showcase {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 20px;
      padding: 24px;
      text-align: center;
    }

    .bot-avatar-ring {
      width: 90px;
      height: 90px;
      border-radius: 50%;
      padding: 4px;
      background: linear-gradient(135deg, #f43f5e, #8b5cf6, #3b82f6);
      margin-bottom: 12px;
      box-shadow: 0 0 20px rgba(139, 92, 246, 0.3);
    }
    .bot-avatar-img {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background: #0f172a;
      display: block;
      object-fit: cover;
      image-rendering: pixelated;
    }

    .bot-name {
      font-size: 16px;
      font-weight: 900;
      color: #f8fafc;
    }
    .bot-rank {
      font-size: 11px;
      color: #94a3b8;
      font-weight: 600;
      margin-bottom: 10px;
    }

    .bot-deck-icons {
      display: flex;
      gap: 8px;
    }
    .bot-type-icon {
      font-size: 14px;
      background: rgba(255, 255, 255, 0.06);
      padding: 4px 8px;
      border-radius: 6px;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    /* MULTIPLAYER SECTION */
    .lobby-multiplayer-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
    }

    .mode-card {
      background: rgba(15, 23, 42, 0.75);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 20px;
      padding: 24px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
      position: relative;
      overflow: hidden;
      min-height: 220px;
      box-sizing: border-box;
    }
    .mode-card:hover {
      border-color: rgba(56, 189, 248, 0.4);
      transform: translateY(-4px);
      box-shadow: 0 18px 40px rgba(0, 0, 0, 0.5), 0 0 25px rgba(56, 189, 248, 0.15);
    }

    .mode-header {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-bottom: 14px;
    }

    .mode-icon-circle {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      flex-shrink: 0;
    }
    .bg-lightning { background: rgba(234, 179, 8, 0.15); border: 1px solid rgba(234, 179, 8, 0.3); color: #fde047; }
    .bg-trophy { background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.3); color: #38bdf8; }
    .bg-key { background: rgba(168, 85, 247, 0.15); border: 1px solid rgba(168, 85, 247, 0.3); color: #c084fc; }

    .mode-title {
      font-size: 17px;
      font-weight: 800;
      color: #f8fafc;
      margin: 0;
    }
    .mode-subtitle {
      font-size: 11px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .mode-desc {
      font-size: 13.5px;
      color: #94a3b8;
      line-height: 1.55;
      margin: 0 0 20px;
      flex-grow: 1;
    }

    .mode-action {
      margin-top: auto;
      width: 100%;
    }

    .btn-mode-cta {
      width: 100%;
      height: 44px;
      box-sizing: border-box;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 800;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.2s;
    }

    .mode-input-group {
      display: flex;
      align-items: stretch;
      width: 100%;
      height: 44px;
      box-sizing: border-box;
      background: rgba(0, 0, 0, 0.45);
      border: 1px solid rgba(255, 255, 255, 0.16);
      border-radius: 12px;
      overflow: hidden;
      transition: all 0.2s ease;
    }
    .mode-input-group:focus-within {
      border-color: #a855f7;
      box-shadow: 0 0 16px rgba(168, 85, 247, 0.35);
    }

    .room-input {
      flex: 1;
      height: 100%;
      box-sizing: border-box;
      background: transparent;
      border: none;
      padding: 0 14px;
      color: #fff;
      font-family: inherit;
      font-size: 13px;
      outline: none;
      min-width: 0;
    }
    .room-input::placeholder {
      color: #64748b;
    }

    .btn-join-cta {
      height: 100%;
      margin: 0;
      padding: 0 20px;
      border: none;
      border-radius: 0;
      font-family: inherit;
      font-size: 13px;
      font-weight: 800;
      background: linear-gradient(135deg, #9333ea, #7c3aed);
      color: #fff;
      cursor: pointer;
      white-space: nowrap;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: all 0.2s;
      flex-shrink: 0;
    }
    .btn-join-cta:hover:not(:disabled) {
      background: linear-gradient(135deg, #7e22ce, #6d28d9);
      box-shadow: 0 0 14px rgba(147, 51, 234, 0.5);
    }
    .btn-join-cta:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      background: #334155;
    }

    /* WAITING QUEUE OVERLAY */
    .lobby-waiting-banner {
      display: flex;
      align-items: center;
      gap: 20px;
      padding: 16px 24px;
      background: rgba(30, 58, 138, 0.7);
      border: 1px solid #3b82f6;
      border-radius: 16px;
      margin: 20px auto 0;
      max-width: 1140px;
      width: calc(100% - 40px);
      animation: pulseGlow 2s infinite ease-in-out;
    }
    @keyframes pulseGlow {
      0%, 100% { box-shadow: 0 0 15px rgba(59, 130, 246, 0.3); }
      50% { box-shadow: 0 0 25px rgba(59, 130, 246, 0.6); }
    }

    .mini-spinner-pokeball {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      border: 2px solid #fff;
      position: relative;
      overflow: hidden;
      animation: rotateSlow 2s linear infinite;
      flex-shrink: 0;
    }
    .mini-spinner-pokeball .pb-top { height: 50%; background: #ef4444; }
    .mini-spinner-pokeball .pb-band { position: absolute; top: 45%; left: 0; right: 0; height: 10%; background: #1e293b; z-index: 2; }
    .mini-spinner-pokeball .pb-center { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 8px; height: 8px; background: #fff; border: 2px solid #1e293b; border-radius: 50%; z-index: 3; }
    .mini-spinner-pokeball .pb-bottom { height: 50%; background: #fff; }

    .waiting-banner-info {
      flex-grow: 1;
    }
    .waiting-banner-info h3 {
      font-size: 15px;
      margin: 0;
      color: #bfdbfe;
    }
    .waiting-banner-info p {
      font-size: 12px;
      margin: 2px 0 0;
      color: #93c5fd;
    }

    .btn-sm {
      padding: 8px 14px;
      font-size: 12px;
    }

    /* ERROR BANNER */
    .lobby-error-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 18px;
      background: rgba(220, 38, 38, 0.2);
      border: 1px solid rgba(239, 68, 68, 0.5);
      border-radius: 12px;
      color: #fca5a5;
      font-size: 13px;
      font-weight: 600;
      margin: 20px auto 0;
      max-width: 1140px;
      width: calc(100% - 40px);
    }
    .btn-close-toast {
      background: none;
      border: none;
      color: #fca5a5;
      cursor: pointer;
      font-size: 14px;
    }

    /* DECK MODAL */
    .deck-modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(10px);
      z-index: 999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      animation: fadeIn 0.2s ease;
    }

    .deck-modal {
      max-width: 900px;
      width: 100%;
      max-height: 88vh;
      background: #0f172a;
      border: 1px solid rgba(56, 189, 248, 0.35);
      border-radius: 20px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.8), 0 0 35px rgba(56, 189, 248, 0.2);
    }

    .deck-modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 18px 24px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      background: rgba(255, 255, 255, 0.02);
    }

    .deck-modal-title h3 {
      font-size: 18px;
      font-weight: 800;
      color: #38bdf8;
      margin: 0;
    }
    .deck-count-badge {
      font-size: 11px;
      font-weight: 700;
      color: #94a3b8;
    }

    .deck-filter-tabs {
      display: flex;
      gap: 8px;
      padding: 12px 24px;
      background: rgba(0, 0, 0, 0.2);
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      overflow-x: auto;
    }

    .deck-tab {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #94a3b8;
      padding: 6px 14px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
      white-space: nowrap;
    }
    .deck-tab.active, .deck-tab:hover {
      background: rgba(56, 189, 248, 0.15);
      border-color: #38bdf8;
      color: #38bdf8;
    }

    .deck-cards-grid {
      padding: 20px 24px;
      overflow-y: auto;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
      gap: 14px;
    }

    .deck-card-tile {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 8px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .deck-card-tile:hover {
      transform: translateY(-3px) scale(1.03);
      border-color: #38bdf8;
      box-shadow: 0 8px 20px rgba(56, 189, 248, 0.2);
    }

    .tile-img-box {
      width: 100%;
      aspect-ratio: 2.5 / 3.5;
      border-radius: 8px;
      overflow: hidden;
      background: #020617;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .tile-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .tile-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .tile-name {
      font-size: 12px;
      font-weight: 800;
      color: #f8fafc;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .tile-sub {
      font-size: 10px;
      font-weight: 600;
      color: #64748b;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .deck-loading-state {
      padding: 48px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 16px;
      color: #94a3b8;
      font-size: 14px;
      font-weight: 600;
    }

    .btn-secondary-glow {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #f8fafc;
      padding: 12px 24px;
      border-radius: 10px;
      font-weight: 700;
      font-size: 15px;
      cursor: pointer;
      transition: background 0.2s ease;
    }
    .btn-secondary-glow:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    @media (max-width: 860px) {
      .lobby-hero-card {
        grid-template-columns: 1fr;
      }
      .bot-showcase {
        display: none;
      }
    }

    /* FULL VIEWPORT TABLETOP BACKGROUND (Warm Wood Grain) */
    .ptcgo-viewport {
      height: 100vh;
      max-height: 100vh;
      width: 100%;
      background: radial-gradient(ellipse at 50% 50%, #4a2810 0%, #2f1708 60%, #150904 100%);
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 6px 14px 8px;
      box-sizing: border-box;
    }

    /* Wood planks subtle styling */
    .ptcgo-viewport::before {
      content: '';
      position: absolute;
      inset: 0;
      background-image: 
        repeating-linear-gradient(90deg, rgba(0, 0, 0, 0.12) 0px, rgba(0, 0, 0, 0.12) 2px, transparent 2px, transparent 180px),
        repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.02) 0px, rgba(255, 255, 255, 0.02) 1px, transparent 1px, transparent 4px);
      pointer-events: none;
      opacity: 0.6;
    }

    /* TOP HUD BAR */
    .ptcgo-top-hud {
      width: 100%;
      max-width: 1720px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      z-index: 50;
      margin-bottom: 6px;
      flex-shrink: 0;
    }

    /* MAIN TWO-COLUMN BATTLE LAYOUT */
    .ptcgo-battle-layout {
      flex: 1;
      min-height: 0;
      display: flex;
      gap: 14px;
      width: 100%;
      max-width: 1720px;
      margin: 0 auto;
      align-items: stretch;
      justify-content: center;
    }

    /* PROFILE PILLS (Kendall & ElGibbo) */
    .profile-pill {
      display: flex;
      align-items: center;
      gap: 10px;
      background: linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.9));
      border: 2px solid #0284c7;
      border-radius: 16px;
      padding: 6px 12px;
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.6), inset 0 1px 2px rgba(255, 255, 255, 0.2);
    }
    .avatar-box {
      width: 64px;
      height: 64px;
      border-radius: 16px;
      overflow: hidden;
      border: 2.5px solid #38bdf8;
      background: #0f172a;
      flex-shrink: 0;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.6), 0 0 12px rgba(56, 189, 248, 0.35);
    }
    .avatar-svg {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .profile-meta {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .player-name-tag {
      font-family: 'Outfit', sans-serif;
      font-size: 13px;
      font-weight: 800;
      color: #f8fafc;
      letter-spacing: 0.5px;
    }
    .meta-counters {
      display: flex;
      gap: 8px;
    }
    .counter-badge {
      font-size: 11px;
      font-weight: 800;
      padding: 1px 6px;
      border-radius: 6px;
      background: rgba(15, 23, 42, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #38bdf8;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .prize-badge {
      color: #f59e0b;
      border-color: rgba(245, 158, 11, 0.4);
    }

    /* PLAYER PILL FIXED AT BOTTOM-RIGHT */
    .player-pill {
      position: fixed;
      bottom: 14px;
      right: 18px;
      z-index: 100;
      border-color: #38bdf8;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.7), 0 0 15px rgba(56, 189, 248, 0.3);
    }

    /* CENTER ZONE */
    .hud-center-zone {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .turn-indicator-pill {
      background: rgba(15, 23, 42, 0.85);
      border: 1.5px solid rgba(255, 255, 255, 0.15);
      padding: 6px 18px;
      border-radius: 20px;
      display: flex;
      align-items: center;
      gap: 10px;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
    }
    .turn-indicator-pill.my-turn {
      border-color: #22c55e;
      background: linear-gradient(135deg, rgba(34, 197, 94, 0.25), rgba(15, 23, 42, 0.9));
      box-shadow: 0 0 18px rgba(34, 197, 94, 0.4);
      animation: pulse-glow 2s infinite ease-in-out;
    }
    .turn-round-tag {
      font-size: 10px;
      font-weight: 700;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .turn-text {
      font-family: 'Outfit', sans-serif;
      font-weight: 800;
      font-size: 14px;
      letter-spacing: 0.5px;
    }
    .my-turn-text { color: #4ade80; }
    .opp-turn-text { color: #cbd5e1; }

    .room-code-pill {
      background: rgba(15, 23, 42, 0.75);
      border: 1px dashed rgba(56, 189, 248, 0.5);
      padding: 5px 12px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      gap: 6px;
      font-family: monospace;
      font-size: 12px;
      cursor: pointer;
      color: #38bdf8;
      transition: all 0.2s;
    }
    .room-code-pill:hover {
      background: rgba(56, 189, 248, 0.15);
      border-color: #38bdf8;
    }
    .room-label { font-size: 9px; color: #94a3b8; font-weight: 700; }
    .room-val { font-weight: 800; }

    /* RIGHT CONTROLS */
    .hud-right-zone {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .ptcgo-icon-btn {
      width: 38px;
      height: 38px;
      border-radius: 10px;
      background: linear-gradient(180deg, #4ade80 0%, #22c55e 50%, #15803d 100%);
      border: 1.5px solid #166534;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.4);
      color: #fff;
      font-size: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      position: relative;
      transition: transform 0.15s ease, filter 0.15s ease;
    }
    .ptcgo-icon-btn:hover {
      transform: translateY(-2px);
      filter: brightness(1.1);
    }
    .btn-assistant-toggle {
      background: linear-gradient(180deg, #38bdf8 0%, #0284c7 50%, #0369a1 100%);
      border-color: #075985;
    }
    .btn-assistant-toggle.active {
      box-shadow: 0 0 14px rgba(56, 189, 248, 0.8);
    }
    .btn-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      background: #ef4444;
      color: #fff;
      font-size: 10px;
      font-weight: 900;
      border-radius: 50%;
      width: 17px;
      height: 17px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1.5px solid #fff;
    }

    /* ARENA STAGE (Compact Left Column) */
    .ptcgo-arena-stage {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      position: relative;
      z-index: 10;
    }

    /* OPPONENT HAND RACK (Top edge face-down cards) */
    .opp-hand-rack {
      display: flex;
      justify-content: center;
      gap: 5px;
      margin-bottom: -10px;
      z-index: 25;
    }
    .opp-hand-card {
      width: 44px;
      height: 58px;
      border-radius: 4px;
      background: #172554;
      border: 1px solid #3b82f6;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.7);
      position: relative;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .mini-card-back {
      width: 85%;
      height: 85%;
      border-radius: 3px;
      border: 1px solid #f59e0b;
      background: radial-gradient(circle at 50% 50%, #1e40af 0%, #0f172a 100%);
    }

    /* THE BATTLE PLAYMAT BOARD */
    .ptcgo-playmat-board {
      width: 100%;
      flex: 1;
      min-height: 380px;
      max-height: calc(100vh - 215px);
      border: 8px solid #232a35;
      border-radius: 22px;
      box-shadow:
        0 20px 50px rgba(0, 0, 0, 0.85),
        0 0 0 2px #3e4a5d,
        inset 0 2px 4px rgba(255, 255, 255, 0.15),
        inset 0 -4px 10px rgba(0, 0, 0, 0.8);
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    /* FIELD HALVES (Top Crimson / Bottom Sapphire) */
    .field-half {
      flex: 1;
      min-height: 0;
      display: grid;
      grid-template-columns: 120px 1fr 120px;
      padding: 6px 12px;
      position: relative;
      z-index: 2;
    }

    /* Opponent Crimson Half */
    .opp-half {
      background: radial-gradient(ellipse at 50% 30%, #831821 0%, #540e14 70%, #2f060a 100%);
      border-bottom: 2px solid #0f172a;
    }

    /* Player Sapphire Half */
    .player-half {
      background: radial-gradient(ellipse at 50% 70%, #153c70 0%, #0d2548 70%, #061226 100%);
      border-top: 2px solid #0f172a;
    }

    /* DOCK COLUMNS */
    .dock-zone {
      display: flex;
      flex-direction: column;
      gap: 8px;
      z-index: 5;
    }
    .dock-left { align-items: flex-start; }
    .dock-right { align-items: flex-end; }

    /* 3D DECK STACK */
    .deck-stack-3d {
      width: 52px;
      height: 72px;
      position: relative;
      cursor: default;
    }
    .deck-shadow {
      position: absolute;
      inset: 3px -3px -3px 3px;
      background: #000;
      border-radius: 6px;
      filter: blur(3px);
      opacity: 0.6;
    }
    .deck-card-back {
      position: absolute;
      inset: 0;
      border-radius: 6px;
      background: linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%);
      border: 2px solid #3b82f6;
      box-shadow: -2px -2px 0 #1e293b, -3px -3px 0 #0f172a;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .player-deck-back {
      border-color: #38bdf8;
    }
    .deck-num-overlay {
      font-family: 'Outfit', sans-serif;
      font-size: 14px;
      font-weight: 900;
      color: #38bdf8;
      text-shadow: 0 2px 5px rgba(0, 0, 0, 0.9);
    }

    /* DISCARD ZONES */
    .discard-zone {
      width: 52px;
      height: 72px;
      border-radius: 6px;
      border: 1.5px dashed rgba(255, 255, 255, 0.2);
      background: rgba(15, 23, 42, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .discard-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      color: #cbd5e1;
    }
    .discard-icon { font-size: 16px; }
    .discard-count { font-weight: 800; font-size: 12px; }
    .discard-empty, .stadium-slot {
      font-size: 9px;
      font-weight: 700;
      color: rgba(255, 255, 255, 0.25);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .stadium-slot {
      width: 52px;
      height: 72px;
      border-radius: 6px;
      border: 1.5px dashed rgba(255, 255, 255, 0.15);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* 3D DECK BOXES */
    .deckbox-3d {
      width: 56px;
      height: 70px;
      border-radius: 6px;
      position: relative;
      box-shadow: 0 8px 18px rgba(0, 0, 0, 0.7);
      perspective: 600px;
    }
    .deckbox-top {
      height: 12px;
      border-radius: 6px 6px 0 0;
      background: #0f172a;
      border-bottom: 1.5px solid rgba(0, 0, 0, 0.4);
    }
    .deckbox-front {
      height: 58px;
      border-radius: 0 0 6px 6px;
      overflow: hidden;
      display: flex;
    }
    .opp-deckbox .deckbox-top { background: #ca8a04; }
    .opp-deckbox .yellow-side {
      flex: 1;
      background: linear-gradient(180deg, #eab308 0%, #ca8a04 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
    }
    .opp-deckbox .dark-side {
      flex: 1;
      background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
    }
    .player-deckbox .deckbox-top { background: #0c4a6e; }
    .guardians-front {
      background: linear-gradient(180deg, #0284c7 0%, #1e3a8a 50%, #4c1d95 100%);
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2px;
      text-align: center;
    }
    .db-brand {
      font-size: 6px;
      font-weight: 900;
      color: #fde047;
    }
    .db-title {
      font-family: 'Outfit', sans-serif;
      font-size: 7px;
      font-weight: 900;
      color: #fff;
      line-height: 1;
    }
    .db-sub {
      font-size: 5px;
      font-weight: 800;
      color: #38bdf8;
    }

    /* PRIZE ZONES */
    .ptcgo-prizes-zone {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      background: rgba(15, 23, 42, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 8px;
      padding: 4px 6px;
      width: 104px;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.4);
    }
    .opp-prizes-zone { border-color: rgba(239, 68, 68, 0.3); }
    .player-prizes-zone { border-color: rgba(234, 179, 8, 0.4); }
    .prize-zone-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1px;
      width: 100%;
    }
    .prize-tag {
      font-size: 8px;
      font-weight: 800;
      letter-spacing: 0.4px;
      text-transform: uppercase;
    }
    .opp-prize-tag { color: #f87171; }
    .player-prize-tag { color: #fbbf24; }
    .prize-taken-info {
      font-size: 9px;
      font-weight: 600;
      color: #94a3b8;
    }
    .player-taken-info { color: #fef08a; }
    .prize-cards-stack {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 2px;
      width: 100%;
      margin: 2px 0;
    }
    .prize-card-back {
      width: 100%;
      height: 18px;
      border-radius: 2.5px;
      background: linear-gradient(135deg, #1e3a8a 0%, #1e1b4b 100%);
      border: 1px solid #3b82f6;
    }
    .opp-prize {
      background: linear-gradient(135deg, #881337 0%, #3f0f1d 100%);
      border-color: #f43f5e;
    }
    .prize-card-empty {
      width: 100%;
      height: 18px;
      border-radius: 2.5px;
      border: 1px dashed rgba(255, 255, 255, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 9px;
      background: rgba(255, 255, 255, 0.03);
    }
    .player-empty-slot { border-color: rgba(234, 179, 8, 0.4); color: #fde047; }
    .opp-empty-slot { border-color: rgba(239, 68, 68, 0.4); color: #fca5a5; }
    .prize-counter-num {
      font-size: 15px;
      font-weight: 900;
      color: #f8fafc;
      line-height: 1;
    }
    .player-counter-num {
      color: #fbbf24;
      text-shadow: 0 0 6px rgba(251, 191, 36, 0.5);
    }
    .prize-footer-hint {
      font-size: 8px;
      font-weight: 600;
      color: #64748b;
      text-align: center;
    }
    .player-footer-hint { color: #a1a1aa; }

    /* DECK META TAG */
    .dock-meta-tag {
      font-size: 9px;
      font-weight: 700;
      padding: 1px 6px;
      border-radius: 4px;
      background: rgba(15, 23, 42, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #cbd5e1;
      margin-top: 2px;
      white-space: nowrap;
    }
    .opp-deck-tag { border-color: rgba(239, 68, 68, 0.3); color: #fca5a5; }
    .player-deck-tag { border-color: rgba(56, 189, 248, 0.3); color: #7dd3fc; }

    /* GLOSSY GREEN "DONE" BUTTON */
    .done-action-box {
      margin-top: auto;
    }
    .btn-ptcgo-done {
      width: 92px;
      height: 32px;
      border-radius: 16px;
      background: linear-gradient(180deg, #6ee7b7 0%, #22c55e 50%, #15803d 100%);
      border: 1.5px solid #166534;
      box-shadow: 0 4px 12px rgba(34, 197, 94, 0.5);
      color: #ffffff;
      font-family: 'Outfit', sans-serif;
      font-size: 14px;
      font-weight: 900;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
    }
    .btn-ptcgo-done:hover:not(:disabled) {
      transform: translateY(-1px) scale(1.03);
    }
    .btn-ptcgo-done:disabled {
      opacity: 0.4;
      cursor: not-allowed;
      filter: grayscale(0.6);
    }

    /* BENCH TRAYS */
    .center-bench-container {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 100%;
    }
    .opp-half .center-bench-container {
      align-items: flex-start;
      padding-top: 2px;
    }
    .player-half .center-bench-container {
      align-items: flex-end;
      padding-bottom: 22px;
    }
    .bench-tray {
      background: #18202b;
      border: 2.5px solid #2e3846;
      border-radius: 14px;
      padding: 4px 10px;
      display: flex;
      gap: 8px;
      box-shadow: inset 0 4px 10px rgba(0, 0, 0, 0.8);
      min-width: 560px;
      min-height: 154px;
      justify-content: center;
      align-items: center;
    }
    .bench-slot {
      width: 104px;
      height: 148px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .bench-slot app-card {
      transform: scale(0.72);
      transform-origin: center;
    }
    .empty-bench-placeholder {
      width: 100%;
      height: 100%;
      border: 1.5px dashed rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: rgba(255, 255, 255, 0.15);
      font-size: 11px;
      font-weight: 700;
    }

    /* CENTER POKÉBALL ARENA */
    .center-pokeball-arena {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 360px;
      height: 360px;
      z-index: 8;
      pointer-events: none;
    }
    .pokeball-disc {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      border: 8px solid #141b24;
      box-shadow: 0 0 30px rgba(0, 0, 0, 0.85), inset 0 0 18px rgba(0, 0, 0, 0.6);
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .pb-half {
      flex: 1;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .pb-top-half {
      background: radial-gradient(circle at 50% 30%, #dc2626 0%, #991b1b 100%);
    }
    .pb-top-arc {
      position: absolute;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 190px;
      height: 95px;
      border-radius: 95px 95px 0 0;
      border: 8px solid rgba(0, 0, 0, 0.25);
      border-bottom: none;
    }
    .pb-bottom-half {
      background: radial-gradient(circle at 50% 70%, #f8fafc 0%, #cbd5e1 60%, #94a3b8 100%);
    }
    .pb-bottom-arc {
      position: absolute;
      top: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 190px;
      height: 95px;
      border-radius: 0 0 95px 95px;
      border: 8px solid rgba(0, 0, 0, 0.15);
      border-top: none;
    }
    .pb-midline-strip {
      height: 8px;
      background: #0f172a;
      width: 100%;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 12;
    }
    .pb-core-button {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: #0f172a;
      border: 3.5px solid #1e293b;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 12px rgba(0, 0, 0, 0.85);
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    }
    .pb-core-inner {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: radial-gradient(circle at 35% 35%, #ffffff 0%, #e2e8f0 60%, #94a3b8 100%);
      border: 2px solid #64748b;
    }
    .active-spot-frame {
      pointer-events: auto;
      z-index: 15;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 120px;
      height: 170px;
    }
    .active-spot-frame app-card {
      transform: scale(0.83);
      transform-origin: center;
    }
    .opp-active-frame { margin-bottom: 4px; }
    .player-active-frame { margin-top: 4px; }
    .active-empty-label {
      font-size: 11px;
      font-weight: 800;
      color: rgba(255, 255, 255, 0.45);
      text-transform: uppercase;
    }
    .player-empty-label { color: rgba(15, 23, 42, 0.35); }

    /* CONDITION COIN */
    .condition-coin {
      position: absolute;
      width: 30px;
      height: 30px;
      border-radius: 50%;
      z-index: 20;
      pointer-events: auto;
      filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.6));
    }
    .opp-coin { left: 18px; top: 48px; }
    .player-coin { right: 18px; bottom: 48px; }
    .coin-svg { width: 100%; height: 100%; }

    /* GX MARKER BOX */
    .gx-marker-box {
      width: 62px;
      height: 32px;
      border-radius: 5px;
      overflow: hidden;
    }
    .gx-marker-img { width: 100%; height: 100%; object-fit: cover; }

    /* PLAYER HAND (Shelf at Bottom Edge) */
    .player-hand-shelf {
      width: 100%;
      display: flex;
      justify-content: center;
      margin-top: -38px;
      z-index: 35;
      pointer-events: none;
    }
    .hand-cards-fan {
      display: flex;
      gap: 0px;
      align-items: flex-end;
      padding-bottom: 2px;
    }
    .hand-card-wrapper {
      pointer-events: auto;
      transform: scale(0.95);
      transform-origin: bottom center;
      margin: 0 -10px;
      transition: transform 0.18s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      cursor: pointer;
    }
    .hand-card-wrapper:hover {
      transform: translateY(-38px) scale(1.08);
      z-index: 55;
      margin: 0 8px;
    }

    /* PLAYER PILL (Bottom Right of Arena Stage) */
    .profile-pill.player-pill {
      position: absolute;
      bottom: 4px;
      right: 8px;
      z-index: 40;
      padding: 4px 10px;
    }

    /* CONTEXTUAL CARD ACTIONS MODAL */
    .context-actions-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px);
      z-index: 200;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .context-actions-modal {
      background: #1e293b;
      border: 2px solid #38bdf8;
      border-radius: 16px;
      padding: 18px;
      width: 320px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.8);
    }
    .cam-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      padding-bottom: 8px;
    }
    .cam-header h4 {
      font-size: 14px;
      color: #f1f5f9;
    }
    .btn-cam-close {
      background: none;
      border: none;
      color: #94a3b8;
      font-size: 16px;
      cursor: pointer;
    }
    .cam-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .btn-cam-move {
      background: rgba(30, 41, 59, 0.9);
      border: 1px solid #38bdf8;
      border-radius: 10px;
      padding: 10px 14px;
      display: flex;
      align-items: center;
      gap: 12px;
      color: #fff;
      cursor: pointer;
      text-align: left;
      transition: all 0.15s ease;
    }
    .btn-cam-move:hover {
      background: #0284c7;
      transform: translateY(-2px);
    }
    .cam-icon { font-size: 20px; }
    .cam-details { display: flex; flex-direction: column; }
    .cam-label { font-weight: 700; font-size: 13px; }
    .cam-sub { font-size: 11px; color: #cbd5e1; }

    /* ROTOM ASSISTANT DRAWER */
    .rotom-drawer {
      position: fixed;
      top: 0;
      left: -400px;
      width: 380px;
      height: 100vh;
      background: rgba(15, 23, 42, 0.96);
      backdrop-filter: blur(16px);
      border-right: 2px solid rgba(56, 189, 248, 0.3);
      box-shadow: 10px 0 30px rgba(0, 0, 0, 0.7);
      z-index: 300;
      transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      flex-direction: column;
    }
    .rotom-drawer.drawer-open {
      left: 0;
    }
    .rotom-drawer-header {
      padding: 18px 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .rd-avatar {
      font-size: 28px;
      width: 46px;
      height: 46px;
      border-radius: 12px;
      background: linear-gradient(135deg, #ef4444, #f97316);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
    }
    .rd-title-group h3 {
      font-size: 16px;
      color: #f87171;
    }
    .rd-title-group p {
      font-size: 11px;
      color: #94a3b8;
    }
    .btn-drawer-close {
      margin-left: auto;
      background: none;
      border: none;
      color: #94a3b8;
      font-size: 18px;
      cursor: pointer;
    }
    .rotom-drawer-body {
      flex: 1;
      overflow-y: auto;
      padding: 18px 20px;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .section-title {
      font-size: 12px;
      font-weight: 800;
      color: #cbd5e1;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    .tip-card {
      background: rgba(245, 158, 11, 0.12);
      border-left: 3px solid #f59e0b;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 12px;
      color: #fde68a;
      margin-bottom: 6px;
    }
    .moves-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .btn-move-item {
      background: rgba(30, 41, 59, 0.9);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 10px;
      padding: 10px 12px;
      display: flex;
      align-items: center;
      gap: 12px;
      color: #fff;
      cursor: pointer;
      text-align: left;
      transition: all 0.15s ease;
    }
    .btn-move-item:hover {
      transform: translateX(4px);
    }
    .btn-attack { border-color: #ef4444; background: rgba(239, 68, 68, 0.15); }
    .btn-energy { border-color: #eab308; background: rgba(234, 179, 8, 0.15); }
    .btn-evolve { border-color: #10b981; background: rgba(16, 185, 129, 0.15); }
    .btn-bench { border-color: #38bdf8; background: rgba(56, 189, 248, 0.15); }
    .btn-trainer { border-color: #a855f7; background: rgba(168, 85, 247, 0.15); }
    .btn-retreat { border-color: #94a3b8; }
    .btn-pass { border-color: #64748b; }
    .m-icon { font-size: 20px; }
    .m-info { display: flex; flex-direction: column; gap: 2px; }
    .m-name { font-weight: 700; font-size: 13px; }
    .m-desc { font-size: 11px; color: #94a3b8; }
    .no-moves-notice {
      font-size: 12px;
      color: #94a3b8;
      font-style: italic;
    }

    /* ERROR ALERT */
    .ptcgo-alert-error {
      position: fixed;
      top: 60px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(239, 68, 68, 0.95);
      color: #fff;
      padding: 10px 20px;
      border-radius: 10px;
      font-weight: 700;
      font-size: 14px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
      z-index: 500;
    }

    /* WAITING SCREEN */
    .screen-waiting {
      max-width: 580px;
      margin: 80px auto;
      padding: 36px;
      text-align: center;
      background: rgba(15, 23, 42, 0.9);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 20px;
      box-shadow: 0 25px 50px rgba(0, 0, 0, 0.8);
      z-index: 100;
    }

    /* =========================================================================
       GAME OVER FULL-SCREEN MODAL & BOARD TRANSPARENCY BACKDROP
       ========================================================================= */
    .gameover-modal-backdrop {
      position: fixed;
      inset: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(4, 7, 15, 0.76);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      animation: gameoverFadeIn 0.35s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes gameoverFadeIn {
      from {
        opacity: 0;
        backdrop-filter: blur(0px);
      }
      to {
        opacity: 1;
        backdrop-filter: blur(8px);
      }
    }

    .gameover-modal-card {
      position: relative;
      max-width: 500px;
      width: 100%;
      background: linear-gradient(160deg, rgba(15, 23, 42, 0.95) 0%, rgba(17, 24, 39, 0.98) 100%);
      border: 1px solid rgba(56, 189, 248, 0.35);
      border-radius: 24px;
      padding: 36px 32px 32px;
      text-align: center;
      box-shadow: 0 25px 60px -10px rgba(0, 0, 0, 0.85), 0 0 40px rgba(56, 189, 248, 0.15);
      animation: gameoverCardPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
      overflow: hidden;
    }

    .gameover-modal-card.is-winner {
      border: 1px solid rgba(245, 158, 11, 0.5);
      box-shadow: 0 25px 60px -10px rgba(0, 0, 0, 0.9), 0 0 50px rgba(245, 158, 11, 0.25);
    }

    .modal-ambient-glow {
      position: absolute;
      top: -60px;
      left: 50%;
      transform: translateX(-50%);
      width: 260px;
      height: 180px;
      background: radial-gradient(ellipse at center, rgba(56, 189, 248, 0.22) 0%, transparent 70%);
      pointer-events: none;
    }

    .gameover-modal-card.is-winner .modal-ambient-glow {
      background: radial-gradient(ellipse at center, rgba(245, 158, 11, 0.3) 0%, transparent 70%);
    }

    @keyframes gameoverCardPop {
      0% {
        transform: scale(0.85) translateY(20px);
        opacity: 0;
      }
      100% {
        transform: scale(1) translateY(0);
        opacity: 1;
      }
    }

    .trophy-badge-container {
      position: relative;
      width: 84px;
      height: 84px;
      margin: 0 auto 14px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .trophy-halo {
      position: absolute;
      inset: -10px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(245, 158, 11, 0.25) 0%, transparent 70%);
      animation: pulseHalo 2.5s infinite ease-in-out;
    }

    .gameover-modal-card.is-loser .trophy-halo {
      background: radial-gradient(circle, rgba(56, 189, 248, 0.2) 0%, transparent 70%);
    }

    @keyframes pulseHalo {
      0%, 100% { transform: scale(0.9); opacity: 0.6; }
      50% { transform: scale(1.15); opacity: 1; }
    }

    .trophy-icon-wrap {
      position: relative;
      z-index: 1;
      width: 72px;
      height: 72px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      background: rgba(15, 23, 42, 0.85);
      border: 2px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
    }

    .winner-svg-trophy {
      width: 44px;
      height: 44px;
      filter: drop-shadow(0 4px 8px rgba(0,0,0,0.5));
    }

    .gameover-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 14px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      margin-bottom: 10px;
    }

    .gameover-pill.winner-pill {
      background: rgba(245, 158, 11, 0.15);
      border: 1px solid rgba(245, 158, 11, 0.4);
      color: #fbbf24;
      box-shadow: 0 0 15px rgba(245, 158, 11, 0.2);
    }

    .gameover-pill.loser-pill {
      background: rgba(56, 189, 248, 0.12);
      border: 1px solid rgba(56, 189, 248, 0.3);
      color: #7dd3fc;
    }

    .winner-title {
      font-size: 24px;
      font-weight: 800;
      color: #f8fafc;
      margin: 0 0 14px;
      letter-spacing: -0.3px;
      line-height: 1.25;
      text-shadow: 0 2px 10px rgba(0,0,0,0.6);
    }

    .winner-reason-card {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 10px 16px;
      margin: 0 auto 22px;
      max-width: 92%;
    }

    .reason-icon {
      width: 18px;
      height: 18px;
      color: #94a3b8;
      flex-shrink: 0;
    }

    .winner-reason-text {
      font-size: 13.5px;
      font-weight: 500;
      color: #cbd5e1;
      line-height: 1.4;
    }

    .gameover-actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin-top: 4px;
    }

    .btn-lobby-return {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      background: linear-gradient(135deg, #0284c7 0%, #2563eb 100%);
      color: #ffffff;
      border: 1px solid rgba(255, 255, 255, 0.2);
      padding: 13px 28px;
      border-radius: 14px;
      font-weight: 700;
      font-size: 14.5px;
      letter-spacing: 0.3px;
      cursor: pointer;
      box-shadow: 0 8px 24px -4px rgba(37, 99, 235, 0.5), 0 0 12px rgba(2, 132, 199, 0.3);
      transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .btn-lobby-return:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 30px -4px rgba(37, 99, 235, 0.7), 0 0 20px rgba(56, 189, 248, 0.5);
      filter: brightness(1.08);
    }

    .btn-lobby-return:active {
      transform: translateY(0);
    }

    .btn-home-svg {
      width: 18px;
      height: 18px;
    }

    .btn-inspect-board {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      background: rgba(255, 255, 255, 0.08);
      color: #94a3b8;
      border: 1px solid rgba(255, 255, 255, 0.15);
      padding: 13px 20px;
      border-radius: 14px;
      font-weight: 600;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-inspect-board:hover {
      background: rgba(255, 255, 255, 0.15);
      color: #ffffff;
      border-color: rgba(255, 255, 255, 0.3);
    }

    .btn-inspect-svg {
      width: 16px;
      height: 16px;
    }

    .gameover-minimized-banner {
      position: fixed;
      top: 18px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 10000;
      display: flex;
      align-items: center;
      gap: 16px;
      background: rgba(15, 23, 42, 0.92);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(56, 189, 248, 0.4);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.7), 0 0 20px rgba(56, 189, 248, 0.2);
      border-radius: 9999px;
      padding: 8px 18px;
      animation: fadeInDown 0.3s ease;
    }

    .minimized-info {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #e2e8f0;
    }

    .minimized-trophy {
      font-size: 16px;
    }

    .minimized-buttons {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .btn-mini-show {
      background: #38bdf8;
      color: #0f172a;
      border: none;
      padding: 6px 14px;
      border-radius: 20px;
      font-weight: 700;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-mini-show:hover {
      background: #7dd3fc;
      transform: scale(1.04);
    }

    .btn-mini-leave {
      background: rgba(255, 255, 255, 0.1);
      color: #cbd5e1;
      border: 1px solid rgba(255, 255, 255, 0.2);
      padding: 6px 14px;
      border-radius: 20px;
      font-weight: 600;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-mini-leave:hover {
      background: rgba(239, 68, 68, 0.2);
      color: #fca5a5;
      border-color: rgba(239, 68, 68, 0.4);
    }
    .room-code-box {
      background: rgba(15, 23, 42, 0.8);
      border: 2px dashed #38bdf8;
      border-radius: 12px;
      padding: 20px;
      margin: 24px 0;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
    }
    .code-text {
      font-family: monospace;
      font-size: 38px;
      font-weight: 800;
      letter-spacing: 6px;
      color: #38bdf8;
    }
    .btn-copy {
      background: #38bdf8;
      color: #0f172a;
      border: none;
      padding: 8px 18px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 13px;
      cursor: pointer;
    }
    .trophy-emoji {
      font-size: 60px;
      margin-bottom: 12px;
    }
    .btn-primary-glow {
      background: linear-gradient(135deg, #38bdf8, #2563eb);
      color: #fff;
      border: none;
      padding: 14px 28px;
      border-radius: 10px;
      font-weight: 800;
      font-size: 16px;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(56, 189, 248, 0.4);
      margin: 0;
    }
    .gameover-actions {
      margin-top: 20px;
    }
    .waiting-creator-tag {
      font-size: 14px;
      color: #94a3b8;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      padding: 6px 14px;
      border-radius: 20px;
      display: inline-block;
      margin: 10px 0 16px 0;
    }
    .waiting-creator-tag b {
      color: #38bdf8;
    }
    .code-label {
      font-size: 11px;
      letter-spacing: 2px;
      font-weight: 700;
      color: #94a3b8;
    }
    .waiting-actions {
      margin-top: 18px;
    }
    .btn-cancel-waiting {
      background: rgba(239, 68, 68, 0.15);
      color: #fca5a5;
      border: 1px solid rgba(239, 68, 68, 0.4);
      padding: 10px 22px;
      border-radius: 10px;
      font-weight: 700;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .btn-cancel-waiting:hover {
      background: rgba(239, 68, 68, 0.35);
      color: #fff;
    }
    .waiting-pill {
      border-color: rgba(245, 158, 11, 0.35) !important;
      background: rgba(245, 158, 11, 0.08) !important;
    }
    .waiting-avatar {
      font-size: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: pulse 1.5s infinite;
    }
    .waiting-subtext {
      font-size: 10px;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .waiting-turn-pill {
      background: rgba(245, 158, 11, 0.15) !important;
      border: 1px solid rgba(245, 158, 11, 0.4) !important;
    }
    .bg-amber {
      background: #f59e0b !important;
      color: #0f172a !important;
      font-weight: 800;
    }
    .text-amber {
      color: #fbbf24 !important;
    }

    /* CARD INSPECTION MODAL */
    .card-inspect-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(8px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card-inspect-modal {
      background: #1e293b;
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 20px;
      max-width: 680px;
      width: 100%;
      padding: 28px;
      position: relative;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.9);
    }
    .btn-close-inspect {
      position: absolute;
      top: 18px;
      right: 18px;
      background: rgba(255, 255, 255, 0.1);
      border: none;
      color: #fff;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      cursor: pointer;
      font-size: 16px;
    }
    .inspect-body {
      display: flex;
      gap: 28px;
      align-items: flex-start;
    }
    .inspect-card-preview {
      transform: scale(1.15);
      transform-origin: top left;
      flex-shrink: 0;
      margin-right: 28px;
      margin-top: 10px;
    }
    .inspect-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .inspect-type-tag {
      display: inline-block;
      font-size: 11px;
      font-weight: 700;
      color: #fff;
      padding: 2px 8px;
      border-radius: 6px;
      margin-top: 4px;
    }
    .hp-stat-bar {
      height: 8px;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.1);
      overflow: hidden;
      margin: 6px 0;
    }
    .hp-bar-fill {
      height: 100%;
      background: #ef4444;
      border-radius: 4px;
    }
    .inspect-section h4 {
      font-size: 13px;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }
    .ia-head {
      display: flex;
      justify-content: space-between;
      margin-bottom: 2px;
    }
    .ia-dmg {
      color: #f59e0b;
      font-weight: 700;
    }

    /* =========================================================================
       LIVE STREAM SIDEBAR (BROADCAST CHAT & DYNAMIC GUIDANCE)
       ========================================================================= */
    .live-stream-sidebar {
      width: 360px;
      min-width: 330px;
      max-width: 400px;
      height: 100%;
      max-height: calc(100vh - 76px);
      display: flex;
      flex-direction: column;
      gap: 10px;
      background: rgba(15, 23, 42, 0.88);
      border: 1px solid rgba(56, 189, 248, 0.3);
      border-radius: 16px;
      padding: 12px;
      box-shadow: 0 16px 36px rgba(0, 0, 0, 0.7), 0 0 20px rgba(56, 189, 248, 0.1);
      backdrop-filter: blur(16px);
      box-sizing: border-box;
      overflow: hidden;
      flex-shrink: 0;
    }

    .stream-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 8px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      flex-shrink: 0;
    }
    .stream-live-tag {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 11px;
      font-weight: 800;
      color: #38bdf8;
      letter-spacing: 0.8px;
      text-transform: uppercase;
    }
    .pulse-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #ef4444;
      box-shadow: 0 0 10px #ef4444;
      animation: ticker-pulse 1.5s infinite;
    }
    @keyframes ticker-pulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.35); opacity: 0.55; }
    }
    .btn-stream-rules {
      background: rgba(234, 179, 8, 0.18);
      border: 1px solid rgba(234, 179, 8, 0.45);
      border-radius: 8px;
      color: #fbbf24;
      font-size: 11px;
      font-weight: 700;
      padding: 4px 10px;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .btn-stream-rules:hover {
      background: rgba(234, 179, 8, 0.35);
      border-color: #fde047;
      transform: translateY(-1px);
    }

    /* DYNAMIC GUIDANCE CARD */
    .guidance-card {
      background: rgba(30, 41, 59, 0.75);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 12px;
      padding: 10px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      flex-shrink: 0;
      transition: border-color 0.25s ease, box-shadow 0.25s ease;
    }
    .guidance-card.turn-mine {
      border-color: rgba(34, 197, 94, 0.45);
      box-shadow: 0 0 16px rgba(34, 197, 94, 0.12);
    }
    .guidance-card.turn-opp {
      border-color: rgba(239, 68, 68, 0.35);
      box-shadow: 0 0 16px rgba(239, 68, 68, 0.08);
    }

    .guidance-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .guidance-badge {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .gb-icon {
      font-size: 13px;
    }
    .gb-title {
      font-size: 11.5px;
      font-weight: 800;
      letter-spacing: 0.5px;
      color: #f8fafc;
    }
    .turn-mine .gb-title {
      color: #86efac;
    }
    .turn-opp .gb-title {
      color: #fca5a5;
    }
    .gb-prize-counter {
      font-size: 11px;
      font-weight: 800;
      color: #fbbf24;
      background: rgba(234, 179, 8, 0.15);
      border: 1px solid rgba(234, 179, 8, 0.3);
      padding: 2px 8px;
      border-radius: 6px;
    }

    .guidance-body {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .guidance-step {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      background: rgba(15, 23, 42, 0.55);
      border: 1px solid rgba(255, 255, 255, 0.07);
      border-radius: 8px;
      padding: 5px 8px;
      font-size: 11.5px;
      line-height: 1.35;
      transition: background 0.2s ease, border-color 0.2s ease;
    }
    .guidance-step.actionable {
      border-color: rgba(56, 189, 248, 0.35);
      background: rgba(56, 189, 248, 0.08);
    }
    .guidance-step.done {
      border-color: rgba(34, 197, 94, 0.25);
      background: rgba(34, 197, 94, 0.06);
    }
    .attack-step.ready-attack {
      border-color: rgba(245, 158, 11, 0.6);
      background: rgba(245, 158, 11, 0.12);
      animation: pulse-border 2s infinite ease-in-out;
    }
    @keyframes pulse-border {
      0%, 100% { border-color: rgba(245, 158, 11, 0.6); }
      50% { border-color: rgba(245, 158, 11, 1); }
    }

    .step-num {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.12);
      color: #f8fafc;
      font-size: 10px;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 1px;
    }
    .guidance-step.done .step-num {
      background: #22c55e;
      color: #0f172a;
    }
    .attack-step.ready-attack .step-num {
      background: #f59e0b;
      color: #0f172a;
    }

    .step-detail {
      flex: 1;
    }
    .step-detail b {
      color: #e2e8f0;
      font-weight: 700;
      display: block;
      margin-bottom: 1px;
    }
    .step-detail p {
      margin: 0;
      color: #cbd5e1;
      font-size: 11px;
    }
    .text-done {
      color: #86efac !important;
      font-style: italic;
    }
    .text-muted {
      color: #64748b !important;
      font-size: 10.5px !important;
    }

    .opp-waiting {
      padding: 4px 0;
    }
    .opp-waiting-box {
      display: flex;
      align-items: center;
      gap: 10px;
      background: rgba(239, 68, 68, 0.08);
      border: 1px dashed rgba(239, 68, 68, 0.35);
      border-radius: 8px;
      padding: 10px;
      font-size: 11.5px;
    }
    .opp-waiting-box b {
      color: #fca5a5;
      display: block;
      margin-bottom: 2px;
    }
    .opp-waiting-box p {
      margin: 0;
      color: #94a3b8;
      font-size: 11px;
    }
    .spinner-icon {
      font-size: 20px;
      animation: spin 3s linear infinite;
    }
    @keyframes spin {
      100% { transform: rotate(360deg); }
    }

    .guidance-rule-hint {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(234, 179, 8, 0.1);
      border: 1px solid rgba(234, 179, 8, 0.3);
      border-radius: 8px;
      padding: 6px 9px;
      font-size: 10.5px;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .guidance-rule-hint:hover {
      background: rgba(234, 179, 8, 0.2);
      border-color: #fbbf24;
    }
    .grh-icon {
      font-size: 14px;
      flex-shrink: 0;
    }
    .grh-text {
      color: #fde047;
      line-height: 1.35;
    }
    .grh-text b {
      color: #fff;
    }
    .grh-text u {
      color: #fbbf24;
      font-weight: 700;
      margin-left: 2px;
    }

    /* LIVE STREAM CHAT FEED */
    .stream-chat-feed {
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
      background: rgba(15, 23, 42, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      overflow: hidden;
    }
    .chat-feed-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 10px;
      background: rgba(0, 0, 0, 0.3);
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      flex-shrink: 0;
    }
    .cf-badge {
      font-size: 10.5px;
      font-weight: 800;
      color: #94a3b8;
      letter-spacing: 0.5px;
    }
    .cf-counter {
      font-size: 10px;
      color: #64748b;
      font-weight: 600;
    }

    .chat-messages-container {
      flex: 1;
      overflow-y: auto;
      padding: 8px;
      display: flex;
      flex-direction: column;
      gap: 7px;
      scroll-behavior: smooth;
    }
    .chat-messages-container::-webkit-scrollbar {
      width: 5px;
    }
    .chat-messages-container::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.15);
      border-radius: 3px;
    }

    .chat-bubble-row {
      display: flex;
      align-items: flex-start;
      gap: 7px;
      padding: 5px 8px;
      border-radius: 8px;
      font-size: 11px;
      line-height: 1.35;
      background: rgba(255, 255, 255, 0.03);
      border-left: 3px solid transparent;
      animation: fadeInBubble 0.25s ease;
    }
    @keyframes fadeInBubble {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .chat-bubble-row.badge-stream {
      border-left-color: #38bdf8;
      background: rgba(56, 189, 248, 0.05);
    }
    .chat-bubble-row.badge-opp {
      border-left-color: #ef4444;
      background: rgba(239, 68, 68, 0.06);
    }
    .chat-bubble-row.badge-player {
      border-left-color: #22c55e;
      background: rgba(34, 197, 94, 0.06);
    }
    .chat-bubble-row.badge-prize {
      border-left-color: #eab308;
      background: rgba(234, 179, 8, 0.1);
    }
    .chat-bubble-row.badge-ko {
      border-left-color: #f97316;
      background: rgba(249, 115, 22, 0.12);
    }

    .bubble-avatar {
      font-size: 14px;
      flex-shrink: 0;
      margin-top: 1px;
    }
    .bubble-content {
      flex: 1;
      min-width: 0;
    }
    .bubble-header {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 2px;
    }
    .bubble-author {
      font-weight: 700;
      font-size: 10px;
      color: #94a3b8;
    }
    .badge-opp .bubble-author {
      color: #fca5a5;
    }
    .badge-player .bubble-author {
      color: #86efac;
    }
    .badge-prize .bubble-author {
      color: #fde047;
    }
    .badge-ko .bubble-author {
      color: #fdba74;
    }
    .bubble-tag {
      font-size: 9px;
      font-weight: 800;
      padding: 1px 4px;
      border-radius: 4px;
      background: #eab308;
      color: #0f172a;
    }
    .ko-tag {
      background: #ef4444;
      color: #fff;
    }
    .bubble-text {
      color: #f1f5f9;
      word-break: break-word;
    }
    .chat-empty-feed {
      text-align: center;
      padding: 24px 8px;
      color: #64748b;
      font-size: 11.5px;
    }

    /* =========================================================================
       PRIZE CARDS ZONE WITH VISUAL 6-SLOT GRID
       ========================================================================= */
    .ptcgo-prizes-zone {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      background: rgba(15, 23, 42, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 10px;
      padding: 6px 8px;
      width: 128px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    }
    .opp-prizes-zone {
      border-color: rgba(239, 68, 68, 0.3);
    }
    .player-prizes-zone {
      border-color: rgba(234, 179, 8, 0.4);
    }
    .prize-zone-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      width: 100%;
    }
    .prize-tag {
      font-size: 9px;
      font-weight: 800;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .opp-prize-tag {
      color: #f87171;
    }
    .player-prize-tag {
      color: #fbbf24;
    }
    .prize-taken-info {
      font-size: 10px;
      font-weight: 600;
      color: #94a3b8;
    }
    .player-taken-info {
      color: #fef08a;
    }
    .prize-cards-stack {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 3px;
      width: 100%;
      margin: 3px 0;
    }
    .prize-card-back {
      width: 100%;
      height: 24px;
      border-radius: 3px;
      background: linear-gradient(135deg, #1e3a8a 0%, #1e1b4b 100%);
      border: 1px solid #3b82f6;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
    }
    .opp-prize {
      background: linear-gradient(135deg, #881337 0%, #3f0f1d 100%);
      border-color: #f43f5e;
    }
    .prize-card-empty {
      width: 100%;
      height: 24px;
      border-radius: 3px;
      border: 1px dashed rgba(255, 255, 255, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      background: rgba(255, 255, 255, 0.03);
    }
    .player-empty-slot {
      border-color: rgba(234, 179, 8, 0.4);
      color: #fde047;
    }
    .opp-empty-slot {
      border-color: rgba(239, 68, 68, 0.4);
      color: #fca5a5;
    }
    .prize-counter-num {
      font-size: 18px;
      font-weight: 900;
      color: #f8fafc;
      line-height: 1;
    }
    .player-counter-num {
      color: #fbbf24;
      text-shadow: 0 0 8px rgba(251, 191, 36, 0.5);
    }
    .prize-footer-hint {
      font-size: 9px;
      font-weight: 600;
      color: #64748b;
      text-align: center;
    }
    .player-footer-hint {
      color: #a1a1aa;
    }

    /* DECK META TAG (Pill below 3D Deck Stack) */
    .dock-meta-tag {
      font-size: 10px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 6px;
      background: rgba(15, 23, 42, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #cbd5e1;
      margin-top: 4px;
      white-space: nowrap;
    }
    .opp-deck-tag {
      border-color: rgba(239, 68, 68, 0.3);
      color: #fca5a5;
    }
    .player-deck-tag {
      border-color: rgba(56, 189, 248, 0.3);
      color: #7dd3fc;
    }

    /* BUTTON RULES TOGGLE */
    .btn-rules-toggle {
      background: rgba(234, 179, 8, 0.2);
      border-color: rgba(234, 179, 8, 0.4);
    }
    .btn-rules-toggle:hover {
      background: rgba(234, 179, 8, 0.35);
      border-color: #fbbf24;
    }

    /* =========================================================================
       RULES MODAL
       ========================================================================= */
    .rules-modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(8px);
      z-index: 999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      animation: fadeIn 0.2s ease;
    }
    .rules-modal {
      max-width: 640px;
      width: 100%;
      max-height: 88vh;
      background: #0f172a;
      border: 1px solid rgba(234, 179, 8, 0.4);
      border-radius: 18px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 0 25px 50px rgba(0, 0, 0, 0.8), 0 0 30px rgba(234, 179, 8, 0.2);
    }
    .rules-modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      background: rgba(255, 255, 255, 0.03);
    }
    .rules-modal-header h3 {
      margin: 0;
      font-size: 18px;
      color: #fbbf24;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .btn-close-modal {
      background: rgba(255, 255, 255, 0.1);
      border: none;
      color: #cbd5e1;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      cursor: pointer;
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s ease;
    }
    .btn-close-modal:hover {
      background: rgba(239, 68, 68, 0.4);
      color: #fff;
    }
    .rules-modal-body {
      padding: 20px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .rule-box {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 16px;
    }
    .gold-rule-box {
      background: rgba(234, 179, 8, 0.05);
      border-color: rgba(234, 179, 8, 0.25);
    }
    .rule-box h4 {
      margin: 0 0 12px 0;
      font-size: 15px;
      color: #f8fafc;
    }
    .gold-rule-box h4 {
      color: #fde047;
    }
    .win-cond-item {
      display: flex;
      gap: 12px;
      align-items: flex-start;
      margin-bottom: 12px;
    }
    .win-cond-item:last-child {
      margin-bottom: 0;
    }
    .wc-num {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: #eab308;
      color: #0f172a;
      font-weight: 800;
      font-size: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 2px;
    }
    .win-cond-item b {
      color: #f8fafc;
      font-size: 13px;
    }
    .win-cond-item p {
      margin: 2px 0 0 0;
      color: #94a3b8;
      font-size: 12.5px;
      line-height: 1.4;
    }
    .rule-bullets {
      margin: 0;
      padding-left: 18px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      color: #cbd5e1;
      font-size: 12.5px;
      line-height: 1.4;
    }
    .rule-bullets b {
      color: #38bdf8;
    }

    /* =========================================================================
       BATTLE HISTORY MODAL
       ========================================================================= */
    .history-modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(8px);
      z-index: 999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      animation: fadeIn 0.2s ease;
    }
    .history-modal {
      max-width: 680px;
      width: 100%;
      max-height: 85vh;
      background: #0f172a;
      border: 1px solid rgba(56, 189, 248, 0.35);
      border-radius: 18px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 0 25px 50px rgba(0, 0, 0, 0.8), 0 0 30px rgba(56, 189, 248, 0.2);
    }
    .history-modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      background: rgba(255, 255, 255, 0.03);
    }
    .history-modal-header h3 {
      margin: 0;
      font-size: 17px;
      color: #38bdf8;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .history-count-badge {
      font-size: 11px;
      font-weight: 700;
      color: #94a3b8;
      background: rgba(255, 255, 255, 0.06);
      padding: 2px 8px;
      border-radius: 6px;
    }
    .history-modal-body {
      padding: 16px 20px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .history-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 8px 12px;
      background: rgba(255, 255, 255, 0.025);
      border-radius: 8px;
      border-left: 3px solid #38bdf8;
      font-size: 13px;
    }
    .history-idx {
      font-size: 11px;
      font-weight: 800;
      color: #64748b;
      min-width: 28px;
    }
    .history-line {
      color: #e2e8f0;
      line-height: 1.4;
    }
    .history-empty {
      text-align: center;
      padding: 32px 16px;
      color: #64748b;
      font-size: 13px;
    }

    /* =========================================================================
       TRAINER SELECTOR & AVATAR BOARD STYLES
       ========================================================================= */
    .trainer-avatar-board {
      image-rendering: pixelated;
      object-fit: cover;
      transform: scale(1.65);
      transform-origin: center 22%;
      background: radial-gradient(circle, rgba(30, 41, 59, 0.9), #0b0f19);
    }
    .bubble-avatar-img {
      width: 26px;
      height: 26px;
      object-fit: cover;
      transform: scale(1.5);
      transform-origin: center 22%;
      image-rendering: pixelated;
      vertical-align: middle;
      border-radius: 50%;
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(56, 189, 248, 0.3);
      overflow: hidden;
    }
    .mini-trainer-avatar {
      width: 48px;
      height: 48px;
      object-fit: cover;
      transform: scale(1.65);
      transform-origin: center 22%;
      image-rendering: pixelated;
      vertical-align: middle;
      margin-right: 8px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(56, 189, 248, 0.35), rgba(15, 23, 42, 0.95));
      border: 2px solid #38bdf8;
      box-shadow: 0 0 12px rgba(56, 189, 248, 0.4);
    }

    .trainer-modal {
      width: 92%;
      max-width: 820px;
      max-height: 88vh;
      display: flex;
      flex-direction: column;
      border-radius: 20px;
      overflow: hidden;
      background: #0b1324;
      border: 1px solid rgba(56, 189, 248, 0.4);
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.9), 0 0 35px rgba(56, 189, 248, 0.25);
    }
    .trainer-modal-intro {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 20px;
      background: rgba(255, 255, 255, 0.02);
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      gap: 12px;
      flex-wrap: wrap;
    }
    .trainer-modal-intro p {
      margin: 0;
      font-size: 13px;
      color: #94a3b8;
      flex: 1;
    }
    .btn-random-trainer {
      background: linear-gradient(135deg, #0284c7, #2563eb);
      border: 1px solid rgba(56, 189, 248, 0.4);
      color: #fff;
      font-weight: 700;
      font-size: 12px;
      padding: 8px 16px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .btn-random-trainer:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 14px rgba(2, 132, 199, 0.5);
    }
    .trainer-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 12px;
      padding: 20px;
      overflow-y: auto;
      max-height: 62vh;
    }
    .trainer-card {
      display: flex;
      align-items: center;
      gap: 12px;
      background: rgba(30, 41, 59, 0.6);
      border: 1.5px solid rgba(255, 255, 255, 0.08);
      border-radius: 14px;
      padding: 10px 12px;
      cursor: pointer;
      transition: all 0.2s ease;
      position: relative;
    }
    .trainer-card:hover {
      background: rgba(56, 189, 248, 0.12);
      border-color: #38bdf8;
      transform: translateY(-2px);
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
    }
    .trainer-card.active {
      background: rgba(2, 132, 199, 0.3);
      border-color: #38bdf8;
      box-shadow: 0 0 16px rgba(56, 189, 248, 0.4);
    }
    .trainer-card-img-wrap {
      width: 66px;
      height: 66px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(56, 189, 248, 0.3), #0f172a);
      border: 2px solid rgba(255, 255, 255, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      overflow: hidden;
      box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
    }
    .trainer-card.active .trainer-card-img-wrap {
      border-color: #38bdf8;
      box-shadow: 0 0 14px #38bdf8;
    }
    .trainer-card-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transform: scale(1.65);
      transform-origin: center 22%;
      image-rendering: pixelated;
    }
    .trainer-card-details {
      display: flex;
      flex-direction: column;
      gap: 3px;
      min-width: 0;
    }
    .trainer-card-name {
      font-size: 15px;
      font-weight: 800;
      color: #f8fafc;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .trainer-card-title {
      font-size: 12px;
      color: #38bdf8;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .trainer-card-region {
      font-size: 10px;
      color: #64748b;
    }
    .trainer-selected-tag {
      position: absolute;
      top: 6px;
      right: 8px;
      font-size: 9px;
      font-weight: 800;
      color: #4ade80;
      background: rgba(74, 222, 128, 0.15);
      border: 1px solid rgba(74, 222, 128, 0.3);
      border-radius: 999px;
      padding: 1px 6px;
    }
  `]
})
export class PokemonGameComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('chatScroll') private chatScrollContainer?: ElementRef;

  view: GameView | null = null;
  error = '';
  waiting = false;
  starting = false;
  copiedId = false;
  selectedCard: CardView | null = null;
  rotomOpen = false;
  rulesModalOpen = false;
  historyModalOpen = false;
  deckModalOpen = false;
  trainerModalOpen = false;
  peekBoard = false;
  allTrainers = POKEMON_TRAINERS;
  allProfessors = POKEMON_PROFESSORS;
  currentTrainer: TrainerProfile = POKEMON_TRAINERS[0];
  currentProfessor: TrainerProfile = getRandomProfessor();
  deckFilter: 'all' | 'pokemon' | 'trainer' | 'energy' = 'all';
  deckCards: GameCard[] = [];
  deckLoading = false;

  playerName = 'Red (Rojo)';
  joinGameCode = '';

  assets = PTCGO_ASSETS;
  energyInfo = energyInfo;

  activeCardMoves: LegalMove[] = [];
  activeCardTarget: CardView | null = null;

  private subs: Subscription[] = [];

  constructor(
    private game: GameService,
    private router: Router,
    private cardService: CardService,
    public authService: AuthService
  ) {}

  toggleRulesModal() {
    this.rulesModalOpen = !this.rulesModalOpen;
  }

  toggleHistoryModal() {
    this.historyModalOpen = !this.historyModalOpen;
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  private scrollToBottom(): void {
    try {
      if (this.chatScrollContainer?.nativeElement) {
        const el = this.chatScrollContainer.nativeElement;
        el.scrollTop = el.scrollHeight;
      }
    } catch {
      // ignore
    }
  }

  canAttachEnergy(): boolean {
    if (!this.isMyTurn() || this.view?.me?.energyAttachedThisTurn) return false;
    return !!this.view?.legalMoves?.some((m) => {
      const t = (m.type || '').toLowerCase();
      return t === 'attach' || t === 'attachenergy';
    });
  }

  canPlayBasicToBench(): boolean {
    if (!this.isMyTurn()) return false;
    return !!this.view?.legalMoves?.some((m) => {
      const t = (m.type || '').toLowerCase();
      return t === 'play' || t === 'playbasictobench';
    });
  }

  canPlayTrainer(): boolean {
    if (!this.isMyTurn()) return false;
    return !!this.view?.legalMoves?.some((m) => {
      const t = (m.type || '').toLowerCase();
      return t === 'trainer' || t === 'playitem' || t === 'playsupporter';
    });
  }

  canAttack(): boolean {
    if (!this.isMyTurn()) return false;
    return !!this.view?.legalMoves?.some((m) => (m.type || '').toLowerCase() === 'attack');
  }

  get liveChatMessages(): StreamChatMessage[] {
    if (!this.view?.log?.length) return [];

    const myName = this.view.me?.name || 'Tú';
    const oppName = this.view.opponent?.name || (this.isOpponentBot ? (this.currentProfessor?.name || 'Profesor IA') : 'Rival');

    return this.view.log.map((line, idx) => {
      const lower = line.toLowerCase();

      if (
        lower.includes('juega contra') ||
        lower.includes('moneda lanzada') ||
        lower.includes('a jugar') ||
        lower.includes('comienza la partida') ||
        lower.includes('preparando')
      ) {
        return {
          id: `log-${idx}`,
          sender: 'stream',
          senderName: 'Transmisión',
          avatar: '🎙️',
          text: line,
          badgeClass: 'badge-stream'
        };
      }

      if (lower.includes('premio') || lower.includes('carta de premio')) {
        return {
          id: `log-${idx}`,
          sender: 'prize',
          senderName: 'Árbitro Pokémon',
          avatar: '🏆',
          text: line,
          badgeClass: 'badge-prize'
        };
      }

      if (lower.includes('fuera de combate') || lower.includes('ha quedado fuera') || lower.includes('k.o.')) {
        return {
          id: `log-${idx}`,
          sender: 'prize',
          senderName: 'Árbitro Pokémon',
          avatar: '💥',
          text: line,
          badgeClass: 'badge-ko'
        };
      }

      if (lower.includes('profesor') || lower.includes('profesora') || lower.includes('kendall') || line.includes(oppName)) {
        return {
          id: `log-${idx}`,
          sender: 'opp',
          senderName: oppName,
          avatar: this.isOpponentBot ? '🤖' : this.opponentAvatarUrl,
          text: line,
          badgeClass: 'badge-opp'
        };
      }

      if (
        line.startsWith(myName) ||
        lower.includes(myName.toLowerCase()) ||
        lower.startsWith('tú ') ||
        lower.startsWith('tu ')
      ) {
        return {
          id: `log-${idx}`,
          sender: 'player',
          senderName: myName,
          avatar: this.playerAvatarUrl,
          text: line,
          badgeClass: 'badge-player'
        };
      }

      return {
        id: `log-${idx}`,
        sender: 'stream',
        senderName: 'Transmisión',
        avatar: '📢',
        text: line,
        badgeClass: 'badge-stream'
      };
    });
  }

  get latestLog(): string {
    if (!this.view?.log?.length) return '¡Comienza la partida Pokémon! Prepara tu estrategia.';
    return this.view.log[this.view.log.length - 1];
  }

  get lastOpponentAction(): string {
    const oppName = this.view?.opponent?.name || this.currentProfessor?.name || 'Rival';
    if (!this.view?.log?.length) return `Esperando movimiento inicial de ${oppName}...`;
    for (let i = this.view.log.length - 1; i >= 0; i--) {
      const line = this.view.log[i];
      if (line.includes(oppName)) {
        return line;
      }
    }
    return 'Sin jugadas registradas aún.';
  }

  get lastPlayerAction(): string {
    if (!this.view?.log?.length) return 'Esperando tu primera jugada...';
    const myName = this.view.me?.name || 'Entrenador';
    for (let i = this.view.log.length - 1; i >= 0; i--) {
      const line = this.view.log[i];
      if (line.includes(myName) || line.startsWith('Tú ') || line.includes('ElGibbo')) {
        return line;
      }
    }
    return '¡Es tu turno para mover!';
  }

  ngOnInit() {
    const user = this.authService.getUser();
    const uname = user?.username?.toLowerCase() || this.authService.getUsername()?.toLowerCase();
    
    // Check if user has a previously chosen trainer or default based on account
    const savedTrainerId = (typeof localStorage !== 'undefined' && uname)
      ? localStorage.getItem('pokemon_trainer_id_' + uname)
      : null;

    if (savedTrainerId) {
      const found = POKEMON_TRAINERS.find(t => t.id === savedTrainerId);
      this.currentTrainer = found || getTrainerForUser(uname);
    } else {
      this.currentTrainer = getTrainerForUser(uname);
    }
    this.playerName = this.currentTrainer.name;

    // Clean up deprecated global key so it never leaks between accounts
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('pokemon_player_name');
    }

    this.game.connect().then(() => this.game.refresh());
    this.subs.push(
      this.game.game$.subscribe((v) => {
        if (v && v.phase === 'GameOver' && !this.view) {
          // If fresh load or restore, do not resurrect a finished game
          this.view = null;
          this.game.reset();
          return;
        }
        this.view = v;
        if (v) {
          this.waiting = false;
          this.starting = false;
        }
        this.error = '';
        this.clearCardMoves();
      }),
      this.game.error$.subscribe((e) => {
        this.error = e;
        this.starting = false;
      }),
      this.game.waiting$.subscribe((w) => {
        this.waiting = w;
        if (w) this.starting = false;
      })
    );
  }

  ngOnDestroy() {
    this.subs.forEach((s) => s.unsubscribe());
    this.game.reset();
  }

  isMyTurn(): boolean {
    return (
      !!this.view &&
      this.view.phase === 'ActiveTurn' &&
      this.view.currentTurnPlayerId === this.view.me?.playerId
    );
  }

  get isOpponentBot(): boolean {
    const oppName = (this.view?.opponent?.name || '').toLowerCase();
    const oppId = this.view?.opponent?.playerId || '';
    return oppName.includes('profesor') || oppName.includes('profesora') || oppName.includes('kendall') || oppId.startsWith('bot-');
  }

  currentPlayerName(): string {
    if (!this.view) return '';
    return this.view.currentTurnPlayerId === this.view.me?.playerId
      ? (this.view.me?.name || 'Tú')
      : (this.view.opponent?.name || 'Rival');
  }

  winnerName(): string {
    if (!this.view) return '';
    return this.view.winnerId === this.view.me?.playerId
      ? (this.view.me?.name || 'Tú')
      : (this.view.opponent?.name || 'Rival');
  }

  isMeWinner(): boolean {
    if (!this.view || !this.view.winnerId || !this.view.me) return false;
    return this.view.winnerId === this.view.me.playerId;
  }

  reasonLabel(): string {
    const iWon = this.isMeWinner();
    const winner = this.winnerName();
    switch (this.view?.winnerReason) {
      case 'prizes':
        return iWon
          ? '¡Tomaste tus 6 cartas de Premio para sellar el combate!'
          : `${winner} tomó sus 6 cartas de Premio.`;
      case 'deckout':
        return iWon
          ? 'El rival se quedó sin cartas para robar de su mazo.'
          : 'Te has quedado sin cartas en tu mazo al inicio del turno.';
      case 'nopokemon':
        return iWon
          ? 'El rival no tiene más Pokémon en banca ni en puesto activo.'
          : 'No te quedaron Pokémon disponibles en banca ni en puesto activo.';
      case 'disconnect':
        return 'Partida finalizada por desconexión.';
      default:
        return 'Partida finalizada.';
    }
  }

  getCardsArray(count: number): number[] {
    return Array.from({ length: Math.max(0, count) }, (_, i) => i);
  }

  copyGameId() {
    if (!this.view?.id) return;
    navigator.clipboard.writeText(this.view.id);
    this.copiedId = true;
    setTimeout(() => (this.copiedId = false), 2500);
  }

  toggleRotom() {
    this.rotomOpen = !this.rotomOpen;
  }

  inspectCard(card: CardView) {
    this.selectedCard = card;
  }

  closeInspect() {
    this.selectedCard = null;
  }

  isCardPlayable(card?: CardView | null): boolean {
    if (!card || !this.isMyTurn() || !this.view?.legalMoves?.length) return false;
    return this.view.legalMoves.some(
      (m) => m.handInstanceId === card.instanceId || m.targetInstanceId === card.instanceId
    );
  }

  onHandCardClick(card: CardView) {
    if (!this.isMyTurn()) {
      this.inspectCard(card);
      return;
    }

    const moves = (this.view?.legalMoves || []).filter(
      (m) => m.handInstanceId === card.instanceId
    );

    if (moves.length === 1) {
      this.doMove(moves[0]);
    } else if (moves.length > 1) {
      this.activeCardMoves = moves;
      this.activeCardTarget = card;
    } else {
      this.inspectCard(card);
    }
  }

  onFieldCardClick(card: CardView) {
    if (!this.isMyTurn()) {
      this.inspectCard(card);
      return;
    }

    const moves = (this.view?.legalMoves || []).filter((m) => {
      const type = (m.type || '').toLowerCase();
      const isActive = this.view?.me?.active?.instanceId === card.instanceId;
      return (
        m.targetInstanceId === card.instanceId ||
        (isActive && (type === 'attack' || type === 'retreat' || type === 'ability'))
      );
    });

    if (moves.length > 0) {
      this.activeCardMoves = moves;
      this.activeCardTarget = card;
    } else {
      this.inspectCard(card);
    }
  }

  clearCardMoves() {
    this.activeCardMoves = [];
    this.activeCardTarget = null;
  }

  executeCardMove(m: LegalMove) {
    this.clearCardMoves();
    this.doMove(m);
  }

  onDoneClick() {
    if (!this.isMyTurn()) return;
    this.game.sendAction({ type: 'pass' });
  }

  getMoveIcon(type: string): string {
    switch (type.toLowerCase()) {
      case 'attack': return '⚡';
      case 'attach':
      case 'attachenergy': return '🔋';
      case 'evolve': return '🔄';
      case 'play':
      case 'playbasictobench': return '🎴';
      case 'trainer':
      case 'playitem': return '🧪';
      case 'playsupporter': return '🧑‍🏫';
      case 'retreat': return '🏃';
      case 'pass':
      case 'endturn': return '⏭️';
      default: return '✨';
    }
  }

  doMove(m: LegalMove) {
    this.error = '';
    this.game.sendAction({
      type: m.type,
      handInstanceId: m.handInstanceId ?? undefined,
      targetInstanceId: m.targetInstanceId ?? undefined,
      benchIndex: m.benchIndex ?? undefined,
      attackIndex: m.attackIndex ?? undefined,
      abilityIndex: m.abilityIndex ?? undefined
    });
  }

  get isPokemonRole(): boolean {
    const role = this.authService.getRole();
    const user = this.authService.getUsername()?.toLowerCase();
    return role === 'pokemon' || (user?.includes('pokemon') ?? false);
  }

  selectTrainer(trainer: TrainerProfile) {
    this.currentTrainer = trainer;
    this.playerName = trainer.name;
    const user = this.authService.getUser();
    const uname = user?.username?.toLowerCase() || this.authService.getUsername()?.toLowerCase();
    if (typeof localStorage !== 'undefined' && uname) {
      localStorage.setItem('pokemon_trainer_id_' + uname, trainer.id);
      localStorage.setItem('pokemon_player_name_' + uname, trainer.name);
    }
    this.trainerModalOpen = false;
  }

  randomizeTrainer(event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    const next = getRandomTrainer(this.currentTrainer?.id);
    this.selectTrainer(next);
  }

  toggleTrainerModal() {
    this.trainerModalOpen = !this.trainerModalOpen;
  }

  get opponentAvatarUrl(): string {
    const oppName = this.view?.opponent?.name;
    const oppId = this.view?.opponent?.playerId || '';
    const t = findTrainerByName(oppName) || (oppId ? findProfessorByNameOrId(oppId.replace('bot-', '')) : undefined);
    if (t) return t.avatar;
    if (this.isOpponentBot) {
      return this.currentProfessor?.avatar || 'https://play.pokemonshowdown.com/sprites/trainers/oak.png';
    }
    return 'assets/trainers/blue.png';
  }

  get playerAvatarUrl(): string {
    return this.currentTrainer?.avatar || 'assets/trainers/red.png';
  }

  isAvatarUrl(avatar?: string | null): boolean {
    if (!avatar) return false;
    return avatar.startsWith('assets/') || avatar.startsWith('http') || avatar.startsWith('data:');
  }

  savePlayerName() {
    const user = this.authService.getUser();
    if (!this.playerName.trim()) {
      this.playerName = this.currentTrainer?.name || 'Red (Rojo)';
    }
    const match = findTrainerByName(this.playerName);
    if (match) {
      this.currentTrainer = match;
    }
    if (typeof localStorage !== 'undefined') {
      const uname = user?.username?.toLowerCase() || this.authService.getUsername()?.toLowerCase();
      if (uname) {
        localStorage.setItem('pokemon_player_name_' + uname, this.playerName.trim());
        if (this.currentTrainer) {
          localStorage.setItem('pokemon_trainer_id_' + uname, this.currentTrainer.id);
        }
      }
      localStorage.removeItem('pokemon_player_name');
    }
  }

  async quickPractice() {
    this.savePlayerName();
    this.starting = true;
    this.error = '';
    try {
      await this.game.connect();
      await this.game.practiceGame(this.playerName);
    } catch (err: any) {
      this.error = 'Error al conectar con la partida contra la IA: ' + (err?.message || err);
      this.starting = false;
    }
  }

  async startQuickMatch() {
    this.savePlayerName();
    this.starting = true;
    this.error = '';
    try {
      await this.game.connect();
      await this.game.quickMatch(this.playerName);
    } catch (err: any) {
      this.error = 'Error al buscar emparejamiento: ' + (err?.message || err);
      this.starting = false;
    }
  }

  async startCreateGame() {
    this.savePlayerName();
    this.starting = true;
    this.error = '';
    try {
      await this.game.connect();
      await this.game.createGame(this.playerName);
    } catch (err: any) {
      this.error = 'Error al crear la sala: ' + (err?.message || err);
      this.starting = false;
    }
  }

  async startJoinGame() {
    let code = this.joinGameCode.trim();
    if (!code) {
      this.error = 'Por favor ingresa un código de sala válido.';
      return;
    }
    // Clean code if user copied "SALA b61615e5" or "sala: b61615e5" or "#b61615e5"
    if (code.toLowerCase().startsWith('sala')) {
      code = code.substring(4).replace(/^[:\s#-]+/, '');
    }
    code = code.trim().toLowerCase();

    this.savePlayerName();
    this.starting = true;
    this.error = '';
    try {
      await this.game.connect();
      await this.game.joinGame(code, this.playerName);
    } catch (err: any) {
      this.error = 'Error al unirse a la sala: ' + (err?.message || err);
      this.starting = false;
    }
  }

  async cancelWaiting() {
    await this.game.leaveGame();
    this.waiting = false;
    this.starting = false;
    this.view = null;
  }

  async leave() {
    await this.game.leaveGame();
    this.view = null;
    this.waiting = false;
    this.starting = false;
    this.error = '';
    this.peekBoard = false;
  }

  async leaveToHome() {
    try {
      await this.game.leaveGame();
    } catch {
      // ignore
    }
    this.view = null;
    this.waiting = false;
    this.starting = false;
    this.peekBoard = false;
    // Return to lobby
    this.view = null;
  }

  async logout() {
    try {
      await this.game.disconnect();
    } catch {
      // ignore
    }
    this.view = null;
    this.waiting = false;
    this.starting = false;
    this.error = '';
    this.peekBoard = false;
    this.authService.logout();
  }

  openDeckModal() {
    this.deckModalOpen = true;
    if (!this.deckCards.length) {
      this.deckLoading = true;
      this.cardService.getStarterDeck().subscribe({
        next: (cards) => {
          this.deckCards = cards || [];
          this.deckLoading = false;
        },
        error: (err) => {
          this.error = 'No se pudo cargar el mazo: ' + (err?.message || err);
          this.deckLoading = false;
        }
      });
    }
  }

  get filteredDeckCards(): GameCard[] {
    if (this.deckFilter === 'all') return this.deckCards;
    return this.deckCards.filter((c) => {
      const sup = (c.supertype || '').toLowerCase();
      if (this.deckFilter === 'pokemon') return sup === 'pokémon' || sup === 'pokemon';
      if (this.deckFilter === 'trainer') return sup === 'trainer' || sup === 'entrenador';
      if (this.deckFilter === 'energy') return sup === 'energy' || sup === 'energía';
      return true;
    });
  }

  countCategory(type: 'pokemon' | 'trainer' | 'energy'): number {
    return this.deckCards.filter((c) => {
      const sup = (c.supertype || '').toLowerCase();
      if (type === 'pokemon') return sup === 'pokémon' || sup === 'pokemon';
      if (type === 'trainer') return sup === 'trainer' || sup === 'entrenador';
      if (type === 'energy') return sup === 'energy' || sup === 'energía';
      return false;
    }).length;
  }

  inspectDeckCard(card: GameCard) {
    this.selectedCard = {
      instanceId: card.id,
      id: card.id,
      name: card.name,
      supertype: card.supertype,
      subtypes: card.subtypes || [],
      hp: card.hp || null,
      types: card.types || [],
      evolvesFrom: card.evolvesFrom || null,
      attacks: card.attacks || [],
      abilities: card.abilities || [],
      rules: card.rules || [],
      weaknesses: [],
      resistances: [],
      retreatCost: card.retreatCost || [],
      energyProvides: [],
      imageSmall: card.imageSmall || null,
      imageLarge: card.imageLarge || null,
      setName: card.setName || null,
      number: card.number || null,
      damageCounters: 0,
      remainingHp: card.hp || 0,
      attachedEnergy: [],
      conditions: [],
      turnsInPlay: 0
    };
  }
}
