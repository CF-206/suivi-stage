import { Routes } from '@angular/router';
import { Shell } from './layout/shell/shell';
import { authGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'connexion',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login-page').then((m) => m.LoginPage),
  },
  {
    path: '',
    component: Shell,
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'candidatures' },
      {
        path: 'candidatures',
        loadComponent: () =>
          import('./features/candidatures/candidature-list/candidature-list').then(
            (m) => m.CandidatureList,
          ),
      },
      {
        path: 'candidatures/:id',
        loadComponent: () =>
          import('./features/candidatures/candidature-detail/candidature-detail').then(
            (m) => m.CandidatureDetail,
          ),
      },
      {
        path: 'profil',
        loadComponent: () => import('./features/profil/profil-page').then((m) => m.ProfilPage),
      },
      {
        path: 'relances',
        loadComponent: () =>
          import('./features/relances/relances-page').then((m) => m.RelancesPage),
      },
      {
        path: 'archives',
        loadComponent: () =>
          import('./features/archives/archives-page').then((m) => m.ArchivesPage),
      },
    ],
  },
  { path: '**', redirectTo: 'candidatures' },
];
