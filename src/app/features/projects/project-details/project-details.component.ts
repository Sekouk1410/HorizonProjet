import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject, Observable, of, switchMap, debounceTime, distinctUntilChanged, combineLatest, map } from 'rxjs';
import { Project } from '../../../shared/models/project.model';
import { TaskService } from '../../../shared/services/task.service';
import { StatusTask } from '../../../shared/models/task.model';
import { ProjectService } from '../../../shared/services/project.service';
import { Milestone } from '../../../shared/models/milestone.model';
import { MilestoneService } from '../../../shared/services/milestone.service';
import { AuthService } from '../../../shared/services/auth.service';
import { UserService } from '../../../shared/services/user.service';
import { User } from '../../../shared/models/user.model';
import { FormsModule } from '@angular/forms';
import { TaskListComponent } from '../../tasks/task-list/task-list.component';

@Component({
  selector: 'app-project-details',
  standalone: true,
  imports: [CommonModule, FormsModule, TaskListComponent],
  templateUrl: './project-details.component.html',
  styleUrls: ['./project-details.component.scss']
})
export class ProjectDetailsComponent {
  project$!: Observable<Project | undefined>;
  projectId = '';
  currentUserId?: string;
  // déclencheurs de rafraîchissement
  private refresh$ = new BehaviorSubject<void>(undefined);
  private milestonesRefresh$ = new BehaviorSubject<void>(undefined);
  // jalons
  milestones$!: Observable<Milestone[]>;
  msName = '';
  msDate?: string;
  msDescription = '';
  // membres
  addMemberEmail = '';
  members$!: Observable<User[]>;
  private emailQuery$ = new BehaviorSubject<string>('');
  suggestions$!: Observable<User[]>;
  suggestionsVisible = false;
  stats$!: Observable<{ total: number; inprogress: number; completed: number }>;

  // notifications toast
  private toastSeq = 0;
  toasts: { id: number; type: 'success' | 'error'; message: string }[] = [];
  private showToast(message: string, type: 'success' | 'error' = 'success', ttlMs = 3000) {
    const id = ++this.toastSeq;
    this.toasts = [...this.toasts, { id, type, message }];
    setTimeout(() => {
      this.toasts = this.toasts.filter(t => t.id !== id);
    }, ttlMs);
  }

  closeToast(id: number) {
    this.toasts = this.toasts.filter(t => t.id !== id);
  }

  onEmailChange(val: string) {
    this.addMemberEmail = val;
    this.emailQuery$.next(val);
  }

  onSelectSuggestion(u: User) {
    this.addMemberEmail = (u.email || '').toLowerCase();
    this.emailQuery$.next(this.addMemberEmail);
    this.suggestionsVisible = false;
  }

  hideSuggestionsSoon() {
    // petit délai pour permettre le clic sur une suggestion avant que le blur masque le panneau
    setTimeout(() => { this.suggestionsVisible = false; }, 150);
  }

  constructor(private route: ActivatedRoute, private projects: ProjectService, private milestones: MilestoneService, private users: UserService, private tasks: TaskService, auth: AuthService) {
    auth.currentUser$.subscribe(u => this.currentUserId = u?.id);

    this.project$ = this.route.paramMap.pipe(
      switchMap(params => {
        this.projectId = params.get('id') || '';
        if (!this.projectId) return of(undefined);
        return this.refresh$.pipe(switchMap(() => this.projects.get$(this.projectId)));
      })
    );

    this.milestones$ = this.route.paramMap.pipe(
      switchMap(params => {
        const id = params.get('id') || '';
        if (!id) return of([] as Milestone[]);
        this.projectId = id;
        return this.milestonesRefresh$.pipe(switchMap(() => this.milestones.listByProject$(id)));
      })
    );

    this.members$ = this.project$.pipe(
      switchMap((p) => this.users.getByIds$(((p?.members as string[]) || []).map(x => String(x))))
    );
    this.stats$ = this.project$.pipe(
      switchMap(p => p?.id ? this.tasks.listByProject$(String((p as any).id)) : of([])),
      map(list => ({
        total: list.length,
        inprogress: list.filter(t => t.status === StatusTask.IN_PROGRESS).length,
        completed: list.filter(t => t.status === StatusTask.DONE).length,
      }))
    );

    this.suggestions$ = combineLatest([this.emailQuery$, this.project$]).pipe(
      debounceTime(250),
      distinctUntilChanged(),
      switchMap(([q, p]) => this.users.searchByEmail$(q).pipe(
        map(list => list.filter(u => {
          const uid = (u as any).id?.toString?.();
          const isManager = uid === this.currentUserId;
          const alreadyMember = (p?.members || []).map(x => String(x)).includes(String(uid));
          return !isManager && !alreadyMember;
        }))
      ))
    );
  }

