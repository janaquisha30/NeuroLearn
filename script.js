/* ============================================================
   NeuroLearn – Complete Shared JavaScript (PRESENTATION MODE)
   ============================================================ */

// ---- Toast Notification ----
let _toastTimer;

function showToast(msg, color) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    if (color) t.style.background = color;
    else t.style.background = '';
    t.classList.add('show');
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}

// ============================================
// CLEAR ALL PROGRESS
// ============================================

function clearAllProgress() {
    console.log('🔵 Clearing all progress data...');
    const lessonKeys = ['addition', 'subtraction', 'plant', 'reading', 'ancient'];
    lessonKeys.forEach(key => {
        localStorage.removeItem(`progress_${key}`);
        localStorage.removeItem(`progress_${key}_pct`);
    });
    localStorage.removeItem('currentLesson');
    localStorage.removeItem('currentLessonData');
    console.log('✅ All progress cleared!');
}

// ============================================
// LOGIN WITH SUPABASE (ALWAYS PROCEEDS TO DASHBOARD)
// ============================================

async function handleLogin() {
    console.log('🔵 handleLogin() called (PRESENTATION MODE)');
    
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const btn = document.getElementById('login-btn');
    
    if (!email) {
        showToast('Please enter your email address!', '#FF6B6B');
        document.getElementById('login-email').focus();
        return;
    }
    
    if (!password) {
        showToast('Please enter your password!', '#FF6B6B');
        document.getElementById('login-password').focus();
        return;
    }
    
    btn.textContent = 'Logging in...';
    btn.disabled = true;
    
    try {
        // Try Supabase login (silent - won't block dashboard)
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password
            });
            
            if (error) {
                console.warn('⚠️ Supabase login error (continuing to dashboard):', error.message);
            } else if (data.user) {
                console.log('✅ Supabase user logged in:', data.user.id);
            }
        } catch (err) {
            console.warn('⚠️ Supabase error (continuing to dashboard):', err);
        }
        
        // ✅ ALWAYS PROCEED TO DASHBOARD
        // Use email prefix as display name
        const displayName = email.split('@')[0];
        
        localStorage.setItem('neurolearn_display_name', displayName);
        localStorage.setItem('neurolearn_user_email', email);
        localStorage.setItem('neurolearn_user_id', 'demo_user_' + Date.now());
        localStorage.setItem('neurolearn_level', '1');
        localStorage.setItem('neurolearn_xp', '0');
        
        showToast(`Welcome back, ${displayName}! 🎉`, '#4CAF7D');
        
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 800);
        
    } catch (error) {
        console.warn('⚠️ Login error, but redirecting to dashboard:', error);
        // Even on error, proceed to dashboard
        const displayName = email.split('@')[0];
        localStorage.setItem('neurolearn_display_name', displayName);
        localStorage.setItem('neurolearn_user_email', email);
        localStorage.setItem('neurolearn_user_id', 'demo_user_' + Date.now());
        localStorage.setItem('neurolearn_level', '1');
        localStorage.setItem('neurolearn_xp', '0');
        
        showToast(`Welcome, ${displayName}! 🎉`, '#4CAF7D');
        
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 800);
    } finally {
        btn.textContent = 'Login';
        btn.disabled = false;
    }
}

// ============================================
// SIGNUP WITH SUPABASE (ALWAYS PROCEEDS TO DASHBOARD)
// ============================================

async function handleSignup() {
    console.log('🔵 handleSignup() called (PRESENTATION MODE)');
    
    const displayName = document.getElementById('signup-displayname').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm-password').value;
    const btn = document.getElementById('signup-btn');

    const activeRoleBtn = document.querySelector('.role-btn.active');
    const role = activeRoleBtn ? activeRoleBtn.dataset.role : 'student';

    // ----- VALIDATION -----
    if (!displayName) {
        showToast('Please enter your display name!', '#FF6B6B');
        document.getElementById('signup-displayname').focus();
        return;
    }

    if (!email) {
        showToast('Please enter your email address!', '#FF6B6B');
        document.getElementById('signup-email').focus();
        return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showToast('Please enter a valid email address!', '#FF6B6B');
        document.getElementById('signup-email').focus();
        return;
    }

    if (!password) {
        showToast('Please create a password!', '#FF6B6B');
        document.getElementById('signup-password').focus();
        return;
    }

    if (password.length < 6) {
        showToast('Password must be at least 6 characters!', '#FF6B6B');
        document.getElementById('signup-password').focus();
        return;
    }

    if (password !== confirmPassword) {
        showToast('Passwords do not match!', '#FF6B6B');
        document.getElementById('signup-confirm-password').focus();
        return;
    }

    console.log('✅ All validations passed!');

    btn.textContent = 'Creating account...';
    btn.disabled = true;

    try {
        // 🟢 CLEAR ALL OLD PROGRESS FOR NEW USER
        clearAllProgress();
        
        // Try Supabase signup (silent - won't block dashboard)
        try {
            console.log('🔄 Trying Supabase signup...');
            const { data, error } = await supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        display_name: displayName,
                        role: role
                    }
                }
            });
            
            if (error) {
                console.warn('⚠️ Supabase signup error (continuing to dashboard):', error.message);
            } else if (data.user) {
                console.log('✅ Supabase user created:', data.user.id);
            }
        } catch (err) {
            console.warn('⚠️ Supabase error (continuing to dashboard):', err);
        }

        // ✅ ALWAYS PROCEED TO DASHBOARD - USE THE DISPLAY NAME FROM FORM
        localStorage.setItem('neurolearn_display_name', displayName);
        localStorage.setItem('neurolearn_user_email', email);
        localStorage.setItem('neurolearn_user_id', 'demo_user_' + Date.now());
        localStorage.setItem('neurolearn_level', '1');
        localStorage.setItem('neurolearn_xp', '0');

        showToast(`Account created successfully, ${displayName}! 🎉`, '#4CAF7D');
        
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 800);

    } catch (error) {
        console.warn('⚠️ Error, but redirecting to dashboard:', error);
        // Even on error, proceed to dashboard
        localStorage.setItem('neurolearn_display_name', displayName);
        localStorage.setItem('neurolearn_user_email', email);
        localStorage.setItem('neurolearn_user_id', 'demo_user_' + Date.now());
        localStorage.setItem('neurolearn_level', '1');
        localStorage.setItem('neurolearn_xp', '0');

        showToast(`Account created successfully, ${displayName}! 🎉`, '#4CAF7D');
        
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 800);
    } finally {
        btn.textContent = 'Create Account';
        btn.disabled = false;
    }
}

