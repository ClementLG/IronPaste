# ironpaste/app.py

import os
import string
import random
from datetime import datetime, timedelta, timezone
from flask import Flask, render_template, request, jsonify, abort
from database import db, Paste

app = Flask(__name__)
db_path = os.path.join(os.path.abspath(os.path.dirname(__file__)), 'pastes.db')
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

def generate_id(length=8):
    """Generates a random, unique alphanumeric ID for a paste."""
    chars = string.ascii_lowercase + string.digits
    while True:
        paste_id = ''.join(random.choice(chars) for _ in range(length))
        if not Paste.query.get(paste_id):
            return paste_id

@app.route('/')
def index():
    """Serves the main page for creating a new paste."""
    return render_template('index.html')

@app.route('/create', methods=['POST'])
def create_paste():
    """API endpoint to create a new paste."""
    data = request.get_json()
    if not data or 'content' not in data:
        abort(400, "Missing content.")

    new_paste = Paste(id=generate_id())
    new_paste.encrypted_content = data.get('content')
    new_paste.is_encrypted = data.get('isEncrypted', False)

    expires_in_seconds = data.get('expiration')
    if expires_in_seconds:
        try:
            expires_at_dt = datetime.now(timezone.utc) + timedelta(seconds=int(expires_in_seconds))
            new_paste.expires_at = expires_at_dt
        except (ValueError, TypeError):
            pass
            
    db.session.add(new_paste)
    db.session.commit()
    
    return jsonify({'id': new_paste.id})

@app.route('/<paste_id>')
def view_paste_page(paste_id):
    """Serves the page to view a paste."""
    paste = Paste.query.get(paste_id)
    if not paste:
        abort(404)

    if paste.expires_at:
        expires_at_aware = paste.expires_at.replace(tzinfo=timezone.utc)
        if expires_at_aware < datetime.now(timezone.utc):
            db.session.delete(paste)
            db.session.commit()
            abort(404, "This paste has expired and was deleted.")

    return render_template('view.html', paste_id=paste_id)

@app.route('/api/get/<paste_id>')
def get_paste_data(paste_id):
    """API endpoint to fetch the raw paste data."""
    paste = Paste.query.get_or_404(paste_id)

    if paste.expires_at:
        expires_at_aware = paste.expires_at.replace(tzinfo=timezone.utc)
        if expires_at_aware < datetime.now(timezone.utc):
            db.session.delete(paste)
            db.session.commit()
            abort(404)
    
    return jsonify({
        'content': paste.encrypted_content,
        'is_encrypted': paste.is_encrypted
    })

@app.cli.command("init-db")
def init_db_command():
    """CLI command to create the database tables."""
    db.create_all()
    print("✅ Initialized the database.")

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)