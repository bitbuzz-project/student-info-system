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
let yearFilter, sessionFilter;

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
    sessionFilter = document.getElementById('sessionFilter');
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
    
    if (sessionFilter) {
        sessionFilter.addEventListener('change', filterGrades);
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
// Load student grades with proper semester structure
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
        displaySimpleGrades();
        
    } catch (error) {
        console.error('Load grades error:', error);
        showAlert('خطأ في تحميل النقط - ' + error.message);
        
        document.getElementById('session1Container').innerHTML = '<div class="no-data"><i>❌</i>خطأ في تحميل النقط<br>Error: ' + error.message + '</div>';
        document.getElementById('session2Container').innerHTML = '<div class="no-data"><i>❌</i>خطأ في تحميل النقط<br>Error: ' + error.message + '</div>';
    }
}

function displaySimpleGrades() {
    const session1Container = document.getElementById('session1Container');
    const session2Container = document.getElementById('session2Container');
    
    if (!session1Container || !session2Container) return;
    
    if (!currentGrades || Object.keys(currentGrades).length === 0) {
        session1Container.innerHTML = '<div class="no-data"><i>📋</i>لا توجد نقط متاحة<br>No grades available</div>';
        session2Container.innerHTML = '<div class="no-data"><i>📋</i>لا توجد نقط متاحة<br>No grades available</div>';
        return;
    }
    
    const selectedYear = yearFilter ? yearFilter.value : '';
    
    // Collect all grades and organize by session
    const session1Grades = [];
    const session2Grades = [];
    
    Object.keys(currentGrades).forEach(function(studyYear) {
        if (selectedYear && studyYear !== selectedYear) return;
        
        const yearData = currentGrades[studyYear];
        
        // Process Session 1
        if (yearData['1']) {
            Object.values(yearData['1']).forEach(sessionTypeData => {
                Object.values(sessionTypeData).forEach(academicYearData => {
                    Object.values(academicYearData).forEach(semesterData => {
                        if (Array.isArray(semesterData)) {
                            session1Grades.push(...semesterData.map(grade => ({
                                ...grade,
                                study_year: studyYear
                            })));
                        }
                    });
                });
            });
        }
        
        // Process Session 2
        if (yearData['2']) {
            Object.values(yearData['2']).forEach(sessionTypeData => {
                Object.values(sessionTypeData).forEach(academicYearData => {
                    Object.values(academicYearData).forEach(semesterData => {
                        if (Array.isArray(semesterData)) {
                            session2Grades.push(...semesterData.map(grade => ({
                                ...grade,
                                study_year: studyYear
                            })));
                        }
                    });
                });
            });
        }
    });
    
    // Create table for Session 1
    session1Container.innerHTML = createGradeTable(session1Grades, 'Session 1');
    
    // Create table for Session 2
    session2Container.innerHTML = createGradeTable(session2Grades, 'Session 2');
}

// Helper function to create grade table
function createGradeTable(grades, sessionName) {
    if (!grades || grades.length === 0) {
        return `<div class="no-data"><i>📋</i>لا توجد نقط لـ ${sessionName}<br>No grades for ${sessionName}</div>`;
    }
    
    // Sort grades by semester number and subject name
    grades.sort((a, b) => {
        const semA = a.semester_number || 0;
        const semB = b.semester_number || 0;
        if (semA !== semB) return semA - semB;
        return (a.lib_elp || '').localeCompare(b.lib_elp || '');
    });
    
    let tableHTML = `
        <table class="grade-table" style="margin: 0;">
            <thead>
                <tr>
                    <th>السنة<br>Year</th>
                    <th>الفصل<br>Semester</th>
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
        const semesterName = grade.semester_number ? `S${grade.semester_number}` : 'N/A';
        
        tableHTML += '<tr>';
        tableHTML += `<td style="font-weight: 600;">${grade.study_year || 'N/A'}</td>`;
        tableHTML += `<td style="font-weight: 600; color: #3498db;">${semesterName}</td>`;
        tableHTML += `<td style="font-weight: 600;">${grade.cod_elp || 'N/A'}</td>`;
        tableHTML += `<td style="text-align: right; font-weight: 500;">${grade.lib_elp || 'N/A'}</td>`;
        
        if (hasArabicNames) {
            const arabicName = grade.lib_elp_arb && grade.lib_elp_arb.trim() !== '' 
                ? grade.lib_elp_arb 
                : grade.lib_elp || 'N/A';
            tableHTML += `<td style="text-align: right; font-weight: 500; color: #27ae60;">${arabicName}</td>`;
        }
        
        tableHTML += `<td><span class="grade-value ${gradeClass}">${gradeValue}</span></td>`;
        tableHTML += `<td style="font-weight: 600; color: #2c3e50;">${grade.cod_tre || '-'}</td>`;
        tableHTML += `<td><span style="background: ${typeColor}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.8em;">${typeLabel}</span></td>`;
        tableHTML += '</tr>';
    });
    
    tableHTML += '</tbody></table>';
    
    // Add summary info
    const totalGrades = grades.length;
    const passedGrades = grades.filter(g => g.not_elp && parseFloat(g.not_elp) >= 10).length;
    const failedGrades = grades.filter(g => g.not_elp && parseFloat(g.not_elp) < 10).length;
    const absentGrades = grades.filter(g => !g.not_elp).length;
    
    const summaryHTML = `
        <div style="padding: 15px; background: #f8f9fa; border-top: 1px solid #e0e0e0;">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; text-align: center;">
                <div>
                    <strong style="color: #3498db;">${totalGrades}</strong><br>
                    <small>إجمالي المواد<br>Total</small>
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
    
    return tableHTML + summaryHTML;
}

