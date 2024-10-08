const SERVER_HOST = "http://localhost:5000";
const API_EXPLAIN = SERVER_HOST + "/api/explain-templ";
const API_CARE = SERVER_HOST + "/api/attend-templ";

function injectHTML() {
  const targetButton = document.querySelector(
    ".btn.btn-primary.btn-export-file"
  );

  if (!targetButton) {
    console.error("Target button not found!");
    return;
  }

  const customControlsDiv = document.createElement("div");
  customControlsDiv.style.marginTop = "10px";
  customControlsDiv.innerHTML = `
    <label for="classToExport">Danh sách lớp hiện có</label>
    <select multiple name="classToExport" id="classToExport" class="form-control"></select>
    <div style="margin-top: 10px;">
      <input type="checkbox" id="exportAllClasses" name="exportAllClasses">
      <label for="exportAllClasses">Export bao gồm cả lớp đang học</label>
    </div>
    <div style="display: flex; justify-content: center; align-items: center; margin-top: 10px;">
      <div>
        <button class="btn btn-primary btn-export-file-gt text-truncated">Tải file giải trình</button>
      </div>
      <div style="margin-left: 10px;">
        <button class="btn btn-primary btn-export-file-cs text-truncated">Tải file chăm sóc sinh viên</button>
      </div>
    </div>
  `;

  targetButton.parentNode.insertBefore(
    customControlsDiv,
    targetButton.nextSibling
  );

  const classSelect = document.getElementById("classToExport");
  const rows = document.querySelectorAll("table.table tbody tr");
  rows.forEach((row) => {
    const classCode = row.querySelector("td:nth-child(4) a").innerText;
    const className = row.querySelector("td:nth-child(2)").innerText;
    const classId = row
      .querySelector("td:nth-child(4) a")
      .getAttribute("href")
      .split("/")
      .pop();
    const option = document.createElement("option");
    option.value = classId;
    option.text = classCode + " - " + className;
    classSelect.appendChild(option);
  });

  document
    .querySelector(".btn-export-file-gt")
    .addEventListener("click", async () => {
      const selectedClassIds = Array.from(classSelect.selectedOptions).map(
        (option) => option.value
      );
      const exportAllClasses =
        document.getElementById("exportAllClasses").checked;

      if (selectedClassIds.length > 0) {
        const exportButton = document.querySelector(".btn-export-file-gt");
        exportButton.disabled = true;
        exportButton.innerText = "Đang xuất dữ liệu...";

        const allClassData = [];
        for (const classId of selectedClassIds) {
          const classCodeAndName = classSelect.querySelector(
            `option[value="${classId}"]`
          ).innerText;
          const [classCode, className] = classCodeAndName.split(" - ");
          const classData = await fetchClassData(
            classId,
            classCode,
            className,
            exportAllClasses
          );
          if (classData) {
            allClassData.push(classData);
          }
        }

        await sendDataToServer(allClassData, API_EXPLAIN);

        exportButton.disabled = false;
        exportButton.innerText = "Tải file giải trình";
        return;
      }
      alert("Please select at least one class to export data.");
    });

  document
    .querySelector(".btn-export-file-cs")
    .addEventListener("click", async () => {
      const selectedClassIds = Array.from(classSelect.selectedOptions).map(
        (option) => option.value
      );

      if (selectedClassIds.length > 0) {
        const exportButton = document.querySelector(".btn-export-file-cs");
        exportButton.disabled = true;
        exportButton.innerText = "Đang xuất dữ liệu...";

        const allAttendanceData = [];
        for (const classId of selectedClassIds) {
          const classCodeAndName = classSelect.querySelector(
            `option[value="${classId}"]`
          ).innerText;
          const [classCode, className] = classCodeAndName.split(" - ");
          const attendanceData = await fetchAttendanceData(
            classId,
            classCode,
            className
          );
          if (attendanceData) {
            allAttendanceData.push(attendanceData);
          }
        }

        await sendAttendanceDataToServer(allAttendanceData, API_CARE);

        exportButton.disabled = false;
        exportButton.innerText = "Tải file chăm sóc sinh viên";
        return;
      }
      alert("Please select at least one class to export data.");
    });
}

