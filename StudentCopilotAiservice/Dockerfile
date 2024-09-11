# Use Python 3.12 as the base image
FROM python:3.12-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
  curl \
  git \
  git-lfs \
  && rm -rf /var/lib/apt/lists/*

# Create and switch to a non-root user
RUN useradd -m appuser
USER appuser

# Create and activate virtual environment
ENV VIRTUAL_ENV=/home/appuser/venv
RUN python -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

# Install Python dependencies
COPY --chown=appuser:appuser requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project
COPY --chown=appuser:appuser ./code /app/code

# Set the default command to run the FastAPI application
CMD ["uvicorn", "code.MainController:app", "--host", "0.0.0.0", "--port", "8000"]

