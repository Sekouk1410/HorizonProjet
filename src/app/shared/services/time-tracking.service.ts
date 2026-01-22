import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { CreateTimeEntryDto, TimeEntry, TimeStats, UpdateTimeEntryDto } from '../models/time-entry.model';
import { API_BASE } from '../config';

@Injectable({ providedIn: 'root' })
export class TimeTrackingService {
  private http = inject(HttpClient);

  listByTask$(taskId: string): Observable<TimeEntry[]> {
    return this.http.get<TimeEntry[]>(`${API_BASE}/timeEntries`, { params: { taskId, _sort: 'startTime', _order: 'desc' } as any });
  }

  listByUser$(userId: string): Observable<TimeEntry[]> {
    return this.http.get<TimeEntry[]>(`${API_BASE}/timeEntries`, { params: { userId, _sort: 'startTime', _order: 'desc' } as any });
  }

  listByProject$(projectId: string): Observable<TimeEntry[]> {
    return this.http.get<TimeEntry[]>(`${API_BASE}/timeEntries`, { params: { projectId, _sort: 'startTime', _order: 'desc' } as any });
  }

  get$(id: string): Observable<TimeEntry | undefined> {
    return this.http.get<TimeEntry>(`${API_BASE}/timeEntries/${id}`);
  }

  async startTimer(taskId: string, userId: string, projectId: string, description?: string): Promise<string> {
    const now = new Date();
    const entry: Omit<TimeEntry, 'id'> = {
      taskId,
      userId,
      projectId,
      startTime: now,
      endTime: null,
      duration: 0,
      description,
      createdAt: now,
      updatedAt: now,
    };
    const res = await firstValueFrom(this.http.post<TimeEntry>(`${API_BASE}/timeEntries`, entry as any));
    return (res as TimeEntry & { id?: string | number })?.id?.toString() ?? '';
  }

  async stopTimer(id: string): Promise<void> {
    const current = (await firstValueFrom(
  this.http.get<TimeEntry>(`${API_BASE}/timeEntries/${id}`)
)) as TimeEntry;
const endTime = new Date();
const duration = Math.max(
  0,
  Math.round((endTime.getTime() - new Date(current.startTime as unknown as string | Date).getTime()) / 60000)
);
await firstValueFrom(
  this.http.patch<TimeEntry>(`${API_BASE}/timeEntries/${id}`, { endTime, duration, updatedAt: new Date() } as any)
);
  }

  async create(data: CreateTimeEntryDto): Promise<string> {
    const now = new Date();
    const entry: Omit<TimeEntry, 'id'> = {
      taskId: data.taskId,
      userId: data.userId,
      projectId: data.projectId,
      startTime: data.startTime,
      endTime: data.endTime ?? null,
      duration: data.duration ?? 0,
      description: data.description,
      createdAt: now,
      updatedAt: now,
    };
    const res = await firstValueFrom(this.http.post<TimeEntry>(`${API_BASE}/timeEntries`, entry as any));
    return (res as any)?.id?.toString() ?? '';
  }

  async update(id: string, patch: UpdateTimeEntryDto): Promise<void> {
    await firstValueFrom(this.http.patch<TimeEntry>(`${API_BASE}/timeEntries/${id}`, { ...patch, updatedAt: new Date() } as any));
  }

  async delete(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(`${API_BASE}/timeEntries/${id}`));
  }

  async computeStatsForTask(taskId: string): Promise<TimeStats> {
    const entries = await firstValueFrom(this.http.get<TimeEntry[]>(`${API_BASE}/timeEntries`, { params: { taskId } as any }));
    const totalMinutes = entries.reduce((acc, e) => acc + (e.duration ?? 0), 0);
    const count = entries.length;
    return {
      totalMinutes,
      totalHours: +(totalMinutes / 60).toFixed(2),
      totalDays: +(totalMinutes / 60 / 8).toFixed(2),
      entriesCount: count,
      averageSessionMinutes: count ? +(totalMinutes / count).toFixed(2) : 0,
    };
  }
}
