import { Injectable, inject } from '@angular/core';
import { Firestore, addDoc, collection, collectionData, deleteDoc, doc, docData, orderBy, query, updateDoc, where } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { CreateMilestoneDto, Milestone, UpdateMilestoneDto } from '../models/milestone.model';

@Injectable({ providedIn: 'root' })
export class MilestoneService {
  private db = inject(Firestore);
  private col = collection(this.db, 'milestones');

  listByProject$(projectId: string): Observable<Milestone[]> {
    const q = query(this.col, where('projectId', '==', projectId), orderBy('date', 'asc'));
    return collectionData(q, { idField: 'id' }) as Observable<Milestone[]>;
  }

  get$(id: string): Observable<Milestone | undefined> {
    const ref = doc(this.db, `milestones/${id}`);
    return docData(ref, { idField: 'id' }) as Observable<Milestone | undefined>;
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
    const ref = await addDoc(this.col, milestone as any);
    return ref.id;
  }

  async update(id: string, patch: UpdateMilestoneDto): Promise<void> {
    const ref = doc(this.db, `milestones/${id}`);
    await updateDoc(ref, { ...patch, updatedAt: new Date() } as any);
  }

  async delete(id: string): Promise<void> {
    const ref = doc(this.db, `milestones/${id}`);
    await deleteDoc(ref);
  }
}
