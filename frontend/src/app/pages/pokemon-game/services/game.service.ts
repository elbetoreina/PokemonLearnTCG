import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { BehaviorSubject, Subject } from 'rxjs';
import { GameActionRequest, GameView } from '../models/game';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../services/auth.service';

@Injectable({ providedIn: 'root' })
export class GameService {
  private connection: signalR.HubConnection | null = null;

  readonly game$ = new BehaviorSubject<GameView | null>(null);
  readonly waiting$ = new BehaviorSubject<boolean>(false);
  readonly error$ = new Subject<string>();
  readonly notice$ = new Subject<string>();
  readonly connected$ = new BehaviorSubject<boolean>(false);

  readonly gameId$ = new BehaviorSubject<string | null>(null);

  constructor(private authService: AuthService) {}

  async connect(): Promise<void> {
    if (this.connection) return;

    // Connect to SignalR hub via /api/ prefix so Nginx routes to backend
    const hubUrl = `${environment.apiBaseUrl}/api/hubs/pokemon`;
    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        withCredentials: true,
        accessTokenFactory: () => this.authService.getAccessToken() || ''
      })
      .withAutomaticReconnect()
      .build();

    this.connection.on('GameState', (view: GameView) => {
      this.game$.next(view);
      this.gameId$.next(view.id);
    });
    this.connection.on('Waiting', (msg: string) => {
      this.waiting$.next(true);
      this.notice$.next(msg);
    });
    this.connection.on('Error', (msg: string) => this.error$.next(msg));
    this.connection.on('ActionRejected', (msg: string) => this.error$.next(msg));
    this.connection.on('GameOver', (winnerId: string, reason: string) => {
      this.notice$.next(`Fin de la partida (${reason})`);
    });

    await this.connection.start();
    this.connected$.next(true);
  }

  async createGame(name: string): Promise<void> {
    await this.ensure();
    this.waiting$.next(false);
    await this.connection!.invoke('CreateGame', name);
  }

  async joinGame(gameId: string, name: string): Promise<void> {
    await this.ensure();
    this.waiting$.next(false);
    await this.connection!.invoke('JoinGame', gameId, name);
  }

  async quickMatch(name: string): Promise<void> {
    await this.ensure();
    await this.connection!.invoke('QuickMatch', name);
  }

  async practiceGame(name: string): Promise<void> {
    await this.ensure();
    this.waiting$.next(false);
    await this.connection!.invoke('PracticeGame', name);
  }

  async sendAction(req: GameActionRequest): Promise<void> {
    await this.ensure();
    await this.connection!.invoke('Action', req);
  }

  async refresh(): Promise<void> {
    await this.ensure();
    await this.connection!.invoke('GetState');
  }

  async leaveGame(): Promise<void> {
    try {
      if (this.connection && this.connection.state === signalR.HubConnectionState.Connected) {
        await this.connection.invoke('LeaveGame');
      }
    } catch {
      // ignore
    }
    this.reset();
  }

  async disconnect(): Promise<void> {
    try {
      if (this.connection && this.connection.state === signalR.HubConnectionState.Connected) {
        try {
          await this.connection.invoke('Logout');
        } catch {
          // ignore
        }
        await this.connection.stop();
      }
    } catch {
      // ignore
    }
    this.connection = null;
    this.connected$.next(false);
    this.reset();
  }

  reset(): void {
    this.game$.next(null);
    this.gameId$.next(null);
    this.waiting$.next(false);
  }

  private async ensure(): Promise<void> {
    if (!this.connection || this.connection.state === signalR.HubConnectionState.Disconnected) {
      this.connection = null;
      await this.connect();
    }
  }
}
