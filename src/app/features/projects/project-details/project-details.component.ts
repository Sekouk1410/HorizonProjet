import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Observable, of, switchMap } from 'rxjs';
import { Project } from '../../../shared/models/project.model';
import { ProjectService } from '../../../shared/services/project.service';

@Component({
  selector: 'app-project-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './project-details.component.html',
  styleUrls: ['./project-details.component.scss']
})
export class ProjectDetailsComponent {
  project$!: Observable<Project | undefined>;

  constructor(private route: ActivatedRoute, private projects: ProjectService) {
    this.project$ = this.route.paramMap.pipe(
      switchMap(params => {
        const id = params.get('id') || '';
        if (!id) return of(undefined);
        return this.projects.get$(id);
      })
    );
  }
}
