/**
 * Interface TimeEntry
 * Représente une entrée de temps pour le suivi du temps passé sur une tâche
 */
export interface TimeEntry {
    id: string;
    taskId: string; // Référence à la tâche
    userId: string; // Référence à l'utilisateur
    startTime: Date;
    endTime: Date | null; // null si le timer est en cours
    duration: number; // Durée en minutes
    description?: string; // Description optionnelle de ce qui a été fait
    createdAt?: Date;
    updatedAt?: Date;
}

/**
 * Interface pour la création d'une entrée de temps (sans ID)
 */
export interface CreateTimeEntryDto {
    taskId: string;
    userId: string;
    startTime: Date;
    endTime?: Date | null;
    duration?: number;
    description?: string;
}

/**
 * Interface pour la mise à jour d'une entrée de temps
 */
export interface UpdateTimeEntryDto {
    endTime?: Date | null;
    duration?: number;
    description?: string;
}

/**
 * Interface pour une entrée de temps avec détails
 */
export interface TimeEntryWithDetails extends TimeEntry {
    taskTitle?: string;
    projectId?: string;
    projectName?: string;
    userName?: string;
}

/**
 * Interface pour les statistiques de temps
 */
export interface TimeStats {
    totalMinutes: number;
    totalHours: number;
    totalDays: number;
    entriesCount: number;
    averageSessionMinutes: number;
}
