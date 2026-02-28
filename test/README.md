# Automated tests

The folders and files for this folder are as follows:
- Backend, contains tests related to our python backend, using Pytest and Django's tests
- Frontend, contains tests related to our React frontend

## 🚀 Testing Framework

Follow these steps to run the tests on your computer.

### Backend

1.  Create and activate a virtual environment (note we are using the same requirements.txt as the one in the backends folder if that one is activate, step 1 and 2 can be skipped):
    ```bash
    python3 -m venv venv
    source venv/bin/activate        # on macOS/Linux
    # venv\Scripts\activate         # on Windows
    ```

2.  Install the required Python packages:
    ```bash
    pip install -r src/backend/requirements.txt
    ```

3.  Run all tests
    ```bash
    pytest
    ```
    This should run all the tests under the test/backend folder
---

You can also run a single test in vscode by:
1. Ctrl + Shift + P in Vscode
2. Select Python: Configure Test
3. Select Pytest as the framework
4. Select test as the directory containing all the tests

### Frontend
1.  Navigate to the test/frontend folder

2.  Install the required package.json for playwright:
    ```bash
    npm ci
    ```

3.  Run tests
    ```bash
    npx playwright test
    ```
    This should run all the tests under the test/frontend folder
---

You can also run tests manually in terminal as headed:
1. Navigate to the test/frontend and install requirements
2. npx playwright test --project=chromium --headed

