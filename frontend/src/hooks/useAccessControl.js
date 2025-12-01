import { useAuth } from '@/features/auth/AuthContext';

export function useAccessControl(entity) {
    const { user } = useAuth();

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
            canManageStaff: false, // Default false
            readOnlyStructure: true,
            readOnlyData: true
        };
    }

    // 1. Determine Role
    let role = entity.access_level;
    if (user.role === 'SKATER' && user.skater_id === entity.id && !role) {
        role = 'SKATER_OWNER';
    }
    if (!role && (user.role === 'COACH' || user.is_superuser)) {
        role = 'COACH';
    }

    // 2. Groups
    const isOwner = role === 'COACH' || role === 'OWNER';
    const isCollaborator = role === 'COLLABORATOR';
    const isManager = role === 'MANAGER';
    
    const isStaff = isOwner || isCollaborator || isManager;
    
    const isObserver = role === 'VIEWER' || role === 'OBSERVER';
    const isGuardian = role === 'GUARDIAN';
    const isSelf = role === 'SKATER_OWNER' || (user.role === 'SKATER' && user.skater_id === entity.id);
    const isFamily = isGuardian || isSelf;

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

        // Visibility
        canViewYearlyPlan: isTechViewer && !isManager,
        canViewGapAnalysis: isOwner || isCollaborator || isObserver,
        canViewPerformance: isTechViewer && !isManager,
        canViewLogistics: true, 
        canViewHealth: isTechViewer && !isManager,

        // Actions
        canEditStructure: isOwner || isCollaborator,
        canEditData: isOwner || isCollaborator || isFamily,
        canDelete: isOwner,
        
        // Specifics
        canEditPlan: isOwner || isCollaborator,
        canCreateCompetitions: isOwner || isCollaborator,
        canEditCompetitions: (isOwner || isCollaborator || isFamily),
        canEditGoals: (isOwner || isCollaborator || isFamily),
        canEditLogs: (isOwner || isCollaborator || isFamily),
        canEditHealth: (isOwner || isCollaborator || isFamily),
        
        // FIX: This was missing!
        canManageStaff: isOwner, // Only Owner invites/revokes staff/parents
        canEditProfile: isOwner, 

        readOnlyStructure: !(isOwner || isCollaborator), 
        readOnlyData: isObserver
    };
}