import { Injectable } from '@angular/core';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, onAuthStateChanged, User as FirebaseUser, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile } from 'firebase/auth';
import { BehaviorSubject, Observable } from 'rxjs';
import { Role, User } from '../models/user.model';
import { firebaseConfig } from '../firebase-config';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth = getAuth(this.ensureFirebaseApp());

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  currentUser$ = this.currentUserSubject.asObservable();

  constructor() {
    onAuthStateChanged(this.auth, (fbUser) => {
      if (!fbUser) {
        this.currentUserSubject.next(null);
        return;
      }
      const user = this.mapFirebaseUser(fbUser);
      this.currentUserSubject.next(user);
    });
  }

  async register(email: string, password: string, userName: string): Promise<User> {
    const cred = await createUserWithEmailAndPassword(this.auth, email, password);
    await updateProfile(cred.user, { displayName: userName });
    const user = this.mapFirebaseUser(cred.user);
    this.currentUserSubject.next(user);
    return user;
  }

  async login(email: string, password: string): Promise<User> {
    const cred = await signInWithEmailAndPassword(this.auth, email, password);
    const user = this.mapFirebaseUser(cred.user);
    this.currentUserSubject.next(user);
    return user;
  }

  logout(): Promise<void> {
    this.currentUserSubject.next(null);
    return signOut(this.auth);
  }

  private mapFirebaseUser(fb: FirebaseUser): User {
    return {
      id: fb.uid,
      userName: fb.displayName || (fb.email ? fb.email.split('@')[0] : 'Utilisateur'),
      email: fb.email || '',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any;
  }

  private ensureFirebaseApp() {
    return getApps().length ? getApps()[0] : initializeApp(firebaseConfig as any);
  }
}
