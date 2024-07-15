from flask import Blueprint
from flask_cors import cross_origin

from convert.converter.service import get_explain_file, get_care_file

converter = Blueprint('converter', __name__)


@converter.route('/api/explain-templ', methods=['POST'])
@cross_origin('*')
def get_explain_file_request():
    return get_explain_file()


@converter.route('/api/attend-templ', methods=['POST'])
@cross_origin('*')
def get_attend_file_request():
    return get_care_file()
