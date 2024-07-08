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
      <select multiple name="classToExport" id="classToExport" class="form-control">
      </select>
      <div style="margin-top: 10px;">
          <button class="btn btn-primary btn-export-data">Xuất Dữ Liệu</button>
          <span class="loading-indicator" style="display: none; margin-left: 10px;">Loading...</span>
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
    .querySelector(".btn-export-data")
    .addEventListener("click", async () => {
      const selectedClassIds = Array.from(classSelect.selectedOptions).map(
        (option) => option.value
      );
      if (selectedClassIds.length > 0) {
        const exportButton = document.querySelector(".btn-export-data");
        const loadingIndicator = document.querySelector(".loading-indicator");
        exportButton.disabled = true;
        exportButton.innerText = "Đang xuất dữ liệu...";
        loadingIndicator.style.display = "inline";

        for (const classId of selectedClassIds) {
          const classCodeAndName = classSelect.querySelector(
            `option[value="${classId}"]`
          ).innerText;
          const [classCode, className] = classCodeAndName.split(" - ");
          await fetchClassData(classId, classCode, className);
        }

        exportButton.disabled = false;
        exportButton.innerText = "Xuất Dữ Liệu";
        loadingIndicator.style.display = "none";
        return;
      }
      alert("Please select at least one class to export data.");
    });
}

async function fetchClassData(classId, classCode, className) {
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
        const attendance = member.attendance;
        for (const session in attendance) {
          const attendanceRecord = attendanceData.data.attendances[session];
          allAttendanceData.push({
            classId,
            classCode,
            studentId,
            session,
            date: attendanceRecord ? attendanceRecord.day : null,
            status: attendance[session],
          });
        }
      });
    }

    if (scoreData && scoreData.data && scoreData.data.members) {
      scoreData.data.members.forEach((member) => {
        const studentId = member.id;
        const studentName = member.fullname;
        const grades = member.grades;
        const scores = Object.keys(grades).map((gradeId) => ({
          gradeName: grades[gradeId].grade_name,
          weight: grades[gradeId].weight,
          point: grades[gradeId].point,
        }));

        if (member.status_subject !== "1") {
          allScoreDataByStudents.push({
            studentId,
            studentName,
            studentCode: member.user.user_code,
            scores,
            statusSubject:
              member.status_subject === "0" ? "Chưa Đạt" : "Trượt Điểm Danh",
          });
        }
      });
    }

    sendDataToServer(
      allMemberData,
      allAttendanceData,
      allScoreDataByStudents,
      commonClassInfo,
      classCode
    );
  } catch (error) {
    alert("Đã xảy ra lỗi khi lấy dữ liệu lớp học. Vui lòng thử lại sau.");
    console.error("Error fetching class data:", error);
  }
}

async function sendDataToServer(
  allMemberData,
  allAttendanceData,
  allScoreData,
  commonClassInfo,
  classCode
) {
  try {
    const response = await fetch("http://localhost:5000/api/convert", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        memberData: allMemberData,
        attendanceData: allAttendanceData,
        scoreData: allScoreData,
        commonClassInfo,
      }),
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.statusText}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Danh_sach_${classCode}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error exporting data:", error);
  }
}

injectHTML();
