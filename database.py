# ironpaste/database.py

from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class Paste(db.Model):
    """
    Represents a paste in the database.
    """
    __tablename__ = 'pastes'

    id = db.Column(db.String(8), primary_key=True)
    encrypted_content = db.Column(db.Text, nullable=False)
    is_encrypted = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime, nullable=True)
    max_reads = db.Column(db.Integer, nullable=True)
    read_count = db.Column(db.Integer, nullable=False, default=0)

    def __repr__(self):
        return f'<Paste {self.id}>'