// ============================================
// SELECT ROLE
// ============================================

function selectRole(btn) {
    document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

// ============================================
// LOAD USER INFO ON DASHBOARD
// ============================================

function loadUserInfo() {
    const displayName = localStorage.getItem('neurolearn_display_name') || 'Student';
    console.log('🔵 loadUserInfo() - Display name:', displayName);
    
    const elements = ['welcome-username', 'nav-username', 'profile-username', 'lesson-username', 'report-name'];
    elements.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = displayName;
    });
    
    const studentName = document.getElementById('student-name');
    if (studentName) {
        studentName.textContent = displayName;
    }
    
    const infoName = document.getElementById('info-name');
    if (infoName) {
        infoName.textContent = displayName;
    }
}

// ============================================
// AUTO-LOGIN CHECK
// ============================================

async function checkAuthAndRedirect() {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            const displayName = localStorage.getItem('neurolearn_display_name') || session.user.email.split('@')[0];
            localStorage.setItem('neurolearn_display_name', displayName);
            localStorage.setItem('neurolearn_user_email', session.user.email);
            localStorage.setItem('neurolearn_user_id', session.user.id);
            
            const currentPage = window.location.pathname.split('/').pop();
            if (currentPage === 'index.html' || currentPage === 'signup.html' || currentPage === '') {
                window.location.href = 'dashboard.html';
            }
        }
    } catch (error) {
        console.error('Auth check error:', error);
    }
}

// ============================================
// CHECK IF USER IS LOGGED IN
// ============================================

async function checkAuth() {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        return !!session;
    } catch (error) {
        return false;
    }
}

// ============================================
// LOGOUT
// ============================================

async function showLogout() {
    try {
        await supabase.auth.signOut();
    } catch (error) {
        console.error('Logout error:', error);
    }
    localStorage.removeItem('neurolearn_display_name');
    localStorage.removeItem('neurolearn_user_email');
    localStorage.removeItem('neurolearn_user_id');
    localStorage.removeItem('neurolearn_level');
    localStorage.removeItem('neurolearn_xp');
    clearAllProgress();
    window.location.href = 'index.html';
    showToast('Logged out successfully 👋');
}

// ============================================
// GO TO DASHBOARD
// ============================================

function goToDashboard() {
    checkAuth().then(isLoggedIn => {
        if (isLoggedIn) {
            window.location.href = 'dashboard.html';
        } else {
            showToast('Please login first!', '#FF6B6B');
            window.location.href = 'index.html';
        }
    });
}

// ============================================
// DASHBOARD FILTER FUNCTIONS
// ============================================

let currentDifficulty = 'all';
let currentSubject = 'math';

