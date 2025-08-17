# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Set the working directory in the container
WORKDIR /app

# Copy the dependencies file to the working directory
COPY requirements.txt .

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir gunicorn

# Copy the rest of the application's code to the working directory
COPY . .

# Expose the port the app runs on
EXPOSE 5005

# Define environment variables
ENV FLASK_APP=app.py
ENV FLASK_CONFIG=production

# Command to run the application
CMD ["gunicorn", "--bind", "0.0.0.0:5005", "app:app"]