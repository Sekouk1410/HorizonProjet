import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Task, StatusTask, Priority } from '../../../shared/models/task.model';
import { Observable, map, of } from 'rxjs';
import { User } from '../../../shared/models/user.model';
import { UserService } from '../../../shared/services/user.service';

@Component({
  selector: 'app-task-item',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './task-item.component.html',
  styleUrls: ['./task-item.component.scss']
})
export class TaskItemComponent implements OnInit {
  @Input() task!: Task;
  @Input() canEdit: boolean = true;
  @Output() edit = new EventEmitter<string>();
  @Output() remove = new EventEmitter<string>();

  assignee$!: Observable<User | undefined>;

  // Expose enums to template
  StatusTask = StatusTask;
  Priority = Priority;

  constructor(private users: UserService) {}

  ngOnInit(): void {
    const uid = (this.task as any)?.assignedTo as string | undefined;
    if (!uid) {
      this.assignee$ = of(undefined);
      return;
    }
    this.assignee$ = this.users.getByIds$([uid]).pipe(
      map(arr => (arr && arr.length ? arr[0] : undefined))
    );
  }

}
