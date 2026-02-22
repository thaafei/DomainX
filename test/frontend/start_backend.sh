#!/bin/bash
set -e

cd ../../

# create venv if it doesn't exist
if [ ! -d ".venv" ]; then
  python -m venv .venv
fi

# activate venv
source .venv/bin/activate

cd src/backend

# install dependencies
pip install -r requirements.txt

# run migrations
python manage.py migrate

# start server
python manage.py runserver 8000