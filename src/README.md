# DomainX Source Code

## 📁 Project Structure

Here’s how the files are organized in this project:
```
DomainX/
└── src/
    ├── backend/       ← Django backend (API and database)
    │   ├── DomainX/   ← Django project settings
    │   ├── api/       ← Main Django app
    ├── ├── users/       ← User app
    │   ├── manage.py
    │   └── requirements.txt
    └── frontend/      ← React frontend
        ├── public/
        ├── src/
        ├── package.json
        └── tsconfig.json
```

---

## 🚀 Getting Started

Follow these steps to run the project on your computer. You will need **two terminals** --> one for backend and one for frontend.

### 1. Prerequisites

Ensure you have these installed:

* **Python 3.8+**
* **Node.js 16+** (npm comes with it)


### 2. Generate a Classic GitHub Token
Visit:
<https://github.com/settings/tokens>

Click Generate new token → Generate new token(Classic)
Required scope:
- repo

Generate token and copy that before you go back to the code.


---
### 3. Add GitHub Token to `.env`
Create file:
`src/.env`

Add:

```
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxx
```

---

### 4. Backend Setup (Django API)

1.  Go to the backend folder:
    ```bash
    cd DomainX/src/backend
    ```

2.  Create and activate a virtual environment:
    ```bash
    python3 -m venv venv
    source venv/bin/activate        # on macOS/Linux
    # venv\Scripts\activate         # on Windows
    ```

3.  Install the required Python packages:
    ```bash
    pip install -r requirements.txt
    ```
4. Open **4 terminals**, make sure the **venv is activated in each**, and run these commands (from `DomainX/src/backend`):

   **Terminal 1 — Redis**
   ```bash
   redis-server
   ```
   **Terminal 2 — Django API (dev)**
   ```bash
   python manage_local.py dev
   ```
   **Terminal 3 — Celery worker (default queue)**
   ```bash
   python manage_local.py worker
   ```
   **Terminal 4 — Celery worker (gitstats queue)**
   ```bash
   python manage_local.py worker_gitstats
   ```


    The API should now be running at: `http://localhost:8000/`

---


## 3. Frontend Setup (React)

1.  Open a new terminal (keep the backend running) and go to the frontend folder:
    ```bash
    cd DomainX/src/frontend
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Start the frontend:
    ```bash
    npm start
    # OR 
    npm run dev
    ```
    The frontend application should open in your browser automatically at: `http://localhost:3000/`


## Finally Create Required Metrics  
 To be able to see information coming from github repositories you need to create metrics with specified names.

Start backend + frontend normally, then:

1. Navigate to **Edit Metrics** page
2. Create metrics with the following names:

- Stars Count 
- Forks Count
- Watchers Count
- Open Issues Count
- Commit Count
- Branch Count
- Open PRs Count
- Text Files (SCC)
- Total Lines (SCC)
- Code Lines (SCC)
- Comment Lines (SCC)
- Blank Lines (SCC)
- GitStats Report


## Deployment (Server)
This repo is deployed with Docker Compose.

### Notes
- The `.env` file is **shared with developers** (already provided). Put it beside `docker-compose.yml`.
- Run all commands from the folder that contains `docker-compose.yml`.

---

### 1) Simple deployment 
Use this when you just pulled changes and **no new dependencies** were added.

```bash
git pull
docker compose up -d --force-recreate
```
verify
```
docker compose ps

docker compose logs --tail=200 backend
```
### 2) Deployment with database changes 
Use this when backend code includes **model changes / migrations**.
``` 
git pull

docker compose up -d --force-recreate backend

docker compose exec backend python manage.py migrate
```
### 3) Only Backend Changed
#### - no dependencies
```
git pull

docker compose up -d --no-deps --force-recreate backend
```
#### - with dependencies
```
git pull

docker compose build backend celery celery_gitstats
docker compose up -d --no-deps --force-recreate backend celery celery_gitstats
```
### 4) Only Frontend Changed
```
git pull

docker compose build web

docker compose up -d --no-deps --force-recreate web
```
### 5) Backend + Frontend Changed (Without Disturbing Celery+Redis tasks already running) 
```
git pull

docker compose build backend web

docker compose up -d --no-deps --force-recreate backend web
```
### 6) Full Refresh
```
git pull
docker compose down
docker compose build
docker compose up -d
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py collectstatic --noinput
```

### 7) Restart Celery/Redis
#### Restart workers (celery)
```
docker compose up -d --force-recreate celery celery_gitstats
```
#### Restart redis
```
docker compose up -d --force-recreate redis
```
## Testing Fixtures
To populate local database with mock data, a test_db fixture is provided. To apply the fixture, do the following steps:
1. Activate the virtual environment under src/backend (see above for instructions)
2. Run migrations:
```bash
python manage_local.py migrate
```
3. Load the fixture
```bash 
python manage_local.py loaddata test_db
```

If there are any errors, delete the db.sqlite3 file and rerun migrations and loaddata