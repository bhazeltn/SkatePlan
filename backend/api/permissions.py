from rest_framework import permissions


class IsCoachUser(permissions.BasePermission):
    """
    Custom permission to only allow users with the 'COACH' role.
    """

    def has_permission(self, request, view):
        # Check if user is authenticated and has the role 'COACH'
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == "COACH"
        )
