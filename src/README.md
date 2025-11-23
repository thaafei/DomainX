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

### 2. Backend Setup (Django API)

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
#### Before continuing, please scroll to the POC SETUP section (at the end of this README) and complete your local setup. The README is currently up-to-date for the POC. Once you finish that setup, return here and continue with the instructions below.
4.  Run migrations and start the server:
    ```bash
    python manage.py migrate
    python manage.py runserver
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

## ⚠️ Proof-of-Concept (POC) Local Setup  
*This section is only for the current prototype.  
Domain IDs and metric names will be replaced once the app is fully implemented.*
### 1. Create a temporary Domain (Local-only)

Open the Django shell:

```bash
cd DomainX/src/backend
python manage.py shell
```
Run Following Code inside shell:
```bash
from api.models import Domain
d = Domain.objects.create(
    Domain_Name="POC Domain",
    Description="Temporary domain for POC testing"
)
print(d.Domain_ID)
```
Copy the printed Domain ID.
You will use it in the frontend.
---
### 2. Update DOMAIN_ID in Frontend Files

In each file below, replace the placeholder:
```
const DOMAIN_ID = "dd8....";
```

Files:

`frontend/src/pages/Libraries.tsx`
`frontend/src/pages/ComparisonTool.tsx`
`frontend/src/pages/Edit.tsx`
`frontend/src/pages/Visualize.tsx`


Replace `"dd8...."` with your real local Domain ID.

⚠️ This is temporary (only for POC).

---
### 3. Generate a Classic GitHub Token
Visit:
<https://github.com/settings/tokens>

Click Generate new token → Generate new token(Classic)
Required scope:
- repo

Generate token and copy that before you go back to the code.


---
### 4. Add GitHub Token to `.env`
Create file:
`src/backend/.env`

Add:

```
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxx
```

---
## Finally Create Required Metrics  
You can go back to setup instructions and continue with that. To be able to see information coming from github repositories you need to create metrics with specified names at POC stage!!

Start backend + frontend normally, then:

1. Navigate to **Edit Metrics** page
2. Create metrics with the following names:

- Stars Count  
- Forks Count  
- Watchers Count  
- Open Issues Count  
- Commit Count  
- Branch Count  

⚠️ These specific names are needed for the GitHub api POC.