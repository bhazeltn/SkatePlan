// FIX: Update import path
import { useAuth } from '@/features/auth/AuthContext';

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
    const isOwner = role === 'COACH' || role === 'OWNER'; 
    const isCollaborator = role === 'COLLABORATOR';       
    const isManager = role === 'MANAGER';                 
    
    const isStaff = isOwner || isCollaborator || isManager;
    
    const isObserver = role === 'VIEWER' || role === 'OBSERVER';
    const isGuardian = role === 'GUARDIAN';
    const isSelf = role === 'SKATER_OWNER' || (user.role === 'SKATER' && user.skater_id === entity.id);
    const isFamily = isGuardian || isSelf;

    // 3. Calculate Capabilities
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
        canViewYearlyPlan: isTechViewer && !isManager,
        canViewGapAnalysis: isOwner || isCollaborator || isObserver,
        canViewPerformance: isTechViewer && !isManager,
        canViewLogistics: true, 
        canViewHealth: isTechViewer && !isManager,

        // --- EDIT PERMISSIONS ---
        canEditStructure: isOwner || isCollaborator,
        canEditData: isOwner || isCollaborator || isFamily,
        canDelete: isOwner,

        // --- SPECIFIC UI FLAGS ---
        canEditPlan: isOwner || isCollaborator,
        canCreateCompetitions: isOwner || isCollaborator,
        canEditCompetitions: (isOwner || isCollaborator || isFamily),
        canEditGoals: (isOwner || isCollaborator || isFamily),
        canEditLogs: (isOwner || isCollaborator || isFamily),
        canEditHealth: (isOwner || isCollaborator || isFamily),
        canEditProfile: isOwner, 
        
        // Global "View Only" flags
        readOnlyStructure: !(isOwner || isCollaborator), 
        readOnlyData: isObserver
    };
}