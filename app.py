# ironpaste/app.py

import os
import string
import random
from datetime import datetime, timedelta, timezone
from flask import Flask, render_template, request, jsonify, abort
from flask_talisman import Talisman
from database import db, Paste
from config import config_by_name

def create_app(config_name='default'):
    """Create and configure an instance of the Flask application."""
    app = Flask(__name__)
    app.config.from_object(config_by_name[config_name])
    
    db.init_app(app)

    # Disable HTTPS forcing in development for Talisman
    if app.config['DEBUG']:
        Talisman(app, force_https=False)
    else:
        Talisman(app)

    return app

app = create_app(os.getenv('FLASK_CONFIG') or 'default')

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
    new_paste.max_reads = data.get('maxReads')

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
    return render_template('view.html', paste_id=paste_id)

@app.route('/api/get/<paste_id>')
def get_paste_data(paste_id):
    """API endpoint to fetch the raw paste data and apply expiration logic."""
    paste = Paste.query.get_or_404(paste_id)

    # 1. Check time-based expiration
    if paste.expires_at and paste.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        db.session.delete(paste)
        db.session.commit()
        abort(404)
    
    # 2. Check read-based expiration
    if paste.max_reads is not None and paste.read_count >= paste.max_reads:
        db.session.delete(paste)
        db.session.commit()
        abort(404)

    # If valid, prepare the content to be returned
    content_to_return = {
        'content': paste.encrypted_content,
        'is_encrypted': paste.is_encrypted
    }

    # 3. Increment read count or delete if it's the final read
    if paste.max_reads is not None:
        if paste.read_count + 1 >= paste.max_reads:
            db.session.delete(paste)
        else:
            paste.read_count += 1
    
    db.session.commit()

    return jsonify(content_to_return)

@app.errorhandler(400)
def bad_request_error(error):
    """Serves the 400 error page."""
    return render_template('400.html'), 400

@app.errorhandler(404)
def not_found_error(error):
    """Serves the 404 error page."""
    return render_template('404.html'), 404

@app.errorhandler(500)
def internal_error(error):
    """Serves the 500 error page."""
    db.session.rollback()
    return render_template('500.html'), 500

@app.cli.command("init-db")
def init_db_command():
    """CLI command to create the database tables."""
    db.create_all()
    print("✅ Initialized the database.")

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run()