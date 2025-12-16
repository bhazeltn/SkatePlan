# Claude Code CLI Setup Guide
## For VS Code Dev Container Environment

---

## Understanding Your Setup

**Current State:**
- You have a VS Code Dev Container
- Django project lives in the container
- You've been developing inside the container

**Goal:**
- Install Claude Code CLI
- Give it access to your codebase
- Work seamlessly with your existing dev container

---

## Option 1: Install Claude Code on Host (RECOMMENDED)

**Best for:** Most flexible, works with your existing workflow

### How It Works
```
Your Machine (Host)
├── Claude Code CLI installed here
├── VS Code with Remote-Containers extension
└── Project folder mounted into container
    └── Dev Container running
        └── Django project + PostgreSQL + Redis
```

**Claude Code accesses the project files on your HOST machine, while your dev container runs the services.**

### Setup Steps

**1. Install Claude Code on your host machine**

**macOS:**
```bash
# Install via Homebrew
brew install anthropic/claude/claude

# Or via curl
curl -fsSL https://raw.githubusercontent.com/anthropics/claude-code/main/install.sh | sh
```

**Linux:**
```bash
# Via curl
curl -fsSL https://raw.githubusercontent.com/anthropics/claude-code/main/install.sh | sh

# Add to PATH (add this to ~/.bashrc or ~/.zshrc)
export PATH="$HOME/.claude/bin:$PATH"
```

**Windows (WSL2 recommended):**
```bash
# Inside WSL2
curl -fsSL https://raw.githubusercontent.com/anthropics/claude-code/main/install.sh | sh

# Add to PATH
export PATH="$HOME/.claude/bin:$PATH"
```

**2. Verify installation**
```bash
claude --version
```

**3. Authenticate Claude Code**
```bash
claude auth login

# This will open a browser to authenticate with your Anthropic account
# Or provide API key if prompted
```

**4. Navigate to your project**
```bash
cd /path/to/your/coachos-project
```

**5. Start Claude Code**
```bash
# Basic start
claude code

# Or with specific directory
claude code --directory /path/to/coachos-project

# With verbose output
claude code --verbose
```

**6. Test it works**
```
In Claude Code chat:

You: "Show me the directory structure of this project"
Claude: [should list your files]

You: "What Django models currently exist?"
Claude: [should read and analyze models.py files]
```

### Advantages
✅ Claude Code sees your files directly on host  
✅ Works with any IDE (VS Code, PyCharm, etc.)  
✅ No container complexity  
✅ Faster file access  
✅ Can still run/test in dev container  

### How to Run/Test Code

**When Claude Code makes changes:**
```bash
# Terminal 1 (Host) - Claude Code
cd ~/projects/coachos
claude code

# Terminal 2 (Host) - Access dev container
docker exec -it coachos-devcontainer bash
# OR via VS Code: Ctrl+` (opens terminal in container)

# Inside container, run tests/migrations
python manage.py test
python manage.py makemigrations
python manage.py migrate
```

---

## Option 2: Install Claude Code Inside Dev Container (ALTERNATIVE)

**Best for:** If you want everything contained, but more setup

### How It Works
```
Your Machine (Host)
└── Dev Container
    ├── Django project
    ├── PostgreSQL + Redis
    └── Claude Code CLI (installed in container)
```

### Setup Steps

**1. Update your `.devcontainer/devcontainer.json`**
```json
{
  "name": "CoachOS Dev Container",
  "dockerComposeFile": "docker-compose.yml",
  "service": "web",
  "workspaceFolder": "/workspace",
  
  // Add this section
  "postCreateCommand": "curl -fsSL https://raw.githubusercontent.com/anthropics/claude-code/main/install.sh | sh && echo 'export PATH=\"$HOME/.claude/bin:$PATH\"' >> ~/.bashrc",
  
  "customizations": {
    "vscode": {
      "extensions": [
        "ms-python.python",
        "ms-python.vscode-pylance"
      ]
    }
  }
}
```

**2. Rebuild container**
```bash
# In VS Code: Ctrl+Shift+P
# Type: "Remote-Containers: Rebuild Container"
```

**3. Once rebuilt, inside container:**
```bash
# Verify Claude Code installed
claude --version

