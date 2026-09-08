import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { PokemonLoginComponent } from './components/login/pokemon-login.component';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'pokemon'
  },
  {
    path: 'login',
    component: PokemonLoginComponent
  },
  {
    path: 'pokemon',
    loadComponent: () => import('./pages/pokemon-game/pokemon-game.component').then(m => m.PokemonGameComponent),
    canActivate: [authGuard]
  },
  {
    path: '**',
    redirectTo: 'pokemon'
  }
];
