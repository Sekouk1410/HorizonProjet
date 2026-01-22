/**
 * Énumération des rôles utilisateur
 * Basé sur le diagramme de classe : manager | member
 */
export enum Role {
    MANAGER = 'manager',
    MEMBER = 'member'
}

/**
 * Interface User
 * Représente un utilisateur de l'application
 */
export interface User {
    id: string;
    userName: string;
    email: string;
    password?: string; // Optionnel car géré par Firebase Auth
    role: Role;
    createdAt?: Date;
    updatedAt?: Date;
}

/**
 * Interface pour la création d'un utilisateur (sans ID)
 */
export interface CreateUserDto {
    userName: string;
    email: string;
    password: string;
    role: Role;
}

/**
 * Interface pour la mise à jour d'un utilisateur
 */
export interface UpdateUserDto {
    userName?: string;
    email?: string;
    role?: Role;
}
