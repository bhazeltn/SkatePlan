from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import PermissionDenied
from django.shortcuts import get_object_or_404
from django.contrib.contenttypes.models import ContentType
from django.core.mail import send_mail
from django.utils import timezone
from django.db import transaction
from django.conf import settings
from django.contrib.auth import authenticate
import uuid
from datetime import date, timedelta

from api.models import Invitation, User, Skater, Team, SynchroTeam, PlanningEntityAccess
from api.services import get_access_role


class SendInviteView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        # Support both single 'email' and list of 'emails'
        emails = request.data.get("emails", [])
        single_email = request.data.get("email")
        if single_email:
            emails.append(single_email)

        role = request.data.get("role")
        entity_type = request.data.get("entity_type")
        entity_id = request.data.get("entity_id")

        if not emails or not role:
            return Response({"error": "Emails and Role required"}, status=400)

        # 1. Find Target
        target = None
        if entity_type == "Skater":
            target = get_object_or_404(Skater, id=entity_id)
        elif entity_type == "Team":
            target = get_object_or_404(Team, id=entity_id)
        elif entity_type == "SynchroTeam":
            target = get_object_or_404(SynchroTeam, id=entity_id)

        if not target:
            return Response({"error": "Target not found"}, status=404)

        # 2. SECURITY CHECK
        user_role = get_access_role(request.user, target)
        if user_role not in ["OWNER", "COACH", "MANAGER"]:
            raise PermissionDenied(
                "You do not have permission to invite users to this entity."
            )

        # 3. Loop and Send
        results = []

        for email in emails:
            email = email.strip()
            if not email:
                continue

            # Compliance Check (Minors - Skaters Only) - Skip for bulk team invites usually
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
                        results.append(
                            {
                                "email": email,
                                "status": "failed",
                                "reason": "SafeSport: Under 13",
                            }
                        )
                        continue

            # Create Invitation
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

            display_role = role.replace("_", " ").title()
            if role == "ATHLETE" and entity_type != "Skater":
                display_role = "Team Member"

            html_message = f"""
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
                <h2 style="color: #2563eb;">Welcome to SkatePlan!</h2>
                <p>Hello,</p>
                <p>Your coach <strong>{request.user.full_name}</strong> has invited you to join their roster on SkatePlan.</p>
                <p><strong>Role:</strong> {display_role}</p>
                <p><strong>Team/Athlete:</strong> {str(target)}</p>
                <br>
                <a href="{accept_link}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Accept Invitation</a>
                <br><br>
                <p style="font-size: 12px; color: #666;">Or copy this link: <br> <a href="{accept_link}">{accept_link}</a></p>
            </div>
            """

            send_mail(
                subject=f"Invitation to join {str(target)}",
                message=f"Accept at: {accept_link}",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email],
                html_message=html_message,
                fail_silently=True,
            )
            results.append({"email": email, "status": "sent"})

        return Response(
            {"message": "Invitations processed", "results": results}, status=201
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
                        return f"SafeSport Compliance: As a minor athlete ({age}), a Parent/Guardian must accept their invitation first."
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

        user_exists = User.objects.filter(email=invite.email).exists()
        return Response(
            {
                "email": invite.email,
                "role": invite.role,
                "target": str(invite.target_entity),
                "user_exists": user_exists,
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

        # --- 1. MAP ROLES ---
        final_role = invite.role
        user_role = User.Role.OBSERVER  # Default safe

        if final_role == "PARENT" or final_role == "GUARDIAN":
            user_role = User.Role.GUARDIAN
        elif final_role == "ATHLETE" or final_role == "SKATER":
            user_role = User.Role.SKATER
        elif final_role in ["COLLABORATOR", "MANAGER", "COACH"]:
            user_role = User.Role.COACH

        # --- 2. RESOLVE USER ---
        user = None
        existing_user = User.objects.filter(email=invite.email).first()

        if existing_user:
            user = authenticate(email=invite.email, password=password)
            if not user:
                return Response(
                    {"error": "Invalid password for existing account."}, status=401
                )
        else:
            if not password or len(password) < 6:
                return Response(
                    {"error": "Password must be at least 6 characters"}, status=400
                )
            with transaction.atomic():
                user = User.objects.create_user(
                    email=invite.email,
                    password=password,
                    full_name=full_name,
                    role=user_role,
                )

        # --- 3. ASSIGN PERMISSIONS ---
        entity = invite.target_entity
        ct = ContentType.objects.get_for_model(entity)

        # Case A: Direct Skater Link (Profile Ownership)
        if (invite.role == "ATHLETE" or invite.role == "SKATER") and hasattr(
            entity, "user_account"
        ):
            if not entity.user_account:
                entity.user_account = user
                entity.save()

        # Case B: Access Record (Team Members, Parents, Staff, Observers)
        else:
            # Map invitation role to PlanningEntityAccess level
            access_level = "VIEWER"  # Default

            if final_role in ["COLLABORATOR", "MANAGER", "COACH"]:
                access_level = final_role
            elif final_role in ["PARENT", "GUARDIAN"]:
                access_level = "GUARDIAN"
            elif final_role in ["ATHLETE", "SKATER"]:
                access_level = "SKATER"  # New PEA Level for Team Members
            elif final_role == "OBSERVER":
                access_level = "OBSERVER"

            PlanningEntityAccess.objects.get_or_create(
                user=user,
                content_type=ct,
                object_id=entity.id,
                defaults={"access_level": access_level},
            )

        invite.accepted_at = timezone.now()
        invite.save()

        from rest_framework.authtoken.models import Token

        auth_token, _ = Token.objects.get_or_create(user=user)

        return Response(
            {"token": auth_token.key, "user_id": user.pk, "role": user.role}
        )
