import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap, catchError, of } from 'rxjs';
import { environment } from '../../environments/environment';

export interface UserClaims {
  username: string;
  displayName: string;
  role: string;
}

export interface LoginResponse {
  token: string;
  accessToken: string;
  user: UserClaims;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly TOKEN_KEY = 'pokemontcg_access_token';
  private readonly USER_KEY = 'pokemontcg_user_claims';
  public static readonly DEFAULT_DEMO_PASSWORD = 'Pk!Arena#2026$Demo';

  private apiUrl = `${environment.apiBaseUrl}/api/auth`;
  private currentUserSubject = new BehaviorSubject<UserClaims | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    this.restoreSession();
  }

  private restoreSession(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const savedUser = localStorage.getItem(this.USER_KEY);
      const savedToken = localStorage.getItem(this.TOKEN_KEY);
      if (savedUser && savedToken) {
        this.currentUserSubject.next(JSON.parse(savedUser));
      }
    } catch {
      this.clearStorage();
    }
  }

  login(username: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, { username, password }).pipe(
      tap((res) => {
        if (res?.token && res?.user) {
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(this.TOKEN_KEY, res.token);
            localStorage.setItem(this.USER_KEY, JSON.stringify(res.user));
          }
          this.currentUserSubject.next(res.user);
        }
      })
    );
  }

  quickLogin(playerNumber: 1 | 2): Observable<LoginResponse> {
    const username = playerNumber === 1 ? 'JugadorPokemon' : 'JugadorPokemon2';
    const password = AuthService.DEFAULT_DEMO_PASSWORD;
    return this.login(username, password);
  }

  logout(): void {
    try {
      this.http.post(`${this.apiUrl}/logout`, {}).pipe(catchError(() => of(null))).subscribe();
    } catch {
      // ignore
    }
    this.clearStorage();
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  private clearStorage(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.USER_KEY);
    }
  }

  getAccessToken(): string | null {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(this.TOKEN_KEY);
  }

  getUser(): UserClaims | null {
    return this.currentUserSubject.value;
  }

  getUsername(): string | null {
    return this.currentUserSubject.value?.username || null;
  }

  getRole(): string | null {
    return this.currentUserSubject.value?.role || 'pokemon';
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }
}
