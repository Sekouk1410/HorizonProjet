import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { of, switchMap, tap } from 'rxjs';
import { Project } from '../../../shared/models/project.model';
import { ProjectService } from '../../../shared/services/project.service';

@Component({
  selector: 'app-project-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './project-edit.component.html',
  styleUrls: ['./project-edit.component.scss']
})
export class ProjectEditComponent implements OnChanges {
  @Input() projectId?: string;
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<'success' | 'error'>();
  form!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private projects: ProjectService
  ) {
    // Initialiser le formulaire après l'injection de FormBuilder
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: ['']
    });

    // Initial load from route if no @Input provided
    this.route.paramMap
      .pipe(
        tap(params => { if (!this.projectId) this.projectId = params.get('id') || ''; }),
        switchMap(() => this.projectId ? this.projects.get$(this.projectId) : of(undefined))
      )
      .subscribe((p?: Project) => {
        if (p) this.form.patchValue({ name: p.name, description: p.description });
      });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['projectId'] && this.projectId) {
      this.projects.get$(this.projectId).subscribe((p?: Project) => {
        if (p) this.form.patchValue({ name: p.name, description: p.description });
      });
    }
  }

  async onSubmit() {
    if (this.form.invalid || !this.projectId) return this.form.markAllAsTouched();
    try {
      await this.projects.update(this.projectId, {
        name: this.form.value.name || undefined,
        description: this.form.value.description || ''
      });
      this.saved.emit('success');
      // In modal context, emit close; in routed context, navigate back to detail
      if (this.route.snapshot.paramMap.get('id')) {
        this.router.navigate(['projects', this.projectId]);
      } else {
        this.close.emit();
      }
    } catch (e) {
      this.saved.emit('error');
    }
  }
}
