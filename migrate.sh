#!/bin/bash

# Migration Script - Copy existing code to K8s structure
# Run this from DCL directory

set -e

echo "🚀 Starting migration to K8s structure..."

# Source and destination
SOURCE_DIR="C:/Users/athul/Desktop/DCL/DCL_SuperAdmin_Dashboard"
DEST_DIR="C:/Users/athul/Desktop/DCL/emergency-call-center-k8s"

# 1. Copy Voice Backend
echo "📦 Copying voice backend..."
mkdir -p "$DEST_DIR/services/voice-backend/app"
cp "$SOURCE_DIR/voicebot-backend/app/main.py" "$DEST_DIR/services/voice-backend/app/" 2>/dev/null || echo "main.py already exists"
cp "$SOURCE_DIR/voicebot-backend/app/requirements.txt" "$DEST_DIR/services/voice-backend/" 2>/dev/null || echo "Creating requirements.txt..."

# Create requirements.txt if it doesn't exist
cat > "$DEST_DIR/services/voice-backend/requirements.txt" << 'EOF'
fastapi==0.115.12
uvicorn==0.34.0
python-multipart==0.0.20
loguru==0.7.3
python-dotenv==1.0.0
groq==0.22.0
httpx==0.28.1
requests==2.32.3
asyncpg==0.30.0
EOF

# 2. Copy ML Routing
echo "📦 Copying ML routing service..."
mkdir -p "$DEST_DIR/services/ml-routing/models"
cp "$SOURCE_DIR/api.py" "$DEST_DIR/services/ml-routing/" 2>/dev/null || true
cp "$SOURCE_DIR/"*.pkl "$DEST_DIR/services/ml-routing/" 2>/dev/null || true
cp "$SOURCE_DIR/"*.csv "$DEST_DIR/services/ml-routing/" 2>/dev/null || true

cat > "$DEST_DIR/services/ml-routing/requirements.txt" << 'EOF'
fastapi==0.115.12
uvicorn==0.34.0
joblib
scikit-learn
pandas
numpy
EOF

# 3. Copy Signaling Server
echo "📦 Copying signaling server..."
cp "$SOURCE_DIR/backend/server.js" "$DEST_DIR/services/signaling-server/" 2>/dev/null || true
cp "$SOURCE_DIR/backend/package.json" "$DEST_DIR/services/signaling-server/" 2>/dev/null || true

# 4. Copy Admin Dashboard
echo "📦 Copying admin dashboard..."
cp -r "$SOURCE_DIR/Admin dashboard/"* "$DEST_DIR/services/admin-dashboard/" 2>/dev/null || true
rm -rf "$DEST_DIR/services/admin-dashboard/node_modules" 2>/dev/null || true

# 5. Copy Mobile App
echo "📦 Copying mobile app..."
cp -r "$SOURCE_DIR/mobile/"* "$DEST_DIR/services/mobile-app/" 2>/dev/null || true
rm -rf "$DEST_DIR/services/mobile-app/node_modules" 2>/dev/null || true

# 6. Create .env template
echo "📝 Creating .env template..."
cat > "$DEST_DIR/.env.example" << 'EOF'
# API Keys (REPLACE WITH YOUR ACTUAL KEYS)
SARVAM_API_KEY=your-sarvam-api-key
GROQ_API_KEY=your-groq-api-key
HUME_API_KEY=your-hume-api-key
X_BEARER_TOKEN=your-twitter-bearer-token

# Database
DATABASE_URL=postgresql://postgres:postgres123@postgresql:5432/call_center_db
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres123

# Service URLs (for Docker Compose)
VOICE_BACKEND_URL=http://voice-backend:8000
ML_ROUTING_URL=http://ml-routing:8002
SIGNALING_SERVER_URL=http://signaling-server:3000
EOF

echo "✅ Migration complete!"
echo ""
echo "📋 Next steps:"
echo "1. Review copied files in: $DEST_DIR"
echo "2. Create .env file: cp .env.example .env"
echo "3. Edit .env with your actual API keys"
echo "4. Test with Docker Compose: cd $DEST_DIR && docker-compose up"
echo "5. Read DEPLOYMENT.md for K8s deployment"
echo ""
echo "Happy deploying! 🚀"