// Update the filter function to use the new display
function filterGrades() {
    displaySimpleGrades();
}

// Populate grade filters
function populateGradeFilters() {
    if (!currentGrades || !yearFilter || !sessionFilter) return;
    
    const years = Object.keys(currentGrades).sort(function(a, b) {
        return b - a;
    });
    const sessions = new Set();
    
    yearFilter.innerHTML = '<option value="">جميع السنوات - All Years</option>';
    
    years.forEach(function(year) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year + ' - ' + (parseInt(year) + 1);
        yearFilter.appendChild(option);
        
        Object.keys(currentGrades[year]).forEach(function(session) {
            sessions.add(session);
        });
    });
    
    sessionFilter.innerHTML = '<option value="">جميع الدورات - All Sessions</option>';
    Array.from(sessions).sort().forEach(function(session) {
        const option = document.createElement('option');
        option.value = session;
        option.textContent = getSessionName(session);
        sessionFilter.appendChild(option);
    });
}

// Get session name
function getSessionName(sessionCode) {
    const sessionNames = {
        '1': 'دورة عادية - Session Normale',
        '2': 'دورة الاستدراك - Session Rattrapage',
        'S1': 'الفصل الأول - Semester 1',
        'S2': 'الفصل الثاني - Semester 2'
    };
    return sessionNames[sessionCode] || 'الدورة ' + sessionCode + ' - Session ' + sessionCode;
}


