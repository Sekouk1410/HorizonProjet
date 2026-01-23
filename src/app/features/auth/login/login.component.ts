import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../shared/services/auth.service';


@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  loading = false;
  error = '';

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  async onSubmit() {
    if (this.form.invalid) return;
    this.loading = true;
    this.error = '';
    let guard: any;
    try {
      guard = setTimeout(() => {
        if (this.loading) {
          this.loading = false;
          this.error = 'Connexion indisponible. Veuillez réessayer.';
        }
      }, 10000);
      const { email, password } = this.form.getRawValue();
      await this.auth.login(email!, password!);
      this.router.navigateByUrl('/');
    } catch (e: any) {
      const code = e?.code ?? e?.status;
      const message = String(e?.message || '');
      let friendly = 'Une erreur est survenue. Veuillez réessayer.';
      if (
        code === 401 || code === 403 ||
        /auth\/(invalid-credential|wrong-password|user-not-found|invalid-email)/i.test(String(code)) ||
        /(invalid|wrong|incorrect|credentials)/i.test(message)
      ) {
        friendly = 'Email ou mot de passe incorrect.';
      }
      this.error = friendly;
    } finally {
      if (guard) clearTimeout(guard);
      this.loading = false;
    }
  }
}
