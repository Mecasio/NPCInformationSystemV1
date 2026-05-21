import React, { useCallback, useEffect, useRef, useState, useContext, useMemo } from 'react';
import { SettingsContext } from "../App";
import axios from 'axios';
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
  Modal,
  Fade,
  Backdrop,
  LinearProgress,
  Snackbar,
  Alert,
  FormControl,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import API_BASE_URL from '../apiConfig';
import LoadingOverlay from '../components/LoadingOverlay';
import Unauthorized from '../components/Unauthorized';
import { postAuditEvent } from '../utils/auditEvents';

const PROGRESS_STEPS = [
  { key: 'sorting', label: 'Sorting XLSX data' },
  { key: 'processing', label: 'Processing grouped records' },
  { key: 'extracting', label: 'Extracting mapped values' },
  { key: 'saving', label: 'Saving to database' },
];

const FILTER_MENU_PROPS = {
    PaperProps: {
        sx: {
            maxHeight: 250,
            marginTop: "5px"
        },
    },
};

const IMPORT_DETAIL_ROW_HEIGHT = 46;
const IMPORT_DETAIL_OVERSCAN = 8;
const IMPORT_DETAIL_VIEWPORT_HEIGHT = 460;
const IMPORT_DETAIL_GRID_COLUMNS = "145px 130px 120px 120px 145px minmax(280px, 1fr)";
const IMPORT_DETAIL_MIN_WIDTH = 940;

