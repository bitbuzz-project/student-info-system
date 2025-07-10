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
        displayGrades();
        
    } catch (error) {
        console.error('Load grades error:', error);
        showAlert('خطأ في تحميل النقط - ' + error.message);
        
        const container = document.getElementById('gradesContainer');
        if (container) {
            container.innerHTML = '<div class="no-data"><i>❌</i>خطأ في تحميل النقط<br>Error: ' + error.message + '</div>';
        }
    }
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
    
    currentGradeStats.forEach(function(stat) {
        const statCard = document.createElement('div');
        statCard.className = 'year-section';
        statCard.innerHTML = '<div class="year-header">السنة الدراسية ' + stat.academic_year + ' - ' + (parseInt(stat.academic_year) + 1) + ' | ' + getSessionName(stat.session) + '</div><div style="padding: 20px;"><div class="stats-summary"><div class="summary-card"><div class="summary-number" style="color: #3498db;">' + stat.total_subjects + '</div><div class="summary-label">إجمالي المواد<br>Total Subjects</div></div><div class="summary-card"><div class="summary-number" style="color: #27ae60;">' + stat.passed_subjects + '</div><div class="summary-label">مواد منجحة<br>Passed</div></div><div class="summary-card"><div class="summary-number" style="color: #e74c3c;">' + stat.failed_subjects + '</div><div class="summary-label">مواد راسبة<br>Failed</div></div><div class="summary-card"><div class="summary-number" style="color: #9b59b6;">' + (stat.average_grade || 'N/A') + '</div><div class="summary-label">المعدل العام<br>Average</div></div></div></div>';
        container.appendChild(statCard);
    });
}

// Display grades with proper academic year and semester organization
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
    
    // Display filtered grades organized by study year > session > academic year > semester
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
            
            const academicYearsData = filteredGrades[studyYear][session];
            if (!academicYearsData || typeof academicYearsData !== 'object') {
                console.warn('Invalid academic years data for study year', studyYear, 'session', session);
                return;
            }
            
            // Display each academic year
            Object.keys(academicYearsData).sort(function(a, b) {
                return parseInt(a) - parseInt(b);
            }).forEach(function(academicYear) {
                const academicYearDiv = document.createElement('div');
                academicYearDiv.style.cssText = 'margin-bottom: 20px; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;';
                
                const academicYearHeader = document.createElement('div');
                academicYearHeader.style.cssText = 'background: linear-gradient(135deg, #3498db 0%, #2980b9 100%); color: white; padding: 15px; font-weight: 600; text-align: center; font-size: 1.1em;';
                academicYearHeader.textContent = getAcademicYearName(parseInt(academicYear));
                academicYearDiv.appendChild(academicYearHeader);
                
                const semestersDiv = document.createElement('div');
                semestersDiv.className = 'semester-grid';
                semestersDiv.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fit, minmax(500px, 1fr)); gap: 20px; padding: 20px;';
                
                const semestersData = academicYearsData[academicYear];
                
                // Display each semester
                Object.keys(semestersData).sort().forEach(function(semester) {
                    const semesterGrades = semestersData[semester];
                    
                    if (!semesterGrades || !Array.isArray(semesterGrades)) {
                        console.warn('Invalid semester grades data:', semesterGrades);
                        return;
                    }
                    
                    const semesterDiv = document.createElement('div');
                    semesterDiv.style.cssText = 'border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;';
                    
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
                    tableHTML += '</tr></thead><tbody>';
                    
                    semesterGrades.forEach(function(grade) {
                        const gradeValue = grade.not_elp !== null && grade.not_elp !== undefined ? parseFloat(grade.not_elp).toFixed(2) : 'ABS';
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
                        
                        tableHTML += '<td><span class="grade-value ' + getGradeClass(grade.not_elp) + '">' + gradeValue + '</span></td>';
                        tableHTML += '<td style="font-weight: 600; color: #2c3e50;">' + (grade.cod_tre || '-') + '</td>';
                        tableHTML += '</tr>';
                    });
                    
                    tableHTML += '</tbody>';
                    table.innerHTML = tableHTML;
                    
                    semesterDiv.appendChild(table);
                    semestersDiv.appendChild(semesterDiv);
                });
                
                academicYearDiv.appendChild(semestersDiv);
                sessionDiv.appendChild(academicYearDiv);
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
        'S6': 'الفصل السادس - Semestre 6',
        'S7': 'الفصل السابع - Semestre 7',
        'S8': 'الفصل الثامن - Semestre 8',
        'S9': 'الفصل التاسع - Semestre 9',
        'S10': 'الفصل العاشر - Semestre 10',
        'S11': 'الفصل الحادي عشر - Semestre 11',
        'S12': 'الفصل الثاني عشر - Semestre 12'
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