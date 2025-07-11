// Configuration
const API_BASE_URL = 'http://localhost:3000';

// Global variables
let authToken = localStorage.getItem('authToken');
let currentTab = 'info';
let currentGrades = null;
let currentGradeStats = null;

// DOM Elements
let loginSection, studentInfo, loadingSection, loginForm, logoutBtn;
let alertContainer, showInfoBtn, showGradesBtn, personalInfoTab, gradesTab;
let yearFilter, semesterTypeFilter, sessionTypeFilter, filteredGradesContainer;

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    initializeElements();
    testAPIConnection();
    
    if (authToken) {
        loadStudentInfo();
    }
    
    setupEventListeners();
});

// Initialize DOM elements
function initializeElements() {
    loginSection = document.getElementById('loginSection');
    studentInfo = document.getElementById('studentInfo');
    loadingSection = document.getElementById('loadingSection');
    loginForm = document.getElementById('loginForm');
    logoutBtn = document.getElementById('logoutBtn');
    alertContainer = document.getElementById('alertContainer');
    showInfoBtn = document.getElementById('showInfoBtn');
    showGradesBtn = document.getElementById('showGradesBtn');
    personalInfoTab = document.getElementById('personalInfoTab');
    gradesTab = document.getElementById('gradesTab');
    yearFilter = document.getElementById('yearFilter');
    semesterTypeFilter = document.getElementById('semesterTypeFilter'); 
    sessionTypeFilter = document.getElementById('sessionTypeFilter');   
    filteredGradesContainer = document.getElementById('filteredGradesContainer');
}

// Setup event listeners
function setupEventListeners() {
    if (showInfoBtn) {
        showInfoBtn.addEventListener('click', function() {
            switchTab('info');
        });
    }
    
    if (showGradesBtn) {
        showGradesBtn.addEventListener('click', function() {
            switchTab('grades');
        });
    }
    
    if (yearFilter) {
        yearFilter.addEventListener('change', filterGrades);
    }
    
    // Add event listeners for new filters
    if (semesterTypeFilter) {
        semesterTypeFilter.addEventListener('change', filterGrades);
    }
    
    if (sessionTypeFilter) {
        sessionTypeFilter.addEventListener('change', filterGrades);
    }
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Auto-logout check
    setInterval(checkTokenValidity, 300000);
}

// Test API connection
async function testAPIConnection() {
    try {
        console.log('Testing API connection to:', API_BASE_URL);
        const response = await fetch(API_BASE_URL + '/health');
        const data = await response.json();
        console.log('API health check successful:', data);
        return true;
    } catch (error) {
        console.error('API connection failed:', error);
        showAlert('خطأ في الاتصال بالخادم - Server connection error');
        return false;
    }
}

// Switch between tabs
function switchTab(tab) {
    currentTab = tab;
    
    if (tab === 'info') {
        if (personalInfoTab) personalInfoTab.style.display = 'block';
        if (gradesTab) gradesTab.style.display = 'none';
        if (showInfoBtn) showInfoBtn.classList.add('active');
        if (showGradesBtn) showGradesBtn.classList.remove('active');
    } else if (tab === 'grades') {
        if (personalInfoTab) personalInfoTab.style.display = 'none';
        if (gradesTab) gradesTab.style.display = 'block';
        if (showInfoBtn) showInfoBtn.classList.remove('active');
        if (showGradesBtn) showGradesBtn.classList.add('active');
        
        if (!currentGrades) {
            loadStudentGrades();
        } else {
            // If grades are already loaded, just apply current filters
            filterGrades();
        }
    }
}

// Show alert
function showAlert(message, type) {
    if (type === undefined) {
        type = 'error';
    }
    
    if (alertContainer) {
        alertContainer.innerHTML = '<div class="alert alert-' + type + '">' + message + '</div>';
        setTimeout(function() {
            alertContainer.innerHTML = '';
        }, 5000);
    }
}