# Authenticate
claude auth login
# Note: This may be tricky in container - might need to set API key directly
export ANTHROPIC_API_KEY="your-api-key-here"

# Start Claude Code
claude code
```

### Advantages
✅ Everything self-contained  
✅ Same environment for development and Claude  

### Disadvantages
⚠️ Authentication might be harder (no browser in container)  
⚠️ Needs container rebuild to install  
⚠️ Tied to VS Code dev container  

---

## Option 3: Hybrid Approach (MOST FLEXIBLE)

**Best for:** Maximum flexibility

### Setup
- Claude Code on host (for file editing)
- Dev container for running/testing
- Use both together

### Workflow
```bash
# Terminal 1 (Host) - File operations
cd ~/projects/coachos
claude code

# Claude Code makes changes to files
# Files are immediately available in container (bind mount)

# Terminal 2 (Container) - Run operations
# Open in VS Code or: docker exec -it coachos-devcontainer bash
python manage.py makemigrations
python manage.py migrate
pytest

# Terminal 3 (Container) - Services
docker-compose up
```

### Advantages
✅ Best of both worlds  
✅ Claude edits files on host  
✅ Services run in container  
✅ No authentication issues  
✅ Works with any dev setup  

---

## Recommended Setup for You

**Based on "VS Code Dev Container" setup:**

### **Use Option 1: Claude Code on Host**

**Why:**
1. Simpler authentication
2. No container modification needed
3. Works with your existing dev container
4. Faster and more flexible

**Your workflow would be:**

**Terminal 1 (Host):**
```bash
cd ~/projects/coachos
claude code
```

**Terminal 2 (VS Code - opens in container automatically):**
```bash
# VS Code terminal is already in container
python manage.py test
python manage.py migrate
```

**Terminal 3 (Optional - services):**
```bash
# If not already running
docker-compose up
```

---

## Step-by-Step: Getting Started Right Now

**1. Install Claude Code on your host machine**
```bash
# macOS
brew install anthropic/claude/claude

# Linux/WSL
curl -fsSL https://raw.githubusercontent.com/anthropics/claude-code/main/install.sh | sh
export PATH="$HOME/.claude/bin:$PATH"
```

**2. Authenticate**
```bash
claude auth login
```

**3. Navigate to your project root**
```bash
cd ~/path/to/coachos-project
# This should be where your .devcontainer folder is
```

**4. Start Claude Code**
```bash
claude code
```

**5. First commands to try**
```
You: "List all files in this project"
You: "Show me the contents of manage.py"
You: "What Django models exist in the api app?"
You: "Read the docker-compose.yml file"
```

**6. If it works, proceed to audit**
```
You: "Please audit the existing Django models and compare them to the 
     COMPLETE_SPECIFICATION_v3.md file in the outputs directory"
```

---

## Troubleshooting

### Issue: "Claude Code can't find my files"

**Solution:**
```bash
# Make sure you're in the project root
pwd
# Should show: /home/you/projects/coachos (or similar)

ls -la
# Should show your Django project files

# Start Claude Code with explicit path
claude code --directory $(pwd)
```

### Issue: "Permission denied when reading files"

**Solution:**
```bash
# Check file permissions
ls -la

# If needed, fix permissions
chmod -R u+rw .
```

### Issue: "Claude Code can't authenticate"

**Solution:**
```bash
# Method 1: Web login
claude auth login

# Method 2: API key directly
export ANTHROPIC_API_KEY="sk-ant-..."
claude code

# Method 3: Config file
mkdir -p ~/.claude
echo "api_key: sk-ant-..." > ~/.claude/config.yml
```

### Issue: "Changes made by Claude don't appear in container"

**Check:**
```bash
# On host: Make sure bind mount is correct in docker-compose.yml
cat docker-compose.yml | grep volumes

# Should see something like:
volumes:
  - .:/workspace
  # or
  - ./backend:/app
```

### Issue: "Claude Code is slow"

**Solutions:**
```bash
# Exclude large directories
claude code --exclude node_modules --exclude .git --exclude __pycache__

# Or create .claudeignore file
cat > .claudeignore << EOF
node_modules/
.git/
__pycache__/
*.pyc
.pytest_cache/
.venv/
staticfiles/
media/
*.log
EOF
```

---

## Configuration Files

### `.claudeignore` (Recommended)
```
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
env/
venv/
.venv/
.pytest_cache/
.coverage
htmlcov/

