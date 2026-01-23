import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, of, map } from 'rxjs';
import { TaskService } from '../../../shared/services/task.service';
import { StatusTask } from '../../../shared/models/task.model';
import { ProjectService } from '../../../shared/services/project.service';
import { Project } from '../../../shared/models/project.model';

export type ProjectModel = {
  id?: string | number;
  name: string;
  description?: string;
  stats?: {
    tasks?: number;
    completed?: number;
    members?: number;
    status?: string;
  };
  role?: 'manager' | 'member';
  canEdit?: boolean;
};

@Component({
  selector: 'app-project-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './project-card.component.html',
  styleUrls: ['./project-card.component.scss']
})
export class ProjectCardComponent implements OnInit, OnChanges  {
  @Input({ required: true }) project!: ProjectModel;

  @Output() view = new EventEmitter<ProjectModel>();
  @Output() edit = new EventEmitter<ProjectModel>();
  @Output() remove = new EventEmitter<ProjectModel>();

  stats$!: Observable<{ total: number; inprogress: number; completed: number }>;
  liveProject$!: Observable<Project | undefined>;

  constructor(private tasks: TaskService, private projects: ProjectService) {}

  ngOnInit(): void {
    this.bindStats();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['project']) this.bindStats();
  }

  private bindStats() {
    const pid = this.project?.id ? String(this.project.id) : '';
    this.stats$ = pid
      ? this.tasks.listByProject$(pid).pipe(
          map(list => ({
            total: list.length,
            inprogress: list.filter(t => t.status === StatusTask.IN_PROGRESS).length,
            completed: list.filter(t => t.status === StatusTask.DONE).length,
          }))
        )
      : of({ total: 0, inprogress: 0, completed: 0 });

    this.liveProject$ = pid ? this.projects.get$(pid) : of(undefined);
  }

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