// Show/hide sections
function showLoading() {
    if (loginSection) loginSection.style.display = 'none';
    if (studentInfo) studentInfo.style.display = 'none';
    if (loadingSection) loadingSection.style.display = 'block';
}

function hideLoading() {
    if (loadingSection) loadingSection.style.display = 'none';
}

function showLogin() {
    hideLoading();
    if (loginSection) loginSection.style.display = 'block';
    if (studentInfo) studentInfo.style.display = 'none';
}

function showStudentInfo() {
    hideLoading();
    if (loginSection) loginSection.style.display = 'none';
    if (studentInfo) studentInfo.style.display = 'block';
}

// Handle login
async function handleLogin(e) {
    e.preventDefault();
    
    const cinInput = document.getElementById('cin');
    const passwordInput = document.getElementById('password');
    
    if (!cinInput || !passwordInput) {
        showAlert('Form elements not found');
        return;
    }
    
    const cin = cinInput.value.trim();
    const password = passwordInput.value.trim();
    
    if (!cin || !password) {
        showAlert('يرجى إدخال جميع البيانات المطلوبة - Please enter all required fields');
        return;
    }
    
    showLoading();
    
    try {
        const response = await fetch(API_BASE_URL + '/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ cin: cin, password: password }),
        });
        
        const data = await response.json();
        
        if (response.ok) {
            authToken = data.token;
            localStorage.setItem('authToken', authToken);
            showAlert('تم تسجيل الدخول بنجاح - Login successful', 'success');
            setTimeout(function() {
                loadStudentInfo();
            }, 1000);
        } else {
            showLogin();
            showAlert(data.error || 'خطأ في تسجيل الدخول - Login failed');
        }
    } catch (error) {
        showLogin();
        showAlert('خطأ في الاتصال بالخادم - Server connection error');
        console.error('Login error:', error);
    }
}

// Load student information
async function loadStudentInfo() {
    if (!authToken) {
        showLogin();
        return;
    }
    
    showLoading();
    
    try {
        const response = await fetch(API_BASE_URL + '/student/me', {
            headers: {
                'Authorization': 'Bearer ' + authToken,
            },
        });
        
        const data = await response.json();
        
        if (response.ok) {
            populateStudentInfo(data.student);
            switchTab('info');
            showStudentInfo();
        } else {
            localStorage.removeItem('authToken');
            authToken = null;
            showLogin();
            showAlert(data.error || 'خطأ في تحميل المعلومات - Failed to load information');
        }
    } catch (error) {
        showLogin();
        showAlert('خطأ في الاتصال بالخادم - Server connection error');
        console.error('Load student info error:', error);
    }
}

// Global variable to track if Arabic names are available
let hasArabicNames = false;

// Load student grades
async function loadStudentGrades() {
    if (!authToken) {
        showLogin();
        return;
    }
    
    try {
        console.log('Loading student grades...');
        
        const healthCheck = await fetch(API_BASE_URL + '/health');
        if (!healthCheck.ok) {
            throw new Error('Server not responding');
        }
        
        const gradesResponse = await fetch(API_BASE_URL + '/student/grades', {
            headers: {
                'Authorization': 'Bearer ' + authToken,
                'Content-Type': 'application/json'
            },
        });
        
        if (!gradesResponse.ok) {
            const errorText = await gradesResponse.text();
            throw new Error('Grades API error: ' + gradesResponse.status + ' - ' + errorText);
        }
        
        const gradesData = await gradesResponse.json();
        
        const statsResponse = await fetch(API_BASE_URL + '/student/grade-stats', {
            headers: {
                'Authorization': 'Bearer ' + authToken,
                'Content-Type': 'application/json'
            },
        });
        
        if (!statsResponse.ok) {
            const errorText = await statsResponse.text();
            throw new Error('Stats API error: ' + statsResponse.status + ' - ' + errorText);
        }
        
        const statsData = await statsResponse.json();
        
        currentGrades = gradesData.grades;
        currentGradeStats = statsData.statistics;
        hasArabicNames = gradesData.has_arabic_names || false;
        
        populateGradeFilters();
        populateGradeStats(); 
        
        // Initial call to filterGrades, will now display message if filters are not fully selected
        filterGrades();
        
    } catch (error) {
        console.error('Load grades error:', error);
        showAlert('خطأ في تحميل النقط - ' + error.message);
        
        if (filteredGradesContainer) {
            filteredGradesContainer.innerHTML = '<div class="no-data"><i>❌</i>خطأ في تحميل النقط<br>Error: ' + error.message + '</div>';
        }
    }
}

