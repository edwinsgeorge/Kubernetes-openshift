# 🚀 Quick Start Guide for DevOps

**Emergency Call Center - Kubernetes Deployment**

## 📦 What You Have

A complete K8s-ready microservices project with:
- ✅ 4 Dockerfiles (all services containerized)
- ✅ Full K8s manifests (deployments, services, ingress)
- ✅ Docker Compose for local testing
- ✅ Database schema and migrations
- ✅ Complete documentation

## ⚡ 3-Minute Local Test

```bash
cd emergency-call-center-k8s

# 1. Copy and edit environment file
cp .env.example .env
nano .env  # Add your API keys

# 2. Start everything
docker-compose up -d

# 3. Check status
docker-compose ps

# 4. View logs
docker-compose logs -f

# Access:
# - Admin Dashboard: http://localhost
# - Voice API: http://localhost:8000
# - ML Routing: http://localhost:8002
```

## 🎯 Deploy to Kubernetes (10 Steps)

```bash
# 1. Create namespace
kubectl apply -f k8s/namespace.yaml

# 2. Create secrets (EDIT WITH REAL VALUES FIRST!)
kubectl create secret generic app-secrets \
  --from-literal=SARVAM_API_KEY=your-key \
  --from-literal=GROQ_API_KEY=your-key \
  --from-literal=DATABASE_PASSWORD=secure-pass \
  --namespace=emergency-call-center

# 3. Apply ConfigMaps
kubectl apply -f k8s/configmaps/

# 4. Deploy Database
kubectl apply -f k8s/deployments/postgresql.yaml
kubectl apply -f k8s/services/postgresql-svc.yaml

# 5. Wait for database
kubectl wait --for=condition=ready pod/postgresql-0 -n emergency-call-center --timeout=300s

# 6. Deploy all services
kubectl apply -f k8s/deployments/
kubectl apply -f k8s/services/

# 7. Deploy ingress
kubectl apply -f k8s/ingress/

# 8. Check everything
kubectl get all -n emergency-call-center

# 9. View logs
kubectl logs -f deployment/voice-backend -n emergency-call-center

# 10. Access the app
kubectl port-forward svc/admin-dashboard 8080:80 -n emergency-call-center
# Open http://localhost:8080
```

## 📁 Project Structure

```
emergency-call-center-k8s/
├── services/           # All microservices
│   ├── voice-backend/     ← Main Python AI service
│   ├── ml-routing/        ← ML routing service
│   ├── signaling-server/  ← Node.js WebRTC
│   └── admin-dashboard/   ← React UI
├── k8s/               # Kubernetes configs
│   ├── deployments/       ← Pod specifications
│   ├── services/          ← Service definitions
│   ├── configmaps/        ← Configuration
│   ├── secrets/           ← Secrets (DON'T COMMIT!)
│   └── ingress/           ← External access
├── database/          # Database schema
├── docs/             # Documentation
├── docker-compose.yml ← Local testing
└── README.md         ← Full documentation
```

## 🔧 Common Commands

### Docker Compose (Local)
```bash
docker-compose up -d         # Start all services
docker-compose down          # Stop all services
docker-compose logs -f       # View logs
docker-compose ps            # Check status
docker-compose restart       # Restart services
```

### Kubernetes
```bash
# View everything
kubectl get all -n emergency-call-center

# Logs
kubectl logs -f deployment/voice-backend -n emergency-call-center

# Shell into pod
kubectl exec -it <pod-name> -n emergency-call-center -- /bin/sh

# Scale
kubectl scale deployment voice-backend --replicas=5 -n emergency-call-center

# Update image
kubectl set image deployment/voice-backend voice-backend=new-image:v2

# Rollback
kubectl rollout undo deployment/voice-backend -n emergency-call-center
```

## 🐛 Troubleshooting

### Pod won't start?
```bash
kubectl describe pod <pod-name> -n emergency-call-center
kubectl logs <pod-name> -n emergency-call-center
```

### Service not accessible?
```bash
kubectl get endpoints -n emergency-call-center
kubectl port-forward svc/<service-name> 8080:8000 -n emergency-call-center
```

### Database issues?
```bash
kubectl exec -it postgresql-0 -n emergency-call-center -- psql -U postgres -d call_center_db
```

## 📚 Learn More

- **Full Guide**: See `DEPLOYMENT.md` for detailed steps
- **Migration**: See `MIGRATION_GUIDE.md` to move existing code
- **Main README**: See `README.md` for architecture overview

## 🎓 Learning Path

1. ✅ Start with Docker Compose (understand services)
2. ✅ Learn Kubernetes basics (pods, services, deployments)
3. ✅ Deploy to local K8s (minikube/kind)
4. ✅ Practice scaling and updates
5. ✅ Deploy to cloud (GKE/EKS/AKS)

## 🔒 Security Checklist

- [ ] Never commit `.env` or real secrets
- [ ] Use proper secrets management (sealed-secrets)
- [ ] Enable TLS/HTTPS
- [ ] Set resource limits
- [ ] Use network policies
- [ ] Scan images for vulnerabilities

## 🎯 Your First Task

```bash
# Test locally first
cd emergency-call-center-k8s
docker-compose up -d
docker-compose ps

# If all green, you're ready for K8s! 🚀
```

---

**Questions?** Check the full documentation in `docs/` folder.

**Ready to deploy?** Follow `DEPLOYMENT.md` step-by-step.

Good luck with your K8s learning journey! 🎉
