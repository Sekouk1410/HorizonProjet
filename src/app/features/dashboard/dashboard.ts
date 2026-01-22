import { Component, Injector, inject, runInInjectionContext } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { ProjectFormComponent } from '../projects/project-form/project-form.component';
import { ProjectEditComponent } from '../projects/project-edit/project-edit.component';
import { ProjectCardComponent, ProjectModel } from '../projects/project-card/project-card.component';
import { ProjectService } from '../../shared/services/project.service';
import { AuthService } from '../../shared/services/auth.service';
import { BehaviorSubject, combineLatest, map, Observable, of, switchMap, catchError, debounceTime, distinctUntilChanged } from 'rxjs';
import { Project } from '../../shared/models/project.model';
import { FormsModule } from '@angular/forms';
import { User } from '../../shared/models/user.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, ProjectFormComponent, ProjectEditComponent, ProjectCardComponent],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss'],
})
export class Dashboard {
  // Flux de données
  projects$!: Observable<Project[]>;
  private search$ = new BehaviorSubject<string>('');
  private filter$ = new BehaviorSubject<'all' | 'active' | 'done'>('all');
  view$!: Observable<ProjectModel[]>;
  private searchDebounced$ = this.search$.pipe(debounceTime(250), distinctUntilChanged());
  private refresh$ = new BehaviorSubject<void>(undefined);

  private currentUserId?: string;
  showCreateModal = false;
  showEditModal = false;
  showConfirmDelete = false;
  editingProjectId?: string;
  editingProjectInitial?: { name?: string; description?: string; endDate?: Date };
  private projectToDeleteId?: string;

  // Toast notifications
  private toastSeq = 0;
  toasts: { id: number; type: 'success' | 'error'; message: string }[] = [];
  private showToast(message: string, type: 'success' | 'error' = 'success', ttlMs = 3000) {
    const id = ++this.toastSeq;
    this.toasts = [...this.toasts, { id, type, message }];
    setTimeout(() => {
      this.toasts = this.toasts.filter(t => t.id !== id);
    }, ttlMs);
  }

  onEditSaved(result: 'success' | 'error') {
    if (result === 'success') {
      this.showToast('Projet mis à jour avec succès', 'success');
      this.refresh$.next();
    } else {
      this.showToast('Échec de la mise à jour du projet', 'error');
    }
  }

  openCreateModal() { this.showEditModal = false; this.showCreateModal = true; }
  closeCreateModal() { this.showCreateModal = false; }
  openEditModal(p: ProjectModel) {
    this.editingProjectId = String(p.id);
    this.editingProjectInitial = {
      name: p.name,
      description: p.description,
    };
    this.showCreateModal = false;
    this.showEditModal = true;
  }
  closeEditModal() { this.editingProjectId = undefined; this.editingProjectInitial = undefined; this.showEditModal = false; }

  async onCreate(p: { name: string; description?: string; endDate?: Date }) {
    if (!this.currentUserId) {
      console.warn('Utilisateur non connecté');
      return;
    }
    try {
      await this.projectService.create({
        name: p.name,
        description: p.description || '',
        startDate: new Date(),
        endDate: p.endDate ?? new Date(),
        status: undefined,
        members: [this.currentUserId]
      }, this.currentUserId);
      this.closeCreateModal();
      this.refresh$.next();
      this.showToast('Projet créé avec succès', 'success');
    } catch (e: any) {
      console.error('[Dashboard] create failed', e);
      this.showToast("Échec de la création du projet", 'error');
    }
  }

  onView(p: ProjectModel) {
    if (p.id) this.router.navigate(['projects', String(p.id)]);
  }

  onEdit(p: ProjectModel) {
    if (!p?.id) return;
    this.openEditModal(p);
  }

  onRemove(p: ProjectModel) {
    if (!p?.id) return;
    this.projectToDeleteId = String(p.id);
    this.showConfirmDelete = true;
  }