// Helper function to fix Arabic text encoding
function fixArabicText(text) {
    if (!text || typeof text !== 'string') return text;
    
    // Handle common encoding issues
    try {
        if (text.includes('Ã') || text.includes('¡') || text.includes('¢')) {
            return text
                .replace(/Ã¡/g, 'ا')
                .replace(/Ã¢/g, 'ب')
                .replace(/Ã£/g, 'ت')
                .replace(/Ã¤/g, 'ث')
                .replace(/Ã¥/g, 'ج')
                .replace(/Ã¦/g, 'ح')
                .replace(/Ã§/g, 'خ')
                .replace(/Ã¨/g, 'د')
                .replace(/Ã©/g, 'ذ')
                .replace(/Ãª/g, 'ر')
                .replace(/Ã«/g, 'ز')
                .replace(/Ã¬/g, 'س')
                .replace(/Ã­/g, 'ش')
                .replace(/Ã®/g, 'ص')
                .replace(/Ã¯/g, 'ض')
                .replace(/Ã°/g, 'ط')
                .replace(/Ã±/g, 'ظ')
                .replace(/Ã²/g, 'ع')
                .replace(/Ã³/g, 'غ')
                .replace(/Ã´/g, 'ف')
                .replace(/Ãµ/g, 'ق')
                .replace(/Ã¶/g, 'ك')
                .replace(/Ã·/g, 'ل')
                .replace(/Ã¸/g, 'م')
                .replace(/Ã¹/g, 'ن')
                .replace(/Ãº/g, 'ه')
                .replace(/Ã»/g, 'و')
                .replace(/Ã¼/g, 'ي')
                .replace(/Ã½/g, 'ة')
                .replace(/Ã¿/g, 'ى');
        }
        
        if (text.includes('Ã') || text.includes('¡') || text.includes('¢')) {
            return '';
        }
        
        return text;
    } catch (error) {
        console.warn('Error fixing Arabic text:', error);
        return text;
    }
}

