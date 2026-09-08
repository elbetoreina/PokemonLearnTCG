import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CardSearchResult, GameCard } from '../models/game';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CardService {
  private readonly baseUrl = `${environment.apiBaseUrl}/api/cards`;

  constructor(private http: HttpClient) {}

  search(q?: string, page = 1, pageSize = 20): Observable<CardSearchResult> {
    const params: Record<string, string> = { page: String(page), pageSize: String(pageSize) };
    if (q) params['q'] = q;
    return this.http.get<CardSearchResult>(this.baseUrl, { params });
  }

  getStarterDeck(): Observable<GameCard[]> {
    return this.http.get<GameCard[]>(`${this.baseUrl}/starter`);
  }

  getCard(id: string): Observable<GameCard> {
    return this.http.get<GameCard>(`${this.baseUrl}/${id}`);
  }
}
