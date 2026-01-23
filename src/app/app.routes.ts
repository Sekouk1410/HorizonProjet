import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';
import { LoginComponent } from './features/auth/login/login.component';
import { RegisterComponent } from './features/auth/register/register.component';
import { MainLayoutComponent } from './features/layout/main-layout.component';

import { Dashboard } from './features/dashboard/dashboard';
import { ProjectFormComponent } from './features/projects/project-form/project-form.component';


export const routes: Routes = [
  {
    path: 'auth',
    children: [
      { path: 'login', component: LoginComponent },
      { path: 'register', component: RegisterComponent },
      { path: '', pathMatch: 'full', redirectTo: 'login' },
    ],
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', component: Dashboard },
      { path: 'dashboard', component: Dashboard },
      { path: 'projects/new', component: ProjectFormComponent },
      { path: 'projects/:id', loadComponent: () => import('./features/projects/project-details/project-details.component').then(m => m.ProjectDetailsComponent) },
      { path: 'projects/:id/gantt', loadComponent: () => import('./features/projects/gantt/gantt-view.component').then(m => m.GanttViewComponent) },
      { path: 'projects/:id/edit', loadComponent: () => import('./features/projects/project-edit/project-edit.component').then(m => m.ProjectEditComponent) },
    ],
  },
  { path: '**', redirectTo: '' },
];
