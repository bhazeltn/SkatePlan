# Gemini Agent Context & Rules

## 1. Environment Strategy
- **Project Structure:** We are working on a Dockerized Django project.
- **Your Location:** You are acting on the **Host Machine** (not inside the container).
- **File Access:** You have direct Read/Write access to the code on the host.

## 2. Command Execution Rules (CRITICAL)
- **Django Commands:** NEVER run `python manage.py` directly. It will fail.
- **Docker Execution:** You MUST run commands inside the running container using `docker exec`.
- **Target Container:** The Django backend is `skateplan-project-web-1`.

**Correct Command Patterns:**
- Migrations: `docker exec skateplan-project-web-1 python manage.py makemigrations`
- Migrate: `docker exec skateplan-project-web-1 python manage.py migrate`
- Tests: `docker exec skateplan-project-web-1 pytest`

## 3. Git Workflow
- **Branches:** NEVER commit to `main`. Always create/checkout a feature branch first. Confirm your branch before creating.
- **Pattern:** `git checkout -b feature/<task-name>`

## 4. Frontend Context
- **Access URL:** The frontend is accessible at `http://localhost:3000` (Host port).
- **Internal Port:** The container uses port 5173 internally.
- **CORS:** `CORS_ALLOWED_ORIGINS` must typically include `http://localhost:3000` and `http://127.0.0.1:3000`.