import { Injectable, inject } from '@angular/core';
import { Firestore, addDoc, collection, collectionData, deleteDoc, doc, docData, orderBy, query, updateDoc, where } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { CreateTaskDto, Task, UpdateTaskDto } from '../models/task.model';

@Injectable({ providedIn: 'root' })
export class TaskService {
  private db = inject(Firestore);
  private col = collection(this.db, 'tasks');

  listByProject$(projectId: string): Observable<Task[]> {
    const q = query(this.col, where('projectId', '==', projectId), orderBy('order', 'asc'));
    return collectionData(q, { idField: 'id' }) as Observable<Task[]>;
  }

  listSubtasks$(parentTaskId: string): Observable<Task[]> {
    const q = query(this.col, where('parentTaskId', '==', parentTaskId), orderBy('order', 'asc'));
    return collectionData(q, { idField: 'id' }) as Observable<Task[]>;
  }

  get$(id: string): Observable<Task | undefined> {
    const ref = doc(this.db, `tasks/${id}`);
    return docData(ref, { idField: 'id' }) as Observable<Task | undefined>;
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
    const ref = await addDoc(this.col, task as any);
    return ref.id;
  }

  async update(id: string, patch: UpdateTaskDto): Promise<void> {
    const ref = doc(this.db, `tasks/${id}`);
    await updateDoc(ref, { ...patch, updatedAt: new Date() } as any);
  }

  async delete(id: string): Promise<void> {
    const ref = doc(this.db, `tasks/${id}`);
    await deleteDoc(ref);
  }

  async reorder(id: string, newOrder: number): Promise<void> {
    const ref = doc(this.db, `tasks/${id}`);
    await updateDoc(ref, { order: newOrder, updatedAt: new Date() } as any);
  }
}
