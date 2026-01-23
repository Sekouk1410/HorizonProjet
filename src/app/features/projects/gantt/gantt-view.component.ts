import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { combineLatest, map, of } from 'rxjs';
import { TaskService } from '../../../shared/services/task.service';
import { MilestoneService } from '../../../shared/services/milestone.service';
import { Task, StatusTask, Priority } from '../../../shared/models/task.model';
import { DataSet } from 'vis-data';
import { Timeline } from 'vis-timeline/standalone';
import { AuthService } from '../../../shared/services/auth.service';
import { ProjectService } from '../../../shared/services/project.service';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

@Component({
  selector: 'app-gantt-view',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './gantt-view.component.html',
  styleUrls: ['./gantt-view.component.scss']
})
export class GanttViewComponent implements OnInit, OnDestroy {
  @ViewChild('ganttContainer', { static: true }) container!: ElementRef<HTMLDivElement>;

  projectId = '';
  timeline?: Timeline;
  items = new DataSet<any>([]);
  private isManager = false;
  currentScale: 'day' | 'week' | 'month' = 'week';

  constructor(
    private route: ActivatedRoute,
    private tasks: TaskService,
    private milestones: MilestoneService,
    private auth: AuthService,
    private projects: ProjectService,
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(p => {
      this.projectId = p.get('id') || '';
      const tasks$ = this.projectId ? this.tasks.listByProject$(this.projectId) : of([] as Task[]);
      const mls$ = this.projectId ? this.milestones.listByProject$(this.projectId) : of([]);
      const mgr$ = this.projectId ? combineLatest([this.auth.currentUser$, this.projects.get$(this.projectId)]) : of([null, null] as any);

      combineLatest([tasks$, mls$, mgr$])
        .pipe(
          map(([ts, ms, [user, project]]) => {
            this.isManager = !!user && project && String(user.id) === String(project.createdBy);
            const taskItems = (ts || []).map(t => ({
              id: `t-${(t as any).id}`,
              content: this.contentForTask(t),
              start: t.startDate ? new Date(t.startDate as any) : new Date(),
              end: t.endDate ? new Date(t.endDate as any) : new Date(),
              className: this.classForTask(t),
              title: this.tooltipForTask(t)
            }));
            const milestoneItems = (ms || []).map((m: any) => ({
              id: `m-${m.id}`,
              content: m.name || 'Jalon',
              start: new Date(m.date),
              type: 'point',
              className: 'milestone',
              title: `Jalon: ${this.escape(m.name || '')}\n${new Date(m.date).toLocaleDateString()}`
            }));
            return [...taskItems, ...milestoneItems];
          })
        )
        .subscribe(items => {
          this.items.update(items);
          if (!this.timeline) {
            this.initTimeline(this.isManager);
            // Zoom par défaut: semaine
            this.setScale('week');
          }
        });
    });
  }

  ngOnDestroy(): void {
    if (this.timeline) {
      this.timeline.destroy();
      this.timeline = undefined;
    }
  }

  setScale(scale: 'day' | 'week' | 'month') {
    if (!this.timeline) return;
    const now = new Date();
    let start: Date;
    let end: Date;
    this.currentScale = scale;
    if (scale === 'day') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 6);
    } else if (scale === 'week') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 21);
    } else {
      start = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      end = new Date(now.getFullYear(), now.getMonth() + 2, now.getDate());
    }
    this.timeline.setWindow(start, end, { animation: true });
  }

  private initTimeline(canEdit: boolean) {
    const options: any = {
      stack: false,
      horizontalScroll: true,
      zoomKey: 'ctrlKey',
      showCurrentTime: true,
      orientation: 'top',
      height: '60vh',
      margin: { item: 8, axis: 12 },
      editable: canEdit ? { add: false, remove: false, updateTime: true, updateGroup: false } : false,
    };
    this.timeline = new Timeline(this.container.nativeElement, this.items, options);
    this.timeline.addCustomTime(new Date(), 'now');

    if (canEdit) {
      // Persister les nouvelles dates quand un item (tâche) est déplacé/redimensionné
      (this.items as any).on('update', async (event: any, props: any) => {
        const updated = (props?.data || []).filter((it: any) => typeof it?.id === 'string' && it.id.startsWith('t-'));
        for (const it of updated) {
          const id = String(it.id).replace(/^t-/, '');
          const start = it.start ? new Date(it.start) : undefined;
          const end = it.end ? new Date(it.end) : undefined;
          await this.tasks.update(id, { startDate: start, endDate: end } as any);
        }
      });
    }
  }

  private contentForTask(t: Task): string {
    const p = t.priority;
    const pr = p === Priority.HIGH ? 'Haute' : p === Priority.MEDIUM ? 'Moyenne' : 'Basse';
    return `<span class="title">${this.escape(t.title)}</span> <span class="badge">${pr}</span>`;
  }

  private classForTask(t: Task): string {
    if (t.status === StatusTask.DONE) return 'done';
    if (t.status === StatusTask.IN_PROGRESS) return 'inprogress';
    return 'todo';
  }

  private tooltipForTask(t: Task): string {
    const pr = t.priority === Priority.HIGH ? 'Haute' : t.priority === Priority.MEDIUM ? 'Moyenne' : 'Basse';
    const start = t.startDate ? new Date(t.startDate as any).toLocaleDateString() : '—';
    const end = t.endDate ? new Date(t.endDate as any).toLocaleDateString() : '—';
    const status = t.status === StatusTask.DONE ? 'Terminé' : t.status === StatusTask.IN_PROGRESS ? 'En cours' : 'À faire';
    return `${this.escape(t.title)}\nPriorité: ${pr}\nStatut: ${status}\nDu ${start} au ${end}`;
  }

  private escape(s: string): string {
    return (s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
  }

  async exportGanttPdf() {
    const target = this.container?.nativeElement;
    if (!target) return;
    // Temporarily expand the container to capture full width/height
    const prevHeight = target.style.height;
    try {
      // Ensure full content is visible for capture
      target.style.height = 'auto';
      const canvas = await html2canvas(target, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
        windowWidth: target.scrollWidth,
        windowHeight: target.scrollHeight,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Compute image dimensions to fit page while preserving aspect ratio
      const imgWidth = pageWidth - 40; // margins
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      if (imgHeight <= pageHeight - 40) {
        pdf.addImage(imgData, 'PNG', 20, 20, imgWidth, imgHeight);
      } else {
        // Multi-page: slice vertically
        let position = 0;
        const sliceHeight = Math.floor(((pageHeight - 40) * canvas.width) / imgWidth);
        while (position < canvas.height) {
          const slice = document.createElement('canvas');
          slice.width = canvas.width;
          slice.height = Math.min(sliceHeight, canvas.height - position);
          const ctx = slice.getContext('2d');
          if (ctx) ctx.drawImage(canvas, 0, position, canvas.width, slice.height, 0, 0, slice.width, slice.height);
          const sliceImg = slice.toDataURL('image/png');
          if (position > 0) pdf.addPage('a4', 'landscape');
          const h = (slice.height * imgWidth) / slice.width;
          pdf.addImage(sliceImg, 'PNG', 20, 20, imgWidth, h);
          position += sliceHeight;
        }
      }
      pdf.save(`gantt-${this.projectId}.pdf`);
    } catch (e) {
      console.error('[Gantt] export PDF failed', e);
    } finally {
      target.style.height = prevHeight;
    }
  }
}