  async confirmDelete() {
    if (!this.projectToDeleteId) return;
    try {
      await this.projectService.delete(this.projectToDeleteId);
      this.showToast('Projet supprimé avec succès', 'success');
      this.refresh$.next();
    } catch (e: any) {
      console.error('[Dashboard] delete failed', e);
      this.showToast('Échec de la suppression du projet', 'error');
    } finally {
      this.projectToDeleteId = undefined;
      this.showConfirmDelete = false;
    }
  }

  cancelDelete() {
    this.projectToDeleteId = undefined;
    this.showConfirmDelete = false;
  }

  setSearch(val: string) { this.search$.next(val); }
  setFilter(val: 'all' | 'active' | 'done') { this.filter$.next(val); }

  async onUpdate(payload: { name: string; description?: string; endDate?: Date }) {
    if (!this.editingProjectId) return;
    try {
      await this.projectService.update(this.editingProjectId, {
        name: payload.name,
        description: payload.description
      });
      this.closeEditModal();
      this.showToast('Projet mis à jour avec succès', 'success');
      this.refresh$.next();
    } catch (e: any) {
      console.error('[Dashboard] update failed', e);
      this.showToast("Échec de la mise à jour du projet", 'error');
    }
  }

  private injector = inject(Injector);

  constructor(private projectService: ProjectService, authService: AuthService, private router: Router) {
    runInInjectionContext(this.injector, () => {
      authService.currentUser$.subscribe((u: User | null) => {
        this.currentUserId = u?.id;
        console.debug('[Dashboard] currentUserId:', this.currentUserId);
      });

      // Lister les projets où l'utilisateur est membre OU créateur (manager)
      this.projects$ = authService.currentUser$.pipe(
        switchMap((u: User | null) => {
          if (!u?.id) return of([] as Project[]);
          return this.refresh$.pipe(
            switchMap(() => combineLatest([
              this.projectService.listByMember$(u.id).pipe(catchError((err: any) => { console.error('[Dashboard] listByMember$ error', err); return of([] as Project[]); })),
              this.projectService.listByCreator$(u.id).pipe(catchError((err: any) => { console.error('[Dashboard] listByCreator$ error', err); return of([] as Project[]); }))
            ]).pipe(
              map(([asMember, asCreator]: [Project[], Project[]]) => {
                const byId = new Map<string, Project>();
                [...asMember, ...asCreator].forEach((p: Project) => { if (p?.id) byId.set(p.id, p); });
                return Array.from(byId.values());
              })
            ))
          );
        })
      );

      this.view$ = combineLatest([this.projects$, this.searchDebounced$, this.filter$]).pipe(
        map(([projects, q, filter]: [Project[], string, 'all' | 'active' | 'done']) => {
          console.debug('[Dashboard] projects received:', projects?.length ?? 0);
          const query = (q || '').trim().toLowerCase();
          const bySearch = (p: Project) =>
            !query || p.name.toLowerCase().includes(query) || (p.description || '').toLowerCase().includes(query);

          const toModel = (p: Project): ProjectModel => ({
            id: p.id,
            name: p.name,
            description: p.description,
            stats: {
              tasks: p.timeSpent || 0,
              completed: Math.min(p.timeSpent || 0, (p.timeSpent || 0) - 0),
              members: (p.members || []).length,
              status: String(p.status)
            },
            role: p.createdBy === this.currentUserId ? 'manager' : 'member',
            canEdit: p.createdBy === this.currentUserId
          });

          const isDone = (p: Project) => p.status === 'completed';
          const isActive = (p: Project) => !isDone(p);
          const byFilter = (p: Project) => filter === 'all' || (filter === 'done' ? isDone(p) : isActive(p));

          const result = projects.filter((p: Project) => bySearch(p) && byFilter(p)).map(toModel);
          console.debug('[Dashboard] view size:', result.length);
          return result;
        })
      );
    });
  }
}
