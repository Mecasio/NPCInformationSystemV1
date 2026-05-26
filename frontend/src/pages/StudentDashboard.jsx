import React, { useState, useEffect, useContext, useRef } from "react";
import { SettingsContext } from "../App";

import '../styles/TempStyles.css';
import axios from 'axios';
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  Avatar,
  Tooltip
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import SchoolIcon from "@mui/icons-material/School";
import PersonIcon from "@mui/icons-material/Person";
import CertificateOfRegistration from "../student/CertificateOfRegistration";
import EaristLogo from "../assets/EaristLogo.png";
import {
  AccountBalanceWallet,
  AssignmentTurnedIn,
  BadgeOutlined,
  Campaign,
  CalendarMonth,
  CreditCard,
  FactCheck,
  MenuBook,
  StarBorder,
  WarningAmber,
  ArrowBackIos,
  ArrowForwardIos,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import KeyboardBackspaceIcon from '@mui/icons-material/KeyboardBackspace';
import AddCircleIcon from "@mui/icons-material/AddCircle";
import API_BASE_URL from "../apiConfig";
import { motion, AnimatePresence } from "framer-motion";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import CloseIcon from "@mui/icons-material/Close";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";

const gradeYearOrder = {
  "First Year": 1,
  "Second Year": 2,
  "Third Year": 3,
  "Fourth Year": 4,
  "Fifth Year": 5,
};

const gradeSemesterOrder = {
  "First Semester": 1,
  "Second Semester": 2,
  Summer: 3,
};

const parseGradeTerm = (term) => {
  const parts = String(term || "").split(" ");
  const yearLabel = parts.length >= 2 ? `${parts[0]} ${parts[1]}` : term;
  const semesterLabel = parts.slice(2).join(" ");

  return { yearLabel, semesterLabel };
};

const sortGradeTerms = (terms) =>
  [...terms].sort((a, b) => {
    const termA = parseGradeTerm(a);
    const termB = parseGradeTerm(b);
    const yA = gradeYearOrder[termA.yearLabel] || 0;
    const yB = gradeYearOrder[termB.yearLabel] || 0;

    if (yA !== yB) return yB - yA;
    return (
      (gradeSemesterOrder[termB.semesterLabel] || 0) -
      (gradeSemesterOrder[termA.semesterLabel] || 0)
    );
  });

const StudentDashboard = ({ profileImage, setProfileImage }) => {
  const navigate = useNavigate();
  const settings = useContext(SettingsContext);

  const [titleColor, setTitleColor] = useState("#000000");
  const [subtitleColor, setSubtitleColor] = useState("#555555");
  const [borderColor, setBorderColor] = useState("#000000");
  const [mainButtonColor, setMainButtonColor] = useState("#1976d2");
  const [subButtonColor, setSubButtonColor] = useState("#ffffff");   // ✅ NEW
  const [stepperColor, setStepperColor] = useState("#000000");       // ✅ NEW

  const [fetchedLogo, setFetchedLogo] = useState(null);
  const [companyName, setCompanyName] = useState("");
  const [shortTerm, setShortTerm] = useState("");
  const [campusAddress, setCampusAddress] = useState("");

  useEffect(() => {
    if (!settings) return;

    // 🎨 Colors
    if (settings.title_color) setTitleColor(settings.title_color);
    if (settings.subtitle_color) setSubtitleColor(settings.subtitle_color);
    if (settings.border_color) setBorderColor(settings.border_color);
    if (settings.main_button_color) setMainButtonColor(settings.main_button_color);
    if (settings.sub_button_color) setSubButtonColor(settings.sub_button_color);   // ✅ NEW
    if (settings.stepper_color) setStepperColor(settings.stepper_color);           // ✅ NEW

    // 🏫 Logo
    if (settings.logo_url) {
      setFetchedLogo(`${API_BASE_URL}${settings.logo_url}`);
    } else {
      setFetchedLogo(EaristLogo);
    }

    // 🏷️ School Information
    if (settings.company_name) setCompanyName(settings.company_name);
    if (settings.short_term) setShortTerm(settings.short_term);
    if (settings.campus_address) setCampusAddress(settings.campus_address);

  }, [settings]);

  const [userID, setUserID] = useState("");
  const [user, setUser] = useState("");
  const [userRole, setUserRole] = useState("");
  const [hovered, setHovered] = useState(false);
  const fileInputRef = useRef(null);
  const [personData, setPerson] = useState({
    student_number: '',
    first_name: '',
    middle_name: '',
    last_name: '',
    profile_image: '',
    student_status: '',
    year_level_description: '',
  });
  const [studentDetails, setStudent] = useState({
    program_description: '',
    section_description: '',
    program_code: '',
    year_level: '',
  });
  const [sy, setActiveSY] = useState({
    current_year: '',
    next_year: '',
    semester_description: ''
  });
  const [courseCount, setCourseCount] = useState({
    initial_course: 0,
    passed_course: 0,
    failed_course: 0,
    inc_course: 0,
    dropped_course: 0,
  });
  const [studentAssessment, setStudentAssessment] = useState(null);
  const [studentAssessmentRows, setStudentAssessmentRows] = useState([]);
  const [gradeSummary, setGradeSummary] = useState({
    gwa: null,
    generalAverage: null,
    latestTermGwa: null,
    loading: true,
    message: "Loading GWA...",
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const storedUser = localStorage.getItem("email");
    const storedRole = localStorage.getItem("role");
    const storedID = localStorage.getItem("person_id");

    if (storedUser && storedRole && storedID) {
      setUser(storedUser);
      setUserRole(storedRole);
      setUserID(storedID);

      if (storedRole !== "student") {
        window.location.href = "/faculty_dashboard";
      } else {
        fetchPersonData(storedID);
        fetchStudentDetails(storedID);
        fetchTotalCourse(storedID);
        fetchStudentAssessment(storedID);
        fetchGradeSummary(storedID);
        console.log("you are an student");
      }
    } else {
      window.location.href = "/login";
    }
  }, []);

  const fetchPersonData = async (id) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/student/${id}`);
      setPerson(res.data);
    } catch (error) {
      console.error(error)
    }
  };

  const fetchTotalCourse = async (id) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/course_count/${id}`);
      console.log("course count:", res.data);
      setCourseCount(res.data || { initial_course: 0 });
    } catch (error) {
      console.error(error)
    }
  };

  const fetchStudentDetails = async (id) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/student_details/${id}`);
      setStudent(res.data);
    } catch (error) {
      console.error(error)
    }
  };

  const fetchStudentAssessment = async (id) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/student-assessment/${id}`);
      const rows = Array.isArray(res.data?.rows) ? res.data.rows : [];
      setStudentAssessmentRows(rows);
      setStudentAssessment(rows[rows.length - 1] || null);
    } catch (error) {
      console.error(error);
      setStudentAssessmentRows([]);
      setStudentAssessment(null);
    }
  };

  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/active_school_year`)
      .then((res) => setActiveSY(res.data[0] || {}))
      .catch((err) => console.error(err));
  }, []);

  // Course status value
  const passed = courseCount?.passed_course || 0;
  const failed = courseCount?.failed_course || 0;
  const incomplete = courseCount?.inc_course || 0;
  const dropped = courseCount?.dropped_course || 0;
  const total = courseCount?.initial_course || 0;
  const displayedStatusTotal = passed + failed + incomplete + dropped;

  // percentages (normalize values to 0–100)
  const statusRingBase = displayedStatusTotal || total;
  const statusSlices = [
    { value: passed, color: "#75a843" },
    { value: failed, color: "#bf2d35" },
    { value: incomplete, color: "#dd8a12" },
    { value: dropped, color: "#1d4ed8" },
  ];
  let statusRingCursor = 0;
  const statusRingSegments = statusSlices
    .filter((slice) => slice.value > 0 && statusRingBase > 0)
    .map((slice) => {
      const start = statusRingCursor;
      const end = statusRingCursor + (slice.value / statusRingBase) * 360;
      statusRingCursor = end;
      return `${slice.color} ${start}deg ${end}deg`;
    });
  if (statusRingBase > displayedStatusTotal) {
    statusRingSegments.push(`#dedcda ${statusRingCursor}deg 360deg`);
  }
  const statusRingBackground =
    statusRingSegments.length > 0
      ? `conic-gradient(${statusRingSegments.join(", ")})`
      : "#dedcda";

  const [dateTime, setDateTime] = useState(new Date());

  const formattedDate = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formattedTime = time.toLocaleTimeString("en-US", {
    timeZone: "Asia/Manila",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });




  const divToPrintRef = useRef();
  const [isCorReadyToPrint, setIsCorReadyToPrint] = useState(false);
  const [isGeneratingCorPdf, setIsGeneratingCorPdf] = useState(false);
  const isCorReadyToPrintRef = useRef(false);

  const handleCorReadyChange = (isReady) => {
    isCorReadyToPrintRef.current = isReady;
    setIsCorReadyToPrint(isReady);
  };

  const fetchMatriculationBalance = async (studentNumber) => {
    if (!studentNumber) return { hasBalance: false, balance: 0 };

    try {
      const { data } = await axios.post(
        `${API_BASE_URL}/api/check-student-balance`,
        { student_number: studentNumber },
      );
      const balance = Number(data?.balance || 0);

      return {
        hasBalance: Boolean(data?.hasBalance) && balance > 0,
        balance: Number.isFinite(balance) ? balance : 0,
      };
    } catch (error) {
      console.error("Failed to check matriculation balance:", error);
      return { hasBalance: false, balance: 0 };
    }
  };

  const fetchGradeSummary = async (id) => {
    setGradeSummary({
      gwa: null,
      generalAverage: null,
      latestTermGwa: null,
      loading: true,
      message: "Loading GWA...",
    });

    try {
      const res = await axios.get(`${API_BASE_URL}/api/student_grade/${id}`);
      const grades = Array.isArray(res.data) ? res.data : [];

      if (!grades.length) {
        setGradeSummary({
          gwa: null,
          generalAverage: null,
          latestTermGwa: null,
          loading: false,
          message: "No grades posted",
        });
        return;
      }

      const balanceInfo = await fetchMatriculationBalance(grades[0]?.student_number);
      if (balanceInfo.hasBalance) {
        setGradeSummary({
          gwa: null,
          generalAverage: null,
          latestTermGwa: null,
          loading: false,
          message: "Hidden due to balance",
        });
        return;
      }

      const groupedByTerm = {};
      grades.forEach((subject) => {
        const termKey = `${subject.year_level_description || "N/A"} ${subject.semester_description || "N/A"}`;
        if (!groupedByTerm[termKey]) groupedByTerm[termKey] = [];
        groupedByTerm[termKey].push(subject);
      });

      const processedGrades = Object.values(groupedByTerm).flatMap((termSubjects) => {
        const allReleased = termSubjects.every(
          (subject) => subject.fe_status === 1 || subject.is_migrated,
        );

        if (allReleased) return termSubjects;

        return termSubjects.map((subject) => ({
          ...subject,
          final_grade:
            subject.fe_status === 1 || subject.is_migrated ? subject.final_grade : null,
          numeric_grade:
            subject.fe_status === 1 || subject.is_migrated ? subject.numeric_grade : null,
          descriptive_grade:
            subject.fe_status === 1 || subject.is_migrated ? subject.descriptive_grade : null,
          en_remarks:
            subject.fe_status === 1 || subject.is_migrated ? subject.en_remarks : null,
          gwa: subject.fe_status === 1 || subject.is_migrated ? subject.gwa : null,
        }));
      });

      const sortedTerms = sortGradeTerms([
        ...new Set(
          processedGrades.map(
            (row) => `${row.year_level_description} ${row.semester_description}`,
          ),
        ),
      ]);
      const latestTerm = sortedTerms[0];
      const latestTermGwa = processedGrades.find(
        (row) =>
          `${row.year_level_description} ${row.semester_description}` === latestTerm &&
          row.gwa !== null &&
          row.gwa !== undefined &&
          row.gwa !== "",
      )?.gwa;
      const postedTermGwas = sortedTerms
        .map((term) => {
          const termGwa = processedGrades.find(
            (row) =>
              `${row.year_level_description} ${row.semester_description}` === term &&
              row.gwa !== null &&
              row.gwa !== undefined &&
              row.gwa !== "",
          )?.gwa;
          const numericGwa = Number(termGwa);
          return Number.isFinite(numericGwa) ? numericGwa : null;
        })
        .filter((termGwa) => termGwa !== null);
      const generalAverage = postedTermGwas.length
        ? postedTermGwas.reduce((sum, termGwa) => sum + termGwa, 0) /
          postedTermGwas.length
        : null;

      setGradeSummary({
        gwa: generalAverage,
        generalAverage,
        latestTermGwa: latestTermGwa ?? null,
        loading: false,
        message: generalAverage ? "" : "Not yet posted",
      });
    } catch (error) {
      console.error("Failed to fetch grade summary:", error);
      setGradeSummary({
        gwa: null,
        generalAverage: null,
        latestTermGwa: null,
        loading: false,
        message: "Unable to load GWA",
      });
    }
  };

  const waitForCorReady = () =>
    new Promise((resolve, reject) => {
      const startedAt = Date.now();
      const check = () => {
        if (isCorReadyToPrintRef.current) {
          resolve();
          return;
        }

        if (Date.now() - startedAt > 10000) {
          reject(new Error("Certificate data is still loading."));
          return;
        }

        setTimeout(check, 250);
      };

      check();
    });

  const waitForImages = async (element) => {
    const images = Array.from(element.querySelectorAll("img"));
    await Promise.all(
      images.map(
        (img) =>
          img.complete
            ? Promise.resolve()
            : new Promise((resolve) => {
              img.onload = resolve;
              img.onerror = resolve;
            }),
      ),
    );
  };

  const nextFrame = () =>
    new Promise((resolve) => requestAnimationFrame(() => resolve()));

  const fileToDataUrl = (blob) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  const waitForImage = (img) =>
    img.complete
      ? Promise.resolve()
      : new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
      });

  const inlineImages = async (element) => {
    const images = Array.from(element.querySelectorAll("img"));

    await Promise.all(
      images.map(async (img) => {
        const source = img.currentSrc || img.src;
        if (!source || source.startsWith("data:")) return;

        try {
          const response = await fetch(source, {
            mode: "cors",
            credentials: "omit",
          });

          if (!response.ok) {
            throw new Error(`Image request failed with ${response.status}`);
          }

          const blob = await response.blob();
          img.removeAttribute("crossorigin");
          img.crossOrigin = null;
          img.src = await fileToDataUrl(blob);
          await waitForImage(img);
        } catch (error) {
          console.warn("Failed to inline image for COR PDF:", source, error);
        }
      }),
    );
  };

  const replaceFormFields = (source, clone) => {
    const sourceFields = source.querySelectorAll("input, textarea, select");
    const cloneFields = clone.querySelectorAll("input, textarea, select");

    sourceFields.forEach((sourceField, index) => {
      const cloneField = cloneFields[index];
      if (!cloneField) return;

      const computedStyle = window.getComputedStyle(sourceField);
      const bounds = sourceField.getBoundingClientRect();
      const width = sourceField.offsetWidth || bounds.width;
      const height = sourceField.offsetHeight || bounds.height;
      const textNode = document.createElement("span");
      textNode.style.cssText = sourceField.getAttribute("style") || "";
      textNode.style.display =
        computedStyle.display === "none" ? "none" : "inline-block";
      textNode.style.boxSizing = "border-box";
      textNode.style.verticalAlign = "middle";
      textNode.style.whiteSpace = "nowrap";
      textNode.style.overflow = "visible";
      textNode.style.textOverflow = "clip";
      textNode.style.visibility = "visible";
      textNode.style.opacity = "1";
      textNode.style.color = "#000";
      textNode.style.webkitTextFillColor = "#000";
      textNode.style.fontFamily = computedStyle.fontFamily || "Arial";
      textNode.style.fontSize = computedStyle.fontSize || "12px";
      textNode.style.fontWeight = computedStyle.fontWeight || "normal";
      textNode.style.textAlign = computedStyle.textAlign || "left";
      textNode.style.lineHeight =
        computedStyle.lineHeight === "normal" ? "1.15" : computedStyle.lineHeight;
      textNode.style.background = "transparent";
      textNode.style.border = "none";
      textNode.style.outline = "none";
      textNode.style.padding = sourceField.style.padding || "0";
      textNode.style.margin = sourceField.style.margin || "0";
      textNode.style.width = width ? `${Math.ceil(width)}px` : "100%";
      textNode.style.minHeight = height ? `${Math.ceil(height)}px` : "auto";
      textNode.style.height = height ? `${Math.ceil(height)}px` : "auto";

      if (sourceField.tagName === "SELECT") {
        textNode.textContent =
          sourceField.selectedOptions?.[0]?.textContent || sourceField.value;
        cloneField.replaceWith(textNode);
        return;
      }

      if (sourceField.type === "checkbox" || sourceField.type === "radio") {
        textNode.textContent = sourceField.checked ? "X" : "";
        cloneField.replaceWith(textNode);
        return;
      }

      textNode.textContent = sourceField.value || sourceField.getAttribute("value") || "";
      cloneField.replaceWith(textNode);
    });
  };

  const cloneCertificateForCapture = (certificate) => {
    const clone = certificate.cloneNode(true);
    replaceFormFields(certificate, clone);

    clone.querySelectorAll("*").forEach((node) => {
      node.style.visibility = "visible";
      node.style.opacity = node.classList.contains("certificate-watermark")
        ? node.style.opacity
        : "1";
    });

    clone.querySelectorAll("img").forEach((img) => {
      img.style.visibility = "visible";
      img.style.opacity = "1";
    });

    return clone;
  };

  const downloadCorPdf = async () => {
    let captureHost = null;

    try {
      setIsGeneratingCorPdf(true);
      await waitForCorReady();

      const certificate = divToPrintRef.current;
      if (!certificate) {
        throw new Error("Certificate is not available.");
      }

      await document.fonts?.ready;
      await waitForImages(certificate);
      await nextFrame();

      captureHost = document.createElement("div");
      captureHost.style.position = "absolute";
      captureHost.style.left = "-99999px";
      captureHost.style.top = "0";
      captureHost.style.width = "8in";
      captureHost.style.height = "auto";
      captureHost.style.overflow = "visible";
      captureHost.style.background = "#ffffff";
      captureHost.style.zIndex = "0";
      captureHost.style.pointerEvents = "none";
      captureHost.style.opacity = "1";
      captureHost.appendChild(cloneCertificateForCapture(certificate));
      document.body.appendChild(captureHost);

      const captureTarget =
        captureHost.querySelector(".certificate-wrapper") || captureHost;
      captureTarget.style.width = "8in";
      captureTarget.style.height = "auto";
      captureTarget.style.maxHeight = "none";
      captureTarget.style.overflow = "visible";
      captureTarget.style.margin = "0";
      captureTarget.style.transform = "none";

      await inlineImages(captureTarget);
      await waitForImages(captureTarget);
      await nextFrame();

      const targetBounds = captureTarget.getBoundingClientRect();
      const captureWidth = Math.ceil(
        Math.max(
          captureTarget.scrollWidth,
          captureTarget.offsetWidth,
          targetBounds.width,
        ),
      );
      const captureHeight = Math.ceil(
        Math.max(
          captureTarget.scrollHeight,
          captureTarget.offsetHeight,
          targetBounds.height,
        ),
      );

      if (!captureWidth || !captureHeight) {
        throw new Error("Certificate layout is empty and cannot be captured.");
      }

      const canvas = await html2canvas(captureTarget, {
        backgroundColor: "#ffffff",
        scale: 3,
        useCORS: true,
        allowTaint: true,
        width: captureWidth,
        height: captureHeight,
        windowWidth: captureWidth,
        windowHeight: captureHeight,
        scrollX: 0,
        scrollY: 0,
      });

      const imageData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 5;

      pdf.addImage(
        imageData,
        "PNG",
        margin,
        margin,
        pageWidth - margin * 2,
        pageHeight - margin * 2,
      );
      pdf.save(
        `certificate-of-registration-${personData.student_number || "student"}.pdf`,
      );
    } catch (error) {
      console.error("Failed to generate COR PDF:", error);
      window.alert(
        error?.message ||
          "Failed to generate Certificate of Registration PDF. Please try again.",
      );
    } finally {
      if (captureHost) {
        captureHost.remove();
      }
      setIsGeneratingCorPdf(false);
    }
  };



  const [date, setDate] = useState(new Date());

  const days = ["Sun", "Mon", "Tue", "Wed", "Thur", "Fri", "Sat"];

  const year = date.getFullYear();
  const month = date.getMonth();

  const now = new Date();
  const manilaDate = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Manila" })
  );
  const today = manilaDate.getDate();
  const thisMonth = manilaDate.getMonth();
  const thisYear = manilaDate.getFullYear();

  const firstDay = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  const weeks = [];
  let currentDay = 1 - firstDay;

  while (currentDay <= totalDays) {
    const week = [];
    for (let i = 0; i < 7; i++) {
      if (currentDay > 0 && currentDay <= totalDays) {
        week.push(currentDay);
      } else {
        week.push(null);
      }
      currentDay++;
    }
    weeks.push(week);
  }

  const handlePrevMonth = () => setDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setDate(new Date(year, month + 1, 1));


  const [holidays, setHolidays] = useState({});

  useEffect(() => {
    const fetchHolidays = async () => {
      try {
        const res = await axios.get(
          `https://date.nager.at/api/v3/PublicHolidays/${year}/PH`
        );
        const lookup = {};
        res.data.forEach((h) => {
          lookup[h.date] = h;
        });
        setHolidays(lookup);
      } catch (err) {
        console.error("❌ Failed to fetch PH holidays:", err);
        setHolidays({});
      }
    };
    fetchHolidays();
  }, [year]);

  const [openImage, setOpenImage] = useState(null);

  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {

        const email = localStorage.getItem("email");

        const res = await axios.get(
          `${API_BASE_URL}/api/announcements/user/${email}`
        );

        setAnnouncements(res.data.announcements || []);

      } catch (err) {
        console.error(err);
      }
    };

    fetchAnnouncements();
  }, []);

  // Lightbox state — add near your other useState declarations
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxZoom, setLightboxZoom] = useState(1);


  // Lightbox helpers
  const openLightbox = (index) => { setLightboxIndex(index); setLightboxZoom(1); setLightboxOpen(true); };
  const closeLightbox = () => { setLightboxOpen(false); setLightboxZoom(1); };
  const lightboxNext = () => { setLightboxIndex(prev => (prev + 1) % announcements.length); setLightboxZoom(1); };
  const lightboxPrev = () => { setLightboxIndex(prev => (prev - 1 + announcements.length) % announcements.length); setLightboxZoom(1); };
  const zoomIn = () => setLightboxZoom(prev => Math.min(prev + 0.5, 3));
  const zoomOut = () => setLightboxZoom(prev => Math.max(prev - 0.5, 1));

  useEffect(() => {
    if (!lightboxOpen) return;
    const handleKey = (e) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowRight") lightboxNext();
      if (e.key === "ArrowLeft") lightboxPrev();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [lightboxOpen, lightboxIndex, announcements.length]);



  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const person_id = localStorage.getItem("person_id");
      const role = localStorage.getItem("role");

      const formData = new FormData();

      formData.append("profile_picture", file);
      formData.append("person_id", person_id);

      // ✅ Upload image using same backend API
      await axios.post(
        `${API_BASE_URL}/update_student`,
        formData
      );

      // ✅ Refresh profile info to display the new image
      const updated = await axios.get(
        `${API_BASE_URL}/api/person_data/${person_id}/${role}`
      );

      setPerson(prev => ({
        ...prev,
        profile_image: updated.data.profile_image
      }));
      const baseUrl = `${API_BASE_URL}/uploads/Student1by1/${updated.data.profile_image}`;
      setProfileImage(`${baseUrl}?t=${Date.now()}`);
    } catch (error) {
      console.error("❌ Upload failed:", error);
    }
  }


  const maroon = settings?.header_color || "#9b2f35";
  const darkMaroon = "#7d252b";
  const softBorder = "#e6ded9";
  const cardSx = {
    height: "100%",
    border: `1px solid ${softBorder}`,
    borderRadius: "8px",
    boxShadow: "0 10px 24px rgba(82, 48, 48, 0.06)",
    backgroundColor: "#fff",
  };
  const iconBoxSx = {
    width: 42,
    height: 42,
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: maroon,
    backgroundColor: "rgba(155, 47, 53, 0.08)",
    border: "1px solid rgba(155, 47, 53, 0.18)",
    flexShrink: 0,
  };
  const money = (value) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(Number(value || 0));
  const assessmentRows = studentAssessmentRows.length ? studentAssessmentRows : studentAssessment ? [studentAssessment] : [];
  const assessment = assessmentRows.reduce(
    (sum, row) => sum + Number(row.assessment ?? row.fees?.grandTotal ?? 0),
    0,
  );
  const paidAmount = assessmentRows.reduce(
    (sum, row) => sum + Number(row.payment ?? 0),
    0,
  );
  const remainingBalance = assessmentRows.reduce(
    (sum, row) => sum + Number(row.balance ?? row.fees?.grandTotal ?? 0),
    0,
  );
  const firstAnnouncement = announcements.find((item) => item.file_path) || announcements[0];
  const statusText = String(
    personData.display_status || personData.student_status || "Student",
  );
  const studentProgram =
    studentDetails.program_description ||
    personData.program_description ||
    personData.program_code ||
    (personData.curriculum_id ? `Curriculum ${personData.curriculum_id}` : "N/A");
  const studentYearLevel =
    personData.year_level_description ||
    studentDetails.year_level ||
    personData.year_level_id ||
    "N/A";
  const quickLinks = [
    { label: "Schedule", icon: <CalendarMonth />, href: "/student_schedule" },
    { label: "Grades", icon: <StarBorder />, href: "/grades_page" },
    { label: "Curriculum", icon: <MenuBook />, href: "/student_section_offering" },
    { label: "Faculty Evaluation", icon: <AssignmentTurnedIn />, href: "/student_faculty_evaluation" },
    { label: "Student Profile", icon: <BadgeOutlined />, href: "/student_personal_data_form" },
    { label: "Account Balance", icon: <CreditCard />, href: "/student_account_balance" },
  ];

  return (
    <Box
      sx={{
        minHeight: "calc(100vh - 100px)",
        width: "100%",
        backgroundColor: "#f7f6f4",
        overflowY: "auto",
        fontFamily: "Poppins, sans-serif",
      }}
    >
      <div
        style={{
          position: "fixed",
          left: "-10000px",
          top: 0,
          width: "max-content",
          background: "#fff",
          pointerEvents: "none",
          zIndex: -1,
        }}
      >
        <CertificateOfRegistration
          ref={divToPrintRef}
          student_number={String(personData.student_number || "")}
          onReadyChange={handleCorReadyChange}
        />
      </div>
      <Box
        sx={{
          mx: { xs: 1.5, md: 3 },
          mt: { xs: 1.5, md: 2.5 },
          borderRadius: "8px 8px 0 0",
          overflow: "hidden",
          background: `linear-gradient(135deg, ${maroon}, ${darkMaroon})`,
          color: "#fff",
        }}
      >
        <Box sx={{ px: { xs: 2, md: 4 }, py: { xs: 2.5, md: 3 }, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Box position="relative" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} sx={{ display: "inline-flex" }}>
              <Avatar
                src={profileImage || (personData?.profile_image ? `${API_BASE_URL}/uploads/Student1by1/${personData.profile_image}` : "")}
                alt={personData?.first_name || "Student"}
                onClick={() => fileInputRef.current?.click()}
                sx={{ width: 64, height: 64, border: "2px solid rgba(255,255,255,0.75)", bgcolor: "rgba(255,255,255,0.15)", cursor: "pointer", display: { xs: "none", sm: "flex" } }}
              >
                {personData?.first_name?.[0] || <PersonIcon />}
              </Avatar>
              {hovered && (
                <IconButton size="small" onClick={() => fileInputRef.current?.click()} sx={{ position: "absolute", right: -6, bottom: -6, bgcolor: "#fff", color: maroon, border: "1px solid rgba(0,0,0,0.1)", display: { xs: "none", sm: "inline-flex" }, "&:hover": { bgcolor: "#fff5f3" } }}>
                  <AddCircleIcon fontSize="small" />
                </IconButton>
              )}
              <input type="file" accept="image/*" ref={fileInputRef} style={{ display: "none" }} onChange={handleFileChange} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: { xs: 25, md: 31 }, fontWeight: 800, lineHeight: 1.1 }}>
                {personData.last_name || "Student"}, {personData.first_name || ""} {personData.middle_name || ""}
              </Typography>
              <Typography sx={{ mt: 1, fontSize: 15, letterSpacing: 0, textTransform: "uppercase", opacity: 0.86 }}>
                Student No. {personData.student_number || "N/A"} - {statusText}
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={2} alignItems="center">
            <Box sx={{ textAlign: "right" }}>
              <Typography sx={{ fontSize: 14, opacity: 0.9 }}>{formattedDate}</Typography>
              <Typography sx={{ fontSize: { xs: 24, md: 31 }, fontWeight: 800 }}>{formattedTime}</Typography>
            </Box>
          </Stack>
        </Box>
        <Box sx={{ px: { xs: 2, md: 4 }, py: 1.5, backgroundColor: "rgba(85, 17, 22, 0.28)", display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "1fr 1fr 2fr 1fr 1fr" }, gap: 2 }}>
          {[
            ["School Year", `${sy.current_year || ""}-${sy.next_year || ""}`],
            ["Semester", sy.semester_description || "N/A"],
            ["Program", studentProgram],
            ["Section", `${studentDetails.program_code || ""}${studentDetails.section_description ? ` ${studentDetails.section_description}` : ""}` || "N/A"],
            ["Year Level", studentYearLevel],
          ].map(([label, value]) => (
            <Box key={label} sx={{ borderLeft: { lg: "1px solid rgba(255,255,255,0.22)" }, pl: { lg: 2 } }}>
              <Typography sx={{ fontSize: 12, textTransform: "uppercase", opacity: 0.78 }}>{label}</Typography>
              <Typography sx={{ fontSize: 15, fontWeight: 600 }}>{value}</Typography>
            </Box>
          ))}
        </Box>
      </Box>

      <Box sx={{ py: { xs: 2, md: 2.5 }, mx: { xs: 1.5, md: 3 }, maxWidth: "none" }}>
        <Grid container spacing={2} sx={{ width: "100%" }}>
          <Grid item xs={12} md={6} lg={3}>
            <Card sx={cardSx}>
              <CardContent sx={{ p: 3 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography sx={{ fontSize: 20, fontWeight: 700 }}>Course Status</Typography>
                    <Typography sx={{ mt: 0.5, color: "text.secondary", fontSize: 13 }}>Academic year {sy.current_year || "N/A"}-{sy.next_year || ""} - {sy.semester_description || "Semester"}</Typography>
                  </Box>
                  <Box sx={{ textAlign: "right" }}>
                    <Typography sx={{ color: maroon, fontSize: 52, lineHeight: 0.9, fontWeight: 800 }}>{total}</Typography>
                    <Typography sx={{ color: maroon, textTransform: "uppercase", fontSize: 12, fontWeight: 700 }}>Courses</Typography>
                  </Box>
                </Stack>
                <Divider sx={{ my: 3 }} />
                <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
                  {[
                    ["Passed", passed, "#75a843"],
                    ["Failed", failed, "#bf2d35"],
                    ["Incomplete", incomplete, "#dd8a12"],
                    ["Dropped", dropped, "#1d4ed8"],
                  ].map(([label, value, color]) => (
                    <Box key={label} sx={{ px: 1.4, py: 0.7, borderRadius: 10, bgcolor: "#f6f4ef", display: "flex", gap: 1, alignItems: "center" }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: color }} />
                      <Typography sx={{ fontSize: 13 }}>{label}</Typography>
                      <Typography sx={{ fontSize: 13, color: "text.secondary" }}>{value}</Typography>
                    </Box>
                  ))}
                </Stack>
                <Divider sx={{ my: 3 }} />
                <Stack direction="row" spacing={2.5} alignItems="center">
                  <Box sx={{ width: 92, height: 92, minWidth: 92, borderRadius: "50%", background: statusRingBackground, display: "grid", placeItems: "center", p: "9px" }}>
                    <Box sx={{ width: "100%", height: "100%", borderRadius: "50%", bgcolor: "#fff", display: "grid", placeItems: "center", fontSize: 17, fontWeight: 800 }}>{total}</Box>
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: 14 }}>All {total} courses are enrolled for this semester.</Typography>
                    <Typography sx={{ mt: 1, color: "text.secondary", fontSize: 14 }}>Grades are not yet posted.</Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6} lg={3}>
            <Card sx={cardSx}>
              <CardContent sx={{ p: 3 }}>
                <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2.5 }}>
                  <Box sx={iconBoxSx}><PersonIcon /></Box>
                  <Box>
                    <Typography sx={{ fontWeight: 700 }}>Enrollment Status</Typography>
                    <Typography component="span" sx={{ mt: 0.8, display: "inline-block", px: 1.4, py: 0.4, borderRadius: 10, bgcolor: "#e7efd4", color: "#496b21", fontSize: 12 }}>Officially Enrolled</Typography>
                  </Box>
                </Stack>
                {[
                  ["Academic Year", `${sy.current_year || ""}-${sy.next_year || ""}`],
                  ["Semester", sy.semester_description || "N/A"],
                  ["Student Type", statusText || "N/A"],
                ].map(([label, value]) => (
                  <Stack key={label} direction="row" justifyContent="space-between" sx={{ py: 1 }}>
                    <Typography sx={{ color: "text.secondary", fontSize: 13 }}>{label}</Typography>
                    <Typography sx={{ fontSize: 13, fontWeight: 600, textAlign: "right" }}>{value}</Typography>
                  </Stack>
                ))}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6} lg={3}>
            <Card sx={cardSx}>
              <CardContent sx={{ p: 3 }}>
                <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2.5 }}>
                  <Box sx={iconBoxSx}><AccountBalanceWallet /></Box>
                  <Typography sx={{ fontWeight: 700 }}>Account Balance</Typography>
                </Stack>
                {[
                  ["Total Assessment", money(assessment)],
                  ["Paid Amount", money(paidAmount)],
                  ["Remaining Balance", money(remainingBalance)],
                  ["Due Date", "Not set"],
                ].map(([label, value], idx) => (
                  <Stack key={label} direction="row" justifyContent="space-between" sx={{ py: 0.8 }}>
                    <Typography sx={{ color: "text.secondary", fontSize: 13 }}>{label}</Typography>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: idx === 2 && remainingBalance > 0 ? "error.main" : "text.primary" }}>{value}</Typography>
                  </Stack>
                ))}
                {remainingBalance > 0 && (
                  <Stack direction="row" spacing={1.5} sx={{ mt: 2, p: 1.4, borderRadius: "8px", bgcolor: "#fff0ee", color: "#c41922" }}>
                    <WarningAmber fontSize="small" />
                    <Box>
                      <Typography sx={{ fontSize: 12, fontWeight: 700 }}>You have a remaining balance.</Typography>
                      <Typography sx={{ fontSize: 12, color: "text.secondary" }}>Grade viewing and some student services may be unavailable until it is settled.</Typography>
                    </Box>
                  </Stack>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6} lg={3}>
            <Card sx={{ ...cardSx, width: "100%", flexShrink: 0 }}>
              <CardContent sx={{ p: 2.5 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
                  <IconButton disabled sx={{ border: `1px solid ${softBorder}`, borderRadius: "8px" }}><ArrowBackIos fontSize="small" /></IconButton>
                  <Typography sx={{ fontSize: 18, fontWeight: 700 }}>{date.toLocaleString("default", { month: "long" })} {year}</Typography>
                  <IconButton disabled sx={{ border: `1px solid ${softBorder}`, borderRadius: "8px" }}><ArrowForwardIos fontSize="small" /></IconButton>
                </Stack>
                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", rowGap: 1, width: "100%" }}>
                  {days.map((day) => <Typography key={day} sx={{ textAlign: "center", fontSize: 12, color: "text.secondary", textTransform: "uppercase" }}>{day.slice(0, 2)}</Typography>)}
                  {weeks.flatMap((week, i) => week.map((day, j) => {
                    const isToday = day === today && month === thisMonth && year === thisYear;
                    const dateKey = day ? `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}` : "";
                    const isHoliday = day ? holidays[dateKey] : null;
                    const cell = (
                      <Box key={`${i}-${j}`} sx={{ height: 39, display: "grid", placeItems: "center", color: !day ? "transparent" : isToday ? "#fff" : "text.primary", fontWeight: isToday || isHoliday ? 700 : 500 }}>
                        <Box sx={{ width: 34, height: 34, borderRadius: "50%", display: "grid", placeItems: "center", bgcolor: isToday ? maroon : isHoliday ? "#f5dfac" : "transparent" }}>{day || 0}</Box>
                      </Box>
                    );
                    return isHoliday ? <Tooltip key={`${i}-${j}`} title={isHoliday.localName} arrow>{cell}</Tooltip> : cell;
                  }))}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} lg={5}>
            <Card sx={cardSx}>
              <CardContent sx={{ p: 0 }}>
                <Grid container>
                  <Grid item xs={12} md={5.2} sx={{ p: 2.5, borderRight: { md: `1px solid ${softBorder}` } }}>
                    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}><Box sx={iconBoxSx}><StarBorder /></Box><Typography sx={{ fontSize: 18, fontWeight: 700 }}>Grade Summary</Typography></Stack>
                    <Box sx={{ border: "1px solid #f0cfcd", borderRadius: "8px", p: 2.5, textAlign: "center", mb: 2.5 }}>
                      <Typography sx={{ fontSize: 16 }}>Overall GWA</Typography>
                      <Typography sx={{ fontSize: 42, color: maroon, fontWeight: 800 }}>
                        {gradeSummary.gwa !== null && gradeSummary.gwa !== undefined
                          ? Number(gradeSummary.gwa).toFixed(3)
                          : "0.00"}
                      </Typography>
                      <Divider sx={{ my: 1.5 }} />
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography sx={{ color: "text.secondary", fontSize: 13 }}>Latest Term GWA</Typography>
                        <Typography sx={{ color: maroon, fontSize: 18, fontWeight: 800 }}>
                          {gradeSummary.latestTermGwa !== null &&
                          gradeSummary.latestTermGwa !== undefined
                            ? Number(gradeSummary.latestTermGwa).toFixed(3)
                            : "0.00"}
                        </Typography>
                      </Stack>
                      {gradeSummary.message && (
                        <Typography sx={{ mt: 0.5, color: "text.secondary", fontSize: 12 }}>
                          {gradeSummary.message}
                        </Typography>
                      )}
                    </Box>
                    {[["Passed", passed, "#2e7d32"], ["Failed", failed, "#d32f2f"], ["Incomplete", incomplete, "#d97706"], ["Dropped", dropped, "#1d4ed8"]].map(([label, value, color]) => (
                      <Stack key={label} direction="row" justifyContent="space-between" sx={{ py: 0.65 }}><Typography sx={{ color, fontWeight: 700 }}>{label}</Typography><Typography>{value}</Typography></Stack>
                    ))}
                  </Grid>
                  <Grid item xs={12} md={6.8} sx={{ p: 2.5 }}>
                    <Typography sx={{ fontSize: 18, fontWeight: 700, mb: 2 }}>Quick Access</Typography>
                    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(3, 1fr)" }, gap: 1.5 }}>
                      {quickLinks.map((link) => (
                        <Button key={link.label} type="button" onClick={() => navigate(link.href)} variant="outlined" sx={{ height: 86, borderRadius: "8px", borderColor: softBorder, color: "text.primary", display: "flex", flexDirection: "column", gap: 0.8, textTransform: "none", "& svg": { color: maroon }, "&:hover": { borderColor: maroon, bgcolor: "rgba(155,47,53,0.04)" } }}>
                          {link.icon}<Typography sx={{ fontSize: 13, lineHeight: 1.1 }}>{link.label}</Typography>
                        </Button>
                      ))}
                    </Box>
                  </Grid>
                </Grid>
                <Divider />
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ xs: "flex-start", sm: "center" }} justifyContent="space-between" sx={{ p: 2.5 }}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Box sx={{ ...iconBoxSx, width: 64, height: 64 }}><FactCheck sx={{ fontSize: 34 }} /></Box>
                    <Box><Typography sx={{ fontSize: 17, fontWeight: 700 }}>Certificate of Registration</Typography><Typography sx={{ mt: 0.5, color: "text.secondary", fontSize: 14 }}>Download your official enrollment certificate for this semester.</Typography></Box>
                  </Stack>
                  <Button
                    variant="outlined"
                    startIcon={<DownloadIcon />}
                    onClick={downloadCorPdf}
                    disabled={!isCorReadyToPrint || isGeneratingCorPdf}
                    sx={{ borderColor: softBorder, color: "text.primary", textTransform: "none", borderRadius: "8px", px: 3 }}
                  >
                    {isGeneratingCorPdf ? "Generating PDF..." : "Download student's copy"}
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} lg={7}>
            <Card sx={cardSx}>
              <CardContent sx={{ p: 0 }}>
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ p: 2, pb: 1.5 }}><Box sx={iconBoxSx}><Campaign /></Box><Typography sx={{ fontSize: 18, fontWeight: 800, textTransform: "uppercase" }}>Announcements</Typography></Stack>
                <Box sx={{ px: 2 }}>
                  {firstAnnouncement?.file_path ? (
                    <Box sx={{ position: "relative", height: { xs: 180, md: 230 }, borderRadius: "8px", overflow: "hidden", cursor: "pointer" }} onClick={() => openLightbox(announcements.indexOf(firstAnnouncement))}>
                      <Box component="img" src={`${API_BASE_URL}/uploads/Announcement/${firstAnnouncement.file_path}`} alt={firstAnnouncement.title} sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    </Box>
                  ) : (
                    <Box sx={{ height: 180, borderRadius: "8px", border: `1px dashed ${softBorder}`, display: "grid", placeItems: "center", color: "text.secondary" }}>No active announcements.</Box>
                  )}
                  <Stack direction="row" spacing={1} justifyContent="center" sx={{ py: 1.5 }}>{(announcements.length ? announcements : [0]).slice(0, 6).map((a, index) => <Box key={a.id || index} sx={{ width: 9, height: 9, borderRadius: "50%", bgcolor: index === 0 ? maroon : "#d1d1d1" }} />)}</Stack>
                </Box>
                <Divider />
                <Box sx={{ px: 2, py: 1 }}>
                  {(announcements || []).slice(0, 3).map((a, index) => (
                    <Stack key={a.id || index} direction="row" spacing={2} alignItems="center" sx={{ py: 1.5, borderBottom: index < Math.min(announcements.length, 3) - 1 ? `1px solid ${softBorder}` : "none" }}>
                      <Box sx={{ ...iconBoxSx, borderRadius: "50%" }}>{index === 0 ? <PersonIcon /> : <SchoolIcon />}</Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{a.title}</Typography>
                        <Typography sx={{ color: "text.secondary", fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.content}</Typography>
                        {a.expires_at && <Typography sx={{ color: maroon, fontSize: 12, mt: 0.5 }}>{new Date(a.expires_at).toLocaleDateString("en-US")}</Typography>}
                      </Box>
                      <ArrowForwardIosIcon sx={{ color: "text.secondary", fontSize: 16 }} />
                    </Stack>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      <AnimatePresence>
        {lightboxOpen && announcements[lightboxIndex] && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} onClick={closeLightbox} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.88)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
            <IconButton onClick={(e) => { e.stopPropagation(); closeLightbox(); }} sx={{ position: "fixed", top: 18, right: 18, color: "#fff", bgcolor: "rgba(255,255,255,0.15)", "&:hover": { bgcolor: "rgba(255,255,255,0.3)" } }}><CloseIcon /></IconButton>
            <IconButton onClick={(e) => { e.stopPropagation(); lightboxPrev(); }} sx={{ position: "fixed", left: { xs: 16, md: 48 }, color: "#fff", bgcolor: "rgba(255,255,255,0.15)", "&:hover": { bgcolor: "rgba(255,255,255,0.3)" } }}><ArrowBackIosNewIcon /></IconButton>
            <Box onClick={(e) => e.stopPropagation()} sx={{ maxWidth: "86vw", maxHeight: "86vh", textAlign: "center", color: "#fff" }}>
              <Box component="img" src={`${API_BASE_URL}/uploads/Announcement/${announcements[lightboxIndex].file_path}`} alt={announcements[lightboxIndex].title} sx={{ maxWidth: "86vw", maxHeight: "74vh", objectFit: "contain", borderRadius: "12px", transform: `scale(${lightboxZoom})`, transition: "transform 0.25s ease" }} draggable={false} />
              <Typography sx={{ mt: 2, fontSize: 20, fontWeight: 700 }}>{announcements[lightboxIndex].title}</Typography>
              <Typography sx={{ mt: 0.5, color: "rgba(255,255,255,0.72)", fontSize: 14 }}>{announcements[lightboxIndex].content}</Typography>
            </Box>
            <IconButton onClick={(e) => { e.stopPropagation(); lightboxNext(); }} sx={{ position: "fixed", right: { xs: 16, md: 48 }, color: "#fff", bgcolor: "rgba(255,255,255,0.15)", "&:hover": { bgcolor: "rgba(255,255,255,0.3)" } }}><ArrowForwardIosIcon /></IconButton>
          </motion.div>
        )}
      </AnimatePresence>
    </Box>
  );

};

export default StudentDashboard;
