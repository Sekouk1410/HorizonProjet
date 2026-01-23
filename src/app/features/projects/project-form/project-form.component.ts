import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-project-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './project-form.component.html',
  styleUrls: ['./project-form.component.scss']
})
export class ProjectFormComponent implements OnChanges {
  @Output() submitProject = new EventEmitter<{ name: string; description?: string; endDate?: Date }>();
  @Input() initial?: { name?: string; description?: string; endDate?: Date | string };
  @Input() submitLabel = 'Enregistrer';
  @Input() showEndDate = true;
  form!: FormGroup;
  todayStr: string;

  get isEndDateTooSoon(): boolean {
    const v = this.form.get('endDate')?.value as string;
    if (!v) return false;
    const end = new Date(v).getTime();
    const now = Date.now();
    return end - now > 0 && end - now < 24 * 60 * 60 * 1000;
  }

  constructor(private fb: FormBuilder) {
    const today = new Date();
    this.todayStr = today.toISOString().slice(0, 10);
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      endDate: ['', [Validators.required, this.minDateValidator(today)]]
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['initial'] && this.initial) {
      const end = this.initial.endDate
        ? new Date(this.initial.endDate)
        : undefined;
      const endStr = end ? new Date(end.getTime() - end.getTimezoneOffset() * 60000).toISOString().slice(0, 10) : '';
      this.form.patchValue({
        name: this.initial.name ?? this.form.get('name')?.value,
        description: this.initial.description ?? this.form.get('description')?.value,
        endDate: endStr || this.form.get('endDate')?.value,
      });
    }
    if (changes['showEndDate']) {
      const endCtrl = this.form.get('endDate');
      if (endCtrl) {
        if (this.showEndDate) {
          const today = new Date();
          endCtrl.setValidators([Validators.required, this.minDateValidator(today)]);
        } else {
          endCtrl.clearValidators();
        }
        endCtrl.updateValueAndValidity({ emitEvent: false });
      }
    }
  }

  onSubmit() {
    if (this.form.valid) {
      const { name, description, endDate } = this.form.value as { name: string; description?: string; endDate?: string };
      const payload = { name, description, endDate: endDate ? new Date(endDate) : undefined };
      this.submitProject.emit(payload);
      this.form.reset();
    } else {
      this.form.markAllAsTouched();
    }
  }

  private minDateValidator(min: Date) {
    const minOnly = new Date(min.getFullYear(), min.getMonth(), min.getDate());
    return (control: AbstractControl) => {
      const v = control.value as string;
      if (!v) return null;
      const d = new Date(v);
      const dOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      return dOnly < minOnly ? { minDate: true } : null;
    };
  }
}