# Django
*.log
local_settings.py
db.sqlite3
media/
staticfiles/

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# Git
.git/

# Node (if you have frontend)
node_modules/
npm-debug.log
yarn-error.log

# OS
.DS_Store
Thumbs.db

# Docker
.dockerignore
```

### `~/.claude/config.yml` (Optional)
```yaml
api_key: "sk-ant-..."  # Or use auth login instead

# Default settings
defaults:
  model: "claude-sonnet-4"
  max_tokens: 8000
  temperature: 0.7

# Project-specific settings
projects:
  coachos:
    path: "~/projects/coachos"
    exclude:
      - "node_modules"
      - "__pycache__"
      - ".git"
```

---

## Working with Your Dev Container

### Typical Workflow

**1. Start your dev container (if not running)**
```bash
# Via VS Code
# Ctrl+Shift+P → "Remote-Containers: Reopen in Container"

# Or via docker-compose
cd ~/projects/coachos
docker-compose up -d
```

**2. Start Claude Code on host**
```bash
# In a terminal on your HOST machine
cd ~/projects/coachos
claude code
```

**3. Work with Claude Code**
```
You: "Add the Federation model to api/models.py as specified in 
     COMPLETE_SPECIFICATION_v3.md"

Claude: [makes changes to files on host]

You: "Now create a migration for this"
```

**4. Run migrations in container**
```bash
# In VS Code terminal (automatically in container)
# OR: docker exec -it coachos-devcontainer bash

python manage.py makemigrations
python manage.py migrate
```

**5. Test the changes**
```bash
# In container
python manage.py shell
>>> from api.models import Federation
>>> Federation.objects.create(name="Skate Canada", code="CAN")
>>> # Should work!
```

**6. Continue with Claude Code**
```
You: "Great! Now let's add tests for the Federation model"
```

---

## Integration with Git

**Claude Code can use git, but YOU should review commits:**

**Safe workflow:**
```bash
# Claude Code makes changes
# Files are modified but not committed

# YOU review changes
git status
git diff

# If good, commit yourself
git add .
git commit -m "Add Federation and FederationLevel models"

# Or ask Claude Code to help with commit message
```

**In Claude Code:**
```
You: "Please suggest a good commit message for these changes"
Claude: [suggests message]

# Then YOU commit manually
```

---

## What to Do Right Now

**Immediate steps:**

1. **Install Claude Code on your host machine**
   ```bash
   # Choose your OS method from above
   ```

2. **Authenticate**
   ```bash
   claude auth login
   ```

3. **Navigate to project**
   ```bash
   cd ~/path/to/coachos
   ```

4. **Create .claudeignore**
   ```bash
   # Copy the .claudeignore content from above
   ```

5. **Start Claude Code**
   ```bash
   claude code
   ```

6. **Test it works**
   ```
   You: "Show me what Django models currently exist"
   ```

7. **If it works, share with me:**
   - "Claude Code is working!"
   - We can begin Phase 0 audit

---

## Phase 0 First Commands

**Once Claude Code is working:**

```
You: "Please read COMPLETE_SPECIFICATION_v3.md and comprehensive_federation_plan.md 
     from the outputs directory I'll provide"

You: "Now audit the existing Django models in api/models.py and compare to the spec. 
     Create a detailed report of what exists, what's missing, and what needs to change."

You: "Based on the audit, create a Phase 0 implementation plan with specific tasks"

You: "Let's start with Task 1: Add Federation and FederationLevel models"
```

---

## Summary

**Recommended Setup:**
- ✅ Install Claude Code on HOST machine
- ✅ Use your existing VS Code dev container for running code
- ✅ Claude edits files on host, you test in container
- ✅ Simple, flexible, no authentication issues

**Next Steps:**
1. Install Claude Code (5 minutes)
2. Authenticate (2 minutes)
3. Test with your project (5 minutes)
4. Begin Phase 0 audit (when ready)

**Questions to answer:**
- What OS is your host machine? (macOS/Linux/Windows)
- Where is your project located? (full path)
- Is your dev container running now?

Ready to install? Let me know if you hit any issues! 🚀

