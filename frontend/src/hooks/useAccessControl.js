import { useAuth } from '@/AuthContext';

/**
 * Centralized Permission Logic.
 * @param {Object} entity - The Skater, Team, or SynchroTeam object being viewed.
 * @returns {Object} Permissions flags (canEdit, canDelete, etc.)
 */
export function useAccessControl(entity) {
    const { user } = useAuth();

    // Safety check
    if (!user || !entity) {
        return {
            role: 'NONE',
            isOwner: false,
            isCollaborator: false,
            isManager: false,
            isObserver: false,
            isGuardian: false,
            isSelf: false,
            canEditStructure: false,
            canEditData: false,
            canDelete: false,
            canViewYearlyPlan: false,
            canViewGapAnalysis: false,
            canViewPerformance: false,
            canViewLogistics: false,
            canViewHealth: false,
            readOnlyStructure: true,
            readOnlyData: true
        };
    }

    // 1. Determine Contextual Role
    let role = entity.access_level;

    // Fallback: Identity Check (Am I this skater?)
    if (user.role === 'SKATER' && user.skater_id === entity.id && !role) {
        role = 'SKATER_OWNER';
    }

    // Fallback: Legacy Owner Check
    if (!role && (user.role === 'COACH' || user.is_superuser)) {
        role = 'COACH';
    }

    // 2. Define Role Groups
    const isOwner = role === 'COACH' || role === 'OWNER'; // Head Coach
    const isCollaborator = role === 'COLLABORATOR';       // Asst Coach (Tech focus)
    const isManager = role === 'MANAGER';                 // Team Manager (Logistics focus)
    
    const isStaff = isOwner || isCollaborator || isManager;
    
    const isObserver = role === 'VIEWER' || role === 'OBSERVER';
    const isGuardian = role === 'GUARDIAN';
    const isSelf = role === 'SKATER_OWNER' || (user.role === 'SKATER' && user.skater_id === entity.id);
    const isFamily = isGuardian || isSelf;

    // 3. Calculate Capabilities

    // Who can see "Training Tech" (YTP, Gap, Goals, Programs)?
    // Owners, Collaborators, Observers, and Family (except Gap Analysis)
    const isTechViewer = isOwner || isCollaborator || isObserver || isFamily;

    return {
        role,
        isOwner,
        isCollaborator,
        isManager,
        isObserver,
        isGuardian,
        isSelf,
        isStaff,

        // --- TAB VISIBILITY FLAGS ---
        
        // Yearly Plan: Staff (except Managers) + Observers + Family
        canViewYearlyPlan: isTechViewer && !isManager,
        
        // Gap Analysis: ONLY Tech Staff + Observers (Hidden from Family & Managers)
        canViewGapAnalysis: isOwner || isCollaborator || isObserver,
        
        // Performance (Goals/Programs/Comps): Tech Staff + Observers + Family
        canViewPerformance: isTechViewer && !isManager,
        
        // Logistics: Everyone involved (Staff, Observers, Family)
        canViewLogistics: true, 

        // Health/Logs: Tech Staff + Observers + Family
        canViewHealth: isTechViewer && !isManager,

        // --- EDIT PERMISSIONS ---
        
        // Structure (Plan/Roster): Only Owners and Collaborators
        canEditStructure: isOwner || isCollaborator,
        
        // Data (Logs/Goals): Tech Staff (inc. Collab) + Family
        canEditData: isOwner || isCollaborator || isFamily,
        
        // Destructive: Only Owner
        canDelete: isOwner,

        // --- SPECIFIC UI FLAGS ---
        canEditPlan: isOwner || isCollaborator,
        canCreateCompetitions: isOwner || isCollaborator,
        canEditCompetitions: (isOwner || isCollaborator || isFamily),
        canEditGoals: (isOwner || isCollaborator || isFamily),
        canEditLogs: (isOwner || isCollaborator || isFamily),
        canEditHealth: (isOwner || isCollaborator || isFamily),
        canEditProfile: isOwner, // Only Owner invites staff
        
        // Global "View Only" flags
        readOnlyStructure: !(isOwner || isCollaborator), 
        readOnlyData: isObserver // Observers can never edit data
    };
}