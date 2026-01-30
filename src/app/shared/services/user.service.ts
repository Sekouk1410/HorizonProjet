import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, firstValueFrom, of } from 'rxjs';
import { API_BASE } from '../config';
import { User } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  private http = inject(HttpClient);

  // Retourne le premier utilisateur correspondant à l'email, ou undefined
  findByEmail$(email: string): Observable<User | undefined> {
    const e = (email || '').trim().toLowerCase();
    return this.http.get<User[]>(`${API_BASE}/users`, { params: { email: e } as any }).pipe(
      map(list => Array.isArray(list) ? list[0] : undefined)
    );
  }

  // Recherche des utilisateurs par email (partiel, insensible à la casse) pour l'autocomplétion
  searchByEmail$(query: string): Observable<User[]> {
    const q = (query || '').trim().toLowerCase();
    if (!q) return this.http.get<User[]>(`${API_BASE}/users`, { params: { _limit: 0 } as any });
    return this.http.get<User[]>(`${API_BASE}/users`, { params: { email_like: q, _limit: 5 } as any });
  }

  // Récupérer des utilisateurs par une liste d'identifiants (json-server accepte des paramètres id répétés)
  getByIds$(ids: string[]): Observable<User[]> {
    const list = Array.from(new Set((ids || []).map(x => String(x)).filter(Boolean)));
    if (!list.length) return of([]);
    let params = new HttpParams();
    list.forEach(id => { params = params.append('id', id); });
    return this.http.get<User[]>(`${API_BASE}/users`, { params });
  }

  // Récupérer un utilisateur par son identifiant
  get$(id: string): Observable<User | undefined> {
    return this.http.get<User>(`${API_BASE}/users/${id}`) as any;
  }

  async upsert(u: User): Promise<void> {
    const id = (u as any)?.id?.toString?.();
    if (!id) return;
    try {
      // Vérifier l'existence
      await firstValueFrom(this.http.get<User>(`${API_BASE}/users/${id}`));
      // Existe -> mise à jour des champs minimaux
      await firstValueFrom(this.http.patch(`${API_BASE}/users/${id}`,
        { email: u.email, userName: (u as any).userName, name: (u as any).userName, updatedAt: new Date() } as any));
    } catch {
      // Non trouvé -> création
      const body: any = {
        id,
        email: u.email,
        userName: (u as any).userName,
        name: (u as any).userName,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      try {
        // Préférer POST /users avec id explicite dans le corps (json-server accepte les id chaîne)
        await firstValueFrom(this.http.post(`${API_BASE}/users`, body));
      } catch {
        // Repli sur PUT /users/:id si POST échoue (ex: contraintes de middleware)
        await firstValueFrom(this.http.put(`${API_BASE}/users/${id}`, body));
      }
    }
  }

  // Aide pratique pour obtenir l'id depuis un email ('' si non trouvé)
  async findIdByEmail(email: string): Promise<string> {
    const e = (email || '').trim().toLowerCase();
    try {
      const users = await firstValueFrom(this.http.get<User[]>(`${API_BASE}/users`, { params: { email: e } as any }));
      const u = Array.isArray(users) ? users[0] : undefined;
      return (u?.id as any)?.toString?.() ?? '';
    } catch {
      return '';
    }
  }
}
