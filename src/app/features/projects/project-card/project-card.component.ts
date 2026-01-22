import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ProjectModel = {
  id?: string | number;
  name: string;
  description?: string;
  stats?: {
    tasks?: number;
    completed?: number;
    members?: number;
    status?: string;
  };
  role?: 'manager' | 'member';
  canEdit?: boolean;
};

@Component({
  selector: 'app-project-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './project-card.component.html',
  styleUrls: ['./project-card.component.scss']
})
export class ProjectCardComponent {
  @Input({ required: true }) project!: ProjectModel;

  @Output() view = new EventEmitter<ProjectModel>();
  @Output() edit = new EventEmitter<ProjectModel>();
  @Output() remove = new EventEmitter<ProjectModel>();
}
