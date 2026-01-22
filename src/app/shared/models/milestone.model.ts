/**
 * Interface Milestone
 * Représente un jalon (milestone) dans un projet
 * Basé sur le diagramme de classe
 */
export interface Milestone {
    id: string;
    projectId: string; // Référence au projet (relation 1..*)
    name: string;
    description: string;
    date: Date;
    isCompleted: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

/**
 * Interface pour la création d'un jalon (sans ID)
 */
export interface CreateMilestoneDto {
    projectId: string;
    name: string;
    description: string;
    date: Date;
    isCompleted?: boolean;
}

/**
 * Interface pour la mise à jour d'un jalon
 */
export interface UpdateMilestoneDto {
    name?: string;
    description?: string;
    date?: Date;
    isCompleted?: boolean;
}

/**
 * Interface pour un jalon avec informations supplémentaires
 */
export interface MilestoneWithDetails extends Milestone {
    projectName?: string;
    daysUntilDue?: number; // Nombre de jours avant l'échéance
    isOverdue?: boolean; // Si le jalon est en retard
}
