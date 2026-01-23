import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskService } from '../../../shared/services/task.service';
import { StatusTask, Priority } from '../../../shared/models/task.model';
import { UserService } from '../../../shared/services/user.service';
import { Observable, of, switchMap, tap } from 'rxjs';
import { ProjectService } from '../../../shared/services/project.service';
import { User } from '../../../shared/models/user.model';

@Component({
  selector: 'app-task-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './task-form.component.html',
  styleUrls: ['./task-form.component.scss']
})
export class TaskFormComponent implements OnInit {
  @Input() projectId!: string;
  @Input() taskId?: string; // édition si fourni
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<'success' | 'error'>();

  title = '';
  description = '';
  startDate = '';
  endDate = '';
  status: StatusTask = StatusTask.TODO;
  priority: Priority = Priority.MEDIUM;
  selectedAssigneeId?: string;
  // Plus de dépendances dans le formulaire
  members$: Observable<User[]> = of([]);
  hasAssignableMembers = false;

  StatusTask = StatusTask;
  Priority = Priority;
  today = '';

  constructor(private tasks: TaskService, private users: UserService, private projects: ProjectService) {}

  ngOnInit(): void {
    this.today = this.formatDateLocal(new Date());
    this.members$ = this.projects.get$(this.projectId).pipe(
      switchMap((p) => {
        const members = (p as any)?.members ?? [];
        const manager = (p as any)?.createdBy;
        const filtered = (members as string[]).filter((id) => id && id !== manager);
        if (!filtered.length) return of([] as User[]);
        return this.users.getByIds$(filtered);
      }),
      tap(list => {
        this.hasAssignableMembers = Array.isArray(list) && list.length > 0;
        if (!this.hasAssignableMembers) this.selectedAssigneeId = undefined;
      })
    );
    if (this.taskId) {
      this.tasks.get$(this.taskId).subscribe((t) => {
        if (!t) return;
        this.title = t.title;
        this.description = t.description;
        this.startDate = t.startDate ? new Date(t.startDate as any).toISOString().slice(0,10) : '';
        this.endDate = t.endDate ? new Date(t.endDate as any).toISOString().slice(0,10) : '';
        this.status = t.status;
        this.priority = t.priority;
        this.selectedAssigneeId = t.assignedTo;
      });
    }
  }

  async submit() {
    try {
      const assignedTo: string | undefined = this.selectedAssigneeId || undefined;
      // Normalisation: empêcher les dates antérieures
      const minStart = this.today;
      const normalizedStart = this.startDate && this.startDate < minStart ? minStart : this.startDate;
      const minEnd = normalizedStart || minStart;
      const normalizedEnd = this.endDate && this.endDate < minEnd ? minEnd : this.endDate;
      if (this.taskId) {
        await this.tasks.update(this.taskId, {
          title: this.title.trim(),
          description: this.description.trim(),
          startDate: normalizedStart ? new Date(normalizedStart) : undefined,
          endDate: normalizedEnd ? new Date(normalizedEnd) : undefined,
          status: this.status,
          priority: this.priority,
          assignedTo,
        });
        this.saved.emit('success');
        this.close.emit();
        return;
      }
      await this.tasks.create({
        projectId: this.projectId,
        title: this.title.trim(),
        description: this.description.trim(),
        startDate: normalizedStart ? new Date(normalizedStart) : new Date(),
        endDate: normalizedEnd ? new Date(normalizedEnd) : new Date(),
        status: this.status,
        priority: this.priority,
        assignedTo
      });
      this.saved.emit('success');
      this.close.emit();
    } catch (e) {
      console.error('[TaskForm] submit failed', e);
      this.saved.emit('error');
    }
  }

  // Couleur d'avatar déterministe (même logique que ProjectDetails)
  colorFor(seed: string): string {
    if (!seed) return '#6366f1';
    let h = 0;
    for (let i = 0; i < seed.length; i++) {
      h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    }
    const palette = ['#f59e0b','#ef4444','#10b981','#3b82f6','#8b5cf6','#14b8a6','#eab308','#ec4899','#22c55e','#fb7185'];
    return palette[h % palette.length];
  }

  private formatDateLocal(d: Date): string {
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
