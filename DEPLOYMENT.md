# FacultyConnect — Deployment Runbook

Target: Ubuntu 22.04 VPS shared with DigiFusion + others.
Time from start to smoke test: ~30 minutes.

---

## Port map for this box

| Component | Port | Bind | Notes |
|---|---|---|---|
| Backend (Node/Express) | `5004` | `127.0.0.1` | Not exposed externally; Nginx proxies to it |
| Nginx external | `8081` | `0.0.0.0` | User-facing entry point |
| MongoDB | `27017` | `127.0.0.1` | Shared instance, new DB `facultyconnect_prod` |

Access URL after deploy: `http://<SERVER_IP>:8081`

---

## Prerequisites (already met on this box)

- Ubuntu 22.04.5 LTS
- Node.js v20 LTS
- npm 10
- PM2 v6
- Nginx 1.18
- MongoDB 7.0
- Git 2.34

No installs needed.

---

## Step 1 — Clone the repo

SSH in as `digilocal`, then:

```bash
cd ~/projects
git clone https://github.com/udayraj0101/FacultyConnect.git facultyconnect
cd facultyconnect
```

---

## Step 2 — Backend setup

### 2a. Install dependencies

```bash
cd ~/projects/facultyconnect/backend
npm ci
```

### 2b. Generate two fresh JWT secrets

```bash
node -e "console.log('ACCESS: ' + require('crypto').randomBytes(48).toString('hex'))"
node -e "console.log('REFRESH:' + require('crypto').randomBytes(48).toString('hex'))"
```

Copy both hex strings; you'll paste them into the `.env` next.

### 2c. Create `backend/.env`

```bash
nano ~/projects/facultyconnect/backend/.env
```

Paste this template, filling in the two secrets from 2b and the `<SERVER_IP>`:

```
PORT=5004
MONGODB_URI=mongodb://localhost:27017/facultyconnect_prod

# Paste the two hex strings from step 2b (48 bytes each, different values)
JWT_ACCESS_SECRET=<paste ACCESS hex here>
JWT_REFRESH_SECRET=<paste REFRESH hex here>
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=30d

# ORCID — sandbox for now; swap to production app when ready
ORCID_CLIENT_ID=
ORCID_CLIENT_SECRET=
ORCID_REDIRECT_URI=http://<SERVER_IP>:8081/v1/auth/orcid/callback
ORCID_API_BASE=https://sandbox.orcid.org
ORCID_PUBLIC_API_BASE=https://pub.sandbox.orcid.org

FRONTEND_URL=http://<SERVER_IP>:8081

# Scopus — leave blank until Elsevier key is available
ELSEVIER_API_KEY=
SCOPUS_API_BASE=https://api.elsevier.com

LOG_LEVEL=info

# Email — console for now, swap to smtp when provider is finalised
EMAIL_TRANSPORT=console
EMAIL_FROM=FacultyConnect <info@digifusion.in>
EMAIL_HOST=
EMAIL_PORT=587
EMAIL_USER=info@digifusion.in
EMAIL_PASS=

# Nightly cron jobs — safe to enable in prod
ENABLE_SCHEDULER=true
SCHEDULER_TIMEZONE=Asia/Kolkata

# Public base URL used in canonical URLs + sitemap
PUBLIC_BASE_URL=http://<SERVER_IP>:8081
```

Save (`Ctrl+O`, `Enter`, `Ctrl+X`).

### 2d. Seed initial data

Creates institutions, one Platform Admin, and three College Admin accounts:

```bash
cd ~/projects/facultyconnect/backend
npm run seed:institutions
npm run seed:platform-admin
npm run seed:demo-accounts
```

Take note of the demo passwords the seed prints — you'll share these with the lead via the credentials file.

---

## Step 3 — Frontend build

### 3a. Install dependencies

```bash
cd ~/projects/facultyconnect/frontend
npm ci
```

### 3b. Create `frontend/.env`

```bash
nano ~/projects/facultyconnect/frontend/.env
```

Paste (replace `<SERVER_IP>`):

```
VITE_API_URL=http://<SERVER_IP>:8081/v1
```

### 3c. Build

```bash
npm run build
```

This creates `frontend/dist/` — the folder Nginx will serve.

---

## Step 4 — PM2 process management

### 4a. Create the ecosystem file

```bash
nano ~/projects/facultyconnect/ecosystem.config.cjs
```

Paste:

```javascript
module.exports = {
  apps: [
    {
      name: 'facultyconnect-backend',
      cwd: '/home/digilocal/projects/facultyconnect/backend',
      script: 'server.js',
      env: {
        NODE_ENV: 'production',
      },
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '500M',
      error_file: '/home/digilocal/.pm2/logs/facultyconnect-backend-error.log',
      out_file: '/home/digilocal/.pm2/logs/facultyconnect-backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};
```

### 4b. Start under PM2

