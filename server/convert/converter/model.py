class Member:
    def __init__(self, classId, classCode, className, studentId, studentName, studentCode, studentEmail, studentLogin,
                 userSurname, userMiddlename, userGivenname, userLogin, sms, luot_hoc):
        self.classId = classId
        self.classCode = classCode
        self.className = className
        self.studentId = studentId
        self.studentName = studentName
        self.studentCode = studentCode
        self.studentEmail = studentEmail
        self.studentLogin = studentLogin
        self.userSurname = userSurname
        self.userMiddlename = userMiddlename
        self.userGivenname = userGivenname
        self.userLogin = userLogin
        self.sms = sms
        self.luot_hoc = luot_hoc


class Attendance:
    def __init__(self, classId, classCode, studentId, session, date, status):
        self.classId = classId
        self.classCode = classCode
        self.studentId = studentId
        self.session = session
        self.date = date
        self.status = status


class ScoreDetail:
    def __init__(self, gradeName, weight, point):
        self.gradeName = gradeName
        self.weight = weight
        self.point = point


class Score:
    def __init__(self, studentId, studentCode, studentName, scores, statusSubject):
        self.studentId = studentId
        self.studentCode = studentCode
        self.studentName = studentName
        self.scores = [ScoreDetail(**score) for score in scores]
        self.statusSubject = statusSubject


class CommonClassInfo:
    def __init__(self, className, subjectCode, skillCode, subjectName):
        self.className = className
        self.subjectCode = subjectCode
        self.skillCode = skillCode
        self.subjectName = subjectName
