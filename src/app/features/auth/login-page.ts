import { Component, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

type Mode = 'connexion' | 'inscription';

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule],
  templateUrl: './login-page.html',
  styleUrl: './login-page.scss',
})
export class LoginPage {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);

  protected readonly mode = signal<Mode>('connexion');
  protected readonly busy = signal(false);
  /** Le mot de passe est-il affiché en clair ? */
  protected readonly mdpVisible = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    motDePasse: ['', [Validators.required, Validators.minLength(6)]],
  });

  constructor() {
    // Si la session arrive (lien de confirmation d'email, retour de
    // connexion automatique), on renvoie direct vers l'app.
    effect(() => {
      const connecte = this.auth.connecte();
      untracked(() => {
        if (connecte) void this.router.navigateByUrl('/candidatures');
      });
    });
  }

  /** Bascule entre connexion et création de compte. */
  protected changerMode(): void {
    this.setMode(this.mode() === 'connexion' ? 'inscription' : 'connexion');
  }

  /** Passe dans un mode précis (onglets Connexion / Créer un compte). */
  protected setMode(mode: Mode): void {
    if (this.mode() === mode) return;
    this.mode.set(mode);
    this.auth.clearErreur();
    this.form.reset();
    this.mdpVisible.set(false);
  }

  protected async soumettre(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.busy.set(true);
    const { email, motDePasse } = this.form.getRawValue();

    try {
      const ok =
        this.mode() === 'connexion'
          ? await this.auth.connexion(email, motDePasse)
          : await this.auth.inscription(email, motDePasse);

      if (ok && this.auth.connecte()) {
        await this.router.navigateByUrl('/candidatures');
      }
    } finally {
      this.busy.set(false);
    }
  }

  /** Envoie un lien de réinitialisation du mot de passe. */
  protected async motDePasseOublie(): Promise<void> {
    const email = this.form.controls.email.value.trim();
    if (!email) {
      this.form.controls.email.markAsTouched();
      return;
    }
    this.busy.set(true);
    try {
      await this.auth.reinitialiserMotDePasse(email);
    } finally {
      this.busy.set(false);
    }
  }
}