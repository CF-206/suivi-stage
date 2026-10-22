import { Component, effect, inject, input, output, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ConfigMailjet, mailjetValide } from '../../../core/models/mailjet';
import { MailjetService } from '../../../core/services/mailjet.service';
import { emailValidator } from '../../../core/utils/validators';

/**
 * Connexion d'un compte Mailjet personnel (optionnel).
 *
 * Utilisable depuis la page « Mes infos » et depuis l'écran d'inscription.
 */
@Component({
  selector: 'app-mailjet-config',
  imports: [ReactiveFormsModule],
  templateUrl: './mailjet-config.html',
  styleUrl: './mailjet-config.scss',
})
export class MailjetConfig {
  /**
   * Si `false`, le composant ne sauvegarde pas tout seul : il émet la
   * configuration (utile pendant l'inscription, où le compte n'existe pas
   * encore et il n'y a donc pas encore de session).
   */
  readonly autoSave = input(true);

  /** Masque le bouton « Tester » (utile pendant l'inscription). */
  readonly compact = input(false);

  /** Émis quand la configuration est prête à être enregistrée. */
  readonly enregistre = output<ConfigMailjet>();

  protected readonly mailjet = inject(MailjetService);

  protected readonly form = inject(NonNullableFormBuilder).group({
    apiKey: ['', [Validators.required]],
    apiSecret: ['', [Validators.required]],
    fromEmail: ['', [Validators.required, emailValidator]],
    fromName: [''],
  });

  protected readonly ouvert = signal(false);
  protected readonly message = signal<{ ok: boolean; texte: string } | null>(null);
  protected readonly test = signal<{ ok: boolean; texte: string } | null>(null);

  constructor() {
    // On remplit le formulaire avec la configuration existante.
    effect(() => {
      const config = this.mailjet.config();
      if (!this.mailjet.configure()) return;
      this.form.patchValue({
        apiKey: config.apiKey,
        apiSecret: config.apiSecret,
        fromEmail: config.fromEmail,
        fromName: config.fromName,
      });
    });
  }

  protected async enregistrer(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.message.set({ ok: false, texte: 'Renseigne tous les champs.' });
      return;
    }

    const config = this.form.getRawValue();

    // Pendant l'inscription, le compte n'existe pas encore : on se contente
    // de remonter la configuration, le parent l'enregistrera après coup.
    if (!this.autoSave()) {
      this.enregistre.emit(config);
      this.message.set({ ok: true, texte: 'Configuration prête ✓' });
      return;
    }

    const resultat = await this.mailjet.enregistrer(config);
    this.message.set({ ok: resultat.ok, texte: resultat.message });
    if (resultat.ok) {
      this.enregistre.emit(config);
      this.ouvert.set(false);
    }
  }

  /** Configuration actuellement saisie (utilisé par l'écran d'inscription). */
  configCourante(): ConfigMailjet {
    return this.form.getRawValue();
  }

  /** Envoie un mail de test pour vérifier les identifiants. */
  protected async tester(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.test.set({ ok: true, texte: 'Envoi du mail de test…' });
    const resultat = await this.testerEndpoint();
    this.test.set(resultat);
  }

  /** Appelle l'endpoint de test. */
  private async testerEndpoint(): Promise<{ ok: boolean; texte: string }> {
    try {
      const config = this.form.getRawValue();
      const reponse = await fetch('/api/tester-mailjet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (!(reponse.headers.get('content-type') ?? '').includes('application/json')) {
        return {
          ok: false,
          texte: "Le test n'est disponible que sur la version en ligne (Vercel).",
        };
      }

      const data = await reponse.json();
      return { ok: !!data.ok, texte: data.message ?? data.error ?? 'Test terminé.' };
    } catch (e) {
      return {
        ok: false,
        texte: e instanceof Error ? e.message : String(e),
      };
    }
  }

  protected async supprimer(): Promise<void> {
    await this.mailjet.supprimer();
    this.form.reset();
    this.message.set({ ok: true, texte: 'Compte Mailjet déconnecté.' });
    this.test.set(null);
  }

  protected readonly valide = () => mailjetValide(this.form.getRawValue());
}
