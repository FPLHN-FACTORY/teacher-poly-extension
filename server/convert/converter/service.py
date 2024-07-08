import os
import pandas as pd
from flask import request, send_file
from openpyxl import load_workbook
from openpyxl.styles import Font, Alignment, PatternFill, Side, Border
from openpyxl.utils import get_column_letter
from openpyxl.workbook import Workbook
from convert.converter.model import Member, Attendance, Score, CommonClassInfo


def format_excel_file(file_path):
    wb = load_workbook(file_path)
    sheet = wb.active
    for column in sheet.columns:
        max_length = max((len(str(cell.value)) for cell in column if cell.value), default=0)
        sheet.column_dimensions[get_column_letter(column[0].column)].width = max_length + 2
    wb.save(file_path)


def create_template_excel(file_path, class_code, class_name, common_class_info):
    wb = Workbook()
    ws = wb.active
    ws.title = f'{class_code}'

    ws.merge_cells('A1:G1')
    ws['A1'] = "DANH SÁCH SINH VIÊN NỢ MÔN"
    ws['A1'].alignment = Alignment(horizontal="center")
    ws['A1'].font = Font(size=16, bold=True)

    ws.merge_cells('A2:G2')
    ws['A2'] = f'(Môn: {common_class_info.subjectCode} - {common_class_info.subjectName} - {class_code} - {class_name})'
    ws['A2'].alignment = Alignment(horizontal="center")
    ws['A2'].fill = PatternFill(start_color="FFA500", end_color="FFA500", fill_type="solid")

    headers = ["STT", "Mã sinh viên", "Họ tên sinh viên", "Lớp", "Email", "Lý do nợ môn", "Ghi chú"]
    for col_num, header in enumerate(headers, 1):
        cell = ws.cell(row=4, column=col_num, value=header)
        cell.font = Font(bold=True)
        cell.alignment = Alignment(horizontal="center")

    wb.save(file_path)


def adjust_column_width(ws):
    for column in ws.columns:
        max_length = max((len(str(cell.value)) for cell in column if cell.value), default=0)
        ws.column_dimensions[get_column_letter(column[0].column)].width = max_length + 2


def add_border(ws, cell_range):
    thin_border = Border(
        left=Side(style='thin'),
        right=Side(style='thin'),
        top=Side(style='thin'),
        bottom=Side(style='thin')
    )

    for row in ws[cell_range]:
        for cell in row:
            cell.border = thin_border


def do_converter():
    try:
        data = request.get_json()
        if not data:
            return {'message': 'No data provided'}, 400

        members = [Member(**member) for member in data['memberData']]
        scores = [Score(**score) for score in data['scoreData']]
        common_class_info = CommonClassInfo(**data['commonClassInfo'])

        members_df = pd.DataFrame([vars(member) for member in members])
        scores_df = pd.DataFrame([vars(score) for score in scores])

        if members_df.empty or scores_df.empty:
            return {'message': 'No member data or score data available'}, 400

        output_dir = os.path.join(os.getcwd(), 'output')
        os.makedirs(output_dir, exist_ok=True)
        local_file_path = os.path.join(output_dir, 'output.xlsx')

        create_template_excel(
            file_path=local_file_path,
            class_code=members_df['classCode'].iloc[0],
            class_name=members_df['className'].iloc[0],
            common_class_info=common_class_info
        )

        wb = load_workbook(local_file_path)
        ws = wb.active

        members_df_filtered = members_df[members_df['studentId'].isin(scores_df['studentId'])]

        for row_num, member in enumerate(members_df_filtered.itertuples(), start=1):
            student_scores = scores_df[scores_df['studentId'] == member.studentId]
            if not student_scores.empty:
                status_subject = student_scores['statusSubject'].iloc[0]
                reason_for_failing = "Chưa Đạt" if status_subject == "Chưa Đạt" else "Trượt Điểm Danh"
            else:
                reason_for_failing = "Không có dữ liệu"

            ws.append([
                row_num,
                member.studentCode,
                member.studentName,
                f"{member.classCode} - {member.className}",
                member.studentEmail,
                reason_for_failing,
                ""
            ])

        adjust_column_width(ws)

        ws.column_dimensions['A'].width = 5

        start_row = 5
        end_row = start_row + len(members_df_filtered) - 1
        add_border(ws, f'A{start_row}:G{end_row}')
        add_border(ws, 'A1:G2')
        add_border(ws, 'A4:G4')

        wb.save(local_file_path)

        if not os.path.exists(local_file_path):
            return {'message': 'Failed to save the file locally'}, 500

        return send_file(local_file_path, as_attachment=True, download_name='output.xlsx')
    except Exception as e:
        print(e)
        return {'message': str(e)}, 500
