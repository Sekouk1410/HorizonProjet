import { Injectable, inject } from '@angular/core';
import { Firestore, addDoc, collection, collectionData, deleteDoc, doc, docData, query, updateDoc, where, orderBy } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { CreateProjectDto, Project, StatusProject, UpdateProjectDto } from '../models/project.model';

@Injectable({ providedIn: 'root' })
export class ProjectService {
  private db = inject(Firestore);
  private col = collection(this.db, 'projects');

  listAll$(): Observable<Project[]> {
    const q = query(this.col, orderBy('createdAt', 'desc'));
    return collectionData(q, { idField: 'id' }) as Observable<Project[]>;
  }

  listByMember$(userId: string): Observable<Project[]> {
    const q = query(this.col, where('members', 'array-contains', userId), orderBy('createdAt', 'desc'));
    return collectionData(q, { idField: 'id' }) as Observable<Project[]>;
  }

  get$(id: string): Observable<Project | undefined> {
    const ref = doc(this.db, `projects/${id}`);
    return docData(ref, { idField: 'id' }) as Observable<Project | undefined>;
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
      members: data.members ?? [createdBy],
      finishedAt: null,
      createdBy,
      createdAt: now,
      updatedAt: now,
    };
    const docRef = await addDoc(this.col, project as any);
    return docRef.id;
  }

  async update(id: string, patch: UpdateProjectDto): Promise<void> {
    const ref = doc(this.db, `projects/${id}`);
    await updateDoc(ref, { ...patch, updatedAt: new Date() } as any);
  }

  async delete(id: string): Promise<void> {
    const ref = doc(this.db, `projects/${id}`);
    await deleteDoc(ref);
  }

  async addMember(id: string, userId: string): Promise<void> {
    const { arrayUnion } = await import('firebase/firestore');
    const ref = doc(this.db, `projects/${id}`);
    await updateDoc(ref, { members: arrayUnion(userId), updatedAt: new Date() } as any);
  }

  async removeMember(id: string, userId: string): Promise<void> {
    const { arrayRemove } = await import('firebase/firestore');
    const ref = doc(this.db, `projects/${id}`);
    await updateDoc(ref, { members: arrayRemove(userId), updatedAt: new Date() } as any);
  }
}