const UploadEnrolledSubject = () => {
    const settings = useContext(SettingsContext);
  
    const [titleColor, setTitleColor] = useState("#000000");
    const [subtitleColor, setSubtitleColor] = useState("#555555");
    const [borderColor, setBorderColor] = useState("#000000");
    const [mainButtonColor, setMainButtonColor] = useState("#1976d2");
    const [subButtonColor, setSubButtonColor] = useState("#ffffff");
    const [stepperColor, setStepperColor] = useState("#000000");
  
    const [fetchedLogo, setFetchedLogo] = useState(null);
    const [companyName, setCompanyName] = useState("");
    const [shortTerm, setShortTerm] = useState("");
    const [campusAddress, setCampusAddress] = useState("");
    const [branches, setBranches] = useState([]);
  
    const [userID, setUserID] = useState("");
    const [user, setUser] = useState("");
    const [userRole, setUserRole] = useState("");
    const [employeeID, setEmployeeID] = useState("");
    const [hasAccess, setHasAccess] = useState(null);
    const [canCreate, setCanCreate] = useState(false);
  
    const [loading, setLoading] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [campus, setCampus] = useState("");
    const [studentUploaded, setStudentUploaded] = useState([]);
    const [totalStudentCount, setTotalStudentCount] = useState(0);
    const [selectedDepartmentFilter, setSelectedDepartmentFilter] = useState("");
    const [selectedProgramFilter, setSelectedProgramFilter] = useState("");
    const [selectedSchoolYearFilter, setSelectedSchoolYearFilter] = useState("");
    const [selectedSemesterFilter, setSelectedSemesterFilter] = useState("");
    const [selectedYearLevelFilter, setSelectedYearLevelFilter] = useState("");
    const [departmentFilters, setDepartmentFilters] = useState([]);
    const [programFilters, setProgramFilters] = useState([]);
    const [schoolYearFilters, setSchoolYearFilters] = useState([]);
    const [semesterFilters, setSemesterFilters] = useState([]);
    const [yearLevelFilters, setYearLevelFilters] = useState([]);
    const [sortOption, setSortOption] = useState("upload_desc");
    const [currentPage, setCurrentPage] = useState(1);
    const [importing, setImporting] = useState(false);

    const [progressOpen, setProgressOpen] = useState(false);
    const [progressValue, setProgressValue] = useState(0);
    const [progressStep, setProgressStep] = useState('sorting');
    const [progressMessage, setProgressMessage] = useState('Preparing import...');

    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'info',
    });
    const [skippedDialogOpen, setSkippedDialogOpen] = useState(false);
    const [skippedRows, setSkippedRows] = useState([]);
    const [importDetailsTitle, setImportDetailsTitle] = useState("Skipped Student Data");
    const [importDetailScrollTop, setImportDetailScrollTop] = useState(0);

    const progressEventSourceRef = useRef(null);
    const fileInputRef = useRef(null);
    const importDetailViewportRef = useRef(null);
    const pageId = 151;

    const getPermissionHeaders = () => ({
        "x-employee-id": employeeID || localStorage.getItem("employee_id") || "",
        "x-page-id": pageId,
        "x-audit-actor-id":
            employeeID ||
            localStorage.getItem("employee_id") ||
            localStorage.getItem("email") ||
            "unknown",
        "x-audit-actor-role": userRole || localStorage.getItem("role") || "registrar",
    });

    const filteredUploadedStudents = useMemo(() => {
        return studentUploaded.filter((row) => {
            const departmentOk =
                !selectedDepartmentFilter || String(row.dprtmnt_id) === String(selectedDepartmentFilter);
            const programOk =
                !selectedProgramFilter || String(row.curriculum_id) === String(selectedProgramFilter);
            const schoolYearOk =
                !selectedSchoolYearFilter || String(row.year_id) === String(selectedSchoolYearFilter);
            const semesterOk =
                !selectedSemesterFilter || String(row.semester_id) === String(selectedSemesterFilter);
            const yearLevelOk =
                !selectedYearLevelFilter ||
                String(row.year_level_id) === String(selectedYearLevelFilter);

            return departmentOk && programOk && schoolYearOk && semesterOk && yearLevelOk;
        });
    }, [
        studentUploaded,
        selectedDepartmentFilter,
        selectedProgramFilter,
        selectedSchoolYearFilter,
        selectedSemesterFilter,
        selectedYearLevelFilter,
    ]);

    const sortedUploadedStudents = useMemo(() => {
        const sorted = [...filteredUploadedStudents];
        if (sortOption === "lname_asc") {
            sorted.sort((a, b) =>
                String(a.last_name || "").localeCompare(String(b.last_name || ""), undefined, {
                    sensitivity: "base",
                }),
            );
        } else if (sortOption === "lname_desc") {
            sorted.sort((a, b) =>
                String(b.last_name || "").localeCompare(String(a.last_name || ""), undefined, {
                    sensitivity: "base",
                }),
            );
        } else {
            sorted.sort(
                (a, b) =>
                    new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime(),
            );
        }
        return sorted;
    }, [filteredUploadedStudents, sortOption]);

    const itemsPerPage = 10;
    const totalPages = Math.max(1, Math.ceil(sortedUploadedStudents.length / itemsPerPage));
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedUploadedStudents = sortedUploadedStudents.slice(
        startIndex,
        startIndex + itemsPerPage,
    );
    
    useEffect(() => {
        if (!settings) return;

        // 🎨 Colors
        if (settings.title_color) setTitleColor(settings.title_color);
        if (settings.subtitle_color) setSubtitleColor(settings.subtitle_color);
        if (settings.border_color) setBorderColor(settings.border_color);
        if (settings.main_button_color)
        setMainButtonColor(settings.main_button_color);
        if (settings.sub_button_color) setSubButtonColor(settings.sub_button_color); // ✅ NEW
        if (settings.stepper_color) setStepperColor(settings.stepper_color); // ✅ NEW

        // 🏫 Logo
        if (settings.logo_url) {
        setFetchedLogo(`${API_BASE_URL}${settings.logo_url}`);
        } else {
        setFetchedLogo(null);
        }

        // 🏷️ School Information
        if (settings.company_name) setCompanyName(settings.company_name);
        if (settings.short_term) setShortTerm(settings.short_term);
        if (settings.campus_address) setCampusAddress(settings.campus_address);
        if (settings?.branches) {
            try {
                const parsedBranches =
                    typeof settings.branches === "string"
                        ? JSON.parse(settings.branches)
                        : settings.branches;
                const branchList = Array.isArray(parsedBranches) ? parsedBranches : [];
                setBranches(branchList);
                setCampus((prev) => prev || String(branchList?.[0]?.id ?? ""));
            } catch (err) {
                console.error("Failed to parse branch settings:", err);
                setBranches([]);
                setCampus("");
            }
        } else {
            setBranches([]);
            setCampus("");
        }
    }, [settings]);

    useEffect(() => {
        const storedUser = localStorage.getItem("email");
        const storedRole = localStorage.getItem("role");
        const storedID = localStorage.getItem("person_id");
        const storedEmployeeID = localStorage.getItem("employee_id");

        if (storedUser && storedRole && storedID) {
            setUser(storedUser);
            setUserRole(storedRole);
            setUserID(storedID);
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

    useEffect(() => {
        fetchUploadedStudent();
    }, []);

    useEffect(() => {
        fetchUploadedStudentCount();
    }, [
        selectedDepartmentFilter,
        selectedProgramFilter,
        selectedSchoolYearFilter,
        selectedSemesterFilter,
        selectedYearLevelFilter,
    ]);

    useEffect(() => {
        const loadFilters = async () => {
            await fetchDepartments();
            await fetchSchoolYears();
            await fetchSemesters();
            await fetchYearLevels();
        };

        loadFilters();
    }, []);

    useEffect(() => {
        setCurrentPage(1);
    }, [
        selectedDepartmentFilter,
        selectedProgramFilter,
        selectedSchoolYearFilter,
        selectedSemesterFilter,
        selectedYearLevelFilter,
        sortOption,
        studentUploaded.length,
    ]);

    useEffect(() => {
        setSelectedProgramFilter("");
    }, [selectedDepartmentFilter]);

    useEffect(() => {
        if (!selectedDepartmentFilter) {
            setProgramFilters([]);
            return;
        }
        fetchPrograms(selectedDepartmentFilter);
    }, [selectedDepartmentFilter]);

    useEffect(() => {
        setSelectedSemesterFilter("");
    }, [selectedSchoolYearFilter]);

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    useEffect(() => {
        return () => {
            if (progressEventSourceRef.current) {
                progressEventSourceRef.current.close();
            }
        };
    }, []);

    useEffect(() => {
        if (!skippedDialogOpen) return;
        setImportDetailScrollTop(0);
        if (importDetailViewportRef.current) {
            importDetailViewportRef.current.scrollTop = 0;
        }
    }, [skippedDialogOpen, skippedRows.length]);

    const checkAccess = async (employeeID) => {
        try {
            const response = await axios.get(
                `${API_BASE_URL}/api/page_access/${employeeID}/${pageId}`,
            );
            if (response.data && Number(response.data.page_privilege) === 1) {
                setHasAccess(true);
                setCanCreate(Number(response.data?.can_create) === 1);
            } else {
                setHasAccess(false);
                setCanCreate(false);
            }
        } catch (error) {
            console.error("Error checking access:", error);
            setHasAccess(false);
            setCanCreate(false);
            if (error.response && error.response.data.message) {
                console.log(error.response.data.message);
            } else {
                console.log("An unexpected error occurred.");
            }
            setLoading(false);
        }
    };

    const insertAuditLog = async (eventType, details = {}) => {
        try {
            await postAuditEvent(eventType, details);
        } catch (err) {
            console.error("Error inserting audit log");
        }
    };

    const fetchUploadedStudent = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/get_uploaded_students`);
            setStudentUploaded(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error('Failed in fetching uploaded students:', err);
        }
    };

    const fetchUploadedStudentCount = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/get_uploaded_students/count`, {
                params: {
                    departmentId: selectedDepartmentFilter || undefined,
                    curriculumId: selectedProgramFilter || undefined,
                    yearId: selectedSchoolYearFilter || undefined,
                    semesterId: selectedSemesterFilter || undefined,
                    yearLevelId: selectedYearLevelFilter || undefined,
                },
            });
            setTotalStudentCount(Number(res.data?.totalStudents || 0));
        } catch (err) {
            console.error('Failed in fetching uploaded student count:', err);
            setTotalStudentCount(0);
        }
    };

    const fetchDepartments = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/get_department`);
            setDepartmentFilters(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error("Failed in fetching departments:", err);
        }
    };

    const fetchPrograms = async (departmentId) => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/applied_program/${departmentId}`);
            setProgramFilters(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error("Failed in fetching programs:", err);
            setProgramFilters([]);
        }
    };

    const fetchSchoolYears = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/get_school_year/`);
            setSchoolYearFilters(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error("Failed in fetching school years:", err);
        }
    };

    const fetchSemesters = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/get_school_semester/`);
            setSemesterFilters(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error("Failed in fetching semesters:", err);
        }
    };

    const fetchYearLevels = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/get_year_level`);
            setYearLevelFilters(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error("Failed in fetching year levels:", err);
        }
    };

    const fetchActiveSchoolYear = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/active_school_year`);
            if (Array.isArray(res.data) && res.data.length > 0) {
                const active = res.data[0];
                if (active?.year_id) setSelectedSchoolYearFilter(active.year_id);
                if (active?.semester_id) setSelectedSemesterFilter(active.semester_id);
            }
        } catch (err) {
            console.error("Failed in fetching active school year:", err);
        }
    };

    const startProgressTracking = (importId) => {
        if (progressEventSourceRef.current) {
            progressEventSourceRef.current.close();
        }

        setProgressOpen(true);
        setProgressValue(1);
        setProgressStep('sorting');
        setProgressMessage('Preparing XLSX import...');

        const eventSource = new EventSource(
            `${API_BASE_URL}/import-xlsx-into-enrolled-subject/progress/${encodeURIComponent(importId)}`,
        );
        progressEventSourceRef.current = eventSource;

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data || "{}");
                const nextProgress = Number(data.progress);

                if (!Number.isNaN(nextProgress)) {
                    setProgressValue(Math.max(0, Math.min(100, nextProgress)));
                }
                if (data.step) {
                    setProgressStep(data.step);
                }
                if (data.message) {
                    setProgressMessage(data.message);
                }
                if (data.done || data.error) {
                    eventSource.close();
                    if (progressEventSourceRef.current === eventSource) {
                        progressEventSourceRef.current = null;
                    }
                }
            } catch (error) {
                console.error("Failed to parse import progress event:", error);
            }
        };

        eventSource.onerror = () => {
            eventSource.close();
            if (progressEventSourceRef.current === eventSource) {
                progressEventSourceRef.current = null;
            }
        };
    };

    const finishProgressTracking = async (isSuccess) => {
        if (progressEventSourceRef.current) {
            progressEventSourceRef.current.close();
            progressEventSourceRef.current = null;
        }

        setProgressValue(100);
        setProgressMessage(isSuccess ? 'Import completed successfully.' : 'Import failed.');

        await new Promise((resolve) => setTimeout(resolve, 800));
        setProgressOpen(false);
    };

    const getStepState = (stepKey) => {
        const currentIndex = PROGRESS_STEPS.findIndex((step) => step.key === progressStep);
        const targetIndex = PROGRESS_STEPS.findIndex((step) => step.key === stepKey);

        if (targetIndex < currentIndex) return 'done';
        if (targetIndex === currentIndex && progressValue < 100) return 'active';
        if (progressValue === 100) return 'done';
        return 'pending';
    };

    const normalizeImportDetailRow = useCallback((item = {}) => ({
        studentNumber:
            item.studentNumber ||
            item.student_number ||
            item.student ||
            item.row ||
            "N/A",
        curriculumId:
            item.curriculumId ||
            item.curriculum_id ||
            item.active_curriculum ||
            item.programCode ||
            item.program_code ||
            "-",
        courseId:
            item.courseId ||
            item.course_id ||
            item.courseCode ||
            item.course_code ||
            "-",
        yearLevelId:
            item.yearLevelId ||
            item.year_level_id ||
            item.yearLevel ||
            item.year_level ||
            "-",
        schoolYear:
            item.schoolYear ||
            item.school_year ||
            item.activeSchoolYearId ||
            item.active_school_year_id ||
            item.curriculumYear ||
            item.curriculum_year ||
            "-",
        reason: item.reason || item.message || "No reason provided",
    }), []);

    const openImportDetails = (title, rows) => {
        setImportDetailsTitle(title);
        setSkippedRows((Array.isArray(rows) ? rows : []).map(normalizeImportDetailRow));
        setSkippedDialogOpen(true);
    };

    const normalizedSkippedRows = useMemo(
        () => skippedRows.map(normalizeImportDetailRow),
        [skippedRows, normalizeImportDetailRow],
    );

    const totalImportDetailHeight = normalizedSkippedRows.length * IMPORT_DETAIL_ROW_HEIGHT;
    const importDetailStartIndex = Math.max(
        0,
        Math.floor(importDetailScrollTop / IMPORT_DETAIL_ROW_HEIGHT) - IMPORT_DETAIL_OVERSCAN,
    );
    const importDetailVisibleCount =
        Math.ceil(IMPORT_DETAIL_VIEWPORT_HEIGHT / IMPORT_DETAIL_ROW_HEIGHT) +
        IMPORT_DETAIL_OVERSCAN * 2;
    const importDetailEndIndex = Math.min(
        normalizedSkippedRows.length,
        importDetailStartIndex + importDetailVisibleCount,
    );
    const visibleImportDetailRows = normalizedSkippedRows.slice(
        importDetailStartIndex,
        importDetailEndIndex,
    );

    const buildImportFailureDetails = (data = {}) => {
        data = data || {};
        const details = [];
        const addDetail = (studentNumber, reason, extra = {}) => {
            const safeReason = String(reason || "").trim();
            if (!safeReason) return;
            details.push({
                studentNumber: studentNumber || "Import failed",
                reason: safeReason,
                ...extra,
            });
        };

        addDetail(null, data.error || data.message || data.detail);
        if (data.detail && data.detail !== data.error && data.detail !== data.message) {
            addDetail("Reason", data.detail);
        }

        const missingCourses = Array.isArray(data.missing_courses)
            ? data.missing_courses
            : [];
        missingCourses.forEach((course) => {
            addDetail(
                course.course_code || "Missing course",
                `Course not found${course.course_description ? `: ${course.course_description}` : ""}`,
                {
                    courseCode: course.course_code,
                    courseId: course.course_id,
                },
            );
        });

        const missingCourseCodes = Array.isArray(data.missing_course_codes)
            ? data.missing_course_codes
            : [];
        missingCourseCodes.forEach((courseCode) => {
            addDetail(courseCode || "Missing course", "Course code does not exist.");
        });

        const missingCurriculums = Array.isArray(data.missingCurriculums)
            ? data.missingCurriculums
            : Array.isArray(data.missing_curriculums)
              ? data.missing_curriculums
              : [];
        missingCurriculums.forEach((curriculum) => {
            addDetail(
                curriculum.studentNumber || curriculum.student_number || "Missing curriculum",
                `Curriculum not found: ${curriculum.programCode || curriculum.program_code || "Unknown program"}${curriculum.major ? ` (${curriculum.major})` : ""}${curriculum.curriculumYear || curriculum.curriculum_year ? ` - ${curriculum.curriculumYear || curriculum.curriculum_year}` : ""}`,
                curriculum,
            );
        });

        const invalidNstpComponents = Array.isArray(data.invalid_nstp_components)
            ? data.invalid_nstp_components
            : [];
        invalidNstpComponents.forEach((item) => {
            addDetail(
                item.detected_course_code || "Invalid NSTP component",
                `Unsupported NSTP component${item.semester ? ` for ${item.semester}` : ""}.`,
            );
        });

        const skippedItems = Array.isArray(data.skippedItems) ? data.skippedItems : [];
        skippedItems.forEach((item) => {
            addDetail(
                item.studentNumber || item.student_number || "Skipped row",
                item.reason || item.message || "No reason provided",
                item,
            );
        });

        return details;
    };

    const buildMissingCurriculumDetails = (data = {}) => {
        const missingCurriculums = Array.isArray(data?.missingCurriculums)
            ? data.missingCurriculums
            : Array.isArray(data?.missing_curriculums)
              ? data.missing_curriculums
              : [];

        return missingCurriculums.map((curriculum) => ({
            studentNumber:
                curriculum.studentNumber ||
                curriculum.student_number ||
                curriculum.programCode ||
                curriculum.program_code ||
                "Missing curriculum",
            curriculumId: curriculum.curriculumId || curriculum.curriculum_id || "-",
            courseId: curriculum.courseId || curriculum.course_id || "-",
            yearLevelId: curriculum.yearLevelId || curriculum.year_level_id || "-",
            schoolYear:
                curriculum.schoolYear ||
                curriculum.school_year ||
                curriculum.curriculumYear ||
                curriculum.curriculum_year ||
                "-",
            reason: `Curriculum not found: ${curriculum.programCode || curriculum.program_code || "Unknown program"}${curriculum.major ? ` (${curriculum.major})` : ""}${curriculum.curriculumYear || curriculum.curriculum_year ? ` - ${curriculum.curriculumYear || curriculum.curriculum_year}` : ""}`,
        }));
    };

    const displayMissingCurriculum = (data = {}) => {
        const details = buildMissingCurriculumDetails(data);
        if (details.length === 0) return false;

        openImportDetails("Missing Curriculum", details);
        return true;
    };

    const showImportFailure = (data = {}, fallbackMessage = "Import failed.") => {
        data = data || {};
        const details = buildImportFailureDetails(data);
        const message =
            data.error && data.detail && data.detail !== data.error
                ? `${data.error}: ${data.detail}`
                : data.error || data.message || data.detail || fallbackMessage;

        setSnackbar({
            open: true,
            message,
            severity: 'error',
        });

        if (!displayMissingCurriculum(data) && details.length > 0) {
            openImportDetails("Import Failed Details", details);
        }
    };

    const handleImportXlsx = async () => {
        if (!canCreate) {
        setSnackbar({
            open: true,
            message: 'You do not have permission to import enrolled subjects.',
            severity: 'error',
        });
        return;
        }

        if (!selectedFile) {
        setSnackbar({
            open: true,
            message: 'Please choose an Excel file first.',
            severity: 'warning',
        });
        return;
        }

        if (!campus) {
            setSnackbar({
                open: true,
                message: 'Please select a campus first.',
                severity: 'warning',
            });
            return;
        }

        try {
        setImporting(true);
        const importId = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        startProgressTracking(importId);

        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('campus', campus);
        formData.append('import_id', importId);

        const res = await axios.post(
            `${API_BASE_URL}/import-xlsx-into-enrolled-subject`,
            formData,
            {
            headers: {
                'Content-Type': 'multipart/form-data',
                ...getPermissionHeaders(),
            },
            },
        );

        if (res.data?.success) {
            await finishProgressTracking(true);
            const skippedCount = Number(res.data?.skippedCount || 0);
            const skippedItems = Array.isArray(res.data?.skippedItems) ? res.data.skippedItems : [];
            const importedCount = Number(res.data?.insertedCount || res.data?.importedCount || 0);
            const missingCurriculumCount = Array.isArray(res.data?.missingCurriculums)
                ? res.data.missingCurriculums.length
                : 0;

            if (skippedCount > 0) {
                setSnackbar({
                    open: true,
                    message:
                        missingCurriculumCount > 0
                            ? `Import finished with ${skippedCount} row(s) not inserted, including ${missingCurriculumCount} missing curriculum record(s).`
                            : `Import finished with ${skippedCount} row(s) not inserted.`,
                    severity: 'warning',
                });
                openImportDetails("Data Not Inserted", skippedItems);
            } else {
                setSnackbar({
                    open: true,
                    message: res.data.message || 'Excel imported successfully.',
                    severity: 'success',
                });
            }

            await insertAuditLog("enrolled_subjects_imported", {
                page_id: pageId,
                module: "Upload Enrolled Subject",
                file_name: selectedFile?.name || "N/A",
                campus,
                imported_count: importedCount,
                skipped_count: skippedCount,
            });

            setSelectedFile(null);
            await fetchUploadedStudent();
        } else {
            await finishProgressTracking(false);
            showImportFailure(res.data, 'Import failed.');
        }
        } catch (err) {
            console.error('Import failed:', err);
            await finishProgressTracking(false);
            showImportFailure(err.response?.data, err.message || 'Import failed.');
        } finally {
            setImporting(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    if (loading || hasAccess === null) {
        return <LoadingOverlay open={loading} message="Loading..." />;
    }
        
    if (!hasAccess) {
        return <Unauthorized />;
    }

    return (
        <Box
        sx={{
            height: 'calc(100vh - 150px)',
            overflowY: 'auto',
            paddingRight: 1,
            backgroundColor: 'transparent',
            mt: 1,
            p: 2,
        }}
        >
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h4" fontWeight="bold" sx={{ color: titleColor }}>
            UPLOAD DATA PANEL
            </Typography>
        </Box>

        <hr style={{ border: "1px solid #ccc", width: "100%" }} />
        <br />

        <TableContainer
            component={Paper}
            sx={{ width: "100%", border: `1px solid ${borderColor}` }}
        >
            <Table>
                <TableHead
                    sx={{ backgroundColor: settings?.header_color || "#1976d2" }}
                >
                    <TableRow>
                        <TableCell sx={{ color: "white", textAlign: "Center" }}>
                            Filter Uploaded Data
                        </TableCell>
                    </TableRow>
                </TableHead>
            </Table>
        </TableContainer>

        <Paper sx={{ p: 3, mb: 3, border: `1px solid ${borderColor}` }}>
            <Box
                sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                gap: 2,
                }}
            >
                <Box sx={{ gridColumn: { xs: "span 1", sm: "span 2" }, display: "flex", justifyContent: "flex-end" }}>
                    <FormControl size="small" sx={{maxWidth: "250px"}}>
                        <Select
                            displayEmpty
                            value={selectedYearLevelFilter}
                            onChange={(e) => setSelectedYearLevelFilter(e.target.value)}
                            MenuProps={FILTER_MENU_PROPS}
                        >
                        <MenuItem value="">All Year Levels</MenuItem>
                        {yearLevelFilters.map((yl) => (
                            <MenuItem key={yl.year_level_id} value={yl.year_level_id}>
                            {yl.year_level_description}
                            </MenuItem>
                        ))}
                        </Select>
                    </FormControl>
                </Box>

                <FormControl size="small" sx={{maxWidth: "400px"}}>
                    <Select
                        displayEmpty
                        value={selectedDepartmentFilter}
                        onChange={(e) => setSelectedDepartmentFilter(e.target.value)}
                        MenuProps={FILTER_MENU_PROPS}
                    >
                        <MenuItem value="">All Colleges</MenuItem>
                        {departmentFilters.map((dept) => (
                            <MenuItem key={dept.dprtmnt_id} value={dept.dprtmnt_id}>
                                {dept.dprtmnt_name}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <FormControl size="small" sx={{maxWidth: "400px", width: "100%",justifySelf: "end"}}>
                    <Select
                        displayEmpty
                        value={selectedProgramFilter}
                        onChange={(e) => setSelectedProgramFilter(e.target.value)}
                        MenuProps={FILTER_MENU_PROPS}
                    >
                        <MenuItem value="">All Programs</MenuItem>
                            {programFilters.map((program) => (
                                <MenuItem key={program.curriculum_id} value={program.curriculum_id}>
                                    ({program.program_code}-{program.year_description}){" "}
                                    {program.program_description} {program.program_major}
                                </MenuItem>
                            ))}
                    </Select>
                </FormControl>

                <FormControl size="small" sx={{maxWidth: "400px"}}>
                    <Select
                        displayEmpty
                        value={selectedSchoolYearFilter}
                        onChange={(e) => setSelectedSchoolYearFilter(e.target.value)}
                        MenuProps={FILTER_MENU_PROPS}
                    >
                        <MenuItem value="">All School Years</MenuItem>
                        {schoolYearFilters.map((yr) => (
                            <MenuItem key={yr.year_id} value={yr.year_id}>
                                {yr.current_year} - {yr.next_year}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <FormControl size="small" sx={{maxWidth: "400px", justifySelf: "end", width: "100%"}}>
                    <Select
                        displayEmpty
                        value={selectedSemesterFilter}
                        onChange={(e) => setSelectedSemesterFilter(e.target.value)}
                        MenuProps={FILTER_MENU_PROPS}
                    >
                        <MenuItem value="">All Semesters</MenuItem>
                        {semesterFilters.map((sem) => (
                            <MenuItem key={sem.semester_id} value={sem.semester_id}>
                                {sem.semester_description}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Box>
        </Paper>


        <TableContainer
            component={Paper}
            sx={{ width: "100%", border: `1px solid ${borderColor}` }}
        >
            <Table>
                <TableHead
                    sx={{ backgroundColor: settings?.header_color || "#1976d2" }}
                >
                    <TableRow>
                        <TableCell sx={{ color: "white", textAlign: "Center" }}>
                            Import Student Data
                        </TableCell>
                    </TableRow>
                </TableHead>
            </Table>
        </TableContainer>

        <Paper sx={{ p: 3, mb: 3, border: `1px solid ${borderColor}` }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" gap={2} flexWrap="wrap">
                <Box>
                    <FormControl size="small" sx={{ minWidth: 180 }}>
                        <Select
                            displayEmpty
                            value={campus}
                            onChange={(e) => setCampus(e.target.value)}
                            MenuProps={FILTER_MENU_PROPS}
                        >
                            <MenuItem value="" disabled>
                                Select Campus
                            </MenuItem>
                            {branches.map((branch) => (
                                <MenuItem
                                    key={branch.id ?? branch.branch}
                                    value={String(branch.id ?? "")}
                                >
                                    {branch.branch}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Box>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    id="enrolled-subject-import"
                    style={{ display: 'none' }}
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                />

                <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
                    {selectedFile && (
                        <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                            {selectedFile.name}
                        </Typography>
                    )}

                    <Button
                        variant="outlined"
                        disabled={!canCreate || importing}
                        onClick={() => {
                            if (fileInputRef.current) {
                                fileInputRef.current.value = '';
                                fileInputRef.current.click();
                            }
                        }}
                    >
                        Choose File
                    </Button>

                    <Button
                        variant="contained"
                        onClick={handleImportXlsx}
                        disabled={!canCreate || importing}
                        sx={{ backgroundColor: mainButtonColor, width: "150px" }}
                    >
                        {importing ? 'Importing...' : 'Import File'}
                    </Button>
                </Box>
            </Box>
        </Paper>

        <TableContainer component={Paper} sx={{ width: "100%", mb: 1 }}>
            <Table size="small">
                <TableHead
                    sx={{
                        backgroundColor: settings?.header_color || "#1976d2",
                        color: "white",
                    }}
                >
                    <TableRow>
                        <TableCell
                            colSpan={8}
                            sx={{
                                border: `1px solid ${borderColor}`,
                                py: 0.5,
                                backgroundColor: settings?.header_color || "#1976d2",
                                color: "white",
                            }}
                        >
                            <Box
                                display="flex"
                                justifyContent="space-between"
                                alignItems="center"
                                flexWrap="wrap"
                                gap={1}
                            >
                                <Typography fontSize="14px" fontWeight="bold" color="white">
                                    Total Students: {totalStudentCount}
                                </Typography>

                                <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                                    <FormControl size="small" sx={{ minWidth: 190 }}>
                                        <Select
                                            value={sortOption}
                                            onChange={(e) => setSortOption(e.target.value)}
                                            sx={{
                                                fontSize: "12px",
                                                height: 36,
                                                color: "white",
                                                border: "1px solid white",
                                                backgroundColor: "transparent",
                                                ".MuiOutlinedInput-notchedOutline": {
                                                    borderColor: "white",
                                                },
                                                "&:hover .MuiOutlinedInput-notchedOutline": {
                                                    borderColor: "white",
                                                },
                                                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                                                    borderColor: "white",
                                                },
                                                "& svg": {
                                                    color: "white",
                                                },
                                            }}
                                            MenuProps={{
                                                PaperProps: {
                                                    sx: {
                                                        maxHeight: 250,
                                                        backgroundColor: "#fff",
                                                    },
                                                },
                                            }}
                                        >
                                            <MenuItem value="upload_desc">Upload Date (Newest)</MenuItem>
                                            <MenuItem value="lname_asc">Last Name (A-Z)</MenuItem>
                                            <MenuItem value="lname_desc">Last Name (Z-A)</MenuItem>
                                        </Select>
                                    </FormControl>

                                    <Button
                                        onClick={() => setCurrentPage(1)}
                                        disabled={currentPage === 1}
                                        variant="outlined"
                                        size="small"
                                        sx={{
                                            minWidth: 80,
                                            color: "white",
                                            borderColor: "white",
                                            backgroundColor: "transparent",
                                            "&:hover": {
                                                borderColor: "white",
                                                backgroundColor: "rgba(255,255,255,0.1)",
                                            },
                                            "&.Mui-disabled": {
                                                color: "white",
                                                borderColor: "white",
                                                backgroundColor: "transparent",
                                                opacity: 1,
                                            },
                                        }}
                                    >
                                        First
                                    </Button>

                                    <Button
                                        onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                                        disabled={currentPage === 1}
                                        variant="outlined"
                                        size="small"
                                        sx={{
                                            minWidth: 80,
                                            color: "white",
                                            borderColor: "white",
                                            backgroundColor: "transparent",
                                            "&:hover": {
                                                borderColor: "white",
                                                backgroundColor: "rgba(255,255,255,0.1)",
                                            },
                                            "&.Mui-disabled": {
                                                color: "white",
                                                borderColor: "white",
                                                backgroundColor: "transparent",
                                                opacity: 1,
                                            },
                                        }}
                                    >
                                        Prev
                                    </Button>

                                    <FormControl size="small" sx={{ minWidth: 80 }}>
                                        <Select
                                            value={currentPage}
                                            onChange={(e) => setCurrentPage(Number(e.target.value))}
                                            displayEmpty
                                            sx={{
                                                fontSize: "12px",
                                                height: 36,
                                                color: "white",
                                                border: "1px solid white",
                                                backgroundColor: "transparent",
                                                ".MuiOutlinedInput-notchedOutline": {
                                                    borderColor: "white",
                                                },
                                                "&:hover .MuiOutlinedInput-notchedOutline": {
                                                    borderColor: "white",
                                                },
                                                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                                                    borderColor: "white",
                                                },
                                                "& svg": {
                                                    color: "white",
                                                },
                                            }}
                                            MenuProps={{
                                                PaperProps: {
                                                    sx: {
                                                        maxHeight: 200,
                                                        backgroundColor: "#fff",
                                                    },
                                                },
                                            }}
                                        >
                                            {Array.from({ length: totalPages }, (_, i) => (
                                                <MenuItem key={i + 1} value={i + 1}>
                                                    Page {i + 1}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>

                                    <Typography fontSize="11px" color="white">
                                        of {totalPages} page{totalPages > 1 ? "s" : ""}
                                    </Typography>

                                    <Button
                                        onClick={() =>
                                            setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                                        }
                                        disabled={currentPage === totalPages}
                                        variant="outlined"
                                        size="small"
                                        sx={{
                                            minWidth: 80,
                                            color: "white",
                                            borderColor: "white",
                                            backgroundColor: "transparent",
                                            "&:hover": {
                                                borderColor: "white",
                                                backgroundColor: "rgba(255,255,255,0.1)",
                                            },
                                            "&.Mui-disabled": {
                                                color: "white",
                                                borderColor: "white",
                                                backgroundColor: "transparent",
                                                opacity: 1,
                                            },
                                        }}
                                    >
                                        Next
                                    </Button>

                                    <Button
                                        onClick={() => setCurrentPage(totalPages)}
                                        disabled={currentPage === totalPages}
                                        variant="outlined"
                                        size="small"
                                        sx={{
                                            minWidth: 80,
                                            color: "white",
                                            borderColor: "white",
                                            backgroundColor: "transparent",
                                            "&:hover": {
                                                borderColor: "white",
                                                backgroundColor: "rgba(255,255,255,0.1)",
                                            },
                                            "&.Mui-disabled": {
                                                color: "white",
                                                borderColor: "white",
                                                backgroundColor: "transparent",
                                                opacity: 1,
                                            },
                                        }}
                                    >
                                        Last
                                    </Button>
                                </Box>
                            </Box>
                        </TableCell>
                    </TableRow>
                </TableHead>
            </Table>
        </TableContainer>

        <TableContainer component={Paper} sx={{ border: `1px solid ${borderColor}` }}>
            <Table size="small">
            <TableHead>
                <TableRow>
                <TableCell sx={{ borderColor: borderColor, borderStyle: "solid", borderWidth: 1, textAlign: "center" }}>No.</TableCell>
                <TableCell sx={{ borderColor: borderColor, borderStyle: "solid", borderWidth: 1 }}>Student Number</TableCell>
                <TableCell sx={{ borderColor: borderColor, borderStyle: "solid", borderWidth: 1 }}>Last Name</TableCell>
                <TableCell sx={{ borderColor: borderColor, borderStyle: "solid", borderWidth: 1 }}>First Name</TableCell>
                <TableCell sx={{ borderColor: borderColor, borderStyle: "solid", borderWidth: 1 }}>Middle Name</TableCell>
                <TableCell sx={{ borderColor: borderColor, borderStyle: "solid", borderWidth: 1 }}>Program</TableCell>
                <TableCell sx={{ borderColor: borderColor, borderStyle: "solid", borderWidth: 1 }}>Program Code</TableCell>
                <TableCell sx={{ borderColor: borderColor, borderStyle: "solid", borderWidth: 1 }}>Semester</TableCell>
                <TableCell sx={{ borderColor: borderColor, borderStyle: "solid", borderWidth: 1 }}>Course Code</TableCell>
                <TableCell sx={{ borderColor: borderColor, borderStyle: "solid", borderWidth: 1 , textAlign: "center"}}>Year Level</TableCell>
                <TableCell sx={{ borderColor: borderColor, borderStyle: "solid", borderWidth: 1 }}>Uploaded At</TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
                {paginatedUploadedStudents.map((row, index) => (
                <TableRow key={`${row.student_number}-${index}`}>
                    <TableCell sx={{ borderColor: borderColor, borderStyle: "solid", borderWidth: 1, textAlign: "center" }}>
                        {startIndex + index + 1}
                    </TableCell>
                    <TableCell sx={{ borderColor: borderColor, borderStyle: "solid", borderWidth: 1 }}>{row.student_number}</TableCell>
                    <TableCell sx={{ borderColor: borderColor, borderStyle: "solid", borderWidth: 1 }}>{row.last_name}</TableCell>
                    <TableCell sx={{ borderColor: borderColor, borderStyle: "solid", borderWidth: 1 }}>{row.first_name}</TableCell>
                    <TableCell sx={{ borderColor: borderColor, borderStyle: "solid", borderWidth: 1 }}>{row.middle_name}</TableCell>
                    <TableCell sx={{ borderColor: borderColor, borderStyle: "solid", borderWidth: 1 }}>{row.program_description}</TableCell>
                    <TableCell sx={{ borderColor: borderColor, borderStyle: "solid", borderWidth: 1 }}>{row.program_code}</TableCell>
                    <TableCell sx={{ borderColor: borderColor, borderStyle: "solid", borderWidth: 1 }}>{row.semester_description || "-"}</TableCell>
                    <TableCell sx={{ borderColor: borderColor, borderStyle: "solid", borderWidth: 1 }}>{row.course_code || "-"}</TableCell>
                    <TableCell sx={{ borderColor: borderColor, borderStyle: "solid", borderWidth: 1 , textAlign: "center"}}>{row.year_level_description}</TableCell>
                    <TableCell sx={{ borderColor: borderColor, borderStyle: "solid", borderWidth: 1 }}>
                        {row.created_at ? new Date(row.created_at).toLocaleString() : "-"}
                    </TableCell>
                </TableRow>
                ))}
                {filteredUploadedStudents.length === 0 && (
                <TableRow>
                    <TableCell
                        colSpan={11}
                        align="center"
                        sx={{ borderColor: borderColor, borderStyle: "solid", borderWidth: 1, height: "120px" }}
                    >
                    No uploaded data yet.
                    </TableCell>
                </TableRow>
                )}
            </TableBody>
            </Table>
        </TableContainer>

        <Modal
            open={progressOpen}
            closeAfterTransition
            slots={{ backdrop: Backdrop }}
            slotProps={{ backdrop: { timeout: 200 } }}
        >
            <Fade in={progressOpen}>
            <Box
                sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: { xs: '90%', sm: 520 },
                bgcolor: 'background.paper',
                border: '1px solid #d0d0d0',
                boxShadow: 24,
                borderRadius: 2,
                p: 3,
                }}
            >
                <Typography variant="h6" fontWeight="bold" mb={1}>
                Import Progress
                </Typography>
                <Typography variant="body2" mb={2}>
                {progressMessage}
                </Typography>

                <LinearProgress variant="determinate" value={progressValue} sx={{ height: 10, borderRadius: 2 }} />
                <Typography variant="caption" display="block" mt={1.5} mb={2}>
                {Math.round(progressValue)}%
                </Typography>

                {PROGRESS_STEPS.map((step) => {
                const state = getStepState(step.key);
                return (
                    <Typography
                    key={step.key}
                    variant="body2"
                    sx={{
                        mb: 0.75,
                        fontWeight: state === 'active' ? 700 : 400,
                        color: state === 'pending' ? 'text.secondary' : 'text.primary',
                    }}
                    >
                    [{state === 'done' ? 'DONE' : state === 'active' ? 'WORKING' : 'PENDING'}] {step.label}
                    </Typography>
                );
                })}
            </Box>
            </Fade>
        </Modal>

        <Dialog
            open={skippedDialogOpen}
            onClose={() => setSkippedDialogOpen(false)}
            maxWidth="lg"
            fullWidth
        >
            <DialogTitle>
                {importDetailsTitle}
                {normalizedSkippedRows.length > 0 ? ` (${normalizedSkippedRows.length})` : ""}
            </DialogTitle>
            <DialogContent dividers sx={{ p: 0 }}>
                {normalizedSkippedRows.length === 0 ? (
                    <Typography variant="body2" sx={{ p: 2 }}>
                        No import details provided.
                    </Typography>
                ) : (
                    <Box sx={{ overflowX: "auto" }}>
                        <Box
                            sx={{
                                display: "grid",
                                gridTemplateColumns: IMPORT_DETAIL_GRID_COLUMNS,
                                gap: 0,
                                minWidth: IMPORT_DETAIL_MIN_WIDTH,
                                bgcolor: "#f5f5f5",
                                borderBottom: "1px solid #d0d0d0",
                                fontWeight: 700,
                                fontSize: "12px",
                            }}
                        >
                            {["Student Number", "Curriculum ID", "Course ID", "Year Level ID", "School Year", "Reason Not Inserted"].map((label) => (
                                <Box
                                    key={label}
                                    sx={{
                                        px: 1.5,
                                        py: 1,
                                        borderRight: "1px solid #d0d0d0",
                                        whiteSpace: "nowrap",
                                    }}
                                >
                                    {label}
                                </Box>
                            ))}
                        </Box>
                        <Box
                            ref={importDetailViewportRef}
                            onScroll={(event) => setImportDetailScrollTop(event.currentTarget.scrollTop)}
                            sx={{
                                height: IMPORT_DETAIL_VIEWPORT_HEIGHT,
                                overflowY: "auto",
                                overflowX: "hidden",
                                position: "relative",
                            }}
                        >
                            <Box sx={{ height: totalImportDetailHeight, minWidth: IMPORT_DETAIL_MIN_WIDTH, position: "relative" }}>
                                {visibleImportDetailRows.map((item, visibleIndex) => {
                                    const rowIndex = importDetailStartIndex + visibleIndex;
                                    return (
                                        <Box
                                            key={`${item.studentNumber}-${item.curriculumId}-${item.courseId}-${rowIndex}`}
                                            sx={{
                                                position: "absolute",
                                                top: rowIndex * IMPORT_DETAIL_ROW_HEIGHT,
                                                left: 0,
                                                right: 0,
                                                height: IMPORT_DETAIL_ROW_HEIGHT,
                                                display: "grid",
                                                gridTemplateColumns: IMPORT_DETAIL_GRID_COLUMNS,
                                                alignItems: "stretch",
                                                borderBottom: "1px solid #eeeeee",
                                                bgcolor: rowIndex % 2 === 0 ? "#fff" : "#fafafa",
                                                fontSize: "12px",
                                            }}
                                        >
                                            {[
                                                item.studentNumber,
                                                item.curriculumId,
                                                item.courseId,
                                                item.yearLevelId,
                                                item.schoolYear,
                                                item.reason,
                                            ].map((value, cellIndex) => (
                                                <Box
                                                    key={cellIndex}
                                                    title={String(value || "-")}
                                                    sx={{
                                                        px: 1.5,
                                                        py: 0.75,
                                                        borderRight: "1px solid #eeeeee",
                                                        overflow: "hidden",
                                                        textOverflow: "ellipsis",
                                                        display: "flex",
                                                        alignItems: "center",
                                                    }}
                                                >
                                                    {value || "-"}
                                                </Box>
                                            ))}
                                        </Box>
                                    );
                                })}
                            </Box>
                        </Box>
                    </Box>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setSkippedDialogOpen(false)} variant="contained">
                    Close
                </Button>
            </DialogActions>
        </Dialog>

        <Snackbar
            open={snackbar.open}
            autoHideDuration={3500}
            anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        >
            <Alert
            onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
            severity={snackbar.severity}
            variant="filled"
            sx={{ width: '100%' }}
            >
            {snackbar.message}
            </Alert>
        </Snackbar>
        </Box>
    );
};

export default UploadEnrolledSubject;
