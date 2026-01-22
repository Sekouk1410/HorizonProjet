/**
 * Énumération des statuts de projet
 * Basé sur le diagramme de classe : in-progress | completed | in-late
 */
export enum StatusProject {
    IN_PROGRESS = 'in-progress',
    COMPLETED = 'completed',
    IN_LATE = 'in-late'
}

/**
 * Interface Project
 * Représente un projet dans l'application
 */
export interface Project {
    id: string;
    name: string;
    description: string;
    startDate: Date;
    endDate: Date;
    timeSpent: number; // Temps passé en heures
    status: StatusProject;
    members: string[]; // IDs des utilisateurs membres
    finishedAt: Date | null;
    createdBy?: string; // ID de l'utilisateur créateur
    createdAt?: Date;
    updatedAt?: Date;
}

/**
 * Interface pour la création d'un projet (sans ID)
 */
export interface CreateProjectDto {
    name: string;
    description: string;
    startDate: Date;
    endDate: Date;
    members?: string[];
    status?: StatusProject;
}

/**
 * Interface pour la mise à jour d'un projet
 */
export interface UpdateProjectDto {
    name?: string;
    description?: string;
    startDate?: Date;
    endDate?: Date;
    timeSpent?: number;
    status?: StatusProject;
    members?: string[];
    finishedAt?: Date | null;
}

/**
 * Interface pour les statistiques d'un projet
 */
export interface ProjectStats {
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    todoTasks: number;
    lateTasks: number;
    progressPercentage: number;
    totalTimeSpent: number;
    totalMilestones: number;
    completedMilestones: number;
}
