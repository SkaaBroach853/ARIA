from flask_login import LoginManager, UserMixin, login_user, logout_user, current_user
from functools import wraps
from flask import jsonify
import bcrypt

# Role → allowed pages/actions
ROLE_PERMISSIONS = {
    'admin':   ['chat', 'dashboard', 'threats', 'timeline', 'logs', 'report', 'admin'],
    'analyst': ['chat', 'dashboard', 'threats', 'timeline', 'logs', 'report'],
    'manager': ['chat', 'dashboard', 'threats', 'report'],
    'viewer':  ['dashboard', 'threats'],
}

# Hardcoded users — replace with DB in production
USERS = {
    'admin':   {'id': '1', 'name': 'Admin',   'role': 'admin',   'password': bcrypt.hashpw(b'Admin@123',   bcrypt.gensalt())},
    'analyst': {'id': '2', 'name': 'Analyst', 'role': 'analyst', 'password': bcrypt.hashpw(b'Analyst@123', bcrypt.gensalt())},
    'manager': {'id': '3', 'name': 'Manager', 'role': 'manager', 'password': bcrypt.hashpw(b'Manager@123', bcrypt.gensalt())},
    'viewer':  {'id': '4', 'name': 'Viewer',  'role': 'viewer',  'password': bcrypt.hashpw(b'Viewer@123',  bcrypt.gensalt())},
}


class User(UserMixin):
    def __init__(self, username, data):
        self.id = data['id']
        self.username = username
        self.name = data['name']
        self.role = data['role']

    def has_permission(self, permission: str) -> bool:
        return permission in ROLE_PERMISSIONS.get(self.role, [])


def setup_auth(app):
    login_manager = LoginManager()
    login_manager.init_app(app)
    login_manager.login_view = None  # API returns 401, React handles redirect

    @login_manager.user_loader
    def load_user(user_id):
        for username, data in USERS.items():
            if data['id'] == user_id:
                return User(username, data)
        return None

    @login_manager.unauthorized_handler
    def unauthorized():
        return jsonify({'error': 'Unauthorized', 'code': 401}), 401

    return login_manager


def requires_permission(permission: str):
    """Decorator: checks role permission, returns 403 if denied."""
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            if not current_user.is_authenticated:
                return jsonify({'error': 'Unauthorized'}), 401
            if not current_user.has_permission(permission):
                return jsonify({'error': 'Forbidden — insufficient role', 'required': permission}), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator


def authenticate(username: str, password: str):
    """Returns User object if credentials valid, else None."""
    user_data = USERS.get(username)
    if not user_data:
        return None
    if bcrypt.checkpw(password.encode(), user_data['password']):
        return User(username, user_data)
    return None
