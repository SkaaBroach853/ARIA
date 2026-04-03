import os
from dotenv import load_dotenv

load_dotenv()

OLLAMA_HOST = os.getenv('OLLAMA_HOST', 'http://192.168.1.X:11434')
OLLAMA_MODEL = os.getenv('OLLAMA_MODEL', 'llama3.1:8b')
SECRET_KEY = os.getenv('SECRET_KEY', 'cyberguard-secret-2025')
IP_API_URL = os.getenv('IP_API_URL', 'http://ip-api.com/json')
IP_API_BATCH_URL = os.getenv('IP_API_BATCH_URL', 'http://ip-api.com/batch')
DATABASE_PATH = os.getenv('DATABASE_PATH', 'cyberguard.db')
LOG_RETENTION_HOURS = int(os.getenv('LOG_RETENTION_HOURS', 168))
FLASK_PORT = int(os.getenv('FLASK_PORT', 5000))