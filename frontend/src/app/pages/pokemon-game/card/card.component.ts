import { Component, Input, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardView } from '../models/game';
import { energyInfo, getCardArtwork, getFullCardImage } from '../energy.util';

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="card-container"
      [class.face-down]="faceDown"
      [class.is-active-card]="isActive"
      [class.is-playable]="isPlayable"
      [class.is-pokemon]="card && card.supertype === 'Pokémon'"
      [class.is-energy]="card && card.supertype === 'Energy'"
      [class.is-trainer]="card && card.supertype === 'Trainer'"
      [class.has-damage]="card && card.damageCounters > 0"
      [class.has-full-image]="!faceDown && card && fullCardImageUrl && !imageLoadError"
      [attr.data-type]="primaryType"
      [style.transform]="tiltTransform"
      (mousemove)="onMouseMove($event)"
      (mouseleave)="onMouseLeave()"
    >
      <!-- Face-Down Card Back -->
      <div class="card-back" *ngIf="faceDown">
        <div class="card-back-border">
          <div class="card-back-core">
            <div class="pokeball-orb">
              <div class="pokeball-top"></div>
              <div class="pokeball-band"></div>
              <div class="pokeball-center-btn"></div>
              <div class="pokeball-bottom"></div>
            </div>
            <span class="back-text">POKÉMON</span>
          </div>
        </div>
      </div>

      <!-- Face-Up Card Front (MODE A: Authentic Full Card Image) -->
      <div class="card-inner-fullimg" *ngIf="!faceDown && card && fullCardImageUrl && !imageLoadError">
        <img
          [src]="fullCardImageUrl"
          [alt]="card.name"
          class="full-card-img"
          loading="eager"
          (error)="onFullImgError($event)"
        />
        
        <!-- Holographic Sheen Overlay -->
        <div class="holo-foil" [style.background-position]="holoPosition"></div>

        <!-- Attached Energy Chips Overlay -->
        <div class="attached-energy-overlay" *ngIf="card.attachedEnergy?.length">
          <span
            class="attached-dot"
            *ngFor="let ae of card.attachedEnergy"
            [style.background]="energyInfo(ae).color"
            [title]="'Energía ' + energyInfo(ae).label"
          >
            {{ energyInfo(ae).symbol }}
          </span>
        </div>

        <!-- In-play Remaining HP Pill (if damaged) -->
        <div class="remaining-hp-badge" *ngIf="(card.damageCounters || 0) > 0 && card.supertype === 'Pokémon'">
          <span class="hp-curr">{{ card.remainingHp }}</span>
          <span class="hp-slash">/</span>
          <span class="hp-total">{{ card.hp }}</span>
        </div>

        <!-- Damage Counter Floating Badge -->
        <div class="damage-overlay-badge" *ngIf="(card.damageCounters || 0) > 0">
          -{{ card.damageCounters * 10 }}
        </div>

        <!-- Status Conditions -->
        <div class="conditions-bar" *ngIf="card.conditions?.length">
          <span class="cond-pill" *ngFor="let c of card.conditions" [class]="'cond-' + c.toLowerCase()">
            {{ conditionEmoji(c) }} {{ conditionLabel(c) }}
          </span>
        </div>
      </div>

      <!-- Face-Up Card Front (MODE B: Fallback CSS Template) -->
      <div class="card-inner" *ngIf="!faceDown && card && (!fullCardImageUrl || imageLoadError)" [style.background]="cardGradient">
        <!-- Holographic Foil Sheen -->
        <div class="holo-foil" [style.background-position]="holoPosition"></div>

        <!-- Card Header -->
        <div class="card-header">
          <div class="header-left">
            <div class="stage-tag" *ngIf="stageLabel">{{ stageLabel }}</div>
            <span class="card-name" [title]="card.name">{{ card.name }}</span>
          </div>
          <div class="header-right">
            <div class="hp-badge" *ngIf="card.hp != null">
              <span class="hp-label">PS</span>
              <span class="hp-value">{{ card.remainingHp }}</span>
            </div>
            <div class="type-orb" *ngIf="primaryType" [style.background]="typeColor" [title]="primaryType">
              {{ typeSymbol }}
            </div>
          </div>
        </div>

        <!-- Evolves From Subheader -->
        <div class="evolves-bar" *ngIf="card.evolvesFrom">
          Evoluciona de {{ card.evolvesFrom }}
        </div>

        <!-- Artwork Window -->
        <div class="art-frame" [style.background]="artBgGradient">
          <img
            *ngIf="artworkUrl"
            [src]="artworkUrl"
            [alt]="card.name"
            class="art-image"
            loading="lazy"
            (error)="onImgError($event)"
          />
          <div *ngIf="!artworkUrl && card.supertype === 'Energy'" class="energy-card-art">
            <div class="energy-giant-symbol" [style.color]="typeColor">{{ typeSymbol }}</div>
          </div>
          <div *ngIf="!artworkUrl && card.supertype === 'Trainer'" class="trainer-card-art">
            <span class="trainer-giant-symbol">📜</span>
          </div>
        </div>

        <!-- Attacks / Rules Area -->
        <div class="card-body">
          <!-- Pokemon Attacks -->
          <div class="attacks-list" *ngIf="card.supertype === 'Pokémon'">
            <div class="attack-item" *ngFor="let a of card.attacks">
              <div class="attack-head">
                <div class="cost-dots">
                  <span
                    class="cost-dot"
                    *ngFor="let c of a.cost"
                    [style.background]="energyInfo(c).color"
                    [title]="energyInfo(c).label"
                  >
                    {{ energyInfo(c).symbol }}
                  </span>
                  <span class="cost-free" *ngIf="!a.cost || a.cost.length === 0">0</span>
                </div>
                <span class="attack-name">{{ a.name }}</span>
                <span class="attack-damage" *ngIf="a.damage">{{ a.damage }}</span>
              </div>
              <p class="attack-text" *ngIf="a.text">{{ a.text }}</p>
            </div>
          </div>

          <!-- Pokemon Abilities -->
          <div class="abilities-list" *ngIf="card.abilities?.length">
            <div class="ability-item" *ngFor="let ab of card.abilities">
              <span class="ability-tag">HABILIDAD</span>
              <span class="ability-name">{{ ab.name }}</span>
              <p class="ability-text" *ngIf="ab.text">{{ ab.text }}</p>
            </div>
          </div>

          <!-- Trainer / Energy Rules -->
          <div class="rules-list" *ngIf="card.rules?.length">
            <div class="rule-line" *ngFor="let r of card.rules">{{ r }}</div>
          </div>

          <!-- Energy Provides -->
          <div class="energy-provides" *ngIf="card.supertype === 'Energy' && card.energyProvides?.length">
            <span class="energy-label">Proporciona:</span>
            <div class="cost-dots">
              <span
                class="cost-dot large"
                *ngFor="let ep of card.energyProvides"
                [style.background]="energyInfo(ep).color"
                [title]="energyInfo(ep).label"
              >
                {{ energyInfo(ep).symbol }}
              </span>
            </div>
          </div>
        </div>

        <!-- Footer Bar: Weakness, Resistance, Retreat -->
        <div class="card-footer" *ngIf="card.supertype === 'Pokémon'">
          <div class="stat-col" title="Debilidad">
            <span class="stat-lbl">Debilidad</span>
            <span class="stat-val" *ngIf="card.weaknesses?.length">
              {{ energyInfo(card.weaknesses[0].type).symbol }} {{ card.weaknesses[0].value }}
            </span>
            <span class="stat-none" *ngIf="!card.weaknesses?.length">—</span>
          </div>

          <div class="stat-col" title="Resistencia">
            <span class="stat-lbl">Resistencia</span>
            <span class="stat-val" *ngIf="card.resistances?.length">
              {{ energyInfo(card.resistances[0].type).symbol }} {{ card.resistances[0].value }}
            </span>
            <span class="stat-none" *ngIf="!card.resistances?.length">—</span>
          </div>

          <div class="stat-col" title="Coste de Retirada">
            <span class="stat-lbl">Retirada</span>
            <div class="retreat-dots" *ngIf="card.retreatCost?.length">
              <span class="retreat-dot" *ngFor="let r of card.retreatCost">⭐</span>
            </div>
            <span class="stat-none" *ngIf="!card.retreatCost?.length">0</span>
          </div>
        </div>

        <!-- Attached Energy Chips -->
        <div class="attached-energy-overlay" *ngIf="card.attachedEnergy?.length">
          <span
            class="attached-dot"
            *ngFor="let ae of card.attachedEnergy; let idx = index"
            [style.background]="energyInfo(ae).color"
            [title]="'Energía ' + energyInfo(ae).label"
          >
            {{ energyInfo(ae).symbol }}
          </span>
        </div>

        <!-- Damage Counter Floating Badge -->
        <div class="damage-overlay-badge" *ngIf="(card.damageCounters || 0) > 0">
          -{{ card.damageCounters * 10 }}
        </div>

        <!-- Status Conditions -->
        <div class="conditions-bar" *ngIf="card.conditions?.length">
          <span class="cond-pill" *ngFor="let c of card.conditions" [class]="'cond-' + c.toLowerCase()">
            {{ conditionEmoji(c) }} {{ conditionLabel(c) }}
          </span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: inline-block;
      user-select: none;
      perspective: 1000px;
    }

    .card-container {
      width: 144px;
      min-height: 204px;
      border-radius: 10px;
      position: relative;
      transition: transform 0.15s ease-out, box-shadow 0.2s ease;
      cursor: pointer;
      box-shadow: 0 8px 18px rgba(0, 0, 0, 0.5);
      background: #1e293b;
      transform-style: preserve-3d;
    }

    .card-container:hover {
      box-shadow: 0 16px 32px rgba(0, 0, 0, 0.7), 0 0 16px rgba(56, 189, 248, 0.4);
      z-index: 10;
    }

    .card-container.is-active-card {
      box-shadow: 0 0 0 3px #f59e0b, 0 10px 25px rgba(245, 158, 11, 0.5);
      animation: pulse-gold 2.5s infinite ease-in-out;
    }

    .card-container.is-playable {
      box-shadow: 0 0 0 3.5px #22c55e, 0 0 20px rgba(34, 197, 94, 0.9), 0 8px 18px rgba(0, 0, 0, 0.6);
      animation: pulse-playable 1.8s infinite ease-in-out;
      cursor: pointer;
    }

    /* FACE-DOWN POKEBALL CARD BACK */
    .card-back {
      width: 100%;
      height: 100%;
      min-height: 204px;
      background: linear-gradient(135deg, #1e3a8a 0%, #172554 100%);
      border: 3px solid #3b82f6;
      border-radius: 10px;
      padding: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .card-back-border {
      width: 100%;
      height: 100%;
      border: 2px solid #f59e0b;
      border-radius: 6px;
      background: radial-gradient(circle at 50% 50%, #1e40af 0%, #0f172a 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 8px;
    }
    .card-back-core {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }
    .pokeball-orb {
      width: 52px;
      height: 52px;
      border-radius: 50%;
      border: 3px solid #0f172a;
      position: relative;
      overflow: hidden;
      background: #ffffff;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.5);
    }
    .pokeball-top {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 50%;
      background: #ef4444;
    }
    .pokeball-band {
      position: absolute;
      top: 45%;
      left: 0;
      right: 0;
      height: 10%;
      background: #0f172a;
      z-index: 2;
    }
    .pokeball-center-btn {
      position: absolute;
      width: 16px;
      height: 16px;
      background: #ffffff;
      border: 3px solid #0f172a;
      border-radius: 50%;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 3;
    }
    .back-text {
      font-family: 'Outfit', sans-serif;
      font-size: 10px;
      font-weight: 900;
      color: #fbbf24;
      letter-spacing: 2px;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
    }

    /* CARD INNER (FACE-UP) */
    .card-inner {
      width: 100%;
      height: 100%;
      min-height: 204px;
      border-radius: 10px;
      padding: 6px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      position: relative;
      border: 2.5px solid #d4af37;
      overflow: hidden;
      color: #0f172a;
    }

    /* Holographic sheen overlay */
    .holo-foil {
      position: absolute;
      inset: 0;
      background: linear-gradient(
        115deg,
        transparent 0%,
        rgba(255, 255, 255, 0.08) 25%,
        rgba(255, 230, 100, 0.18) 45%,
        rgba(100, 220, 255, 0.18) 55%,
        transparent 75%
      );
      background-size: 200% 200%;
      pointer-events: none;
      mix-blend-mode: color-dodge;
      opacity: 0.6;
    }

    /* HEADER */
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 4px;
      z-index: 2;
    }
    .header-left {
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .stage-tag {
      font-size: 7px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #475569;
      line-height: 1;
    }
    .card-name {
      font-family: 'Outfit', sans-serif;
      font-weight: 800;
      font-size: 11px;
      line-height: 1.1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: #0f172a;
    }
    .header-right {
      display: flex;
      align-items: center;
      gap: 4px;
      flex-shrink: 0;
    }
    .hp-badge {
      display: flex;
      align-items: baseline;
      gap: 1px;
    }
    .hp-label {
      font-size: 7px;
      font-weight: 700;
      color: #b91c1c;
    }
    .hp-value {
      font-family: 'Outfit', sans-serif;
      font-size: 13px;
      font-weight: 800;
      color: #b91c1c;
      line-height: 1;
    }
    .type-orb {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 9px;
      color: #fff;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.4);
    }

    .evolves-bar {
      font-size: 7.5px;
      color: #475569;
      font-style: italic;
      margin-top: -2px;
      z-index: 2;
    }

    /* ART FRAME */
    .art-frame {
      width: 100%;
      height: 76px;
      border-radius: 6px;
      border: 1.5px solid #64748b;
      box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.25);
      position: relative;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2;
    }
    .art-image {
      width: 100%;
      height: 100%;
      object-fit: contain;
      filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.3));
      transition: transform 0.2s ease;
    }
    .card-container:hover .art-image {
      transform: scale(1.08);
    }
    .energy-card-art, .trainer-card-art {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
    }
    .energy-giant-symbol, .trainer-giant-symbol {
      font-size: 38px;
      filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.3));
    }

    /* CARD BODY */
    .card-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 3px;
      font-size: 9px;
      line-height: 1.2;
      z-index: 2;
    }
    .attack-item {
      padding: 2px 0;
      border-bottom: 1px dashed rgba(0, 0, 0, 0.15);
    }
    .attack-item:last-child {
      border-bottom: none;
    }
    .attack-head {
      display: flex;
      align-items: center;
      gap: 3px;
    }
    .cost-dots {
      display: inline-flex;
      align-items: center;
      gap: 1.5px;
    }
    .cost-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 6px;
      color: #fff;
      border: 0.5px solid rgba(0, 0, 0, 0.2);
    }
    .cost-dot.large {
      width: 16px;
      height: 16px;
      font-size: 9px;
    }
    .cost-free {
      font-size: 8px;
      color: #64748b;
    }
    .attack-name {
      font-weight: 700;
      color: #0f172a;
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .attack-damage {
      font-family: 'Outfit', sans-serif;
      font-weight: 800;
      font-size: 11px;
      color: #0f172a;
      margin-left: auto;
    }
    .attack-text {
      font-size: 7.5px;
      color: #334155;
      margin-top: 1px;
    }

    /* Abilities */
    .ability-item {
      background: rgba(239, 68, 68, 0.08);
      border-left: 2px solid #ef4444;
      padding: 1px 3px;
      border-radius: 2px;
    }
    .ability-tag {
      font-size: 6.5px;
      font-weight: 800;
      background: #dc2626;
      color: #fff;
      padding: 0 2px;
      border-radius: 2px;
      margin-right: 3px;
    }
    .ability-name {
      font-weight: 700;
    }
    .ability-text {
      font-size: 7.5px;
      color: #475569;
    }

    .rules-list, .rule-line {
      font-size: 8px;
      color: #334155;
      font-style: italic;
    }
    .energy-provides {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 8.5px;
      font-weight: 600;
    }

    /* FOOTER STATS */
    .card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid rgba(0, 0, 0, 0.15);
      padding-top: 2px;
      font-size: 7px;
      color: #475569;
      margin-top: auto;
      z-index: 2;
    }
    .stat-col {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .stat-lbl {
      font-size: 6px;
      text-transform: uppercase;
      letter-spacing: 0.2px;
      color: #64748b;
    }
    .stat-val {
      font-weight: 700;
      color: #0f172a;
    }
    .retreat-dots {
      display: flex;
      gap: 1px;
    }
    .retreat-dot {
      font-size: 7px;
    }

    /* OVERLAYS: ATTACHED ENERGY & DAMAGE */
    .attached-energy-overlay {
      position: absolute;
      top: 6px;
      left: -8px;
      display: flex;
      flex-direction: column;
      gap: 3px;
      z-index: 20;
    }
    .attached-dot {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 9px;
      color: #fff;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.6);
      border: 1.5px solid #ffffff;
      animation: pop-in 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }

    .damage-overlay-badge {
      position: absolute;
      bottom: 24px;
      right: 4px;
      background: #dc2626;
      color: #ffffff;
      font-family: 'Outfit', sans-serif;
      font-size: 11px;
      font-weight: 800;
      padding: 1px 5px;
      border-radius: 12px;
      border: 1.5px solid #fee2e2;
      box-shadow: 0 3px 8px rgba(0, 0, 0, 0.6);
      z-index: 25;
      animation: pulse-glow 2s infinite ease-in-out;
    }

    .conditions-bar {
      position: absolute;
      bottom: 4px;
      left: 4px;
      right: 4px;
      display: flex;
      gap: 2px;
      flex-wrap: wrap;
      z-index: 25;
    }
    .cond-pill {
      font-size: 6.5px;
      font-weight: 700;
      padding: 0 3px;
      border-radius: 4px;
      color: #ffffff;
      background: #334155;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
    }
    .cond-poisoned { background: #9333ea; }
    .cond-burned { background: #ea580c; }
    .cond-asleep { background: #2563eb; }
    .cond-confused { background: #d97706; }
    .cond-paralyzed { background: #ca8a04; }

    /* FULL OFFICIAL CARD IMAGE STYLES */
    .card-inner-fullimg {
      width: 100%;
      height: 100%;
      min-height: 201px;
      border-radius: 9px;
      overflow: hidden;
      position: relative;
      background: #0f172a;
      display: flex;
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.15);
    }
    .full-card-img {
      width: 100%;
      height: 100%;
      object-fit: fill;
      border-radius: 8px;
      display: block;
    }
    .remaining-hp-badge {
      position: absolute;
      top: 6px;
      right: 6px;
      background: rgba(15, 23, 42, 0.9);
      backdrop-filter: blur(6px);
      border: 1.5px solid #ef4444;
      border-radius: 12px;
      padding: 1px 6px;
      display: flex;
      align-items: baseline;
      gap: 2px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.8);
      z-index: 15;
      animation: pulse-glow 2s infinite ease-in-out;
    }
    .hp-curr {
      font-family: 'Outfit', sans-serif;
      font-weight: 900;
      font-size: 12px;
      color: #ef4444;
      line-height: 1;
    }
    .hp-slash {
      font-size: 8px;
      color: #94a3b8;
    }
    .hp-total {
      font-size: 8px;
      font-weight: 700;
      color: #cbd5e1;
    }
  `]
})
export class CardComponent {
  @Input() card!: CardView;
  @Input() faceDown = false;
  @Input() isActive = false;
  @Input() isPlayable = false;

  energyInfo = energyInfo;
  imageLoadError = false;

  tiltTransform = 'rotateX(0deg) rotateY(0deg)';
  holoPosition = '50% 50%';

  constructor(private el: ElementRef) {}

  get fullCardImageUrl(): string {
    return getFullCardImage(this.card);
  }

  onFullImgError(event: Event) {
    this.imageLoadError = true;
  }

  get primaryType(): string {
    return this.card?.types?.[0] || (this.card?.supertype === 'Energy' ? this.card?.energyProvides?.[0] || 'Colorless' : 'Colorless');
  }

  get typeInfo() {
    return energyInfo(this.primaryType);
  }

  get typeColor(): string {
    return this.typeInfo.color;
  }

  get typeSymbol(): string {
    return this.typeInfo.symbol;
  }

  get stageLabel(): string {
    if (this.card?.subtypes?.includes('Stage 2')) return 'ETAPA 2';
    if (this.card?.subtypes?.includes('Stage 1')) return 'ETAPA 1';
    if (this.card?.subtypes?.includes('Basic')) return 'BÁSICO';
    if (this.card?.supertype === 'Trainer') return this.card?.subtypes?.[0]?.toUpperCase() || 'ENTRENADOR';
    if (this.card?.supertype === 'Energy') return 'ENERGÍA';
    return '';
  }

  get artworkUrl(): string {
    return getCardArtwork(this.card);
  }

  get cardGradient(): string {
    if (this.card?.supertype === 'Trainer') {
      return 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 50%, #94a3b8 100%)';
    }
    if (this.card?.supertype === 'Energy') {
      return this.typeInfo.gradient;
    }
    // Pokemon card type gradient
    switch (this.primaryType) {
      case 'Fire': return 'linear-gradient(135deg, #ffedd5 0%, #fed7aa 60%, #fdba74 100%)';
      case 'Water': return 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 60%, #7dd3fc 100%)';
      case 'Grass': return 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 60%, #86efac 100%)';
      case 'Lightning': return 'linear-gradient(135deg, #fef9c3 0%, #fef08a 60%, #fde047 100%)';
      case 'Psychic': return 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 60%, #d8b4fe 100%)';
      case 'Fighting': return 'linear-gradient(135deg, #fef3c7 0%, #fde68a 60%, #fcd34d 100%)';
      case 'Darkness': return 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 60%, #94a3b8 100%)';
      default: return 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 60%, #e2e8f0 100%)';
    }
  }

  get artBgGradient(): string {
    if (this.card?.supertype === 'Energy') {
      return 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.4) 0%, rgba(0,0,0,0.2) 100%)';
    }
    return 'radial-gradient(circle at 50% 40%, rgba(255,255,255,0.85) 0%, rgba(203,213,225,0.5) 100%)';
  }

  onMouseMove(e: MouseEvent) {
    const rect = this.el.nativeElement.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotX = ((y - centerY) / centerY) * -12;
    const rotY = ((x - centerX) / centerX) * 12;

    this.tiltTransform = `rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) scale3d(1.03, 1.03, 1.03)`;
    const px = Math.round((x / rect.width) * 100);
    const py = Math.round((y / rect.height) * 100);
    this.holoPosition = `${px}% ${py}%`;
  }

  onMouseLeave() {
    this.tiltTransform = 'rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
    this.holoPosition = '50% 50%';
  }

  onImgError(event: Event) {
    (event.target as HTMLElement).style.display = 'none';
  }

  conditionLabel(c: string): string {
    const map: Record<string, string> = {
      Poisoned: 'Veneno',
      Burned: 'Quemadura',
      Asleep: 'Dormido',
      Confused: 'Confusión',
      Paralyzed: 'Parálisis'
    };
    return map[c] ?? c;
  }

  conditionEmoji(c: string): string {
    const map: Record<string, string> = {
      Poisoned: '☠️',
      Burned: '🔥',
      Asleep: '💤',
      Confused: '💫',
      Paralyzed: '⚡'
    };
    return map[c] ?? '⚠️';
  }
}