// Filters and renders grades based on selected filters
function filterGrades() {
    console.log('--- filterGrades called ---');
    if (!currentGrades || !filteredGradesContainer) {
        console.log("filterGrades: currentGrades or filteredGradesContainer not ready.", { currentGrades, filteredGradesContainer });
        return;
    }

    const selectedYear = yearFilter ? yearFilter.value : '';
    const selectedSemesterType = semesterTypeFilter ? semesterTypeFilter.value : '';
    const selectedSessionType = sessionTypeFilter ? sessionTypeFilter.value : '';

    console.log("Filter selections:", { selectedYear, selectedSemesterType, selectedSessionType });

    // NEW LOGIC: Only proceed if all three main filters have a specific selection
    if (!selectedYear || !selectedSemesterType || !selectedSessionType) {
        console.log("Not all main filters selected. Clearing grades container.");
        if (filteredGradesContainer) {
            filteredGradesContainer.innerHTML = `
                <div class="no-data">
                    <i>👆</i>
                    يرجى تحديد السنة ونوع الدورة والدورة لعرض النقط.<br>
                    Please select Academic Year, Session Type, and Session to display grades.
                </div>
            `;
        }
        return; // Stop function execution
    }

    let extractedGrades = []; 

    Object.keys(currentGrades).forEach(function(studyYear) {
        if (studyYear !== selectedYear) { // Only process the selected year
            console.log(`Skipping year ${studyYear}, processing only ${selectedYear}.`);
            return;
        }

        const yearData = currentGrades[studyYear];
        
        ['1', '2'].forEach(function(sessionNumber) { 
            if (yearData[sessionNumber]) {
                extractGradesFromSessionData(yearData[sessionNumber], extractedGrades, studyYear, sessionNumber);
            }
        });
    });
    console.log("Extracted grades (from selected year only):", extractedGrades.length);


    // Apply semester type and session type filters
    const finalFilteredGrades = extractedGrades.filter(grade => {
        const matchesSemesterType = grade.session_type === selectedSemesterType;
        const matchesSessionType = grade.session_number === selectedSessionType;
        return matchesSemesterType && matchesSessionType;
    });
    console.log("Grades after Semester Type and Session Type filters (strict match):", finalFilteredGrades.length);


    // Handle Rattrapage logic: if Session 2 is selected, remove modules already passed in Session 1
    let gradesToDisplay = finalFilteredGrades;
    if (selectedSessionType === '2') {
        console.log("Applying Rattrapage logic for Session 2.");
        // For rattrapage comparison, we need all session 1 grades for the selected year and semester type
        const session1GradesForComparison = extractedGrades.filter(g => 
            g.session_number === '1' && 
            g.study_year === selectedYear &&
            g.session_type === selectedSemesterType
        );
        console.log("Session 1 grades for comparison:", session1GradesForComparison.length);
        gradesToDisplay = filterSession2Grades(session1GradesForComparison, finalFilteredGrades);
        console.log("Grades after Rattrapage filter:", gradesToDisplay.length);
    }

    renderGrades(gradesToDisplay, selectedSemesterType, selectedSessionType);
    console.log("Rendered grades count:", gradesToDisplay.length);
    console.log('--- filterGrades finished ---');
}


// Helper function to extract grades from session data structure
function extractGradesFromSessionData(sessionData, gradesArray, studyYear, sessionNumber) {
    if (!sessionData || typeof sessionData !== 'object') return;
    
    Object.keys(sessionData).forEach(function(sessionType) { 
        const sessionTypeData = sessionData[sessionType];
        if (!sessionTypeData || typeof sessionTypeData !== 'object') return;
        
        Object.keys(sessionTypeData).forEach(function(academicYear) { 
            const academicYearData = sessionTypeData[academicYear];
            if (!academicYearData || typeof academicYearData !== 'object') return;
            
            Object.keys(academicYearData).forEach(function(semester) { 
                const semesterGrades = academicYearData[semester];
                if (!Array.isArray(semesterGrades)) return;
                
                semesterGrades.forEach(function(grade) {
                    gradesArray.push({
                        ...grade,
                        study_year: studyYear,
                        session_number: sessionNumber, 
                        session_type: sessionType,     
                        academic_year: academicYear,   
                        semester: semester             
                    });
                });
            });
        });
    });
}

// Helper function to filter Session 2 grades - remove modules already passed in Session 1
function filterSession2Grades(session1Grades, session2Grades) {
    const passedInSession1 = new Map();
    
    session1Grades.forEach(function(grade) {
        const moduleKey = `${grade.study_year}_${grade.cod_elp}`;
        const gradeValue = parseFloat(grade.not_elp);
        
        if ((grade.not_elp !== null && gradeValue >= 10) || grade.cod_tre === 'V') {
            passedInSession1.set(moduleKey, true);
        }
    });
    
    const filteredGrades = session2Grades.filter(function(grade) {
        const moduleKey = `${grade.study_year}_${grade.cod_elp}`;
        
        return !passedInSession1.has(moduleKey);
    });
    
    return filteredGrades;
}