// Populate grade statistics
function populateGradeStats() {
    const container = document.getElementById('gradeStatsContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!currentGradeStats || currentGradeStats.length === 0) {
        container.innerHTML = '<div class="no-data"><i>📊</i>لا توجد إحصائيات متاحة<br>No statistics available</div>';
        return;
    }
    
    // Group statistics by study year and session
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
    
    // Display statistics
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

function displayGrades() {
    const container = document.getElementById('gradesContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!currentGrades || Object.keys(currentGrades).length === 0) {
        container.innerHTML = '<div class="no-data"><i>📋</i>لا توجد نقط متاحة<br>No grades available</div>';
        return;
    }
    
    const selectedYear = yearFilter ? yearFilter.value : '';
    const selectedSession = sessionFilter ? sessionFilter.value : '';
    
    // Filter grades
    const filteredGrades = {};
    
    Object.keys(currentGrades).forEach(function(studyYear) {
        if (selectedYear && studyYear !== selectedYear) return;
        
        if (currentGrades[studyYear] && typeof currentGrades[studyYear] === 'object') {
            Object.keys(currentGrades[studyYear]).forEach(function(session) {
                if (selectedSession && session !== selectedSession) return;
                
                if (!filteredGrades[studyYear]) filteredGrades[studyYear] = {};
                filteredGrades[studyYear][session] = currentGrades[studyYear][session];
            });
        }
    });
    
    if (Object.keys(filteredGrades).length === 0) {
        container.innerHTML = '<div class="no-data"><i>📋</i>لا توجد نقط متاحة للفلترة المحددة<br>No grades available for selected filters</div>';
        return;
    }
    
    // Display filtered grades organized by study year > session > session type > academic year > semester
    Object.keys(filteredGrades).sort(function(a, b) {
        return b - a;
    }).forEach(function(studyYear) {
        const studyYearDiv = document.createElement('div');
        studyYearDiv.className = 'year-section';
        
        const studyYearHeader = document.createElement('div');
        studyYearHeader.className = 'year-header';
        studyYearHeader.textContent = 'السنة الدراسية ' + studyYear + ' - ' + (parseInt(studyYear) + 1);
        studyYearDiv.appendChild(studyYearHeader);
        
        Object.keys(filteredGrades[studyYear]).sort().forEach(function(session) {
            const sessionDiv = document.createElement('div');
            sessionDiv.className = 'session-section';
            
            const sessionHeader = document.createElement('div');
            sessionHeader.className = 'session-header';
            sessionHeader.textContent = getSessionName(session);
            sessionDiv.appendChild(sessionHeader);
            
            const sessionData = filteredGrades[studyYear][session];
            if (!sessionData || typeof sessionData !== 'object') {
                console.warn('Invalid session data for study year', studyYear, 'session', session);
                return;
            }
            
            // Group by session type (automne/printemps)
            Object.keys(sessionData).sort().forEach(function(sessionType) {
                const sessionTypeDiv = document.createElement('div');
                sessionTypeDiv.style.cssText = 'margin-bottom: 20px; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;';
                
                const sessionTypeHeader = document.createElement('div');
                sessionTypeHeader.style.cssText = `background: linear-gradient(135deg, ${sessionType === 'automne' ? '#e67e22' : '#3498db'} 0%, ${sessionType === 'automne' ? '#d35400' : '#2980b9'} 100%); color: white; padding: 15px; font-weight: 600; text-align: center; font-size: 1.1em;`;
                sessionTypeHeader.textContent = sessionType === 'automne' ? 
                    'دورة الخريف - Session Automne (S1, S3, S5)' : 
                    'دورة الربيع - Session Printemps (S2, S4, S6)';
                sessionTypeDiv.appendChild(sessionTypeHeader);
                
                const academicYearsData = sessionData[sessionType];
                if (!academicYearsData || typeof academicYearsData !== 'object') {
                    console.warn('Invalid academic years data for session type', sessionType);
                    return;
                }
                
                // Display each academic year within this session type
                Object.keys(academicYearsData).sort(function(a, b) {
                    return parseInt(a) - parseInt(b);
                }).forEach(function(academicYear) {
                    const academicYearDiv = document.createElement('div');
                    academicYearDiv.style.cssText = 'margin-bottom: 15px; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; margin: 10px;';
                    
                    const academicYearHeader = document.createElement('div');
                    academicYearHeader.style.cssText = 'background: linear-gradient(135deg, #34495e 0%, #2c3e50 100%); color: white; padding: 12px; font-weight: 600; text-align: center;';
                    academicYearHeader.textContent = getAcademicYearName(parseInt(academicYear));
                    academicYearDiv.appendChild(academicYearHeader);
                    
                    const semestersDiv = document.createElement('div');
                    semestersDiv.className = 'semester-grid';
                    semestersDiv.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fit, minmax(500px, 1fr)); gap: 20px; padding: 15px;';
                    
                    const semestersData = academicYearsData[academicYear];
                    
                    // Display each semester
                    Object.keys(semestersData).sort().forEach(function(semester) {
                        const semesterGrades = semestersData[semester];
                        
                        if (!semesterGrades || !Array.isArray(semesterGrades)) {
                            console.warn('Invalid semester grades data:', semesterGrades);
                            return;
                        }
                        
                        const semesterDiv = document.createElement('div');
                        semesterDiv.style.cssText = 'border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; background: white;';
                        
                        const semesterHeader = document.createElement('div');
                        semesterHeader.style.cssText = 'background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%); color: white; padding: 12px; font-weight: 600; text-align: center;';
                        semesterHeader.textContent = getSemesterName(semester);
                        semesterDiv.appendChild(semesterHeader);
                        
                        const table = document.createElement('table');
                        table.className = 'grade-table';
                        table.style.margin = '0';
                        
                        // Create table header - conditionally include Arabic column
                        let tableHTML = '<thead><tr>';
                        tableHTML += '<th>رمز المادة<br>Subject Code</th>';
                        tableHTML += '<th>اسم المادة<br>Subject Name</th>';
                        if (hasArabicNames) {
                            tableHTML += '<th>الاسم بالعربية<br>Arabic Name</th>';
                        }
                        tableHTML += '<th>النقطة<br>Grade</th>';
                        tableHTML += '<th>كود النتيجة<br>Result Code</th>';
                        tableHTML += '<th>النوع<br>Type</th>';
                        tableHTML += '</tr></thead><tbody>';
                        
                        // Group grades by modules and subjects
                        const modules = [];
                        const subjects = [];
                        
                        semesterGrades.forEach(function(grade) {
                            if (grade.is_module) {
                                modules.push(grade);
                            } else {
                                subjects.push(grade);
                            }
                        });
                        
                        // Display modules first, then subjects
                        const allGrades = [...modules, ...subjects];
                        
                        allGrades.forEach(function(grade) {
                            const gradeValue = grade.not_elp !== null && grade.not_elp !== undefined ? parseFloat(grade.not_elp).toFixed(2) : 'ABS';
                            const gradeClass = getGradeClass(grade.not_elp);
                            const typeLabel = grade.is_module ? 'وحدة - Module' : 'مادة - Subject';
                            const typeColor = grade.is_module ? '#9b59b6' : '#3498db';
                            
                            tableHTML += '<tr>';
                            tableHTML += '<td style="font-weight: 600;">' + (grade.cod_elp || 'N/A') + '</td>';
                            tableHTML += '<td style="text-align: right; font-weight: 500;">' + (grade.lib_elp || 'N/A') + '</td>';
                            
                            // Only include Arabic name column if Arabic names are available
                            if (hasArabicNames) {
                                const arabicName = grade.lib_elp_arb && grade.lib_elp_arb.trim() !== '' 
                                    ? grade.lib_elp_arb 
                                    : grade.lib_elp || 'N/A';
                                tableHTML += '<td style="text-align: right; font-weight: 500; color: #27ae60;">' + arabicName + '</td>';
                            }
                            
                            tableHTML += '<td><span class="grade-value ' + gradeClass + '">' + gradeValue + '</span></td>';
                            tableHTML += '<td style="font-weight: 600; color: #2c3e50;">' + (grade.cod_tre || '-') + '</td>';
                            tableHTML += '<td><span style="background: ' + typeColor + '; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.8em;">' + typeLabel + '</span></td>';
                            tableHTML += '</tr>';
                        });
                        
                        tableHTML += '</tbody>';
                        table.innerHTML = tableHTML;
                        
                        semesterDiv.appendChild(table);
                        semestersDiv.appendChild(semesterDiv);
                    });
                    
                    academicYearDiv.appendChild(semestersDiv);
                    sessionTypeDiv.appendChild(academicYearDiv);
                });
                
                sessionDiv.appendChild(sessionTypeDiv);
            });
            
            studyYearDiv.appendChild(sessionDiv);
        });
        
        container.appendChild(studyYearDiv);
    });
}

