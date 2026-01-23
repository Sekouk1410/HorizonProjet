import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BehaviorSubject, Observable, map, switchMap } from 'rxjs';
import { TaskService } from '../../../shared/services/task.service';
import { Task, StatusTask } from '../../../shared/models/task.model';
import { ProjectService } from '../../../shared/services/project.service';
import { StatusProject } from '../../../shared/models/project.model';
import { TaskItemComponent } from '../task-item/task-item.component';
import { TaskFormComponent } from '../task-form/task-form.component';
import { DragDropModule, CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [CommonModule, TaskItemComponent, TaskFormComponent, DragDropModule],
  templateUrl: './task-list.component.html',
  styleUrls: ['./task-list.component.scss']
})
export class TaskListComponent implements OnInit {
  @Input() projectId!: string;
  @Input() managerId?: string;
  @Input() currentUserId?: string;
  @Input() projectStatus?: StatusProject;

  board$!: Observable<{ todo: Task[]; inprogress: Task[]; done: Task[] }>;
  progress$!: Observable<number>;
  showCreate = false;
  private refresh$ = new BehaviorSubject<void>(undefined);

  showEdit = false;
  editingTaskId?: string;
  showConfirmDelete = false;
  deletingTaskId?: string;

  toasts: { type: 'success' | 'error'; message: string }[] = [];
  private finished = false;

  constructor(private tasks: TaskService, private projects: ProjectService) {}

  ngOnInit(): void {
    this.board$ = this.refresh$.pipe(
      switchMap(() => this.tasks.listByProject$(this.projectId).pipe(
        map(list => {
          const sorted = [...list].sort((a, b) => (a.order || 0) - (b.order || 0));
          return {
            todo: sorted.filter(t => t.status === StatusTask.TODO),
            inprogress: sorted.filter(t => t.status === StatusTask.IN_PROGRESS),
            done: sorted.filter(t => t.status === StatusTask.DONE),
          };
        })
      ))
    );

    this.progress$ = this.board$.pipe(
      map(b => {
        const total = b.todo.length + b.inprogress.length + b.done.length;
        if (total === 0) return 0;
        return Math.round((b.done.length / total) * 100);
      })
    );
  }

  get isManager(): boolean {
    return !!this.managerId && !!this.currentUserId && this.managerId === this.currentUserId;
  }

  get isFinished(): boolean {
    return this.finished || this.projectStatus === StatusProject.COMPLETED;
  }

  // Validation manager et progression
  canFinish$(progress: number | null | undefined): boolean {
    return this.isManager && (progress ?? 0) >= 100;
  }

  // Confirmation terminer projet
  showFinishConfirm = false;
  openFinishConfirm() { this.showFinishConfirm = true; }
  cancelFinishConfirm() { this.showFinishConfirm = false; }
  async confirmFinish() {
    if (!this.projectId) return;
    await this.projects.update(this.projectId, { status: StatusProject.COMPLETED, finishedAt: new Date() } as any);
    this.showFinishConfirm = false;
    this.addToast('Projet marqué Terminé', 'success');
    this.finished = true;
  }

  openCreate() {
    this.showCreate = true;
  }
  closeCreate() { this.showCreate = false; }

  onSaved(result: 'success' | 'error') {
    if (result === 'success') {
      this.showCreate = false;
      this.refresh$.next();
      this.addToast('Tâche créée avec succès', 'success');
    }
  }

  trackById(_: number, t: Task) { return (t as any).id; }

  onEdit(id: string) { this.editingTaskId = id; this.showEdit = true; }
  closeEdit() { this.editingTaskId = undefined; this.showEdit = false; }
  onEdited(result: 'success' | 'error') { if (result === 'success') { this.closeEdit(); this.refresh$.next(); this.addToast('Tâche mise à jour', 'success'); } }

  onRemove(id: string) { this.deletingTaskId = id; this.showConfirmDelete = true; }
  cancelDelete() { this.deletingTaskId = undefined; this.showConfirmDelete = false; }
  async confirmDelete() {
    if (!this.deletingTaskId) return;
    await this.tasks.delete(this.deletingTaskId);
    this.deletingTaskId = undefined;
    this.showConfirmDelete = false;
    this.refresh$.next();

    // toast succès suppression
    this.addToast('Tâche supprimée avec succès', 'success');
  }

  addToast(message: string, type: 'success' | 'error' = 'success') {
    const toast = { message, type };
    // réassignation pour garantir la détection de changement
    this.toasts = [...this.toasts, toast];
    setTimeout(() => {
      this.toasts = this.toasts.filter(t => t !== toast);
    }, 2500);
  }

  async drop(event: CdkDragDrop<Task[]>) {
    if (!this.isManager || this.isFinished) return;
    const prev = event.previousContainer;
    const curr = event.container;
    if (prev === curr) {
      const data = curr.data;
      moveItemInArray(data, event.previousIndex, event.currentIndex);
      const base = Date.now();
      for (let i = 0; i < data.length; i++) {
        const t = data[i];
        const newOrder = base + i;
        if ((t.order || 0) !== newOrder) {
          await this.tasks.reorder(String((t as any).id), newOrder);
        }
      }
      this.refresh$.next();
      return;
    }

    // Cross-list: update status depending on target container id, then recompute orders for both lists
    const sourceList = prev.data;
    const targetList = curr.data;
    const moved: Task = sourceList[event.previousIndex];

    // perform local transfer to reflect UI ordering
    transferArrayItem(sourceList, targetList, event.previousIndex, event.currentIndex);

    const targetId = curr.id;
    let newStatus: StatusTask = StatusTask.TODO;
    if (targetId === 'inprogress') newStatus = StatusTask.IN_PROGRESS;
    else if (targetId === 'done') newStatus = StatusTask.DONE;
    else newStatus = StatusTask.TODO;

    await this.tasks.update(String((moved as any).id), { status: newStatus });

    // Recompute order for both affected lists
    const base1 = Date.now();
    for (let i = 0; i < targetList.length; i++) {
      const t = targetList[i];
      const newOrder = base1 + i;
      if ((t.order || 0) !== newOrder) {
        await this.tasks.reorder(String((t as any).id), newOrder);
      }
    }
    const base2 = Date.now();
    for (let i = 0; i < sourceList.length; i++) {
      const t = sourceList[i];
      const newOrder = base2 + i;
      if ((t.order || 0) !== newOrder) {
        await this.tasks.reorder(String((t as any).id), newOrder);
      }
    }
    this.refresh$.next();
  }
}