// Renamed and updated display function to handle combined filters
function renderGrades(gradesToDisplay, selectedSemesterType, selectedSessionType) {
    if (!filteredGradesContainer) return;

    if (!gradesToDisplay || gradesToDisplay.length === 0) {
        filteredGradesContainer.innerHTML = '<div class="no-data"><i>📋</i>لا توجد نقط متاحة للفلاتر المختارة<br>No grades available for selected filters</div>';
        return;
    }

    const gradesByAcademicYear = {};
    gradesToDisplay.forEach(grade => {
        const academicYear = grade.academic_year;
        if (!gradesByAcademicYear[academicYear]) {
            gradesByAcademicYear[academicYear] = [];
        }
        gradesByAcademicYear[academicYear].push(grade);
    });

    let htmlContent = '';

    Object.keys(gradesByAcademicYear).sort((a, b) => b - a).forEach(academicYear => {
        const yearGrades = gradesByAcademicYear[academicYear];
        
        htmlContent += `
            <div class="year-section">
                <div class="year-header">
                    السنة الجامعية ${academicYear} - Academic Year ${academicYear}
                    ${selectedSemesterType ? (selectedSemesterType === 'automne' ? ' (الدورة الخريفية - Autumn Session)' : ' (الدورة الربيعية - Spring Session)') : ''}
                    ${selectedSessionType ? (selectedSessionType === '1' ? ' (عادية - Normale)' : ' (استدراكية - Rattrapage)') : ''}
                </div>
                <div style="padding: 20px;">
                    ${createSessionDisplayWithSemesters(yearGrades, 'النتائج')}
                </div>
            </div>
        `;
    });

    filteredGradesContainer.innerHTML = htmlContent;
}

function createSessionDisplayWithSemesters(grades, sessionTitle) {
    if (!grades || grades.length === 0) {
        return `<div class="no-data"><i>📋</i>لا توجد نقط لـ ${sessionTitle}<br>No grades for ${sessionTitle}</div>`;
    }
    
    const gradesBySemester = {};
    
    grades.forEach(function(grade) {
        let semesterKey = 'Unknown';
        
        if (grade.semester_number) {
            semesterKey = `S${grade.semester_number}`;
        } else if (grade.semester) {
            semesterKey = grade.semester;
        }
        
        if (!gradesBySemester[semesterKey]) {
            gradesBySemester[semesterKey] = [];
        }
        
        gradesBySemester[semesterKey].push(grade);
    });
    
    const sortedSemesters = Object.keys(gradesBySemester).sort((a, b) => {
        const numA = parseInt(a.replace('S', '')) || 0;
        const numB = parseInt(b.replace('S', '')) || 0;
        return numA - numB;
    });
    
    let sessionHTML = '';
    
    sortedSemesters.forEach(function(semester) {
        const semesterGrades = gradesBySemester[semester];
        
        semesterGrades.sort((a, b) => {
            const codeA = a.cod_elp || '';
            const codeB = b.cod_elp || '';
            return codeA.localeCompare(codeB, undefined, {numeric: true});
        });
        
        const semesterName = getSemesterDisplayName(semester);
        const semesterColor = getSemesterColor(semester);
        
        sessionHTML += `
            <div style="margin-bottom: 30px;">
                <div style="background: ${semesterColor}; color: white; padding: 15px; border-radius: 10px 10px 0 0; text-align: center; font-weight: 600; font-size: 1.1em;">
                    ${semesterName}
                </div>
                <div style="border: 2px solid ${semesterColor}; border-top: none; border-radius: 0 0 10px 10px;">
                    ${createSemesterTable(semesterGrades)}
                    ${createSemesterSummary(semesterGrades)}
                </div>
            </div>
        `;
    });
    
    return sessionHTML;
}

function getSemesterDisplayName(semester) {
    const semesterNames = {
        'S1': 'الفصل الأول - Semester 1',
        'S2': 'الفصل الثاني - Semester 2',
        'S3': 'الفصل الثالث - Semester 3',
        'S4': 'الفصل الرابع - Semester 4',
        'S5': 'الفصل الخامس - Semester 5',
        'S6': 'الفصل السادس - Semester 6'
    };
    
    return semesterNames[semester] || semester;
}

