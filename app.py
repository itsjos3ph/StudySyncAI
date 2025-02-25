import os
from flask import Flask, render_template, request, redirect, url_for, flash, get_flashed_messages, jsonify, session
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
import logging

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
app = Flask(__name__)
app.config['SECRET_KEY'] = os.urandom(24).hex()
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', f'sqlite:///{os.path.join(BASE_DIR, "database.db")}')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

if app.config['SQLALCHEMY_DATABASE_URI'].startswith('postgres://'):
    app.config['SQLALCHEMY_DATABASE_URI'] = app.config['SQLALCHEMY_DATABASE_URI'].replace('postgres://', 'postgresql://')

db = SQLAlchemy(app)
login_manager = LoginManager(app)
login_manager.login_view = 'login'

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    timer_default = db.Column(db.Integer, default=25)
    study_balance = db.Column(db.Integer, default=0)
    credits = db.Column(db.Integer, default=0)
    tasks = db.relationship('Task', backref='user', lazy=True)

class Task(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.String(500), nullable=True)
    due_datetime = db.Column(db.DateTime, nullable=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/signup', methods=['GET', 'POST'])
def signup():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        if User.query.filter_by(username=username).first():
            flash('That name is already in use!')
            return redirect(url_for('signup'))
        hashed_password = generate_password_hash(password)
        new_user = User(username=username, password=hashed_password, timer_default=25, study_balance=0, credits=5)
        db.session.add(new_user)
        db.session.commit()
        return redirect(url_for('login'))
    return render_template('signup.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        user = User.query.filter_by(username=username).first()
        if user and check_password_hash(user.password, password):
            login_user(user)
            logger.debug(f"User {username} logged in successfully")
            return redirect(url_for('dashboard'))
        flash('Invalid login!')
        return redirect(url_for('login'))
    return render_template('login.html')

@app.route('/dashboard', methods=['GET', 'POST'])
@login_required
def dashboard():
    sort_option = request.form.get('sort', 'off') if request.method == 'POST' else 'off'
    
    tasks_query = Task.query.filter_by(user_id=current_user.id)
    if sort_option == 'due_date':
        tasks = tasks_query.order_by(Task.due_datetime.asc()).all()
    else:
        tasks = tasks_query.all()

    now = datetime.now()
    current_date = now.strftime('%Y-%m-%d')
    current_time = now.strftime('%H:%M')

    balance_seconds = current_user.study_balance
    balance_hours = balance_seconds // 3600
    balance_minutes = (balance_seconds % 3600) // 60
    balance_seconds = balance_seconds % 60
    study_balance_str = f"{balance_hours:02d}:{balance_minutes:02d}:{balance_seconds:02d}"

    return render_template('dashboard.html', username=current_user.username, tasks=tasks, 
                           timer_default=current_user.timer_default, sort_option=sort_option,
                           current_date=current_date, current_time=current_time, 
                           study_balance=study_balance_str, credits=current_user.credits)

@app.route('/add_task', methods=['POST'])
@login_required
def add_task():
    title = request.form['title']
    description = request.form.get('description', '')
    due_date_str = request.form.get('due_date', '')
    due_time_str = request.form.get('due_time', '')
    due_datetime = None
    if due_date_str and due_time_str:
        due_datetime = datetime.strptime(f"{due_date_str} {due_time_str}", '%Y-%m-%d %H:%M')
    elif due_date_str:
        due_datetime = datetime.strptime(due_date_str, '%Y-%m-%d')
    
    new_task = Task(title=title, description=description, due_datetime=due_datetime, user_id=current_user.id)
    db.session.add(new_task)
    db.session.commit()
    return redirect(url_for('dashboard'))

@app.route('/delete_task/<int:task_id>', methods=['POST'])
@login_required
def delete_task(task_id):
    task = Task.query.get(task_id)
    if task and task.user_id == current_user.id:
        db.session.delete(task)
        db.session.commit()
    return redirect(url_for('dashboard'))

@app.route('/edit_task', methods=['POST'])
@login_required
def edit_task():
    task_id = request.form.get('task_id')
    task = Task.query.get(task_id)
    if task and task.user_id == current_user.id:
        task.title = request.form['title']
        task.description = request.form.get('description', '')
        due_date_str = request.form.get('due_date', '')
        due_time_str = request.form.get('due_time', '')
        if due_date_str and due_time_str:
            task.due_datetime = datetime.strptime(f"{due_date_str} {due_time_str}", '%Y-%m-%d %H:%M')
        elif due_date_str:
            task.due_datetime = datetime.strptime(due_date_str, '%Y-%m-%d')
        else:
            task.due_datetime = None
        db.session.commit()
    return redirect(url_for('dashboard'))

@app.route('/set_timer_default', methods=['POST'])
@login_required
def set_timer_default():
    custom_time = request.form.get('customTime')
    if custom_time:
        current_user.timer_default = int(custom_time)
        db.session.commit()
    return redirect(url_for('dashboard'))

@app.route('/update_study_time', methods=['POST'])
@login_required
def update_study_time():
    data = request.get_json()
    session_time = data.get('session_time', 0)
    user = User.query.get(current_user.id)
    user.study_balance += int(session_time)
    db.session.commit()
    return jsonify({'status': 'success', 'study_balance': user.study_balance, 'credits': user.credits})

@app.route('/convert_credits', methods=['POST'])
@login_required
def convert_credits():
    user = User.query.get(current_user.id)
    credits_to_add = user.study_balance // (25 * 60)  # 25 minutes = 1 credit
    if credits_to_add > 0:
        user.credits += credits_to_add
        user.study_balance -= credits_to_add * 25 * 60
        db.session.commit()
        return jsonify({'status': 'success', 'study_balance': user.study_balance, 'credits': user.credits})
    else:
        return jsonify({'status': 'error', 'study_balance': user.study_balance, 'credits': user.credits})

@app.route('/spend_credits', methods=['POST'])
@login_required
def spend_credits():
    data = request.get_json()
    credits_spent = data.get('credits', 0)
    user = User.query.get(current_user.id)
    if user.credits >= credits_spent:
        user.credits -= credits_spent
        db.session.commit()
        return jsonify({'status': 'success', 'credits': user.credits})
    return jsonify({'status': 'error', 'message': 'Not enough credits'})

@app.route('/reset_study_time', methods=['POST'])
@login_required
def reset_study_time():
    user = User.query.get(current_user.id)
    user.study_balance = 0  # Only reset study balance
    db.session.commit()
    return jsonify({'status': 'success', 'study_balance': 0, 'credits': user.credits})

@app.route('/break')
@login_required
def break_page():
    return render_template('break.html', credits=current_user.credits)

@app.route('/logout', methods=['GET', 'POST'])
@login_required
def logout():
    logger.debug(f"Logging out user: {current_user.username}")
    logout_user()
    session.clear()
    logger.debug("User logged out, redirecting to home")
    return redirect(url_for('home'))

with app.app_context():
    db.create_all()

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)