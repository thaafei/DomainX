#!/bin/bash
set -e

cd ../../

# create venv if it doesn't exist
if [ ! -d ".venv" ]; then
  python3 -m venv .venv
fi

# activate venv
source .venv/bin/activate

cd src/backend

# install dependencies
pip install -r requirements.txt

# run migrations
python3 manage.py migrate

# start server
python3 manage.py runserver 0.0.0.0:8000