// Get academic year name
function getAcademicYearName(year) {
    const yearNames = {
        1: 'السنة الأولى - 1ère Année',
        2: 'السنة الثانية - 2ème Année', 
        3: 'السنة الثالثة - 3ème Année',
        4: 'السنة الرابعة - 4ème Année',
        5: 'السنة الخامسة - 5ème Année',
        6: 'السنة السادسة - 6ème Année'
    };
    
    return yearNames[year] || 'السنة ' + year + ' - Année ' + year;
}

// Get semester name in Arabic/French
function getSemesterName(semesterCode) {
    const semesterNames = {
        'S1': 'الفصل الأول - Semestre 1',
        'S2': 'الفصل الثاني - Semestre 2',
        'S3': 'الفصل الثالث - Semestre 3', 
        'S4': 'الفصل الرابع - Semestre 4',
        'S5': 'الفصل الخامس - Semestre 5',
        'S6': 'الفصل السادس - Semestre 6'
    };
    
    return semesterNames[semesterCode] || semesterCode;
}

// Get grade CSS class
function getGradeClass(grade) {
    if (grade === null || grade === undefined) return 'grade-absent';
    const numGrade = parseFloat(grade);
    if (numGrade >= 10) return 'grade-pass';
    return 'grade-fail';
}

// Filter grades
function filterGrades() {
    displayGrades();
}

// Populate student information
function populateStudentInfo(student) {
    const elements = {
        'studentCode': student.cod_etu || '-',
        'fullName': student.nom_complet || '-',
        'arabicName': student.nom_arabe || '-',
        'cinNumber': student.cin || '-',
        'dateOfBirth': formatDate(student.date_naissance) || '-',
        'placeOfBirth': (student.lieu_naissance || '-') + (student.lieu_naissance_arabe ? ' - ' + student.lieu_naissance_arabe : ''),
        'gender': student.sexe === 'M' ? 'ذكر - Male' : student.sexe === 'F' ? 'أنثى - Female' : '-',
        'specialization': student.etape || '-',
        'license': student.licence_etape || '-',
        'academicYear': student.annee_universitaire || '-',
        'diploma': student.diplome || '-',
        'cycleInscriptions': student.nombre_inscriptions_cycle || '0',
        'stageInscriptions': student.nombre_inscriptions_etape || '0',
        'diplomaInscriptions': student.nombre_inscriptions_diplome || '0',
        'lastUpdate': formatDate(student.derniere_mise_a_jour) || '-'
    };
    
    Object.keys(elements).forEach(function(id) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = elements[id];
        }
    });
}

// Format date
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

// Handle logout
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

// Check token validity
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
