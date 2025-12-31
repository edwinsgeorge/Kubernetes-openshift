# DCL Emergency Call Center

AI-powered Emergency Call Center with Voice AI, ML Routing, and Real-time Dashboard.

## Project Structure

```
├── README.md
├── docker-compose.yml
├── .gitignore
│
├── frontend/                    # Admin Dashboard (React/TypeScript)
│   ├── Dockerfile
│   └── (dashboard code)
│
├── backend/                     # Backend API (Node.js)
│   ├── Dockerfile
│   └── (backend code)
│
├── voicebot/                    # Voice Bot Service (Python/FastAPI)
│   ├── Dockerfile
│   └── (voicebot code)
│
├── ml-model/                    # ML Routing Files
│   ├── call_routing_model.pkl
│   └── tfidf_vectorizer.pkl
│
├── mobile/                      # Mobile App
│   └── (mobile code)
│
├── database/                    # Database Scripts
│   └── init.sql
│
└── k8s/                         # ALL Kubernetes Files
    ├── namespace.yaml
    ├── frontend-deployment.yaml
    ├── frontend-service.yaml
    ├── backend-deployment.yaml
    ├── backend-service.yaml
    ├── voicebot-deployment.yaml
    ├── voicebot-service.yaml
    ├── postgresql-deployment.yaml
    ├── postgresql-service.yaml
    ├── signaling-deployment.yaml
    ├── signaling-service.yaml
    ├── configmap.yaml
    ├── secrets.yaml
    └── ingress.yaml
```

## Services Overview

| Service | Technology | Description |
|---------|------------|-------------|
| frontend | React/TypeScript | Admin web dashboard |
| backend | Node.js | Main API server |
| voicebot | Python/FastAPI | Voice AI processing |
| ml-model | Python/ML | Call routing models |
| mobile | React Native | Mobile application |

## Deploy to OpenShift

```bash
# Login to OpenShift
oc login <your-cluster-url>

# Create namespace
oc apply -f k8s/namespace.yaml

# Deploy all resources
oc apply -f k8s/configmap.yaml
oc apply -f k8s/secrets.yaml
oc apply -f k8s/postgresql-deployment.yaml
oc apply -f k8s/postgresql-service.yaml
oc apply -f k8s/backend-deployment.yaml
oc apply -f k8s/backend-service.yaml
oc apply -f k8s/frontend-deployment.yaml
oc apply -f k8s/frontend-service.yaml
oc apply -f k8s/voicebot-deployment.yaml
oc apply -f k8s/voicebot-service.yaml
oc apply -f k8s/ingress.yaml
```

## Local Development

```bash
docker-compose up
```

## Author

Edwin George