function filterSubject(btn, subject) {
    document.querySelectorAll('.subject-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    filterLessons(subject, currentDifficulty);
}

function filterDifficulty(val) {
    currentDifficulty = val;
    filterLessons(currentSubject, val);
}

function filterLessons(subject, difficulty) {
    currentSubject = subject;
    const cards = document.querySelectorAll('.lesson-card');
    cards.forEach(card => {
        const cardSubject = card.dataset.subject;
        const cardDifficulty = card.dataset.difficulty;
        const matchSubject = subject === 'all' || cardSubject === subject;
        const matchDiff = difficulty === 'all' || cardDifficulty === difficulty;
        card.style.display = matchSubject && matchDiff ? 'flex' : 'none';
    });
}

// ============================================
// START LESSON
// ============================================

function startLesson(lessonType) {
    localStorage.setItem('currentLesson', lessonType);
    window.location.href = 'lesson.html';
}

// ============================================
// LOAD LESSON PROGRESS
// ============================================

function loadLessonProgress() {
    const lessons = [
        { id: 'addition', progressEl: 'addition-progress', barEl: 'addition-bar', btnEl: 'addition-btn' },
        { id: 'subtraction', progressEl: 'subtraction-progress', barEl: 'subtraction-bar', btnEl: 'subtraction-btn' },
        { id: 'plant', progressEl: 'plant-progress', barEl: 'plant-bar', btnEl: 'plant-btn' },
        { id: 'reading', progressEl: 'reading-progress', barEl: 'reading-bar', btnEl: 'reading-btn' },
        { id: 'ancient', progressEl: 'ancient-progress', barEl: 'ancient-bar', btnEl: 'ancient-btn' }
    ];

    lessons.forEach(lesson => {
        let pct = parseInt(localStorage.getItem(`progress_${lesson.id}_pct`)) || 0;
        if (pct > 100) pct = 100;

        const progressEl = document.getElementById(lesson.progressEl);
        const barEl = document.getElementById(lesson.barEl);
        if (progressEl) progressEl.textContent = pct + '%';
        if (barEl) barEl.style.width = pct + '%';

        const btn = document.getElementById(lesson.btnEl);
        if (btn) {
            if (pct === 0) {
                btn.textContent = '▷ Start';
                btn.className = 'btn-action start';
                btn.onclick = function() { startLesson(lesson.id); };
            } else if (pct < 100) {
                btn.textContent = '▶ Continue';
                btn.className = 'btn-action continue';
                btn.onclick = function() { startLesson(lesson.id); };
            } else if (pct === 100) {
                btn.textContent = '↺ Retake';
                btn.className = 'btn-action review';
                btn.onclick = function() {
                    if (confirm(`Are you sure you want to retake the ${lesson.id.charAt(0).toUpperCase() + lesson.id.slice(1)} lesson? This will reset your progress.`)) {
                        localStorage.removeItem(`progress_${lesson.id}`);
                        localStorage.removeItem(`progress_${lesson.id}_pct`);
                        loadLessonProgress();
                        showToast('Progress reset! You can retake the lesson now.', '#FF8C42');
                    }
                };
            }
        }
    });
}

// ============================================
// ANIMATE PROGRESS BARS
// ============================================

function animateProgressBars() {
    document.querySelectorAll('.progress-fill[data-width]').forEach(bar => {
        const target = bar.dataset.width;
        bar.style.width = '0%';
        setTimeout(() => { bar.style.width = target; }, 100);
    });
    document.querySelectorAll('.progress-fill:not([data-width])').forEach(bar => {
        const w = bar.style.width;
        if (w && w !== '0%') {
            bar.style.width = '0%';
            setTimeout(() => { bar.style.width = w; }, 100);
        }
    });
}

// ============================================
// FONT SIZE PREFERENCE
// ============================================

function applyFontSize(val) {
    const map = { Small: '14px', Medium: '16px', Large: '18px' };
    document.documentElement.style.fontSize = map[val] || '16px';
    showToast(`Font size changed to ${val}`);
}

// ============================================
// SET ACTIVE NAVIGATION
// ============================================

function setActiveNav() {
    const currentPage = window.location.pathname.split('/').pop();
    document.querySelectorAll('.nav-tab').forEach(tab => {
        const href = tab.getAttribute('href');
        if (href && href === currentPage) {
            tab.classList.add('active');
        } else if (currentPage === '' || currentPage === 'index.html') {
            if (tab.getAttribute('href') === 'dashboard.html') {
                tab.classList.add('active');
            }
        }
    });
}

// ============================================
// PAGE INITIALIZATION
// ============================================

// ---- Login Page ----
if (document.getElementById('login-screen')) {
    document.addEventListener('DOMContentLoaded', () => {
        checkAuthAndRedirect();
    });
}

// ---- Signup Page ----
if (document.getElementById('signup-screen')) {
    document.addEventListener('DOMContentLoaded', () => {
        checkAuthAndRedirect();
    });
}

// ---- Dashboard Page ----
if (document.getElementById('dashboard-screen')) {
    window.addEventListener('DOMContentLoaded', () => {
        loadUserInfo();
        loadLessonProgress();
        animateProgressBars();
        const displayName = localStorage.getItem('neurolearn_display_name');
        if (displayName) {
            showToast(`Welcome back, ${displayName}! 🎉`);
        }
    });
}

// ---- Profile Page ----
if (document.querySelector('.profile-tabs')) {
    window.addEventListener('DOMContentLoaded', () => {
        loadUserInfo();
        animateProgressBars();
    });
}

// ---- Report Page ----
if (document.getElementById('bar-chart')) {
    window.addEventListener('DOMContentLoaded', () => {
        loadUserInfo();
        animateProgressBars();
    });
}

// ---- Lesson Page ----
if (document.getElementById('q-list')) {
    window.addEventListener('DOMContentLoaded', () => {
        loadUserInfo();
    });
}

// ---- General DOM Ready ----
document.addEventListener('DOMContentLoaded', () => {
    setActiveNav();
    animateProgressBars();
});
