import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-pokemon-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-wrapper">
      <div class="login-backdrop"></div>

      <div class="login-card glass-panel">
        <!-- Brand Header -->
        <div class="brand-header">
          <div class="pokeball-badge">
            <div class="pokeball-half-top"></div>
            <div class="pokeball-center-line"></div>
            <div class="pokeball-btn-ring"></div>
            <div class="pokeball-half-bottom"></div>
          </div>
          <h1 class="game-title">POKÉMON TCG</h1>
          <p class="game-subtitle">Battle Arena & Learning Platform</p>
        </div>

        <!-- Quick 1-Click Login Section -->
        <div class="quick-access-box">
          <span class="quick-title">⚡ Acceso Rápido de Jugador</span>
          <div class="quick-buttons-row">
            <button
              class="btn-quick red-trainer"
              (click)="quickEnter(1)"
              [disabled]="loading"
            >
              <img src="assets/trainers/red.png" alt="Red" class="quick-avatar" />
              <div class="quick-meta">
                <span class="trainer-name">Jugador 1</span>
                <span class="trainer-tag">Entrenador Red</span>
              </div>
            </button>

            <button
              class="btn-quick blue-trainer"
              (click)="quickEnter(2)"
              [disabled]="loading"
            >
              <img src="assets/trainers/blue.png" alt="Blue" class="quick-avatar" />
              <div class="quick-meta">
                <span class="trainer-name">Jugador 2</span>
                <span class="trainer-tag">Entrenador Blue</span>
              </div>
            </button>
          </div>
        </div>

        <div class="divider-row">
          <span class="divider-line"></span>
          <span class="divider-text">o ingresa tus credenciales</span>
          <span class="divider-line"></span>
        </div>

        <!-- Manual Login Form -->
        <form (ngSubmit)="submitLogin()" class="login-form">
          <div class="form-group">
            <label class="form-label" for="username">Usuario</label>
            <input
              id="username"
              type="text"
              class="form-input"
              [(ngModel)]="username"
              name="username"
              placeholder="JugadorPokemon"
              required
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="password">Contraseña</label>
            <input
              id="password"
              type="password"
              class="form-input"
              [(ngModel)]="password"
              name="password"
              placeholder="••••••••"
              required
            />
          </div>

          <div class="error-banner" *ngIf="errorMessage">
            ⚠️ {{ errorMessage }}
          </div>

          <button type="submit" class="btn-submit" [disabled]="loading">
            {{ loading ? 'Conectando...' : 'Entrar a la Arena' }}
          </button>
        </form>

        <div class="login-footer">
          <span>Partidas 1v1 en tiempo real • Duelos contra Profesores Pokémon (IA)</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      background: #090d16;
      color: #f8fafc;
      font-family: 'Outfit', sans-serif;
    }

    .login-wrapper {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      position: relative;
      overflow: hidden;
    }

    .login-backdrop {
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at 50% 30%, rgba(56, 189, 248, 0.15) 0%, transparent 60%),
                  radial-gradient(circle at 20% 80%, rgba(239, 68, 68, 0.12) 0%, transparent 50%),
                  radial-gradient(circle at 80% 80%, rgba(59, 130, 246, 0.12) 0%, transparent 50%);
      pointer-events: none;
    }

    .glass-panel {
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 40px rgba(56, 189, 248, 0.1);
      border-radius: 24px;
    }

    .login-card {
      width: 100%;
      max-width: 480px;
      padding: 40px 36px;
      position: relative;
      z-index: 10;
    }

    .brand-header {
      text-align: center;
      margin-bottom: 28px;
    }

    .pokeball-badge {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      border: 3px solid #0f172a;
      margin: 0 auto 16px;
      position: relative;
      overflow: hidden;
      box-shadow: 0 0 25px rgba(239, 68, 68, 0.5);
      animation: ball-pulse 3s infinite ease-in-out;
    }

    @keyframes ball-pulse {
      0%, 100% { transform: scale(1); filter: drop-shadow(0 0 10px rgba(239, 68, 68, 0.4)); }
      50% { transform: scale(1.05); filter: drop-shadow(0 0 20px rgba(59, 130, 246, 0.6)); }
    }

    .pokeball-half-top {
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 50%;
      background: #ef4444;
    }
    .pokeball-center-line {
      position: absolute;
      top: 45%; left: 0; right: 0;
      height: 10%;
      background: #0f172a;
      z-index: 2;
    }
    .pokeball-btn-ring {
      position: absolute;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #ffffff;
      border: 3.5px solid #0f172a;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      z-index: 3;
    }
    .pokeball-half-bottom {
      position: absolute;
      bottom: 0; left: 0; right: 0;
      height: 50%;
      background: #ffffff;
    }

    .game-title {
      font-size: 30px;
      font-weight: 900;
      letter-spacing: 2px;
      color: #f8fafc;
      margin: 0 0 6px;
      background: linear-gradient(135deg, #f8fafc 0%, #38bdf8 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .game-subtitle {
      font-size: 13px;
      color: #94a3b8;
      margin: 0;
      letter-spacing: 0.5px;
    }

    .quick-access-box {
      margin-bottom: 24px;
      background: rgba(30, 41, 59, 0.5);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 16px;
      padding: 16px;
    }

    .quick-title {
      display: block;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #38bdf8;
      margin-bottom: 12px;
      text-align: center;
    }

    .quick-buttons-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .btn-quick {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      cursor: pointer;
      transition: all 0.2s ease;
      background: rgba(15, 23, 42, 0.7);
      text-align: left;
    }

    .btn-quick:hover:not(:disabled) {
      transform: translateY(-2px);
    }

    .red-trainer:hover:not(:disabled) {
      border-color: #ef4444;
      box-shadow: 0 6px 20px rgba(239, 68, 68, 0.35);
      background: linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(15, 23, 42, 0.8));
    }

    .blue-trainer:hover:not(:disabled) {
      border-color: #3b82f6;
      box-shadow: 0 6px 20px rgba(59, 130, 246, 0.35);
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(15, 23, 42, 0.8));
    }

    .quick-avatar {
      width: 42px;
      height: 42px;
      object-fit: contain;
      image-rendering: pixelated;
      background: rgba(0, 0, 0, 0.3);
      border-radius: 8px;
      padding: 2px;
    }

    .quick-meta {
      display: flex;
      flex-direction: column;
    }

    .trainer-name {
      font-size: 13px;
      font-weight: 800;
      color: #f8fafc;
    }

    .trainer-tag {
      font-size: 10px;
      color: #94a3b8;
    }

    .divider-row {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
    }

    .divider-line {
      flex: 1;
      height: 1px;
      background: rgba(255, 255, 255, 0.1);
    }

    .divider-text {
      font-size: 11px;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .login-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .form-label {
      font-size: 12px;
      font-weight: 700;
      color: #cbd5e1;
    }

    .form-input {
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 10px;
      padding: 12px 14px;
      color: #f8fafc;
      font-size: 14px;
      outline: none;
      transition: all 0.2s;
    }

    .form-input:focus {
      border-color: #38bdf8;
      box-shadow: 0 0 15px rgba(56, 189, 248, 0.25);
    }

    .error-banner {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid #ef4444;
      color: #fca5a5;
      padding: 10px 14px;
      border-radius: 10px;
      font-size: 12px;
      font-weight: 600;
    }

    .btn-submit {
      margin-top: 6px;
      background: linear-gradient(135deg, #0284c7 0%, #2563eb 100%);
      color: #ffffff;
      font-size: 14px;
      font-weight: 800;
      letter-spacing: 0.5px;
      padding: 14px;
      border: 1px solid #38bdf8;
      border-radius: 12px;
      cursor: pointer;
      box-shadow: 0 8px 20px rgba(37, 99, 235, 0.4);
      transition: all 0.2s ease;
    }

    .btn-submit:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 12px 25px rgba(37, 99, 235, 0.6);
    }

    .btn-submit:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .login-footer {
      text-align: center;
      margin-top: 24px;
      font-size: 11px;
      color: #64748b;
    }
  `]
})
export class PokemonLoginComponent {
  username = 'JugadorPokemon';
  password = 'Susanita2014';
  loading = false;
  errorMessage = '';

  constructor(private auth: AuthService, private router: Router) {}

  quickEnter(playerNumber: 1 | 2) {
    this.loading = true;
    this.errorMessage = '';
    this.auth.quickLogin(playerNumber).subscribe({
      next: () => {
        this.router.navigate(['/pokemon']);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err?.error?.message || 'Error de conexión con el servidor.';
      }
    });
  }

  submitLogin() {
    if (!this.username.trim() || !this.password.trim()) {
      this.errorMessage = 'Por favor ingresa usuario y contraseña.';
      return;
    }
    this.loading = true;
    this.errorMessage = '';
    this.auth.login(this.username.trim(), this.password).subscribe({
      next: () => {
        this.router.navigate(['/pokemon']);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err?.error?.message || 'Usuario o contraseña incorrectos.';
      }
    });
  }
}
