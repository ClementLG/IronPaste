# ironpaste/config.py

import os

class Config:
    """Base configuration."""
    SECRET_KEY = os.environ.get('SECRET_KEY') or os.urandom(24)
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    RANDOM_PASSWORD_LENGTH = 15
    DEBUG = False
    TESTING = False
    FORCE_HTTPS = False

class DevelopmentConfig(Config):
    """Development configuration."""
    DEBUG = True
    FORCE_HTTPS = False
    db_path = os.path.join(os.path.abspath(os.path.dirname(__file__)), 'pastes.db')
    SQLALCHEMY_DATABASE_URI = f'sqlite:///{db_path}'

class ProductionConfig(Config):
    """Production configuration."""
    # In a real production environment, you would use a more robust database
    # and set the DATABASE_URL environment variable.
    db_path = os.path.join(os.path.abspath(os.path.dirname(__file__)), 'pastes.db')
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or f'sqlite:///{db_path}'

# Dictionary to access configs by name
config_by_name = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}