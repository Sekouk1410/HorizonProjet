import { Injectable, inject } from '@angular/core';
import { Auth, User as FirebaseUser, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from '@angular/fire/auth';
import { Firestore, doc, docData, setDoc, collection, getDoc } from '@angular/fire/firestore';
import { BehaviorSubject, Observable } from 'rxjs';
import { Role, User } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth = inject(Auth);
  private db = inject(Firestore);

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  currentUser$ = this.currentUserSubject.asObservable();

  constructor() {
    onAuthStateChanged(this.auth, async (fbUser) => {
      if (!fbUser) {
        this.currentUserSubject.next(null);
        return;
      }
      const user = await this.getUserProfileOnce(fbUser.uid);
      this.currentUserSubject.next(user ?? null);
    });
  }

  async register(email: string, password: string, userName: string, role: Role = Role.MEMBER): Promise<User> {
    const cred = await createUserWithEmailAndPassword(this.auth, email, password);
    await updateProfile(cred.user, { displayName: userName });

    const user: User = {
      id: cred.user.uid,
      userName,
      email,
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const usersCol = collection(this.db, 'users');
    const userRef = doc(usersCol, user.id);
    await setDoc(userRef, { ...user });
    this.currentUserSubject.next(user);
    return user;
  }

  async login(email: string, password: string): Promise<User> {
    const cred = await signInWithEmailAndPassword(this.auth, email, password);
    const profile = await this.getUserProfileOnce(cred.user.uid);
    // Si pas de profil (rare), on le crée minimalement
    if (!profile) {
      const user: User = {
        id: cred.user.uid,
        userName: cred.user.displayName || email.split('@')[0],
        email: cred.user.email || email,
        role: Role.MEMBER,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const usersCol = collection(this.db, 'users');
      const userRef = doc(usersCol, user.id);
      await setDoc(userRef, { ...user });
      this.currentUserSubject.next(user);
      return user;
    }
    this.currentUserSubject.next(profile);
    return profile;
  }

  logout(): Promise<void> {
    this.currentUserSubject.next(null);
    return signOut(this.auth);
  }

  getUserProfile$(uid: string): Observable<User | undefined> {
    const ref = doc(this.db, `users/${uid}`);
    return docData(ref) as Observable<User | undefined>;
  }

  private async getUserProfileOnce(uid: string): Promise<User | undefined> {
    const ref = doc(this.db, `users/${uid}`);
    const snap = await getDoc(ref as any);
    return (snap.exists() ? (snap.data() as User) : undefined);
  }
}