async function fetchClassData(classId, classCode, className, exportAllClasses) {
  const campusCode = "ph";
  const allMemberData = [];
  const allAttendanceData = [];
  const allScoreDataByStudents = [];
  const commonClassInfo = {};

  try {
    const apiMember = `https://gv.poly.edu.vn/teacher/group/get_group_member_by_id/${classId}?campus_code=${campusCode}`;
    const apiAttendance = `https://gv.poly.edu.vn/teacher/group/get_attendance_by_group_id/${classId}?campus_code=${campusCode}`;
    const apiScore = `https://gv.poly.edu.vn/teacher/group/get_grade_by_group_id/${classId}?campus_code=${campusCode}`;
    const apiCommonClassInfo = `https://gv.poly.edu.vn/teacher/group/get_by_id/${classId}?campus_code=${campusCode}`;

    const [
      memberResponse,
      attendanceResponse,
      scoreResponse,
      commonClassInfoResponse,
    ] = await Promise.all([
      fetch(apiMember),
      fetch(apiAttendance),
      fetch(apiScore),
      fetch(apiCommonClassInfo),
    ]);

    if (
      memberResponse.status === 403 ||
      attendanceResponse.status === 403 ||
      scoreResponse.status === 403 ||
      commonClassInfoResponse.status === 403
    ) {
      window.location.reload();
      return;
    }

    const [memberData, attendanceData, scoreData, commonClassData] =
      await Promise.all([
        memberResponse.json(),
        attendanceResponse.json(),
        scoreResponse.json(),
        commonClassInfoResponse.json(),
      ]);

    if (commonClassData && commonClassData.data) {
      commonClassInfo.className = commonClassData.data.group_name;
      commonClassInfo.subjectCode = commonClassData.data.psubject_code;
      commonClassInfo.skillCode = commonClassData.data.skill_code;
      commonClassInfo.subjectName = commonClassData.data.psubject_name;
    }

    if (memberData && memberData.data) {
      memberData.data.members.forEach((student) => {
        allMemberData.push({
          classId,
          classCode,
          className,
          studentId: student.id,
          studentName: student.fullname,
          studentCode: student.user_code,
          studentEmail: student.user_email,
          studentLogin: student.member_login,
          userSurname: student.user.user_surname,
          userMiddlename: student.user.user_middlename,
          userGivenname: student.user.user_givenname,
          userLogin: student.user.user_login,
          sms: student.sms,
          luot_hoc: student.luot_hoc,
        });
      });
    }

    if (
      attendanceData &&
      attendanceData.data &&
      attendanceData.data.members &&
      attendanceData.data.attendances
    ) {
      attendanceData.data.members.forEach((member) => {
        const studentId = member.id;
        const studentDetails = allMemberData.find(
          (student) => student.studentId === studentId
        );
        const attendance = member.attendance;
        let attendanceCount = 0;
        for (const session in attendance) {
          const attendanceRecord = attendanceData.data.attendances[session];
          if (attendance[session] === 1) {
            attendanceCount++;
          }
        }
        allAttendanceData.push({
          classId,
          classCode,
          studentId,
          studentCode: studentDetails ? studentDetails.studentCode : null,
          studentName: studentDetails ? studentDetails.studentName : null,
          studentEmail: studentDetails ? studentDetails.studentEmail : null,
          attendanceCount,
        });
      });
    }

    let hasAssignmentWithNullScore = false;

    if (scoreData && scoreData.data && scoreData.data.members) {
      scoreData.data.members.forEach((member) => {
        const studentId = member.id;
        const studentName = member.fullname;
        const grades = member.grades;
        const scores = Object.keys(grades).map((gradeId) => {
          const grade = grades[gradeId];
          if (grade.grade_name.includes("Assignment") && grade.point === null) {
            hasAssignmentWithNullScore = true;
          }
          return {
            gradeName: grade.grade_name,
            weight: grade.weight,
            point: grade.point,
          };
        });

        if (member.status_subject !== "1") {
          if (hasAssignmentWithNullScore) {
            allScoreDataByStudents.push({
              studentId,
              studentName,
              studentCode: member.user.user_code,
              scores,
              statusSubject: "-2",
            });

            return;
          }
          allScoreDataByStudents.push({
            studentId,
            studentName,
            studentCode: member.user.user_code,
            scores,
            statusSubject: member.status_subject,
          });
        }
      });
    }

    if (hasAssignmentWithNullScore && !exportAllClasses) {
      const confirmExport = confirm(
        `Lớp ${className} vẫn đang học vì có Assignment chưa có điểm. Bạn có muốn xuất dữ liệu không?`
      );
      if (!confirmExport) {
        return null;
      }
    }

    return {
      memberData: allMemberData,
      attendanceData: allAttendanceData,
      scoreData: allScoreDataByStudents,
      commonClassInfo,
      classCode,
      className,
    };
  } catch (error) {
    alert("Đã xảy ra lỗi khi lấy dữ liệu lớp học. Vui lòng thử lại sau.");
    console.error("Error fetching class data:", error);
  }
}

