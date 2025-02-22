import os
from flask import Flask, render_template, request, redirect, url_for, flash, get_flashed_messages, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-here'
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{os.path.join(BASE_DIR, "database.db")}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)
login_manager = LoginManager(app)
login_manager.login_view = 'login'

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(120), nullable=False)
    timer_default = db.Column(db.Integer, default=25)
    total_study_time = db.Column(db.Integer, default=0)
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
            flash('Username already exists!')
            return redirect(url_for('signup'))
        hashed_password = generate_password_hash(password)
        new_user = User(username=username, password=hashed_password, timer_default=25, total_study_time=0)
        db.session.add(new_user)
        db.session.commit()
        flash('Signup successful! Please log in.')
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
            return redirect(url_for('dashboard'))
        flash('Invalid username or password!')
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

    total_seconds = current_user.total_study_time
    hours = total_seconds // 3600
    minutes = (total_seconds % 3600) // 60
    seconds = total_seconds % 60
    total_study_time_str = f"{hours:02d}:{minutes:02d}:{seconds:02d}"

    if not get_flashed_messages():
        flash('Good luck on your studying!')
    return render_template('dashboard.html', username=current_user.username, tasks=tasks, 
                           timer_default=current_user.timer_default, sort_option=sort_option,
                           current_date=current_date, current_time=current_time, 
                           total_study_time=total_study_time_str)

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
    flash('Task added!')
    return redirect(url_for('dashboard'))

@app.route('/delete_task/<int:task_id>', methods=['POST'])
@login_required
def delete_task(task_id):
    task = Task.query.get(task_id)
    if task and task.user_id == current_user.id:
        db.session.delete(task)
        db.session.commit()
        flash('Task deleted!')
    return redirect(url_for('dashboard'))

@app.route('/set_timer_default', methods=['POST'])
@login_required
def set_timer_default():
    custom_time = request.form.get('customTime')
    if custom_time:
        current_user.timer_default = int(custom_time)
        db.session.commit()
        flash(f'Timer default set to {custom_time} minutes!')
    return redirect(url_for('dashboard'))

@app.route('/update_study_time', methods=['POST'])
@login_required
def update_study_time():
    data = request.get_json()
    session_time = data.get('session_time', 0)
    user = User.query.get(current_user.id)
    user.total_study_time += int(session_time)  # Add 1 second at a time
    db.session.commit()
    return jsonify({'status': 'success', 'total_study_time': user.total_study_time})

@app.route('/reset_study_time', methods=['POST'])
@login_required
def reset_study_time():
    user = User.query.get(current_user.id)
    user.total_study_time = 0
    db.session.commit()
    return jsonify({'status': 'success', 'total_study_time': 0})

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('home'))

with app.app_context():
    db.create_all()

if __name__ == '__main__':
    app.run(debug=True)