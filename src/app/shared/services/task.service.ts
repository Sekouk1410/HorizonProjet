import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { CreateTaskDto, Task, UpdateTaskDto } from '../models/task.model';
import { API_BASE } from '../config';

@Injectable({ providedIn: 'root' })
export class TaskService {
  private http = inject(HttpClient);

  listByProject$(projectId: string): Observable<Task[]> {
    return this.http.get<Task[]>(`${API_BASE}/tasks`, { params: { projectId, _sort: 'order', _order: 'asc' } as any });
  }

  listSubtasks$(parentTaskId: string): Observable<Task[]> {
    return this.http.get<Task[]>(`${API_BASE}/tasks`, { params: { parentTaskId, _sort: 'order', _order: 'asc' } as any });
  }

  get$(id: string): Observable<Task | undefined> {
    return this.http.get<Task>(`${API_BASE}/tasks/${id}`);
  }

  async create(data: CreateTaskDto): Promise<string> {
    const now = new Date();
    const task: Omit<Task, 'id'> = {
      projectId: data.projectId,
      title: data.title,
      description: data.description,
      createdAt: now,
      startDate: data.startDate,
      endDate: data.endDate,
      finishedAt: null,
      timeSpent: 0,
      status: data.status ?? 'todo',
      priority: data.priority ?? 'medium',
      dependencies: data.dependencies ?? [],
      parentTaskId: data.parentTaskId,
      assignedTo: data.assignedTo,
      order: Date.now(),
      updatedAt: now,
    } as any;
    const res = await firstValueFrom(this.http.post<Task>(`${API_BASE}/tasks`, task as any));
    return (res as any)?.id?.toString() ?? '';
  }

  async update(id: string, patch: UpdateTaskDto): Promise<void> {
    await firstValueFrom(this.http.patch(`${API_BASE}/tasks/${id}`, { ...patch, updatedAt: new Date() } as any));
  }

  async delete(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(`${API_BASE}/tasks/${id}`));
  }

  async reorder(id: string, newOrder: number): Promise<void> {
    await firstValueFrom(this.http.patch(`${API_BASE}/tasks/${id}`, { order: newOrder, updatedAt: new Date() } as any));
  }
}
