# Kubernetes Deployment Guide

Complete step-by-step guide for deploying the Emergency Call Center on Kubernetes.

## 📋 Prerequisites

### Required Tools
- Docker (v20.10+)
- Kubernetes cluster:
  - Minikube (for local)
  - Kind (for local)
  - GKE/EKS/AKS (for cloud)
- kubectl (v1.25+)
- (Optional) Helm v3

### Required Knowledge
- Basic Kubernetes concepts (Pods, Services, Deployments)
- Docker basics
- YAML syntax

## 🎓 Learning Path for DevOps

### Step 1: Local Development (Docker Compose)

Start here to understand how services work together:

```bash
# 1. Create environment file
cat > .env << EOF
SARVAM_API_KEY=your-key-here
GROQ_API_KEY=your-key-here
HUME_API_KEY=your-key-here
EOF

# 2. Start services
docker-compose up -d

# 3. Watch logs
docker-compose logs -f

# 4. Test services
curl http://localhost:8000/  # Voice backend
curl http://localhost:8002/  # ML routing
curl http://localhost:3000/  # Signaling server
open http://localhost        # Admin dashboard

# 5. Stop services
docker-compose down
```

**Learning Goals:**
- Understand service dependencies
- See how containers communicate
- Debug issues in isolated environment

### Step 2: Build Docker Images

Learn containerization:

```bash
# Build each service
cd services/voice-backend
docker build -t voice-backend:v1.0 .

cd ../ml-routing
docker build -t ml-routing:v1.0 .

cd ../signaling-server
docker build -t signaling-server:v1.0 .

cd ../admin-dashboard
docker build -t admin-dashboard:v1.0 .

# List images
docker images

# Test an image
docker run -p 8000:8000 voice-backend:v1.0
```

**Learning Goals:**
- Understand Dockerfile instructions
- Multi-stage builds (admin-dashboard)
- Image layering and caching
- Container networking

### Step 3: Setup Local Kubernetes (Minikube)

Install and configure:

```bash
# Install minikube (example for Linux)
curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
sudo install minikube-linux-amd64 /usr/local/bin/minikube

# Start cluster
minikube start --cpus 4 --memory 8192 --driver=docker

# Enable addons
minikube addons enable ingress
minikube addons enable metrics-server

# Verify cluster
kubectl cluster-info
kubectl get nodes
```

**Learning Goals:**
- Kubernetes cluster architecture
- Master and worker nodes
- kubectl basics

### Step 4: Deploy to Kubernetes

Deploy step-by-step:

#### A. Create Namespace

```bash
kubectl apply -f k8s/namespace.yaml

# Verify
kubectl get namespaces
```

**Learning:** Namespaces isolate resources

#### B. Create ConfigMaps

```bash
kubectl apply -f k8s/configmaps/

# View ConfigMap
kubectl get configmap -n emergency-call-center
kubectl describe configmap app-config -n emergency-call-center
```

**Learning:** ConfigMaps store configuration data

#### C. Create Secrets

```bash
# Method 1: From file (development)
kubectl apply -f k8s/secrets/app-secrets.yaml

# Method 2: From command line (production)
kubectl create secret generic app-secrets \
  --from-literal=SARVAM_API_KEY=actual-key \
  --from-literal=GROQ_API_KEY=actual-key \
  --from-literal=DATABASE_PASSWORD=secure-password \
  --namespace=emergency-call-center

# View secrets (values are base64 encoded)
kubectl get secrets -n emergency-call-center
kubectl describe secret app-secrets -n emergency-call-center

# Decode a secret
kubectl get secret app-secrets -n emergency-call-center -o jsonpath='{.data.SARVAM_API_KEY}' | base64 --decode
```

**Learning:** Secrets store sensitive data securely

#### D. Deploy Database

```bash
kubectl apply -f k8s/deployments/postgresql.yaml
kubectl apply -f k8s/services/postgresql-svc.yaml

# Watch pod creation
kubectl get pods -n emergency-call-center -w

# Check logs
kubectl logs -f postgresql-0 -n emergency-call-center

# Verify database is ready
kubectl wait --for=condition=ready pod/postgresql-0 -n emergency-call-center --timeout=300s
```

**Learning:**
- StatefulSets for stateful applications
- Persistent volumes
- Headless services

#### E. Deploy Backend Services

```bash
# Deploy all backend services
kubectl apply -f k8s/deployments/voice-backend.yaml
kubectl apply -f k8s/deployments/ml-routing.yaml
kubectl apply -f k8s/deployments/signaling-server.yaml

# Apply their services
kubectl apply -f k8s/services/

# Check status
kubectl get deployments -n emergency-call-center
kubectl get pods -n emergency-call-center

# Describe a deployment
kubectl describe deployment voice-backend -n emergency-call-center
```

**Learning:**
- Deployments manage pods
- ReplicaSets ensure availability
- Rolling updates
- Health checks (liveness/readiness probes)