async function fetchAttendanceData(classId, classCode, className) {
  const campusCode = "ph";
  const allAttendanceData = [];
  const commonClassInfo = {};

  try {
    const apiAttendance = `https://gv.poly.edu.vn/teacher/group/get_attendance_by_group_id/${classId}?campus_code=${campusCode}`;
    const apiCommonClassInfo = `https://gv.poly.edu.vn/teacher/group/get_by_id/${classId}?campus_code=${campusCode}`;
    const apiScore = `https://gv.poly.edu.vn/teacher/group/get_grade_by_group_id/${classId}?campus_code=${campusCode}`;

    const [attendanceResponse, commonClassInfoResponse, scoreResponse] =
      await Promise.all([
        fetch(apiAttendance),
        fetch(apiCommonClassInfo),
        fetch(apiScore),
      ]);

    if (
      attendanceResponse.status === 403 ||
      commonClassInfoResponse.status === 403 ||
      scoreResponse.status === 403
    ) {
      window.location.reload();
      return;
    }

    const [attendanceData, commonClassData, scoreData] = await Promise.all([
      attendanceResponse.json(),
      commonClassInfoResponse.json(),
      scoreResponse.json(),
    ]);

    if (commonClassData && commonClassData.data) {
      commonClassInfo.className = commonClassData.data.group_name;
      commonClassInfo.subjectCode = commonClassData.data.psubject_code;
      commonClassInfo.skillCode = commonClassData.data.skill_code;
      commonClassInfo.subjectName = commonClassData.data.psubject_name;
    }

    if (
      attendanceData &&
      attendanceData.data &&
      attendanceData.data.members &&
      attendanceData.data.attendances &&
      scoreData &&
      scoreData.data &&
      scoreData.data.members
    ) {
      attendanceData.data.members.forEach((member) => {
        const studentId = member.id;
        const attendance = member.attendance;
        let attendanceCount = 0;
        for (const session in attendance) {
          if (attendance[session] === 1) {
            attendanceCount++;
          }
        }

        const statusSubject = scoreData.data.members.find(
          (student) => student.id === studentId
        ).status_subject;

        if (statusSubject !== "1") {
          allAttendanceData.push({
            class_id: classId,
            class_code: classCode,
            student_id: studentId,
            student_code: member.user.user_code,
            student_name: member.fullname,
            student_email: member.user.user_email,
            attendance_count: attendanceCount,
            status: statusSubject,
            total_session: member.total_session,
          });
        }
      });
    }

    return {
      attendanceData: allAttendanceData,
      commonClassInfo,
      classCode,
      className,
    };
  } catch (error) {
    alert("Đã xảy ra lỗi khi lấy dữ liệu lớp học. Vui lòng thử lại sau.");
    console.error("Error fetching attendance data:", error);
  }
}

async function sendDataToServer(allClassData, apiUrl) {
  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        classData: allClassData,
      }),
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.statusText}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Danh Sách Sinh Viên Trượt Môn.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    alert("Đã xảy ra lỗi khi xuất dữ liệu. Vui lòng thử lại sau.");
    console.error("Error exporting data:", error);
  }
}

async function sendAttendanceDataToServer(allAttendanceData, apiUrl) {
  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        attendanceData: allAttendanceData,
      }),
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.statusText}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Danh Sách Sinh Viên Chăm Sóc.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    alert("Đã xảy ra lỗi khi gửi dữ liệu. Vui lòng thử lại sau.");
    console.error("Error sending attendance data:", error);
  }
}

injectHTML();
