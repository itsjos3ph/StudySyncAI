import os
from flask import Flask, render_template, request, redirect, url_for, flash
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from werkzeug.security import generate_password_hash, check_password_hash

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-here'
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{os.path.join(BASE_DIR, "database.db")}'
db = SQLAlchemy(app)
login_manager = LoginManager(app)
login_manager.login_view = 'login'

# User model with mood
class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(120), nullable=False)
    mood = db.Column(db.String(20), default="normal")  # New column for mood
    tasks = db.relationship('Task', backref='user', lazy=True)

# Task model with priority
class Task(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    priority = db.Column(db.Integer, default=0)

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
        new_user = User(username=username, password=hashed_password, mood="normal")
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

@app.route('/dashboard')
@login_required
def dashboard():
    tasks = Task.query.filter_by(user_id=current_user.id).order_by(Task.priority.desc()).all()
    return render_template('dashboard.html', username=current_user.username, tasks=tasks, mood=current_user.mood)

@app.route('/add_task', methods=['POST'])
@login_required
def add_task():
    title = request.form['title']
    new_task = Task(title=title, user_id=current_user.id)
    db.session.add(new_task)
    db.session.commit()
    prioritize_tasks(current_user.mood)  # Use saved mood
    return redirect(url_for('dashboard'))

@app.route('/delete_task/<int:task_id>', methods=['POST'])
@login_required
def delete_task(task_id):
    task = Task.query.get(task_id)
    if task and task.user_id == current_user.id:
        db.session.delete(task)
        db.session.commit()
        prioritize_tasks(current_user.mood)  # Use saved mood
    return redirect(url_for('dashboard'))

@app.route('/set_mood', methods=['POST'])
@login_required
def set_mood():
    mood = request.form.get('mood')
    print(f"Set mood to: {mood}")  # Debug
    if mood:
        current_user.mood = mood  # Save to user
        db.session.commit()
        prioritize_tasks(mood)
        flash(f"Mood set to: {mood}")
    else:
        print("No mood received!")
        flash("No mood received!")
    return redirect(url_for('dashboard'))

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('home'))

# Simple AI prioritization based on mood
def prioritize_tasks(mood="normal"):
    print(f"Prioritizing tasks for mood: {mood}")  # Debug
    tasks = Task.query.filter_by(user_id=current_user.id).all()
    for task in tasks:
        title_lower = task.title.lower()
        if mood == "stressed":
            if "urgent" in title_lower or "now" in title_lower or "sleep" in title_lower:
                task.priority = 2
            else:
                task.priority = 0
        elif mood == "tired":
            if "easy" in title_lower or "quick" in title_lower or "poop" in title_lower:
                task.priority = 1
            else:
                task.priority = 0
        else:  # normal
            task.priority = 0
        print(f"Task '{task.title}' set to priority {task.priority}")  # Debug
    db.session.commit()
    flash(f"Tasks prioritized for {mood} mood!")

# Create database
with app.app_context():
    db.create_all()

if __name__ == '__main__':
    app.run(debug=True)