#### F. Deploy Frontend

```bash
kubectl apply -f k8s/deployments/admin-dashboard.yaml
kubectl apply -f k8s/services/admin-dashboard-svc.yaml

# Check all services
kubectl get svc -n emergency-call-center
```

#### G. Setup Ingress

```bash
kubectl apply -f k8s/ingress/ingress.yaml

# Get ingress IP
kubectl get ingress -n emergency-call-center

# For minikube, get URL
minikube service list -n emergency-call-center

# Or use tunnel
minikube tunnel
```

**Learning:**
- Ingress routes external traffic
- Path-based routing
- TLS termination

### Step 5: Verify Deployment

```bash
# Check all resources
kubectl get all -n emergency-call-center

# Check pod status in detail
kubectl get pods -n emergency-call-center -o wide

# View pod logs
kubectl logs deployment/voice-backend -n emergency-call-center --tail=50

# Follow logs
kubectl logs -f deployment/voice-backend -n emergency-call-center

# Check pod events
kubectl describe pod <pod-name> -n emergency-call-center

# Execute command in pod
kubectl exec -it <pod-name> -n emergency-call-center -- /bin/sh
```

### Step 6: Test the Application

```bash
# Port forward to test locally
kubectl port-forward svc/voice-backend 8000:8000 -n emergency-call-center
kubectl port-forward svc/admin-dashboard 8080:80 -n emergency-call-center

# Test APIs
curl http://localhost:8000/
curl http://localhost:8000/api/active-calls

# Access dashboard
open http://localhost:8080
```

### Step 7: Scaling

```bash
# Manual scaling
kubectl scale deployment voice-backend --replicas=5 -n emergency-call-center

# Watch pods scale up
kubectl get pods -n emergency-call-center -w

# Auto-scaling (HPA)
kubectl autoscale deployment voice-backend \
  --cpu-percent=70 \
  --min=2 \
  --max=10 \
  -n emergency-call-center

# View HPA
kubectl get hpa -n emergency-call-center
```

**Learning:**
- Horizontal Pod Autoscaling
- Resource requests vs limits
- Load distribution

### Step 8: Updates and Rollbacks

```bash
# Update image
kubectl set image deployment/voice-backend \
  voice-backend=voice-backend:v1.1 \
  -n emergency-call-center

# Watch rollout
kubectl rollout status deployment/voice-backend -n emergency-call-center

# View rollout history
kubectl rollout history deployment/voice-backend -n emergency-call-center

# Rollback if needed
kubectl rollout undo deployment/voice-backend -n emergency-call-center
```

**Learning:**
- Rolling updates
- Zero-downtime deployments
- Rollback strategies

## 🐛 Troubleshooting

### Pod Won't Start

```bash
# Check events
kubectl describe pod <pod-name> -n emergency-call-center

# Common issues:
# - ImagePullBackOff: Wrong image name or registry credentials
# - CrashLoopBackOff: Application error, check logs
# - Pending: Resource constraints or PVC not bound
```

### Service Not Accessible

```bash
# Check service endpoints
kubectl get endpoints -n emergency-call-center

# Check if pods are ready
kubectl get pods -n emergency-call-center

# Test service internally
kubectl run test-pod --image=busybox -n emergency-call-center -- sleep 3600
kubectl exec -it test-pod -n emergency-call-center -- wget -O- http://voice-backend:8000/
```

### Database Connection Issues

```bash
# Check PostgreSQL logs
kubectl logs postgresql-0 -n emergency-call-center

# Verify secrets are mounted
kubectl exec -it deployment/voice-backend -n emergency-call-center -- env | grep DATABASE

# Test database connection
kubectl exec -it postgresql-0 -n emergency-call-center -- psql -U postgres -d call_center_db
```

## 🔒 Production Checklist

- [ ] Use proper image registry (ECR, GCR, ACR)
- [ ] Implement sealed-secrets or external secrets
- [ ] Setup TLS certificates
- [ ] Configure resource limits on all pods
- [ ] Enable network policies
- [ ] Setup monitoring (Prometheus/Grafana)
- [ ] Setup logging (ELK/Loki)
- [ ] Configure backups for database
- [ ] Setup CI/CD pipeline
- [ ] Implement RBAC
- [ ] Enable Pod Security Policies
- [ ] Configure alerts

## 📚 Next Steps

1. Learn Helm for package management
2. Explore service mesh (Istio/Linkerd)
3. Implement GitOps (ArgoCD/Flux)
4. Study Kubernetes security
5. Learn cluster management (Rancher/OpenShift)

## 🎯 Practice Exercises

1. **Add a new microservice** - Deploy a separate translation service
2. **Implement blue-green deployment** - Zero-downtime updates
3. **Setup monitoring** - Install Prometheus and Grafana
4. **Configure autoscaling** - Test HPA with load
5. **Backup and restore** - Database disaster recovery
6. **Multi-environment** - Dev, staging, production namespaces

Happy Learning! 🚀