  get isManager(): boolean {
    // project.createdBy === currentUserId géré dans le template via async au besoin
    return !!this.currentUserId; // secours; la vérification précise se fait dans le template
  }

  async addMember(project: Project) {
    const email = (this.addMemberEmail || '').trim().toLowerCase();
    if (!email || !this.projectId) return;
    try {
      const userId = await this.users.findIdByEmail(email);
      if (!userId) {
        this.showToast('Aucun utilisateur trouvé pour cet email', 'error');
        return;
      }
      const members = Array.from(new Set([...(project.members || []), userId]));
      await this.projects.update(this.projectId, { members } as any);
      this.addMemberEmail = '';
      this.refresh$.next();
      this.showToast('Membre ajouté avec succès', 'success');
    } catch (e: any) {
      console.error('[ProjectDetails] addMember failed', e);
      this.showToast("Échec de l\'ajout du membre", 'error');
    }
  }

  async removeMember(project: Project, memberId: string) {
    if (!memberId || !this.projectId) return;
    try {
      const members = (project.members || []).filter(m => m !== memberId);
      await this.projects.update(this.projectId, { members } as any);
      this.refresh$.next();
      this.showToast('Membre retiré', 'success');
    } catch (e: any) {
      console.error('[ProjectDetails] removeMember failed', e);
      this.showToast("Échec du retrait du membre", 'error');
    }
  }

  async createMilestone() {
    if (!this.projectId || !this.msName || !this.msDate) return;
    try {
      await this.milestones.create({
        projectId: this.projectId,
        name: this.msName,
        description: this.msDescription,
        date: new Date(this.msDate)
      });
      this.msName = '';
      this.msDescription = '';
      this.msDate = undefined;
      this.milestonesRefresh$.next();
      this.showToast('Jalon créé', 'success');
    } catch (e: any) {
      console.error('[ProjectDetails] createMilestone failed', e);
      this.showToast("Échec de la création du jalon", 'error');
    }
  }

  async toggleMilestone(m: Milestone) {
    try {
      await this.milestones.update(String((m as any).id), { isCompleted: !m.isCompleted });
      this.milestonesRefresh$.next();
      this.showToast('Jalon mis à jour', 'success');
    } catch (e: any) {
      console.error('[ProjectDetails] toggleMilestone failed', e);
      this.showToast("Échec de la mise à jour du jalon", 'error');
    }
  }

  showConfirmMl = false;
  mlToDelete?: Milestone;
  openConfirmMilestone(m: Milestone) {
    this.mlToDelete = m;
    this.showConfirmMl = true;
  }
  cancelConfirmMilestone() {
    this.mlToDelete = undefined;
    this.showConfirmMl = false;
  }
  async confirmDeleteMilestone() {
    if (!this.mlToDelete) return;
    try {
      await this.milestones.delete(String((this.mlToDelete as any).id));
      this.milestonesRefresh$.next();
      this.showToast('Jalon supprimé', 'success');
    } catch (e: any) {
      console.error('[ProjectDetails] deleteMilestone failed', e);
      this.showToast("Échec de la suppression du jalon", 'error');
    } finally {
      this.cancelConfirmMilestone();
    }
  }

  // Génère une couleur d'avatar déterministe à partir d'une chaîne
  colorFor(seed: string): string {
    if (!seed) return '#6366f1';
    let h = 0;
    for (let i = 0; i < seed.length; i++) {
      h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    }
    const palette = ['#f59e0b','#ef4444','#10b981','#3b82f6','#8b5cf6','#14b8a6','#eab308','#ec4899','#22c55e','#fb7185'];
    return palette[h % palette.length];
  }

  // Libellés FR pour le statut projet
  statusLabel(status: any): string {
    const s = (String(status || '')).toLowerCase();
    switch (s) {
      case 'in_progress':
      case 'in-progress':
      case 'progress':
        return 'En cours';
      case 'completed':
      case 'done':
      case 'finished':
        return 'Terminé';
      case 'planned':
      case 'pending':
        return 'Planifié';
      case 'on_hold':
      case 'on-hold':
        return 'En pause';
      case 'cancelled':
      case 'canceled':
        return 'Annulé';
      default:
        return status || '—';
    }
  }
}
