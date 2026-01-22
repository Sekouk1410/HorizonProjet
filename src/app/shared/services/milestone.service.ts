import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { CreateMilestoneDto, Milestone, UpdateMilestoneDto } from '../models/milestone.model';
import { API_BASE } from '../config';

@Injectable({ providedIn: 'root' })
export class MilestoneService {
  private http = inject(HttpClient);

  listByProject$(projectId: string): Observable<Milestone[]> {
    return this.http.get<Milestone[]>(`${API_BASE}/milestones`, { params: { projectId, _sort: 'date', _order: 'asc' } as any });
  }

  get$(id: string): Observable<Milestone | undefined> {
    return this.http.get<Milestone>(`${API_BASE}/milestones/${id}`);
  }

  async create(data: CreateMilestoneDto): Promise<string> {
    const now = new Date();
    const milestone: Omit<Milestone, 'id'> = {
      projectId: data.projectId,
      name: data.name,
      description: data.description,
      date: data.date,
      isCompleted: false,
      createdAt: now,
      updatedAt: now,
    } as any;
    const res = await firstValueFrom(this.http.post<Milestone>(`${API_BASE}/milestones`, milestone as any));
    return (res as any)?.id?.toString() ?? '';
  }

  async update(id: string, patch: UpdateMilestoneDto): Promise<void> {
    await firstValueFrom(this.http.patch(`${API_BASE}/milestones/${id}`, { ...patch, updatedAt: new Date() } as any));
  }

  async delete(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(`${API_BASE}/milestones/${id}`));
  }
}
