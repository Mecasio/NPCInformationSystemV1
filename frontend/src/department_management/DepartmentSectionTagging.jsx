import React, { useState, useEffect, useContext, useRef } from "react";
import { SettingsContext } from "../App";
import axios from "axios";
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Snackbar,
  Alert,
  Chip,
  CircularProgress,
  Tooltip,
  Checkbox,
} from "@mui/material";
import {
  Search as SearchIcon,
  PersonRemove as UnenrollIcon,
  GroupAdd as EnrollAllIcon,
  GroupRemove as UnenrollAllIcon,
} from "@mui/icons-material";
import API_BASE_URL from "../apiConfig";
import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";

const DepartmentSectionTagging = () => {
  const settings = useContext(SettingsContext);

  // ── Theme ─────────────────────────────────────────────────────────────────
  const [mainButtonColor, setMainButtonColor] = useState("#1976d2");
  const [headerColor, setHeaderColor] = useState("#1976d2");
  const [borderColor, setBorderColor] = useState("#c8d8f0");
  const [titleColor, setTitleColor] = useState("#1976d2");

  useEffect(() => {
    if (!settings) return;
    if (settings.main_button_color) setMainButtonColor(settings.main_button_color);
    if (settings.header_color) setHeaderColor(settings.header_color);
    if (settings.border_color) setBorderColor(settings.border_color);
    if (settings.title_color) setTitleColor(settings.title_color);
  }, [settings]);

  // ── Auth / access ─────────────────────────────────────────────────────────
  const [hasAccess, setHasAccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const [employeeID, setEmployeeID] = useState("");
  const pageId = 148;

  const getAuditHeaders = () => ({
    headers: {
      "x-employee-id": employeeID || localStorage.getItem("employee_id") || "",
      "x-page-id": pageId,
      "x-audit-actor-id": employeeID || localStorage.getItem("employee_id") || "",
      "x-audit-actor-role": localStorage.getItem("role") || "registrar",
    },
  });

  useEffect(() => {
    const storedRole = localStorage.getItem("role");
    const storedID = localStorage.getItem("person_id");
    const storedEmployeeID = localStorage.getItem("employee_id");

    if (storedRole && storedID) {
      setEmployeeID(storedEmployeeID);
      if (storedRole === "registrar") {
        checkAccess(storedEmployeeID);
      } else {
        window.location.href = "/login";
      }
    } else {
      window.location.href = "/login";
    }
  }, []);

  const checkAccess = async (empID) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/page_access/${empID}/${pageId}`);
      setHasAccess(res.data?.page_privilege === 1);
    } catch {
      setHasAccess(false);
    }
  };

  // ── Dropdown data ─────────────────────────────────────────────────────────
  const [departments, setDepartments] = useState([]);
  const [allCurriculums, setAllCurriculums] = useState([]);
  const [filteredCurriculums, setFilteredCurriculums] = useState([]);
  const [departmentSections, setDepartmentSections] = useState([]);
  const [schoolYears, setSchoolYears] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [yearLevels, setYearLevels] = useState([]);

  // ── FILTER SELECTIONS ────────────────────────────────────────────────────
  const [filterDepartment, setFilterDepartment] = useState("");
  const [filterCurriculum, setFilterCurriculum] = useState("");
  const [filterYearLevel, setFilterYearLevel] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterSemester, setFilterSemester] = useState("");

  // ── INSERTION SELECTIONS ─────────────────────────────────────────────────
  const [insertSection, setInsertSection] = useState("");

  // ── Load all dropdowns once on mount ─────────────────────────────────────
  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const [deptRes, currRes, secRes, yrRes, semRes, yearLevelRes, activeRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/get_department`),
          axios.get(`${API_BASE_URL}/api/applied_program`).catch(() => ({ data: [] })),
          axios.get(`${API_BASE_URL}/department_section`),
          axios.get(`${API_BASE_URL}/get_school_year`),
          axios.get(`${API_BASE_URL}/get_school_semester`),
          axios.get(`${API_BASE_URL}/get_year_level`).catch(() => ({ data: [] })),
          axios.get(`${API_BASE_URL}/active_school_year`),
        ]);

        const depts = deptRes.data || [];
        const currs = Array.isArray(currRes.data) ? currRes.data : [];
        const secs = secRes.data || [];
        const yrs = yrRes.data || [];
        const sems = semRes.data || [];
        const yearLevelList = Array.isArray(yearLevelRes.data) ? yearLevelRes.data : [];

        setDepartments(depts);
        setAllCurriculums(currs);
        setDepartmentSections(secs);
        setSchoolYears(yrs);
        setSemesters(sems);
        setYearLevels(yearLevelList);

        if (activeRes.data?.length > 0) {
          const active = activeRes.data[0];
          setFilterYear(active.year_id);
          setFilterSemester(active.semester_id);
        }

        if (depts.length > 0) {
          const firstDept = String(depts[0].dprtmnt_id ?? depts[0].id ?? "");
          setFilterDepartment(firstDept);
        }
      } catch (err) {
        console.error("Failed to fetch dropdowns:", err);
      }
    };
    fetchDropdowns();
  }, []);

  // ── Filter curriculums when department changes ────────────────────────────
  useEffect(() => {
    if (!filterDepartment) {
      setFilteredCurriculums([]);
      setFilterCurriculum("");
      return;
    }
    const filtered = allCurriculums.filter(
      (c) => String(c.dprtmnt_id) === String(filterDepartment)
    );
    setFilteredCurriculums(filtered);
    if (filtered.length > 0) {
      setFilterCurriculum(String(filtered[0].curriculum_id ?? ""));
    } else {
      setFilterCurriculum("");
    }
  }, [filterDepartment, allCurriculums]);

  // ── Filter sections when curriculum changes ───────────────────────────────
  const filteredSections = departmentSections.filter(
    (s) => String(s.curriculum_id) === String(filterCurriculum)
  );

  useEffect(() => {
    if (filteredSections.length > 0) {
      setInsertSection(String(filteredSections[0].department_section_id ?? ""));
    } else {
      setInsertSection("");
    }
  }, [filterCurriculum]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Resolve active_school_year_id ─────────────────────────────────────────
  const [activeSYID, setActiveSYID] = useState("");

  useEffect(() => {
    if (!filterYear || !filterSemester) return;
    axios
      .get(`${API_BASE_URL}/get_selecterd_year/${filterYear}/${filterSemester}`)
      .then((res) => {
        if (res.data?.length > 0) setActiveSYID(res.data[0].school_year_id);
      })
      .catch(() => { });
  }, [filterYear, filterSemester]);

  // ── Table data ────────────────────────────────────────────────────────────
  const [allCurriculumStudents, setAllCurriculumStudents] = useState([]);
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [enrolledNumbers, setEnrolledNumbers] = useState(new Set());
  // track which student numbers are currently being toggled to prevent double-clicks
  const [togglingNumbers, setTogglingNumbers] = useState(new Set());
  const latestCurriculumRequestRef = useRef(0);
  const latestEnrolledRequestRef = useRef(0);

  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);

  // ── Fetch all students under the curriculum ───────────────────────────────
  const fetchCurriculumStudents = async () => {
    const requestId = ++latestCurriculumRequestRef.current;
    try {
      const res = await axios.get(`${API_BASE_URL}/get_student_per_curriculum`, {
        params: {
          curriculum_id: filterCurriculum,
          active_school_year_id: activeSYID,
          year_level_id: filterYearLevel || undefined,
        },
      });
      if (requestId === latestCurriculumRequestRef.current) {
        setAllCurriculumStudents(Array.isArray(res.data) ? res.data : []);
      }
    } catch (err) {
      if (err.response?.status === 404) {
        if (requestId === latestCurriculumRequestRef.current) {
          setAllCurriculumStudents([]);
        }
      } else {
        throw err;
      }
    }
  };

  // ── Fetch already-tagged students ─────────────────────────────────────────
  const fetchEnrolledStudents = async () => {
    const requestId = ++latestEnrolledRequestRef.current;
    try {
      const res = await axios.get(`${API_BASE_URL}/get_student_already_tagged`, {
        params: {
          curriculum_id: filterCurriculum,
          active_school_year_id: activeSYID,
          year_level_id: filterYearLevel || undefined,
        },
      });
      const enrolled = Array.isArray(res.data) ? res.data : [];
      if (requestId === latestEnrolledRequestRef.current) {
        setEnrolledStudents(enrolled);
        setEnrolledNumbers(new Set(enrolled.map((s) => String(s.student_number))));
      }
    } catch (err) {
      if (err.response?.status === 404) {
        if (requestId === latestEnrolledRequestRef.current) {
          setEnrolledStudents([]);
          setEnrolledNumbers(new Set());
        }
      } else {
        console.error("Failed to fetch enrolled students:", err);
      }
    }
  };

  const fetchBothPanels = async () => {
    await Promise.all([fetchCurriculumStudents(), fetchEnrolledStudents()]);
  };

  const syncEnrolledState = (students) => {
    setEnrolledStudents(students);
    setEnrolledNumbers(new Set(students.map((s) => String(s.student_number))));
  };

  // ── Search ─────────────────────────────────────────────────────────────────
  const handleSearch = async () => {
    if (!filterCurriculum || !activeSYID) {
      setSnackbar({
        open: true,
        message: "Please select all filters before searching.",
        severity: "warning",
      });
      return;
    }
    setSearching(true);
    try {
      await Promise.all([fetchCurriculumStudents(), fetchEnrolledStudents()]);
      setSearched(true);
    } catch (err) {
      console.error("Search error:", err);
      setSnackbar({
        open: true,
        message: "Failed to fetch students.",
        severity: "error",
      });
    } finally {
      setSearching(false);
    }
  };

  // ── Enroll / Unenroll helpers ─────────────────────────────────────────────
  const [actionLoading, setActionLoading] = useState(false);

  const getEnrollMeta = () => ({
    curriculum_id: filterCurriculum,
    active_school_year_id: activeSYID,
    department_section_id: insertSection,
    year_level_id: filterYearLevel || undefined,
  });

  const insertSectionLabel = (() => {
    const sec = filteredSections.find(
      (s) => String(s.department_section_id) === String(insertSection)
    );
    if (!sec) return "—";
    return `${sec.program_code || ""} — ${sec.section_description || ""}`;
  })();

  const addOptimisticEnrollment = (studentNumber) => {
    const student = allCurriculumStudents.find(
      (s) => String(s.student_number) === String(studentNumber)
    );
    if (!student) return;
    const nextStudent = {
      ...student,
      department_section_id: insertSection,
      section_description: insertSectionLabel,
      section: insertSectionLabel,
    };
    setEnrolledStudents((prev) => {
      const next = [
        ...prev.filter((s) => String(s.student_number) !== String(studentNumber)),
        nextStudent,
      ];
      setEnrolledNumbers(new Set(next.map((s) => String(s.student_number))));
      return next;
    });
  };

  const removeOptimisticEnrollment = (studentNumber) => {
    setEnrolledStudents((prev) => {
      const next = prev.filter(
        (s) => String(s.student_number) !== String(studentNumber)
      );
      setEnrolledNumbers(new Set(next.map((s) => String(s.student_number))));
      return next;
    });
  };

  // ── Checkbox toggle: tag on check, untag on uncheck ──────────────────────
  const handleCheckboxToggle = async (student) => {
    if (!insertSection) {
      setSnackbar({
        open: true,
        message: "Please select a section first.",
        severity: "warning",
      });
      return;
    }

    const studentNumber = String(student.student_number);
    const isEnrolled = enrolledNumbers.has(studentNumber);

    // Prevent double-toggle while request is in flight
    if (togglingNumbers.has(studentNumber)) return;
    setTogglingNumbers((prev) => new Set(prev).add(studentNumber));

    try {
      if (isEnrolled) {
        // ── Untag ───────────────────────────────────────────────────────────
        const enrolledStudent = enrolledStudents.find(
          (s) => String(s.student_number) === studentNumber
        );
        const actualSectionId =
          enrolledStudent?.department_section_id || insertSection;

        await axios.put(
          `${API_BASE_URL}/unenrolled_student_in_section/${studentNumber}`,
          {
            curriculum_id: filterCurriculum,
            active_school_year_id: activeSYID,
            department_section_id: actualSectionId,
          },
          getAuditHeaders()
        );
        removeOptimisticEnrollment(studentNumber);
        setSnackbar({
          open: true,
          message: `Student ${studentNumber} untagged successfully.`,
          severity: "success",
        });
      } else {
        // ── Tag ─────────────────────────────────────────────────────────────
        await axios.put(
          `${API_BASE_URL}/enrolled_student_in_section/${studentNumber}`,
          getEnrollMeta(),
          getAuditHeaders()
        );
        addOptimisticEnrollment(studentNumber);
        setSnackbar({
          open: true,
          message: `Student ${studentNumber} tagged successfully.`,
          severity: "success",
        });
      }
    } catch (err) {
      setSnackbar({
        open: true,
        message: isEnrolled
          ? `Failed to untag ${studentNumber}.`
          : `Failed to tag ${studentNumber}.`,
        severity: "error",
      });
    } finally {
      setTogglingNumbers((prev) => {
        const next = new Set(prev);
        next.delete(studentNumber);
        return next;
      });
    }
  };

  // ── Enroll All ────────────────────────────────────────────────────────────
  const handleEnrollAll = async () => {
    if (!insertSection) {
      setSnackbar({
        open: true,
        message: "Please select a section before tagging.",
        severity: "warning",
      });
      return;
    }
    setActionLoading(true);
    try {
      const res = await axios.put(
        `${API_BASE_URL}/enrolled_student_in_section`,
        getEnrollMeta(),
        getAuditHeaders()
      );
      syncEnrolledState([
        ...enrolledStudents,
        ...allCurriculumStudents
          .filter((student) => !enrolledNumbers.has(String(student.student_number)))
          .map((student) => ({
            ...student,
            department_section_id: insertSection,
            section_description: insertSectionLabel,
            section: insertSectionLabel,
          })),
      ]);
      setSnackbar({
        open: true,
        message: res.data?.message || "All students tagged successfully.",
        severity: "success",
      });
      fetchBothPanels().catch((err) => {
        console.error("Background refresh after tag all failed:", err);
      });
    } catch (err) {
      setSnackbar({ open: true, message: "Tag all failed.", severity: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  // ── Unenroll All ──────────────────────────────────────────────────────────
  const handleUnenrollAll = async () => {
    if (!insertSection) {
      setSnackbar({
        open: true,
        message: "Please select a section before untagging.",
        severity: "warning",
      });
      return;
    }
    setActionLoading(true);
    try {
      const res = await axios.put(
        `${API_BASE_URL}/unenrolled_student_in_section`,
        getEnrollMeta(),
        getAuditHeaders()
      );
      syncEnrolledState([]);
      setSnackbar({
        open: true,
        message: res.data?.message || "All students untagged successfully.",
        severity: "success",
      });
      fetchBothPanels().catch((err) => {
        console.error("Background refresh after untag all failed:", err);
      });
    } catch (err) {
      setSnackbar({ open: true, message: "Untag all failed.", severity: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  // ── Unenroll Single (from right panel) ───────────────────────────────────
  const handleUnenrollSingle = async (studentNumber) => {
    const enrolledStudent = enrolledStudents.find(
      (s) => String(s.student_number) === String(studentNumber)
    );
    const actualSectionId = enrolledStudent?.department_section_id || insertSection;

    try {
      await axios.put(
        `${API_BASE_URL}/unenrolled_student_in_section/${studentNumber}`,
        {
          curriculum_id: filterCurriculum,
          active_school_year_id: activeSYID,
          department_section_id: actualSectionId,
        },
        getAuditHeaders()
      );
      removeOptimisticEnrollment(studentNumber);
      setSnackbar({
        open: true,
        message: `Student ${studentNumber} untagged successfully.`,
        severity: "success",
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: `Failed to untag ${studentNumber}.`,
        severity: "error",
      });
    }
  };

  // ── Snackbar ──────────────────────────────────────────────────────────────
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  // ── Guard ─────────────────────────────────────────────────────────────────
  if (loading || hasAccess === null)
    return <LoadingOverlay open={loading} message="Loading..." />;
  if (!hasAccess) return <Unauthorized />;

  // ── Shared table styles ───────────────────────────────────────────────────
  const thStyle = {
    backgroundColor: headerColor || "#1976d2",
    color: "#fff",
    fontWeight: 600,
    fontSize: "13px",
    padding: "10px 12px",
    border: "none",
    whiteSpace: "nowrap",
  };

  const tdStyle = {
    fontSize: "13px",
    padding: "9px 12px",
    borderBottom: `1px solid ${borderColor}`,
  };

  const canManageStudents = Boolean(filterCurriculum && insertSection && activeSYID);

  return (
    <Box
      sx={{
        height: "calc(100vh - 150px)",
        overflowY: "auto",
        paddingRight: 1,
        backgroundColor: "transparent",
        mt: 1,
        p: 2,
      }}
    >
      {/* HEADER */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          mb: 2,
        }}
      >
        <Typography
          variant="h4"
          sx={{ fontWeight: "bold", color: titleColor, fontSize: "36px" }}
        >
          DEPARTMENT SECTION TAGGING
        </Typography>
      </Box>

      <hr style={{ border: "1px solid #ccc", width: "100%" }} />
      <br />
      <br />

      <TableContainer
        component={Paper}
        sx={{ width: "100%", border: `1px solid ${borderColor}` }}
      >
        <Table>
          <TableHead sx={{ backgroundColor: settings?.header_color || "#1976d2" }}>
            <TableRow>
              <TableCell sx={{ color: "white", textAlign: "Center" }}>Student Tagged Section</TableCell>
            </TableRow>
          </TableHead>
        </Table>
      </TableContainer>

      <Paper
        elevation={0}
        sx={{ border: `1px solid ${borderColor}`, p: 2.5, mb: 2, backgroundColor: "#fff" }}
      >
        <Typography
          sx={{
            fontSize: "12px",
            fontWeight: 600,
            color: "#888",
            letterSpacing: "0.08em",
            mb: 1.5,
            textTransform: "uppercase",
          }}
        >
          Filter & Search
        </Typography>

        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "flex-end" }}>
          {/* Department */}
          <FormControl size="small" sx={{ minWidth: 200, flex: "1 1 200px" }}>
            <InputLabel>Department</InputLabel>
            <Select
              value={String(filterDepartment || "")}
              label="Department"
              onChange={(e) => setFilterDepartment(e.target.value)}
            >
              <MenuItem value="" disabled>Select Department</MenuItem>
              {departments.map((d) => {
                const val = String(d.dprtmnt_id ?? d.id ?? "");
                return (
                  <MenuItem key={val} value={val}>
                    {d.dprtmnt_name || d.name}
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>

          {/* Curriculum */}
          <FormControl size="small" sx={{ minWidth: 260, flex: "1 1 260px" }}>
            <InputLabel>Curriculum</InputLabel>
            <Select
              value={String(filterCurriculum || "")}
              label="Curriculum"
              onChange={(e) => setFilterCurriculum(e.target.value)}
              disabled={filteredCurriculums.length === 0}
            >
              <MenuItem value="" disabled>Select Curriculum</MenuItem>
              {filteredCurriculums.map((c) => {
                const val = String(c.curriculum_id ?? "");
                return (
                  <MenuItem key={val} value={val}>
                    ({c.program_code}) {c.program_description}{" "}
                    {c.major ? `- ${c.major}` : ""} [{c.year_description}]
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>

          {/* Year Level */}
          <FormControl size="small" sx={{ minWidth: 170 }}>
            <InputLabel>Year Level</InputLabel>
            <Select
              value={String(filterYearLevel || "")}
              label="Year Level"
              onChange={(e) => setFilterYearLevel(e.target.value)}
            >
              <MenuItem value="">All Year Levels</MenuItem>
              {yearLevels.map((yl) => (
                <MenuItem key={yl.year_level_id} value={String(yl.year_level_id)}>
                  {yl.year_level_description}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* School Year */}
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>School Year</InputLabel>
            <Select
              value={filterYear}
              label="School Year"
              onChange={(e) => setFilterYear(e.target.value)}
            >
              <MenuItem value="" disabled>Select Year</MenuItem>
              {schoolYears.map((yr) => (
                <MenuItem key={yr.year_id} value={yr.year_id}>
                  {yr.current_year} – {yr.next_year}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Semester */}
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Semester</InputLabel>
            <Select
              value={filterSemester}
              label="Semester"
              onChange={(e) => setFilterSemester(e.target.value)}
            >
              <MenuItem value="" disabled>Select Semester</MenuItem>
              {semesters.map((sem) => (
                <MenuItem key={sem.semester_id} value={sem.semester_id}>
                  {sem.semester_description}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Search Button */}
          <Button
            variant="contained"
            startIcon={
              searching ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <SearchIcon />
              )
            }
            disabled={searching}
            onClick={handleSearch}
            sx={{
              backgroundColor: mainButtonColor,
              color: "#fff",
              fontWeight: 600,
              height: "40px",
              px: 3,
              borderRadius: "8px",
              textTransform: "none",
              "&:hover": { backgroundColor: mainButtonColor, opacity: 0.88 },
            }}
          >
            {searching ? "Searching…" : "Search"}
          </Button>
        </Box>

        <Box sx={{ display: "flex", gap: 2, mt: 3, flexWrap: "wrap", alignItems: "flex-end" }}>
          {/* Section */}
          <FormControl size="small" sx={{ minWidth: 280, flex: "1 1 280px" }}>
            <InputLabel>Section</InputLabel>
            <Select
              value={String(insertSection || "")}
              label="Section"
              onChange={(e) => setInsertSection(e.target.value)}
              disabled={filteredSections.length === 0}
            >
              <MenuItem value="" disabled>Select Section</MenuItem>
              {filteredSections.map((s) => {
                const val = String(s.department_section_id ?? "");
                return (
                  <MenuItem key={val} value={val}>
                    {s.program_code} — {s.section_description}
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>

          {insertSection && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography sx={{ fontSize: "12px", color: "#666" }}>Selected:</Typography>
              <Chip
                label={insertSectionLabel}
                size="small"
                sx={{
                  backgroundColor: "#e3f2fd",
                  color: "#1565c0",
                  fontWeight: 600,
                  fontSize: "11px",
                  height: "24px",
                }}
              />
            </Box>
          )}
        </Box>
      </Paper>

      {/* ── Tag All / Untag All ───────────────────────────────────────────── */}
      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1.5, mb: 2, flexWrap: "wrap" }}>
        <Tooltip
          title={
            canManageStudents
              ? `Tag all students into ${insertSectionLabel}`
              : "Please complete filter and select a section first"
          }
        >
          <span>
            <Button
              variant="contained"
              startIcon={
                actionLoading ? (
                  <CircularProgress size={14} color="inherit" />
                ) : (
                  <EnrollAllIcon />
                )
              }
              disabled={actionLoading || !canManageStudents}
              onClick={handleEnrollAll}
              sx={{
                backgroundColor: mainButtonColor,
                color: "#fff",
                fontWeight: 600,
                fontSize: "12px",
                height: "36px",
                px: 2,
                borderRadius: "8px",
                textTransform: "none",
                "&:hover": { backgroundColor: mainButtonColor, opacity: 0.85 },
              }}
            >
              Tag All
            </Button>
          </span>
        </Tooltip>

        <Tooltip
          title={
            canManageStudents
              ? "Untag all students from this section"
              : "Please complete filter and select a section first"
          }
        >
          <span>
            <Button
              variant="outlined"
              startIcon={<UnenrollAllIcon />}
              disabled={actionLoading || !canManageStudents}
              onClick={handleUnenrollAll}
              sx={{
                fontWeight: 600,
                fontSize: "12px",
                height: "36px",
                px: 2,
                borderRadius: "8px",
                textTransform: "none",
                border: "2px solid #c62828",
                color: "#c62828",
                "&:hover": { backgroundColor: "#ffebee", border: "2px solid #c62828" },
              }}
            >
              Untag All
            </Button>
          </span>
        </Tooltip>
      </Box>

      {/* ── Two-panel table layout ────────────────────────────────────────── */}
      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2.5 }}>

        {/* ── LEFT: All Curriculum Students ────────────────────────────── */}
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
            <Typography fontWeight={600} fontSize="14px" color="#333">
              Curriculum Students
            </Typography>
            <Chip
              label={allCurriculumStudents.length}
              size="small"
              sx={{
                backgroundColor: "#e8f5e9",
                color: "#2e7d32",
                fontWeight: 700,
                fontSize: "11px",
                height: "20px",
              }}
            />
          </Box>

          <Paper elevation={0} sx={{ border: `1px solid ${borderColor}`, overflow: "hidden" }}>
            <TableContainer sx={{ maxHeight: 480 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    {/* Tag checkbox column */}
                    <TableCell sx={{ ...thStyle, width: "52px", textAlign: "center", border: `1px solid ${borderColor}` }}>
                      Tag
                    </TableCell>
                    {["#", "Student No.", "Student Name", "Program", "Year Level"].map((h) => (
                      <TableCell key={h} sx={{ ...thStyle, textAlign: "center", border: `1px solid ${borderColor}` }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {allCurriculumStudents.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        sx={{ textAlign: "center", py: 4, color: "#aaa", fontSize: "13px" }}
                      >
                        {searched
                          ? "No students found for this curriculum"
                          : "Select filters and search to load students"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    allCurriculumStudents.map((s, idx) => {
                      const studentNumber = String(s.student_number);
                      const isTagged = enrolledNumbers.has(studentNumber);
                      const isToggling = togglingNumbers.has(studentNumber);

                      return (
                        <TableRow
                          key={s.student_number}
                          onClick={() => {
                            if (!actionLoading && !isToggling) handleCheckboxToggle(s);
                          }}
                          sx={{
                            backgroundColor: isTagged
                              ? "#e8f5e9"                          // tagged → always green tint
                              : idx % 2 === 0 ? "#ffffff" : "lightgray",  // alternating white / light gray
                            cursor: actionLoading || isToggling ? "wait" : "pointer",
                            transition: "background-color 0.15s ease",

                          }}
                        >
                          {/* 25×25 checkbox */}
                          <TableCell
                            sx={{ ...tdStyle, textAlign: "center", width: "52px", border: `1px solid ${borderColor}` }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {isToggling ? (
                              <CircularProgress
                                size={18}
                                sx={{ color: mainButtonColor, display: "block", mx: "auto" }}
                              />
                            ) : (
                              <Checkbox
                                checked={isTagged}
                                disabled={actionLoading || !insertSection}
                                onChange={() => handleCheckboxToggle(s)}
                                sx={{
                                  p: 0,
                                  width: "35px",
                                  height: "35px",
                                  "& .MuiSvgIcon-root": { fontSize: "25px" },
                                  color: "#000",
                                  "&.Mui-checked": { color: mainButtonColor },
                                }}
                              />
                            )}
                          </TableCell>

                          <TableCell sx={{ ...tdStyle, color: "#888", border: `1px solid ${borderColor}` }}>{idx + 1}</TableCell>
                          <TableCell sx={{ ...tdStyle, border: `1px solid ${borderColor}` }}>{s.student_number}</TableCell>
                          <TableCell sx={{ ...tdStyle, border: `1px solid ${borderColor}` }}>
                            {s.last_name}, {s.first_name} {s.middle_name || ""}
                          </TableCell>
                          <TableCell sx={{ ...tdStyle, border: `1px solid ${borderColor}` }}>{s.program_code}</TableCell>
                          <TableCell sx={{ ...tdStyle, border: `1px solid ${borderColor}` }}>
                            {s.year_level_description || s.year_level}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>

        {/* ── RIGHT: Tagged Students ────────────────────────────────────── */}
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
            <Typography fontWeight={600} fontSize="14px" color="#333">
              Tagged Students
            </Typography>
            <Chip
              label={enrolledStudents.length}
              size="small"
              sx={{
                backgroundColor: "#e3f2fd",
                color: "#1565c0",
                fontWeight: 700,
                fontSize: "11px",
                height: "20px",
              }}
            />
          </Box>

          <Paper elevation={0} sx={{ border: `1px solid ${borderColor}`, overflow: "hidden" }}>
            <TableContainer sx={{ maxHeight: 480 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    {["#", "Student No.", "Student Name", "Program", "Year Level", "Section", "Action"].map((h) => (
                      <TableCell key={h} sx={{ ...thStyle, textAlign: "center", border: `1px solid ${borderColor}` }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {enrolledStudents.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        sx={{ textAlign: "center", py: 4, color: "#aaa", fontSize: "13px" }}
                      >
                        No tagged students yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    enrolledStudents.map((s, idx) => (
                      <TableRow
                        key={s.student_number}
                        sx={{ "&:hover": { backgroundColor: "#fff8e1" } }}
                      >
                        <TableCell sx={{ ...tdStyle, color: "#888", width: "36px", border: `1px solid ${borderColor}`  }}>
                          {idx + 1}
                        </TableCell>
                        <TableCell sx={{ ...tdStyle, border: `1px solid ${borderColor}` }}>{s.student_number}</TableCell>
                        <TableCell sx={{ ...tdStyle, border: `1px solid ${borderColor}` }}>
                          {s.last_name}, {s.first_name} {s.middle_name || ""}
                        </TableCell>
                        <TableCell sx={{ ...tdStyle, border: `1px solid ${borderColor}` }}>{s.program_code}</TableCell>
                        <TableCell sx={{ ...tdStyle, border: `1px solid ${borderColor}` }}>
                          {s.year_level_description || s.year_level}
                        </TableCell>
                        <TableCell sx={{ ...tdStyle, border: `1px solid ${borderColor}` }}>
                          <Chip
                            label={s.section_description || s.section || "—"}
                            size="small"
                            sx={{
                              backgroundColor: "#e3f2fd",
                              color: "#1565c0",
                              fontWeight: 600,
                              fontSize: "11px",
                              height: "22px",
                              border: "1px solid #1565c0",
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ ...tdStyle, border: `1px solid ${borderColor}` }}>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<UnenrollIcon sx={{ fontSize: "14px !important" }} />}
                            onClick={() => handleUnenrollSingle(s.student_number)}
                            sx={{
                              fontSize: "11px",
                              fontWeight: 600,
                              height: "28px",
                              px: 1.5,
                              borderRadius: "6px",
                              textTransform: "none",
                              minWidth: "unset",
                              border: "1.5px solid #c62828",
                              color: "#c62828",
                              "&:hover": {
                                backgroundColor: "#ffebee",
                                border: "1.5px solid #c62828",
                              },
                            }}
                          >
                            Untag
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
      </Box>

      {/* ── Snackbar ───────────────────────────────────────────────────────── */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3500}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
      >
        <Alert severity={snackbar.severity} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default DepartmentSectionTagging;
