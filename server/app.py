from flask_cors import CORS

from convert import create_app

if __name__ == '__main__':
    app = create_app()
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    app.config['CORS_HEADERS'] = 'Content-Type'
    app.run(debug=True)
