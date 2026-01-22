import { Injectable, inject } from '@angular/core';
import { Firestore, addDoc, collection, collectionData, deleteDoc, doc, docData, orderBy, query, updateDoc, where } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { CreateTimeEntryDto, TimeEntry, TimeStats, UpdateTimeEntryDto } from '../models/time-entry.model';

@Injectable({ providedIn: 'root' })
export class TimeTrackingService {
  private db = inject(Firestore);
  private col = collection(this.db, 'timeEntries');

  listByTask$(taskId: string): Observable<TimeEntry[]> {
    const q = query(this.col, where('taskId', '==', taskId), orderBy('startTime', 'desc'));
    return collectionData(q, { idField: 'id' }) as Observable<TimeEntry[]>;
  }

  listByUser$(userId: string): Observable<TimeEntry[]> {
    const q = query(this.col, where('userId', '==', userId), orderBy('startTime', 'desc'));
    return collectionData(q, { idField: 'id' }) as Observable<TimeEntry[]>;
  }

  get$(id: string): Observable<TimeEntry | undefined> {
    const ref = doc(this.db, `timeEntries/${id}`);
    return docData(ref, { idField: 'id' }) as Observable<TimeEntry | undefined>;
  }

  async startTimer(taskId: string, userId: string, description?: string): Promise<string> {
    const now = new Date();
    const entry: Omit<TimeEntry, 'id'> = {
      taskId,
      userId,
      startTime: now,
      endTime: null,
      duration: 0,
      description,
      createdAt: now,
      updatedAt: now,
    };
    const ref = await addDoc(this.col, entry as any);
    return ref.id;
  }

  async stopTimer(id: string): Promise<void> {
    const ref = doc(this.db, `timeEntries/${id}`);
    const snap = await (await import('firebase/firestore')).getDoc(ref as any);
    if (!snap.exists()) return;
    const data = snap.data() as TimeEntry;
    const endTime = new Date();
    const duration = Math.max(0, Math.round((endTime.getTime() - new Date(data.startTime).getTime()) / 60000));
    await updateDoc(ref, { endTime, duration, updatedAt: new Date() } as any);
  }

  async create(data: CreateTimeEntryDto): Promise<string> {
    const now = new Date();
    const entry: Omit<TimeEntry, 'id'> = {
      taskId: data.taskId,
      userId: data.userId,
      startTime: data.startTime,
      endTime: data.endTime ?? null,
      duration: data.duration ?? 0,
      description: data.description,
      createdAt: now,
      updatedAt: now,
    };
    const ref = await addDoc(this.col, entry as any);
    return ref.id;
  }

  async update(id: string, patch: UpdateTimeEntryDto): Promise<void> {
    const ref = doc(this.db, `timeEntries/${id}`);
    await updateDoc(ref, { ...patch, updatedAt: new Date() } as any);
  }

  async delete(id: string): Promise<void> {
    const ref = doc(this.db, `timeEntries/${id}`);
    await deleteDoc(ref);
  }

  async computeStatsForTask(taskId: string): Promise<TimeStats> {
    const { getDocs } = await import('firebase/firestore');
    const q = query(this.col, where('taskId', '==', taskId));
    const snaps = await getDocs(q as any);
    let totalMinutes = 0;
    snaps.forEach((s) => {
      const e = s.data() as TimeEntry;
      totalMinutes += e.duration ?? 0;
    });
    return {
      totalMinutes,
      totalHours: +(totalMinutes / 60).toFixed(2),
      totalDays: +(totalMinutes / 60 / 8).toFixed(2),
      entriesCount: snaps.size,
      averageSessionMinutes: snaps.size ? +(totalMinutes / snaps.size).toFixed(2) : 0,
    };
  }
}
