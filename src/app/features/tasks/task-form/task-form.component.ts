import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskService } from '../../../shared/services/task.service';
import { StatusTask, Priority, Task } from '../../../shared/models/task.model';
import { UserService } from '../../../shared/services/user.service';
import { Observable, of, switchMap } from 'rxjs';
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
  dependencies: string[] = [];

  allTasks$: Observable<Task[]> = of([]);
  members$: Observable<User[]> = of([]);

  StatusTask = StatusTask;
  Priority = Priority;

  constructor(private tasks: TaskService, private users: UserService, private projects: ProjectService) {}

  ngOnInit(): void {
    this.allTasks$ = this.tasks.listByProject$(this.projectId);
    this.members$ = this.projects.get$(this.projectId).pipe(
      switchMap((p) => {
        const members = (p as any)?.members ?? [];
        const manager = (p as any)?.createdBy;
        const filtered = (members as string[]).filter((id) => id && id !== manager);
        return this.users.getByIds$(filtered);
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
        this.dependencies = [...(t.dependencies || [])];
        this.selectedAssigneeId = t.assignedTo;
      });
    }
  }

  async submit() {
    try {
      const assignedTo: string | undefined = this.selectedAssigneeId || undefined;
      if (this.taskId) {
        await this.tasks.update(this.taskId, {
          title: this.title.trim(),
          description: this.description.trim(),
          startDate: this.startDate ? new Date(this.startDate) : undefined,
          endDate: this.endDate ? new Date(this.endDate) : undefined,
          status: this.status,
          priority: this.priority,
          dependencies: this.dependencies,
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
        startDate: this.startDate ? new Date(this.startDate) : new Date(),
        endDate: this.endDate ? new Date(this.endDate) : new Date(),
        status: this.status,
        priority: this.priority,
        dependencies: this.dependencies,
        assignedTo
      });
      this.saved.emit('success');
      this.close.emit();
    } catch (e) {
      console.error('[TaskForm] submit failed', e);
      this.saved.emit('error');
    }
  }
}
