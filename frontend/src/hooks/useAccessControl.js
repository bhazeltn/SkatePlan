import { useAuth } from '@/AuthContext';

/**
 * Centralized Permission Logic.
 * @param {Object} entity - The Skater, Team, or SynchroTeam object being viewed.
 * @returns {Object} Permissions flags (canEdit, canDelete, etc.)
 */
export function useAccessControl(entity) {
    const { user } = useAuth();

    // Safety check: If data isn't loaded, return "locked down" state
    if (!user || !entity) {
        return {
            role: 'NONE',
            isOwner: false,
            isCollaborator: false,
            isObserver: false,
            isGuardian: false,
            isSelf: false,
            canEditStructure: false,
            canEditData: false,
            canDelete: false,
            
            // UI Flags
            canEditPlan: false,
            canCreateCompetitions: false,
            canEditCompetitions: false,
            canEditGoals: false,
            canEditLogs: false,
            canEditHealth: false,
            canEditProfile: false,
            viewGapAnalysis: false,
            
            // Global Read Only
            readOnlyStructure: true,
            readOnlyData: true
        };
    }

    // 1. Determine Contextual Role
    // We prioritize the 'access_level' field from the API (Roster/Team serializers)
    let role = entity.access_level;

    // Fallback: Identity Check (Am I this skater?)
    // Note: 'user.skater_id' comes from UserSerializer
    if (user.role === 'SKATER' && user.skater_id === entity.id && !role) {
        role = 'SKATER_OWNER';
    }

    // Fallback: Legacy Owner Check (if access_level is missing)
    // If I am a Coach and I see this skater but have no access record, I'm likely the creator/owner.
    if (!role && (user.role === 'COACH' || user.is_superuser)) {
        role = 'COACH';
    }

    // 2. Define Role Groups
    const isOwner = role === 'COACH' || role === 'OWNER' || role === 'MANAGER'; // Managers usually treated as Owners for day-to-day
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
        isStaff,

        // --- STRUCTURE PERMISSIONS (Plans, Programs, Roster) ---
        // Only Staff can change the training structure.
        canEditStructure: isStaff,
        
        // --- DATA PERMISSIONS (Logs, Goals, Health) ---
        // Staff + Family + Athlete can contribute data.
        // Only Observers are strictly locked out.
        canEditData: isStaff || isGuardian || isSelf,

        // --- DESTRUCTIVE PERMISSIONS ---
        // Only the true Owner/Head Coach can delete the entity or major plans.
        canDelete: isOwner,

        // --- SPECIFIC UI FLAGS (Mapped to Tabs) ---
        canEditPlan: isStaff,
        canCreateCompetitions: isStaff,
        // Parents/Skaters can edit results (upload protocols), but Observers cannot
        canEditCompetitions: !isObserver, 
        canEditGoals: !isObserver,
        canEditLogs: !isObserver,
        canEditHealth: !isObserver,
        canEditProfile: isOwner, // Only Owner invites staff/parents
        
        viewGapAnalysis: isStaff || isObserver, // Visible to staff and mentors
        
        // Global "View Only" flags
        readOnlyStructure: !isStaff, // Passed to Plans/Programs
        readOnlyData: isObserver // Passed to Logs/Health if needed
    };
}