# Migration Guide

How to move your existing code into this K8s-ready structure.

## 📦 Current vs New Structure

### Current Structure
```
DCL_SuperAdmin_Dashboard/
├── voicebot-backend/
├── backend/
├── mobile/
├── Admin dashboard/
├── api.py
└── .env
```

### New K8s-Ready Structure
```
emergency-call-center-k8s/
├── services/
│   ├── voice-backend/
│   ├── ml-routing/
│   ├── signaling-server/
│   └── admin-dashboard/
├── k8s/
├── database/
└── docs/
```

## 🔄 Step-by-Step Migration

### 1. Copy Voice Backend (Python)

```bash
# From: DCL_SuperAdmin_Dashboard/voicebot-backend/
# To: emergency-call-center-k8s/services/voice-backend/

# Copy the app folder
cp -r "C:/Users/athul/Desktop/DCL/DCL_SuperAdmin_Dashboard/voicebot-backend/app" \
      "C:/Users/athul/Desktop/DCL/emergency-call-center-k8s/services/voice-backend/"

# Copy requirements.txt
cp "C:/Users/athul/Desktop/DCL/DCL_SuperAdmin_Dashboard/voicebot-backend/app/requirements.txt" \
   "C:/Users/athul/Desktop/DCL/emergency-call-center-k8s/services/voice-backend/"
```

**Files to copy:**
- `app/main.py` (we already created unified version)
- `app/requirements.txt`

### 2. Copy ML Routing Service

```bash
# From: DCL_SuperAdmin_Dashboard/
# To: emergency-call-center-k8s/services/ml-routing/

cp "C:/Users/athul/Desktop/DCL/DCL_SuperAdmin_Dashboard/api.py" \
   "C:/Users/athul/Desktop/DCL/emergency-call-center-k8s/services/ml-routing/"

cp "C:/Users/athul/Desktop/DCL/DCL_SuperAdmin_Dashboard/"*.pkl \
   "C:/Users/athul/Desktop/DCL/emergency-call-center-k8s/services/ml-routing/"

cp "C:/Users/athul/Desktop/DCL/DCL_SuperAdmin_Dashboard/"*.csv \
   "C:/Users/athul/Desktop/DCL/emergency-call-center-k8s/services/ml-routing/"
```

**Create requirements.txt for ml-routing:**
```txt
fastapi==0.115.12
uvicorn==0.34.0
joblib
scikit-learn
pandas
```

### 3. Copy Signaling Server (Node.js)

```bash
# From: DCL_SuperAdmin_Dashboard/backend/
# To: emergency-call-center-k8s/services/signaling-server/

cp "C:/Users/athul/Desktop/DCL/DCL_SuperAdmin_Dashboard/backend/server.js" \
   "C:/Users/athul/Desktop/DCL/emergency-call-center-k8s/services/signaling-server/"

cp "C:/Users/athul/Desktop/DCL/DCL_SuperAdmin_Dashboard/backend/package.json" \
   "C:/Users/athul/Desktop/DCL/emergency-call-center-k8s/services/signaling-server/"
```

### 4. Copy Admin Dashboard (React)

```bash
# From: DCL_SuperAdmin_Dashboard/Admin dashboard/
# To: emergency-call-center-k8s/services/admin-dashboard/

# Copy entire source
cp -r "C:/Users/athul/Desktop/DCL/DCL_SuperAdmin_Dashboard/Admin dashboard/"* \
      "C:/Users/athul/Desktop/DCL/emergency-call-center-k8s/services/admin-dashboard/"

# Exclude node_modules
rm -rf "C:/Users/athul/Desktop/DCL/emergency-call-center-k8s/services/admin-dashboard/node_modules"
```

### 5. Copy Mobile App (React Native)

```bash
# From: DCL_SuperAdmin_Dashboard/mobile/
# To: emergency-call-center-k8s/services/mobile-app/

cp -r "C:/Users/athul/Desktop/DCL/DCL_SuperAdmin_Dashboard/mobile/"* \
      "C:/Users/athul/Desktop/DCL/emergency-call-center-k8s/services/mobile-app/"

# Exclude node_modules
rm -rf "C:/Users/athul/Desktop/DCL/emergency-call-center-k8s/services/mobile-app/node_modules"
```

## 🔧 Configuration Updates

### Update Environment Variables

Create `.env` in root:

```env
# API Keys
SARVAM_API_KEY=your-key-here
GROQ_API_KEY=your-key-here
HUME_API_KEY=your-key-here
X_BEARER_TOKEN=your-token-here

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/call_center_db
DATABASE_USER=postgres
DATABASE_PASSWORD=password

# Service URLs (for local development)
VOICE_BACKEND_URL=http://localhost:8000
ML_ROUTING_URL=http://localhost:8002
SIGNALING_SERVER_URL=http://localhost:3000
```

### Update Code References

#### In voice-backend/app/main.py:

```python
# Update these lines:
ROUTING_API_URL = os.getenv("ROUTING_API_URL", "http://ml-routing:8002/route-call")
# In K8s, services are accessible by their service name
```

#### In admin-dashboard/src:

Update API endpoints to use environment variables or relative paths:

```javascript
// Instead of hardcoded URLs:
// const API_URL = "http://192.168.31.30:8000"

// Use:
const API_URL = process.env.REACT_APP_API_URL || "/api/voice"
```

## 🧪 Testing After Migration

### Test with Docker Compose

```bash
cd emergency-call-center-k8s

# Build and start all services
docker-compose up --build

# In another terminal, test:
curl http://localhost:8000/
curl http://localhost:8002/
curl http://localhost:3000/
open http://localhost
```

### Common Issues

**Issue: Module not found**
```bash
# Ensure all dependencies are in requirements.txt
cd services/voice-backend
pip install -r requirements.txt
```

**Issue: Database connection failed**
```bash
# Check DATABASE_URL
echo $DATABASE_URL

# Ensure PostgreSQL is running
docker-compose ps postgresql
```

**Issue: CORS errors**
```bash
# Update CORS origins in main.py
origins = [
    "http://localhost",
    "http://localhost:3000",
    # Add your frontend URL
]
```

## ✅ Verification Checklist

- [ ] All source files copied
- [ ] Dependencies (requirements.txt, package.json) present
- [ ] Environment variables configured
- [ ] Docker builds succeed
- [ ] Docker Compose runs all services
- [ ] Database initializes correctly
- [ ] API endpoints respond
- [ ] Frontend loads and connects to backend
- [ ] No hardcoded IP addresses or ports
- [ ] .gitignore includes secrets and env files

## 🚀 Next Steps

1. Test locally with Docker Compose
2. Fix any issues
3. Build Docker images
4. Push to container registry
5. Deploy to Kubernetes
6. Test in K8s environment

## 📝 Notes

- Keep the original code as backup
- Test thoroughly before deploying to production
- Update documentation as you make changes
- Consider using environment-specific configs (dev, staging, prod)
