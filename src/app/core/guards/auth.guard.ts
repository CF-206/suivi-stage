import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, firstValueFrom } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Protège les pages de l'app : si Supabase est configuré, il faut être
 * connecté. Si Supabase n'est pas configuré, l'app reste utilisable en mode
 * local (les données restent dans le navigateur).
 */
export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.disponible) return true;

  if (auth.chargement()) {
    await firstValueFrom(toObservable(auth.chargement).pipe(filter((charge) => !charge)));
  }

  return auth.connecte() ? true : router.createUrlTree(['/connexion']);
};

/** À l'inverse : si l'utilisateur est déjà connecté, on le renvoie à l'app. */
export const guestGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.disponible) return true;

  if (auth.chargement()) {
    await firstValueFrom(toObservable(auth.chargement).pipe(filter((charge) => !charge)));
  }

  return auth.connecte() ? router.createUrlTree(['/candidatures']) : true;
};
