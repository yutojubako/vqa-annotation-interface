FROM python:3.9-slim

WORKDIR /app

# Copy the application files
COPY frontend/ /app/frontend/
COPY run.py /app/

# Install dependencies
RUN pip install --no-cache-dir argparse

# Expose the port
EXPOSE 8000

# Set the entrypoint
ENTRYPOINT ["python", "run.py", "--no-browser"]

# Default command
CMD ["--port", "8000"]
