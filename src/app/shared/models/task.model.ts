/**
 * Énumération des statuts de tâche
 * Basé sur le diagramme de classe : todo | in-progress | done | in-late
 */
export enum StatusTask {
    TODO = 'todo',
    IN_PROGRESS = 'in-progress',
    DONE = 'done',
    IN_LATE = 'in-late'
}

/**
 * Énumération des priorités
 * Basé sur le diagramme de classe : low | medium | high
 */
export enum Priority {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high'
}

/**
 * Interface Task
 * Représente une tâche dans un projet
 */
export interface Task {
    id: string;
    projectId: string; // Référence au projet (relation 1..*)
    title: string;
    description: string;
    createdAt: Date;
    startDate: Date;
    endDate: Date;
    finishedAt: Date | null;
    timeSpent: number; // Temps passé en heures
    status: StatusTask;
    priority: Priority;
    dependencies: string[]; // IDs des tâches dépendantes (relation 1..*)
    parentTaskId?: string; // Pour la hiérarchie Tâche > Sous-tâche
    assignedTo?: string; // ID de l'utilisateur assigné
    order?: number; // Pour l'ordre d'affichage
    updatedAt?: Date;
}

/**
 * Interface pour la création d'une tâche (sans ID)
 */
export interface CreateTaskDto {
    projectId: string;
    title: string;
    description: string;
    startDate: Date;
    endDate: Date;
    status?: StatusTask;
    priority?: Priority;
    dependencies?: string[];
    parentTaskId?: string;
    assignedTo?: string;
}

/**
 * Interface pour la mise à jour d'une tâche
 */
export interface UpdateTaskDto {
    title?: string;
    description?: string;
    startDate?: Date;
    endDate?: Date;
    finishedAt?: Date | null;
    timeSpent?: number;
    status?: StatusTask;
    priority?: Priority;
    dependencies?: string[];
    parentTaskId?: string;
    assignedTo?: string;
    order?: number;
}

/**
 * Interface pour une tâche avec ses sous-tâches (hiérarchie)
 */
export interface TaskWithSubtasks extends Task {
    subtasks?: Task[];
    level?: number; // Niveau de profondeur dans la hiérarchie
}

/**
 * Interface pour le chemin critique
 */
export interface CriticalPathTask extends Task {
    isCritical: boolean;
    earliestStart: Date;
    latestStart: Date;
    slack: number; // Marge en jours
}
