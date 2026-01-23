import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { BehaviorSubject, Observable, map, firstValueFrom, switchMap } from 'rxjs';
import { CreateProjectDto, Project, StatusProject, UpdateProjectDto } from '../models/project.model';
import { USE_JSON_API, API_BASE } from '../config';

@Injectable({ providedIn: 'root' })
export class ProjectService {
  private http = inject(HttpClient);
  private refresh$ = new BehaviorSubject<void>(undefined);

  listAll$(): Observable<Project[]> {
    return this.http.get<Project[]>(`${API_BASE}/projects?_sort=createdAt&_order=desc`);
  }

  listByMember$(userId: string): Observable<Project[]> {
    // json-server ne supporte pas array-contains, on filtre côté client
    return this.http.get<Project[]>(`${API_BASE}/projects`).pipe(
      map((list: Project[]) => list.filter(p => Array.isArray(p.members) && p.members.includes(userId)))
    );
  }

  listByCreator$(userId: string): Observable<Project[]> {
    return this.http.get<Project[]>(`${API_BASE}/projects?createdBy=${encodeURIComponent(userId)}`);
  }

  get$(id: string): Observable<Project | undefined> {
    return this.refresh$.pipe(
      switchMap(() => this.http.get<Project>(`${API_BASE}/projects/${id}`))
    );
  }

  async create(data: CreateProjectDto, createdBy: string): Promise<string> {
    const now = new Date();
    const project: Omit<Project, 'id'> = {
      name: data.name,
      description: data.description,
      startDate: data.startDate,
      endDate: data.endDate,
      timeSpent: 0,
      status: data.status ?? StatusProject.IN_PROGRESS,
      members: Array.from(new Set([...(data.members ?? []), createdBy])),
      finishedAt: null,
      createdBy,
      createdAt: now,
      updatedAt: now,
    };
    const res = await firstValueFrom(this.http.post<Project>(`${API_BASE}/projects`, project as any));
    return (res as any)?.id?.toString() ?? '';
  }

  async update(id: string, patch: UpdateProjectDto): Promise<void> {
    await firstValueFrom(this.http.patch(`${API_BASE}/projects/${id}`, { ...patch, updatedAt: new Date() } as any));
    this.refresh$.next();
  }

  async delete(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(`${API_BASE}/projects/${id}`));
    this.refresh$.next();
  }

  async addMember(id: string, userId: string): Promise<void> {
    const project = await firstValueFrom(this.http.get<Project>(`${API_BASE}/projects/${id}`));
    const members = Array.from(new Set([...(project?.members ?? []), userId]));
    await firstValueFrom(this.http.patch(`${API_BASE}/projects/${id}`, { members, updatedAt: new Date() } as any));
    this.refresh$.next();
  }

  async removeMember(id: string, userId: string): Promise<void> {
    const project = await firstValueFrom(this.http.get<Project>(`${API_BASE}/projects/${id}`));
    const members = (project?.members ?? []).filter((m: string) => m !== userId);
    await firstValueFrom(this.http.patch(`${API_BASE}/projects/${id}`, { members, updatedAt: new Date() } as any));
    this.refresh$.next();
  }
}
