from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.contrib.contenttypes.models import ContentType
from django.core.mail import send_mail
from django.utils import timezone
from django.db import transaction
from django.conf import settings
import uuid
from datetime import date

from api.models import Invitation, User, Skater, Team, SynchroTeam, PlanningEntityAccess
from api.serializers import UserSerializer


class SendInviteView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        email = request.data.get("email")
        role = request.data.get("role")
        entity_type = request.data.get("entity_type")
        entity_id = request.data.get("entity_id")

        if not email or not role:
            return Response({"error": "Email and Role required"}, status=400)

        if User.objects.filter(email=email).exists():
            return Response(
                {"error": "User already exists. Add as collaborator instead."},
                status=409,
            )

        # Find Target
        target = None
        if entity_type == "Skater":
            target = get_object_or_404(Skater, id=entity_id)
        elif entity_type == "Team":
            target = get_object_or_404(Team, id=entity_id)
        elif entity_type == "SynchroTeam":
            target = get_object_or_404(SynchroTeam, id=entity_id)

        if not target:
            return Response({"error": "Target not found"}, status=404)

        # --- UPDATED COMPLIANCE CHECK ---
        if role == "ATHLETE" and entity_type == "Skater":
            if target.date_of_birth:
                today = date.today()
                dob = target.date_of_birth
                age = (
                    today.year
                    - dob.year
                    - ((today.month, today.day) < (dob.month, dob.day))
                )

                if age < 13:
                    return Response(
                        {
                            "error": "SafeSport: Athletes under 13 cannot have direct accounts. Please invite a Parent/Guardian."
                        },
                        status=400,
                    )

        invite = Invitation.objects.create(
            email=email,
            sender=request.user,
            role=role,
            content_type=ContentType.objects.get_for_model(target),
            object_id=target.id,
            token=str(uuid.uuid4()),
        )

        # Send Email
        base_url = settings.FRONTEND_URL.rstrip("/")
        accept_link = f"{base_url}/#/accept-invite/{invite.token}"

        subject = f"You've been invited to SkatePlan"
        html_message = f"""
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
            <h2 style="color: #2563eb;">Welcome to SkatePlan!</h2>
            <p>Hello,</p>
            <p>Your coach <strong>{request.user.full_name}</strong> has invited you to join their roster on SkatePlan.</p>
            <p><strong>Role:</strong> {role.replace('_', ' ').title()}</p>
            <p><strong>Team/Athlete:</strong> {str(target)}</p>
            <br>
            <a href="{accept_link}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Accept Invitation</a>
            <br><br>
            <p style="font-size: 12px; color: #666;">Or copy this link: <br> <a href="{accept_link}">{accept_link}</a></p>
        </div>
        """

        send_mail(
            subject=subject,
            message=f"Accept at: {accept_link}",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            html_message=html_message,
            fail_silently=False,
        )

        return Response(
            {"message": "Invitation sent", "token": invite.token}, status=201
        )


class AcceptInviteView(APIView):
    permission_classes = [permissions.AllowAny]

    def validate_requirements(self, invite):
        if invite.role == "ATHLETE" and isinstance(invite.target_entity, Skater):
            skater = invite.target_entity
            if skater.date_of_birth:
                today = date.today()
                dob = skater.date_of_birth
                age = (
                    today.year
                    - dob.year
                    - ((today.month, today.day) < (dob.month, dob.day))
                )

                if 13 <= age < 18:
                    ct = ContentType.objects.get_for_model(Skater)
                    has_guardian = PlanningEntityAccess.objects.filter(
                        content_type=ct, object_id=skater.id, access_level="GUARDIAN"
                    ).exists()

                    if not has_guardian:
                        return f"SafeSport Compliance: As a minor athlete ({age}), a Parent/Guardian must accept their invitation and link their account before you can join."
        return None

    def get(self, request, token):
        invite = get_object_or_404(Invitation, token=token)
        if not invite.is_valid:
            return Response({"error": "Invitation expired or already used"}, status=400)

        error_msg = self.validate_requirements(invite)
        if error_msg:
            return Response(
                {"error": error_msg, "code": "DEPENDENCY_ERROR"}, status=400
            )

        return Response(
            {
                "email": invite.email,
                "role": invite.role,
                "target": str(invite.target_entity),
            }
        )

    def post(self, request, token):
        invite = get_object_or_404(Invitation, token=token)
        if not invite.is_valid:
            return Response({"error": "Invitation expired or already used"}, status=400)

        error_msg = self.validate_requirements(invite)
        if error_msg:
            return Response({"error": error_msg}, status=400)

        password = request.data.get("password")
        full_name = request.data.get("full_name")

        if not password or len(password) < 6:
            return Response(
                {"error": "Password must be at least 6 characters"}, status=400
            )

        with transaction.atomic():
            # Fix: removed 'username' and 'is_coach' arguments
            user = User.objects.create_user(
                email=invite.email,
                password=password,
                full_name=full_name,
                role=invite.role,
            )
            entity = invite.target_entity

            if invite.role == "ATHLETE" and hasattr(entity, "user_account"):
                entity.user_account = user
                entity.save()

            elif invite.role == "PARENT":
                PlanningEntityAccess.objects.create(
                    user=user,
                    planning_entity=entity,
                    access_level=PlanningEntityAccess.AccessLevel.GUARDIAN,
                )

            elif invite.role == "COLLABORATOR":
                PlanningEntityAccess.objects.create(
                    user=user,
                    planning_entity=entity,
                    access_level=PlanningEntityAccess.AccessLevel.COLLABORATOR,
                )

            elif invite.role == "MANAGER":
                PlanningEntityAccess.objects.create(
                    user=user,
                    planning_entity=entity,
                    access_level=PlanningEntityAccess.AccessLevel.MANAGER,
                )

            elif invite.role == "OBSERVER":
                PlanningEntityAccess.objects.create(
                    user=user,
                    planning_entity=entity,
                    access_level=PlanningEntityAccess.AccessLevel.VIEWER,
                )

            invite.accepted_at = timezone.now()
            invite.save()

            from rest_framework.authtoken.models import Token

            auth_token, _ = Token.objects.get_or_create(user=user)

            # Fix: Use user.pk instead of user.id
            return Response(
                {"token": auth_token.key, "user_id": user.pk, "role": user.role}
            )
