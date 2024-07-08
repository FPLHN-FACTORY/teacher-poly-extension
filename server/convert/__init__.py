from flask import Flask

from .converter.controller import converter


def create_app():
    app = Flask(__name__)
    app.register_blueprint(converter)
    return app
