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

