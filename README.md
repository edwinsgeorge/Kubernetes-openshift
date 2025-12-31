# DCL Emergency Call Center

AI-powered Emergency Call Center with Voice AI, ML Routing, and Real-time Dashboard.

## Project Structure

```
├── frontend/       # Admin Dashboard (React/TypeScript)
├── backend/        # Python Backend API
├── voicebot/       # Voice Bot Service
├── ml-model/       # Machine Learning Models
├── mobile/         # Mobile Application
├── database/       # Database Schemas
└── k8s/            # Kubernetes Manifests for OpenShift
```

## Services Overview

| Service | Description |
|---------|-------------|
| frontend | Admin web dashboard |
| backend | Main Python API server |
| voicebot | Voice AI processing service |
| ml-model | ML-based call routing |
| mobile | Mobile application |

## Kubernetes Files (k8s/)

| File/Folder | Purpose |
|-------------|---------|
| namespace.yaml | Creates project namespace |
| deployments/ | Deployment configs for each service |
| services/ | Service configs for internal networking |
| configmaps/ | Application configuration |
| secrets/ | Sensitive data (passwords, keys) |
| ingress/ | External access configuration |

## Deploy to OpenShift

```bash
# Login to OpenShift
oc login <your-cluster-url>

# Create namespace
oc apply -f k8s/namespace.yaml

# Deploy all resources
oc apply -f k8s/configmaps/
oc apply -f k8s/secrets/
oc apply -f k8s/deployments/
oc apply -f k8s/services/
oc apply -f k8s/ingress/
```

## Local Development

```bash
docker-compose up
```

## Author

Edwin George
