# BSC AI Companion

A locally-hosted AI chat interface combining a Django backend with a modern React frontend. Designed to run offline using Ollama, with Docker support for easy deployment.

## 🌟 Features
- **AI Chat**: Powered by Ollama (specifically `llama3:70b` by default).
- **Document RAG**: Upload PDF/Text documents and chat with them.
- **Web Search**: Real-time web search capabilities.
- **Modern UI**: React-based interface with streaming responses.
- **Dockerized**: specific container setup for Backend and Frontend.

---

## 🛠 Prerequisites

Before you begin, ensure you have the following installed:
1.  **Git**: [Install Git](https://git-scm.com/downloads)
2.  **Docker Desktop**: [Install Docker](https://www.docker.com/products/docker-desktop/)
3.  **Ollama**: [Install Ollama](https://ollama.com/download)

---

## 🤖 Ollama Setup (Critical)

This project relies on Ollama running on the host machine.

1.  **Install & Run Ollama**
    Download and install Ollama from the official site.

2.  **Pull the Model**
    Open your terminal and run:
    ```bash
    ollama pull llama3:70b
    ```

3.  **Configure Host Binding (IMPORTANT)**
    By default, Ollama only listens on `localhost`. For Docker containers to access it, it must listen on `0.0.0.0`.

    *   ** Mac**:
        Run this command in your terminal:
        ```bash
        launchctl setenv OLLAMA_HOST "0.0.0.0"
        ```
        **Restart the Ollama application** (Quit from menu bar and open it again).

    *   **🐧 Linux**:
        If running as a service:
        ```bash
        # Edit systemd service
        sudo systemctl edit ollama.service
        
        # Add inside the editor:
        [Service]
        Environment="OLLAMA_HOST=0.0.0.0"
        ```
        Then reload and restart:
        ```bash
        sudo systemctl daemon-reload
        sudo systemctl restart ollama
        ```

    *   **🪟 Windows**:
        Set a system environment variable `OLLAMA_HOST` to `0.0.0.0` and restart Ollama.

---

## 💻 Local Setup (User's Laptop)

### Option A: Running with Docker (Recommended)

1.  **Clone the Repository**
    ```bash
    git clone <your-repo-url>
    cd bsc-ai
    ```

3.  **Start the Application**
    ```bash
    docker compose up --build
    ```

4.  **Access the App**
    - Frontend: [http://localhost:5173](http://localhost:5173)
    - Backend: [http://localhost:8000](http://localhost:8000)

### Option B: Running Manually (No Docker)

**1. Backend (Django)**
```bash
# Setup Virtual Env
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install Dependencies
pip install -r requirements.txt

# Run Server
python manage.py runserver
```

**2. Frontend (React)**
```bash
cd bsc-ai-companion
npm install
npm run dev
```
The frontend is pre-configured to automatically connect to `localhost:8000` when running in this mode.

---

## ☁️ Deployment Guide (Linux VPS)

Follow these steps to deploy on a fresh Ubuntu/Debian VPS.

### 1. Initial Server Setup
Update your system:
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl
```

### 2. Install Docker
```bash
# Add Docker's official GPG key:
sudo apt-get update
sudo apt-get install ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

# Add the repository to Apt sources:
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update

# Install Docker packages
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

### 3. Install & Configure Ollama
```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Enable external access (Important for Docker container connectivity)
sudo sed -i '/\[Service\]/a Environment="OLLAMA_HOST=0.0.0.0"' /etc/systemd/system/ollama.service
sudo systemctl daemon-reload
sudo systemctl restart ollama

# Pull the model
ollama pull llama3:70b
```

### 4. Deploy the Application
```bash
# Clone repo
git clone <your-repo-url>
cd bsc-ai

# Start containers
docker compose up -d --build
```

### 5. Accessing on VPS
- If you have a domain, configure Nginx as a reverse proxy to port `5173`.
- For testing, access `http://<YOUR_VPS_IP>:5173`.
  - *Note: You may need to allow port 5173 in your firewall (`ufw allow 5173`).*

---

## 🔧 Troubleshooting

**"Connection Refused" to Ollama inside Docker**
- Run `curl http://host.docker.internal:11434/api/tags` inside the container.
- If it fails, check that `OLLAMA_HOST=0.0.0.0` is set on the host machine.

**Docker Build Errors**

If you encounter `driver not connecting` or API version errors:

1.  **Create a clean builder**:
    ```bash
    # Create a new builder that bypasses broken default drivers
    DOCKER_API_VERSION=1.43 docker buildx create --name clean-builder --use --buildkitd-flags '--allow-insecure-entitlement security.insecure' --driver-opt network=host --bootstrap
    ```

2.  **Run with API Version Enforced**:
    ```bash
    export DOCKER_API_VERSION=1.43
    docker compose up --build
    ```

**PDF/Image Previews Broken**
- Ensure the frontend container can reach the backend. The `vite.config.ts` includes proxy settings to handle `/media` requests.
