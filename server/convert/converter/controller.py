from flask import Blueprint
from flask_cors import cross_origin

from convert.converter.service import do_converter

converter = Blueprint('converter', __name__)


@converter.route('/api/convert', methods=['POST'])
@cross_origin('*')
def convert_request():
    return do_converter()
