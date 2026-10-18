# 🚀 RouteWise Production Deployment Guide

This guide details how to deploy RouteWise to production cloud hosting environments:
- **Backend (FastAPI):** Hosted on [Render.com](https://render.com) (or Railway / Fly.io)
- **Frontend (React + Vite):** Hosted on [Vercel](https://vercel.com) (or Netlify)

---

## 1. Backend Deployment (Render.com)

Render provides free or low-cost Python web service hosting with automatic GitHub deployments.

### Step 1: Create a New Web Service on Render
1. Log in to [dashboard.render.com](https://dashboard.render.com) and click **"New +"** $\rightarrow$ **"Web Service"**.
2. Connect your GitHub repository: `https://github.com/SahilCoding07/smart-delivery-route-optimizer`.
3. Configure the service settings:
   - **Name:** `routewise-api`
   - **Root Directory:** `.` (leave empty or set to root)
   - **Runtime:** `Python 3`
   - **Build Command:**
     ```bash
     pip install -r backend/requirements.txt && python -m app.ml.train
     ```
   - **Start Command:**
     ```bash
     PYTHONPATH=backend uvicorn app.main:app --host 0.0.0.0 --port $PORT
     ```
4. **Environment Variables**:
   - `CITY`: `Central Delhi, New Delhi, India`
   - `USE_SYNTHETIC_GRID`: `true`
   - `DEFAULT_SPEED_KMH`: `30.0`
   - `MAX_SPEED_KMH`: `80.0`
5. Click **"Create Web Service"**.
6. Note your deployed backend URL: `https://routewise-api.onrender.com`.

---

## 2. Frontend Deployment (Vercel)

Vercel provides edge hosting with automatic continuous integration for Vite + React projects.

### Step 1: Create a New Project on Vercel
1. Log in to [vercel.com](https://vercel.com) and click **"Add New..."** $\rightarrow$ **"Project"**.
2. Import your GitHub repository: `SahilCoding07/smart-delivery-route-optimizer`.
3. In the project configuration:
   - **Framework Preset:** `Vite`
   - **Root Directory:** Edit to point to `frontend`.
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. **Environment Variables:**
   Add your deployed backend URL:
   - `VITE_API_BASE_URL`: `https://routewise-api.onrender.com/api`
5. Click **"Deploy"**.
6. Your live web dashboard will be accessible at: `https://routewise-delivery.vercel.app`.

---

## 3. Production Docker Option

To package the entire backend into a container:

```dockerfile
# backend/Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .

# Warm up model artifacts
RUN PYTHONPATH=. python app/ml/train.py

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```
