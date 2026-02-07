# CK-X Simulator – Local setup

## Prerequisites

- **Docker** – v20.10+ (Docker Desktop on Mac/Windows, or Docker Engine on Linux)
- **Docker Compose** – v2.0+
- **Resources** – 8GB RAM recommended, 4+ cores, ~20GB free disk
- **Port** – `30080` free on your machine

## 1. Clone and enter the repo (if needed)

```bash
cd /Users/danilo/repos/dojo-exam
```

## 2. Start everything with Docker Compose

**Option A – Using the deploy script (builds images, starts services, opens browser):**

```bash
chmod +x compose-deploy.sh
./compose-deploy.sh
```

**Option B – Manual:**

```bash
# Build and start all services (first time or after code changes)
docker compose up --build -d

# Or run in foreground to see logs
docker compose up --build
```

## 3. Open the app

- **URL:** http://localhost:30080  
- The script opens it automatically; otherwise open this URL in your browser.

## 4. Default credentials (from `docker-compose.yaml`)

| Use case        | Value                |
|-----------------|----------------------|
| VNC password    | `bakku-the-wizard`   |
| SSH (terminal)  | user: `candidate`, password: `password` |
| Jumphost host   | `ckad9999` (internal) |

No `.env` file is required; all config is in `docker-compose.yaml`.

## Useful commands

| Action              | Command |
|---------------------|--------|
| Stop all services   | `docker compose down` |
| Stop and remove volumes | `docker compose down --volumes --remove-orphans` |
| Restart             | `docker compose restart` |
| View logs (all)     | `docker compose logs -f` |
| Logs for one service| `docker compose logs -f <service-name>` |
| Rebuild one service | `docker compose up -d --build <service-name>` |

## Services (internal)

- **nginx** – reverse proxy, only service on port 30080
- **webapp** – frontend (Node)
- **remote-desktop** – VNC (Ubuntu)
- **remote-terminal** – SSH terminal
- **jumphost** – SSH jumphost (ckad9999)
- **k8s-api-server** – KIND Kubernetes cluster
- **redis** – used by facilitator
- **facilitator** – backend API and exam logic

## Troubleshooting

- **Port 30080 in use:**  
  `lsof -i :30080` (Mac/Linux) or change `30080:80` under `nginx` in `docker-compose.yaml`.

- **Docker not running:**  
  Start Docker Desktop (Mac/Windows) or `sudo systemctl start docker` (Linux).

- **Containers failing:**  
  `docker compose logs -f` then `docker compose logs -f <service-name>`.

- **KIND cluster slow to be ready:**  
  Wait 1–2 minutes after start; the deploy script already waits ~30s for the cluster.

- **Low resources:**  
  Reduce `deploy.resources.limits` (cpus/memory) in `docker-compose.yaml` for heavy services (e.g. `k8s-api-server`, `remote-desktop`).

- **Progress bar stuck at ~90% when starting a lab:**  
  The bar is time-based and only reaches 100% when the lab (Kubernetes cluster + jumphost) reports READY. If it stays around 90%:
  - Wait up to **6 minutes** – the app will now show an error and stop if preparation doesn’t finish in time.
  - If preparation **fails**, you’ll see an alert; check logs:  
    `docker compose logs -f facilitator jumphost k8s-api-server`
  - Ensure the cluster is up:  
    `docker compose ps k8s-api-server`  
    The first start of the KIND/K3d cluster can take 1–2 minutes; start the lab only after all services are healthy.
