import { useAuth } from '@/AuthContext';

/**
 * Centralized Permission Logic.
 * @param {Object} entity - The Skater, Team, or SynchroTeam object being viewed.
 * @returns {Object} Permissions flags (canEdit, canDelete, etc.)
 */
export function useAccessControl(entity) {
    const { user } = useAuth();

    if (!user || !entity) {
        return {
            role: 'NONE',
            canEdit: false,
            canDelete: false,
            readOnly: true,
            isOwner: false,
            isCollaborator: false,
            isObserver: false
        };
    }

    // 1. Determine Contextual Role
    // We prioritize the 'access_level' field from the API (Roster/Team serializers)
    let role = entity.access_level;

    // Fallback: Identity Check (Am I this skater?)
    if (user.role === 'SKATER' && user.skater_id === entity.id && !role) {
        // Note: Ideally backend sends 'OWNER' in access_level for self, 
        // but this covers the gap if it doesn't.
        role = 'SKATER_OWNER';
    }

    // If still null (e.g. Legacy Admin), assume Owner if global Coach
    if (!role && (user.role === 'COACH' || user.is_superuser)) {
        role = 'COACH';
    }

    // 2. Define Role Groups
    const isOwner = role === 'COACH' || role === 'OWNER' || role === 'MANAGER';
    const isCollaborator = role === 'COLLABORATOR';
    const isStaff = isOwner || isCollaborator;
    
    const isObserver = role === 'VIEWER' || role === 'OBSERVER';
    const isGuardian = role === 'GUARDIAN';
    const isSelf = role === 'SKATER_OWNER' || (user.role === 'SKATER' && user.skater_id === entity.id);

    // 3. Calculate Capabilities

    return {
        // Raw Role
        role,
        
        // Groups
        isOwner,
        isCollaborator,
        isObserver,
        isGuardian,
        isSelf,

        // --- STRUCTURE PERMISSIONS (Plans, Programs, Roster) ---
        // Only Staff can change the training structure.
        canEditStructure: isStaff,
        
        // --- DATA PERMISSIONS (Logs, Goals, Health) ---
        // Staff + Family + Athlete can contribute data.
        // Only Observers are strictly locked out.
        canEditData: !isObserver,

        // --- DESTRUCTIVE PERMISSIONS ---
        // Only the true Owner/Head Coach can delete the entity or major plans.
        canDelete: isOwner,

        // --- SPECIFIC UI FLAGS (Mapped to current Tabs) ---
        canEditPlan: isStaff,
        canCreateCompetitions: isStaff,
        canEditCompetitions: !isObserver, // Parents can upload protocols
        canEditGoals: !isObserver,
        canEditLogs: !isObserver,
        canEditHealth: !isObserver,
        canEditProfile: isOwner, // Only Owner invites staff/parents
        
        // Global "View Only" flag (Useful for locking inputs)
        // If you can't edit data, you are totally Read Only.
        // (Note: Guardians are ReadOnly on Plans but Edit on Logs. 
        // This flag is best used for "Structure" components).
        readOnlyStructure: !isStaff, 
    };
}