```bash
cd ~/projects/facultyconnect
pm2 start ecosystem.config.cjs
pm2 save
```

### 4c. Verify

```bash
pm2 status
pm2 logs facultyconnect-backend --lines 30
```

You should see `FacultyConnect API listening on :5004` and `MongoDB connected`.

Confirm it responds locally:

```bash
curl http://localhost:5004/health
# Expected: {"status":"ok","service":"facultyconnect-api"}
```

---

## Step 5 — Nginx configuration

### 5a. Create the server block

```bash
sudo nano /etc/nginx/sites-available/facultyconnect
```

Paste (no changes needed):

```nginx
server {
    listen 8081;
    server_name _;

    # File upload limit — CVs, CSV bulk-invite files
    client_max_body_size 5M;

    # Access + error logs (separate from other sites for easy debugging)
    access_log /var/log/nginx/facultyconnect-access.log;
    error_log  /var/log/nginx/facultyconnect-error.log;

    # Frontend static assets — served directly
    root /home/digilocal/projects/facultyconnect/frontend/dist;
    index index.html;

    # ---- Backend routes ----

    # Main API
    location /v1/ {
        proxy_pass         http://127.0.0.1:5004;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }

    # Server-side rendered public profiles (SEO)
    location /f/ {
        proxy_pass         http://127.0.0.1:5004;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }

    # XML sitemap
    location = /sitemap.xml {
        proxy_pass         http://127.0.0.1:5004;
        proxy_set_header   Host $host;
    }

    # Health check
    location = /health {
        proxy_pass         http://127.0.0.1:5004;
        proxy_set_header   Host $host;
    }

    # ---- Frontend SPA ----

    # Anything else falls through to the React SPA (client-side routing)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets aggressively
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }
}
```

### 5b. Enable + test + reload

```bash
sudo ln -s /etc/nginx/sites-available/facultyconnect /etc/nginx/sites-enabled/facultyconnect
sudo nginx -t
sudo systemctl reload nginx
```

`nginx -t` must print `syntax is ok` and `test is successful`. If not, fix errors before reload.

---

## Step 6 — Smoke test

From your local machine (or the server):

```bash
# Backend health
curl http://<SERVER_IP>:8081/health

# Public opportunities list
curl http://<SERVER_IP>:8081/v1/opportunities | head -c 200

# Sitemap (empty until a faculty enables public profile in prod)
curl http://<SERVER_IP>:8081/sitemap.xml
```

Then in the browser: **`http://<SERVER_IP>:8081`**

- Home page should load
- Sign in as the platform admin (creds from seed output)
- Sidebar should show admin console
- Try creating a College Admin via the platform admin console, then a Faculty

---

## Step 7 — What to hand off to the lead

Create a private note (WhatsApp / password manager, NOT in git) with:

```
FacultyConnect (initial live)
─────────────────────────────
URL:            http://<SERVER_IP>:8081

Platform Admin
  Email:        admin@facultyconnect.in
  Password:     PlatformAdmin@2026    (change on first login)

College Admin (IIT Madras — for demo)
  Email:        admin@iitm.ac.in
  Password:     CollegeAdmin@2026

Faculty (rich demo profile)
  Email:        ananya.krishnan@iitm.ac.in
  Password:     Faculty@2026

MongoDB:        localhost:27017 / facultyconnect_prod
PM2 process:    facultyconnect-backend (port 5004)
Nginx site:     /etc/nginx/sites-available/facultyconnect
Logs:           pm2 logs facultyconnect-backend
                /var/log/nginx/facultyconnect-*.log
```

---

## Common gotchas

**502 Bad Gateway** — backend crashed or Nginx can't reach it.
```bash
pm2 status
pm2 logs facultyconnect-backend --err --lines 50
```

**Can't reach `:8081` from outside** — cloud firewall (not local `ufw`) may be blocking. Check your hosting provider's dashboard (AWS Security Group, DigitalOcean Cloud Firewall, etc.). Local `ufw` is inactive on this box so it's not the issue.

**Frontend loads but API 404s** — `VITE_API_URL` in `frontend/.env` was wrong at build time. Fix the value, `npm run build` again, no PM2 restart needed (Nginx serves the fresh `dist/` immediately).

**"MongooseError: not connected" in backend logs** — the local MongoDB service isn't running. Check with `sudo systemctl status mongod` and start with `sudo systemctl start mongod` if needed.

**Emails print to PM2 logs instead of getting sent** — expected. `EMAIL_TRANSPORT=console` until Resend / Workspace App Password is set up. Users can still onboard: copy the URL from `pm2 logs facultyconnect-backend | grep onboarding` and share it manually.

---

## Deploying updates later

Whenever you push new code to GitHub:

```bash
cd ~/projects/facultyconnect
git pull origin main
cd backend && npm ci && cd ..
cd frontend && npm ci && npm run build && cd ..
pm2 restart facultyconnect-backend
# No nginx reload needed unless nginx config changed
```