function getSemesterColor(semester) {
    const colors = {
        'S1': '#3498db',
        'S2': '#e67e22',
        'S3': '#2ecc71',
        'S4': '#9b59b6',
        'S5': '#e74c3c',
        'S6': '#34495e'
    };
    
    return colors[semester] || '#95a5a6';
}

function createSemesterTable(grades) {
    let tableHTML = `
        <table class="grade-table" style="margin: 0;">
            <thead>
                <tr>
                    <th>السنة<br>Year</th>
                    <th>رمز المادة<br>Code</th>
                    <th>اسم المادة<br>Subject Name</th>
    `;
    
    if (hasArabicNames) {
        tableHTML += '<th>الاسم بالعربية<br>Arabic Name</th>';
    }
    
    tableHTML += `
                    <th>النقطة<br>Grade</th>
                    <th>النتيجة<br>Result</th>
                    <th>النوع<br>Type</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    grades.forEach(function(grade) {
        const gradeValue = grade.not_elp !== null && grade.not_elp !== undefined ? 
            parseFloat(grade.not_elp).toFixed(2) : 'ABS';
        const gradeClass = getGradeClass(grade.not_elp);
        const typeLabel = grade.is_module ? 'وحدة - Module' : 'مادة - Subject';
        const typeColor = grade.is_module ? '#9b59b6' : '#3498db';
        
        let arabicName = '';
        if (hasArabicNames && grade.lib_elp_arb) {
            arabicName = fixArabicText(grade.lib_elp_arb);
            if (!arabicName || arabicName.includes('Ã')) {
                arabicName = grade.lib_elp || 'غير متوفر';
            }
        }
        
        tableHTML += '<tr>';
        tableHTML += `<td style="font-weight: 600;">${grade.study_year || 'N/A'}</td>`;
        tableHTML += `<td style="font-weight: 600; color: #2c3e50;">${grade.cod_elp || 'N/A'}</td>`;
        tableHTML += `<td style="text-align: right; font-weight: 500;">${grade.lib_elp || 'N/A'}</td>`;
        
        if (hasArabicNames) {
            tableHTML += `<td style="text-align: right; font-weight: 500; color: #27ae60; direction: rtl;">${arabicName}</td>`;
        }
        
        tableHTML += `<td><span class="grade-value ${gradeClass}">${gradeValue}</span></td>`;
        tableHTML += `<td style="font-weight: 600; color: #2c3e50;">${grade.cod_tre || '-'}</td>`;
        tableHTML += `<td><span style="background: ${typeColor}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.8em;">${typeLabel}</span></td>`;
        tableHTML += '</tr>';
    });
    
    tableHTML += '</tbody></table>';
    return tableHTML;
}

function createSemesterSummary(grades) {
    const totalGrades = grades.length;
    const passedGrades = grades.filter(g => g.not_elp !== null && parseFloat(g.not_elp) >= 10).length;
    const failedGrades = grades.filter(g => g.not_elp !== null && parseFloat(g.not_elp) < 10).length;
    const absentGrades = grades.filter(g => g.not_elp === null || g.not_elp === undefined).length;
    
    return `
        <div style="padding: 15px; background: #f8f9fa; border-top: 1px solid #e0e0e0;">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; text-align: center;">
                <div>
                    <strong style="color: #3498db;">${totalGrades}</strong><br>
                    <small>إجمالي<br>Total</small>
                </div>
                <div>
                    <strong style="color: #27ae60;">${passedGrades}</strong><br>
                    <small>نجح<br>Passed</small>
                </div>
                <div>
                    <strong style="color: #e74c3c;">${failedGrades}</strong><br>
                    <small>رسب<br>Failed</small>
                </div>
                <div>
                    <strong style="color: #95a5a6;">${absentGrades}</strong><br>
                    <small>غائب<br>Absent</small>
                </div>
            </div>
        </div>
    `;
}

function populateGradeFilters() {
    if (!currentGrades || !yearFilter) return;
    
    const years = Object.keys(currentGrades).sort(function(a, b) {
        return b - a;
    });
    
    yearFilter.innerHTML = '<option value="">جميع السنوات - All Years</option>';
    
    years.forEach(function(year) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year + ' - ' + (parseInt(year) + 1);
        yearFilter.appendChild(option);
    });
}

function populateGradeStats() {
    const container = document.getElementById('gradeStatsContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!currentGradeStats || currentGradeStats.length === 0) {
        container.innerHTML = '<div class="no-data"><i>📊</i>لا توجد إحصائيات متاحة<br>No statistics available</div>';
        return;
    }
    
    const statsByYearAndSession = {};
    
    currentGradeStats.forEach(function(stat) {
        const year = stat.academic_year;
        const session = stat.session;
        
        if (!statsByYearAndSession[year]) {
            statsByYearAndSession[year] = {};
        }
        
        if (!statsByYearAndSession[year][session]) {
            statsByYearAndSession[year][session] = {
                total_subjects: 0,
                passed_subjects: 0,
                failed_subjects: 0,
                absent_subjects: 0,
                total_grades: 0,
                semester_details: []
            };
        }
        
        const yearSessionStats = statsByYearAndSession[year][session];
        yearSessionStats.total_subjects += stat.total_subjects;
        yearSessionStats.passed_subjects += stat.passed_subjects;
        yearSessionStats.failed_subjects += stat.failed_subjects;
        yearSessionStats.absent_subjects += stat.absent_subjects;
        
        if (stat.average_grade) {
            yearSessionStats.total_grades += parseFloat(stat.average_grade) * stat.total_subjects;
        }
        
        yearSessionStats.semester_details.push({
            semester_number: stat.semester_number,
            session_type: stat.session_type,
            average_grade: stat.average_grade,
            total_subjects: stat.total_subjects,
            passed_subjects: stat.passed_subjects,
            failed_subjects: stat.failed_subjects
        });
    });
    
    Object.keys(statsByYearAndSession).sort((a, b) => b - a).forEach(function(year) {
        Object.keys(statsByYearAndSession[year]).sort().forEach(function(session) {
            const stats = statsByYearAndSession[year][session];
            const averageGrade = stats.total_subjects > 0 ? 
                (stats.total_grades / stats.total_subjects).toFixed(2) : 'N/A';
            
            const statCard = document.createElement('div');
            statCard.className = 'year-section';
            
            let semesterDetailsHtml = '';
            stats.semester_details.forEach(function(detail) {
                const sessionTypeLabel = detail.session_type === 'automne' ? 
                    'خريف - Automne' : 'ربيع - Printemps';
                
                semesterDetailsHtml += `
                    <div style="background: #f8f9fa; padding: 10px; margin: 5px 0; border-radius: 5px; border-left: 3px solid ${detail.session_type === 'automne' ? '#e67e22' : '#3498db'};">
                        <strong>S${detail.semester_number} (${sessionTypeLabel})</strong><br>
                        <small>المواد: ${detail.total_subjects} | نجح: ${detail.passed_subjects} | رسب: ${detail.failed_subjects} | معدل: ${detail.average_grade || 'N/A'}</small>
                    </div>
                `;
            });
            
            statCard.innerHTML = `
                <div class="year-header">
                    السنة الدراسية ${year} - ${parseInt(year) + 1} | ${getSessionName(session)}
                </div>
                <div style="padding: 20px;">
                    <div class="stats-summary">
                        <div class="summary-card">
                            <div class="summary-number" style="color: #3498db;">${stats.total_subjects}</div>
                            <div class="summary-label">إجمالي المواد<br>Total Subjects</div>
                        </div>
                        <div class="summary-card">
                            <div class="summary-number" style="color: #27ae60;">${stats.passed_subjects}</div>
                            <div class="summary-label">مواد منجحة<br>Passed</div>
                        </div>
                        <div class="summary-card">
                            <div class="summary-number" style="color: #e74c3c;">${stats.failed_subjects}</div>
                            <div class="summary-label">مواد راسبة<br>Failed</div>
                        </div>
                        <div class="summary-card">
                            <div class="summary-number" style="color: #9b59b6;">${averageGrade}</div>
                            <div class="summary-label">المعدل العام<br>Average</div>
                        </div>
                    </div>
                    <div style="margin-top: 15px;">
                        <h4 style="margin-bottom: 10px; color: #2c3e50;">تفاصيل الفصول - Semester Details</h4>
                        ${semesterDetailsHtml}
                    </div>
                </div>
            `;
            container.appendChild(statCard);
        });
    });
}

function getGradeClass(grade) {
    if (grade === null || grade === undefined) return 'grade-absent';
    const numGrade = parseFloat(grade);
    if (numGrade >= 10) return 'grade-pass';
    return 'grade-fail';
}

function populateStudentInfo(student) {
    const elements = {
        'studentCode': student.cod_etu || '-',
        'fullName': student.nom_complet || '-', // Corrected: Use API-provided 'nom_complet'
        'arabicName': student.nom_arabe || '-',   // Corrected: Use API-provided 'nom_arabe'
        'cinNumber': student.cin || '-',          // Corrected: Use API-provided 'cin'
        'dateOfBirth': formatDate(student.date_naissance) || '-', // Corrected: Use API-provided 'date_naissance'
        'placeOfBirth': (student.lieu_naissance || '-') + (student.lieu_naissance_arabe ? ' - ' + student.lieu_naissance_arabe : ''), // Corrected: Use API-provided names
        'gender': student.sexe || '-',          // Corrected: Use API-provided 'sexe'
        'specialization': student.etape || '-',   // Corrected: Use API-provided 'etape'
        'license': student.licence_etape || '-',  // Corrected: Use API-provided 'licence_etape'
        'academicYear': student.annee_universitaire || '-', // Corrected: Use API-provided 'annee_universitaire'
        'diploma': student.diplome || '-',        // Corrected: Use API-provided 'diplome'
        'cycleInscriptions': student.nombre_inscriptions_cycle || '0', // Corrected: Use API-provided name
        'stageInscriptions': student.nombre_inscriptions_etape || '0', // Corrected: Use API-provided name
        'diplomaInscriptions': student.nombre_inscriptions_diplome || '0', // Corrected: Use API-provided name
        'lastUpdate': formatDate(student.derniere_mise_a_jour) || '-' // Corrected: Use API-provided 'derniere_mise_a_jour'
    };
    
    Object.keys(elements).forEach(function(id) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = elements[id];
        }
    });
}

function formatDate(dateString) {
    if (!dateString) return '-';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('ar-MA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch (error) {
        return dateString;
    }
}

function handleLogout() {
    localStorage.removeItem('authToken');
    authToken = null;
    currentGrades = null;
    currentGradeStats = null;
    
    const form = document.getElementById('loginForm');
    if (form) {
        form.reset();
    }
    
    showLogin();
    showAlert('تم تسجيل الخروج بنجاح - Logged out successfully', 'success');
}

function checkTokenValidity() {
    if (authToken && studentInfo && studentInfo.style.display === 'block') {
        fetch(API_BASE_URL + '/student/me', {
            headers: {
                'Authorization': 'Bearer ' + authToken,
            },
        })
        .then(function(response) {
            if (!response.ok) {
                localStorage.removeItem('authToken');
                authToken = null;
                showLogin();
                showAlert('انتهت صلاحية الجلسة - Session expired');
            }
        })
        .catch(function(error) {
            console.error('Token check error:', error);
        });
    }
}