/* ============================================================
   NeuroLearn – Complete Shared JavaScript
   ============================================================ */

// ---- CHECK IF SUPABASE IS LOADED ----
console.log("🔵 script.js loaded");

// ============================================================
// ⭐ SINGLETON: Wait for supabase to be available
// ============================================================
function waitForSupabase() {
    return new Promise((resolve) => {
        // Check singleton first
        if (window.__supabaseClient && window.__supabaseClient.auth) {
            resolve(window.__supabaseClient);
            return;
        }
        
        // Check window.supabaseClient
        if (typeof window.supabaseClient !== 'undefined' && window.supabaseClient && window.supabaseClient.auth) {
            window.__supabaseClient = window.supabaseClient;
            resolve(window.supabaseClient);
            return;
        }
        
        // Check global supabase
        if (typeof supabase !== 'undefined' && supabase && supabase.auth) {
            window.__supabaseClient = supabase;
            resolve(supabase);
            return;
        }
        
        let retries = 0;
        const maxRetries = 10;
        const interval = setInterval(() => {
            retries++;
            
            if (window.__supabaseClient && window.__supabaseClient.auth) {
                clearInterval(interval);
                resolve(window.__supabaseClient);
                return;
            }
            
            if (typeof window.supabaseClient !== 'undefined' && window.supabaseClient && window.supabaseClient.auth) {
                window.__supabaseClient = window.supabaseClient;
                clearInterval(interval);
                resolve(window.supabaseClient);
                return;
            }
            
            if (typeof supabase !== 'undefined' && supabase && supabase.auth) {
                window.__supabaseClient = supabase;
                clearInterval(interval);
                resolve(supabase);
                return;
            }
            
            if (retries >= maxRetries) {
                clearInterval(interval);
                resolve(null);
            }
        }, 500);
    });
}

// ---- Toast Notification ----
let _toastTimer;

function showToast(msg, color) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.style.background = color || '#2E8C8C';
    t.style.color = '#FFFFFF';
    t.classList.add('show');
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
}

// ============================================================
// ⭐ ACCESSIBILITY SETTINGS - APPLIES TO ALL PAGES ⭐
// ============================================================

/**
 * Load and apply accessibility settings from localStorage
 * This runs on EVERY page load
 */
function loadAccessibilitySettings() {
    console.log('🔵 loadAccessibilitySettings() called');
    const saved = localStorage.getItem('neurolearn_accessibility');
    console.log('📦 localStorage data:', saved);
    
    if (saved) {
        try {
            const settings = JSON.parse(saved);
            console.log('✅ Parsed settings:', settings);
            
            // === FONT SIZE ===
            const sizeMap = { Small: '14px', Medium: '16px', Large: '18px' };
            if (settings.fontSize && sizeMap[settings.fontSize]) {
                document.documentElement.style.fontSize = sizeMap[settings.fontSize];
                document.body.style.fontSize = sizeMap[settings.fontSize];
                console.log('✅ Font size applied:', settings.fontSize, '→', sizeMap[settings.fontSize]);
            }
            
            // === FONT TYPE ===
            if (settings.fontType) {
                if (settings.fontType === 'OpenDyslexic') {
                    // Load OpenDyslexic font if not already loaded
                    if (!document.querySelector('#opendyslexic-font')) {
                        const link = document.createElement('link');
                        link.id = 'opendyslexic-font';
                        link.rel = 'stylesheet';
                        link.href = 'https://fonts.googleapis.com/css2?family=OpenDyslexic&display=swap';
                        document.head.appendChild(link);
                        console.log('✅ OpenDyslexic font loaded');
                    }
                    document.body.style.fontFamily = '"OpenDyslexic", "Nunito", sans-serif';
                } else if (settings.fontType === 'Large Print') {
                    document.body.style.fontFamily = '"Nunito", sans-serif';
                    document.documentElement.style.fontSize = '20px';
                    document.body.style.fontSize = '20px';
                } else {
                    document.body.style.fontFamily = '"Nunito", sans-serif';
                }
                console.log('✅ Font type applied:', settings.fontType);
            }
            
            // === COLOR THEME ===
            // Remove existing theme classes
            document.body.classList.remove('high-contrast-mode', 'pastel-mode');
            
            if (settings.colorTheme === 'High Contrast') {
                document.body.classList.add('high-contrast-mode');
                console.log('✅ High Contrast mode applied');
            } else if (settings.colorTheme === 'Pastel') {
                document.body.classList.add('pastel-mode');
                console.log('✅ Pastel mode applied');
            } else {
                console.log('✅ Standard theme applied');
            }
            
            return settings;
        } catch (e) {
            console.error('Error loading accessibility settings:', e);
        }
    } else {
        console.log('ℹ️ No accessibility settings found, using defaults');
        // Reset to defaults if no settings
        document.body.classList.remove('high-contrast-mode', 'pastel-mode');
        document.body.style.fontFamily = '"Nunito", sans-serif';
        document.documentElement.style.fontSize = '16px';
        document.body.style.fontSize = '16px';
    }
    return null;
}

// ⭐ Auto-load accessibility settings on EVERY page
document.addEventListener('DOMContentLoaded', function() {
    // Small delay to ensure DOM is ready
    setTimeout(loadAccessibilitySettings, 50);
});

// ============================================
// SUPABASE AUTHENTICATION FUNCTIONS
// ============================================

// ---- LOGIN WITH SUPABASE ----
async function handleLogin() {
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
        const supabaseClient = await waitForSupabase();
        
        if (!supabaseClient || !supabaseClient.auth) {
            showToast('Supabase not ready. Please refresh.', '#FF6B6B');
            btn.textContent = 'Login';
            btn.disabled = false;
            return;
        }
        
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) {
            if (error.message.includes('Invalid login credentials')) {
                showToast('Invalid email or password. Please try again.', '#FF6B6B');
            } else if (error.message.includes('Email not confirmed')) {
                showToast('Please verify your email before logging in. 📧', '#FF8C42');
            } else {
                showToast(error.message, '#FF6B6B');
            }
            btn.textContent = 'Login';
            btn.disabled = false;
            return;
        }
        
        if (data.user) {
            console.log('✅ User logged in:', data.user.id);
            
            // Get user data from users table
            const { data: userData, error: userError } = await supabaseClient
                .from('users')
                .select('display_name, role, level, xp, full_name, birthday, grade, child_code, parent_id')
                .eq('id', data.user.id)
                .single();
            
            if (userError) {
                console.warn('⚠️ User not found in users table, creating record...');
                
                const displayName = email.split('@')[0];
                const { error: insertError } = await supabaseClient
                    .from('users')
                    .insert({
                        id: data.user.id,
                        email: email,
                        display_name: displayName,
                        role: 'student',
                        level: 1,
                        xp: 0,
                        streak_days: 0
                    });
                
                if (insertError) {
                    console.error('Error inserting user:', insertError);
                } else {
                    console.log('✅ User inserted into users table');
                }
                
                localStorage.setItem('neurolearn_display_name', displayName);
                localStorage.setItem('neurolearn_user_role', 'student');
                localStorage.setItem('neurolearn_level', '1');
                localStorage.setItem('neurolearn_xp', '0');
            } else {
                const displayName = userData.display_name || email.split('@')[0];
                const role = userData.role || 'student';
                
                localStorage.setItem('neurolearn_display_name', displayName);
                localStorage.setItem('neurolearn_user_role', role);
                localStorage.setItem('neurolearn_level', userData.level || 1);
                localStorage.setItem('neurolearn_xp', userData.xp || 0);
                
                // Store profile data
                if (userData.full_name) localStorage.setItem('neurolearn_full_name', userData.full_name);
                if (userData.birthday) localStorage.setItem('neurolearn_birthday', userData.birthday);
                if (userData.grade) localStorage.setItem('neurolearn_grade', userData.grade);
                if (userData.child_code) localStorage.setItem('neurolearn_child_code', userData.child_code);
                
                // Check if user is a parent with linked children
                if (role === 'parent') {
                    const { data: children } = await supabaseClient
                        .from('users')
                        .select('id, full_name, display_name')
                        .eq('parent_id', data.user.id);
                    
                    if (children && children.length > 0) {
                        localStorage.setItem('neurolearn_linked_child_id', children[0].id);
                        localStorage.setItem('neurolearn_linked_child_name', children[0].full_name || children[0].display_name || 'Child');
                    }
                }
            }
            
            localStorage.setItem('neurolearn_user_email', email);
            localStorage.setItem('neurolearn_user_id', data.user.id);
            
            const displayName = localStorage.getItem('neurolearn_display_name');
            const role = localStorage.getItem('neurolearn_user_role');
            
            showToast(`Welcome back, ${displayName}! 🎉`, '#4CAF7D');
            
            // ============================================
            // ⭐ ROLE-BASED REDIRECT ON LOGIN ⭐
            // ============================================
            setTimeout(() => {
                if (role === 'student') {
                    window.location.href = 'dashboard.html';
                } else if (role === 'parent') {
                    window.location.href = 'parent-dashboard.html';
                } else if (role === 'admin') {
                    window.location.href = 'admin-dashboard.html';
                } else {
                    window.location.href = 'dashboard.html';
                }
            }, 800);
        }
    } catch (error) {
        console.error('💥 Login error:', error);
        showToast('An error occurred. Please try again.', '#FF6B6B');
    } finally {
        btn.textContent = 'Login';
        btn.disabled = false;
    }
}

// ---- SIGNUP WITH SUPABASE (ROLE-BASED REDIRECT) ----
async function handleSignup() {
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

    btn.textContent = 'Creating account...';
    btn.disabled = true;

    try {
        const supabaseClient = await waitForSupabase();
        
        if (!supabaseClient || !supabaseClient.auth) {
            showToast('Supabase not ready. Please refresh.', '#FF6B6B');
            btn.textContent = 'Create Account';
            btn.disabled = false;
            return;
        }
        
        console.log('🔵 Attempting Supabase auth signup...');
        console.log('🎭 Selected role:', role);
        
        const { data, error } = await supabaseClient.auth.signUp({
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
            console.error('🔴 Supabase auth error:', error);
            if (error.message.includes('User already registered')) {
                showToast('This email is already registered. Please login instead.', '#FF8C42');
            } else {
                showToast(error.message, '#FF6B6B');
            }
            btn.textContent = 'Create Account';
            btn.disabled = false;
            return;
        }

        if (data && data.user) {
            console.log('✅ Supabase user created:', data.user.id);
            
            try {
                const { data: existingUser } = await supabaseClient
                    .from('users')
                    .select('id')
                    .eq('id', data.user.id)
                    .single();

                if (!existingUser) {
                    const { error: insertError } = await supabaseClient
                        .from('users')
                        .insert({
                            id: data.user.id,
                            email: email,
                            display_name: displayName,
                            role: role,
                            level: 1,
                            xp: 0,
                            streak_days: 0
                        });

                    if (insertError) {
                        console.warn('⚠️ Could not insert into users table:', insertError.message);
                    } else {
                        console.log('✅ User inserted into users table');
                    }
                }
            } catch (err) {
                console.warn('⚠️ User insertion check failed:', err.message);
            }

            localStorage.setItem('neurolearn_display_name', displayName);
            localStorage.setItem('neurolearn_user_email', email);
            localStorage.setItem('neurolearn_user_id', data.user.id);
            localStorage.setItem('neurolearn_user_role', role);
            localStorage.setItem('neurolearn_level', '1');
            localStorage.setItem('neurolearn_xp', '0');

            // ============================================
            // ⭐ ROLE-BASED REDIRECT ON SIGNUP ⭐
            // ============================================
            let redirectUrl = 'dashboard.html';
            
            if (role === 'student') {
                redirectUrl = 'student-setup.html';
            } else if (role === 'parent') {
                redirectUrl = 'parent-onboarding.html';
            } else if (role === 'admin') {
                redirectUrl = 'admin-dashboard.html';
            }

            console.log('🔄 Redirecting to:', redirectUrl);

            if (data.session) {
                showToast(`Account created successfully, ${displayName}! 🎉`, '#4CAF7D');
                setTimeout(() => {
                    window.location.href = redirectUrl;
                }, 800);
            } else {
                showToast('Account created! Please check your email to confirm your account. 📧', '#4CAF7D');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 3000);
            }
        } else {
            showToast('Something went wrong. Please try again.', '#FF6B6B');
            btn.textContent = 'Create Account';
            btn.disabled = false;
        }
    } catch (error) {
        console.error('💥 Signup error:', error);
        showToast('An error occurred. Please try again.', '#FF6B6B');
        btn.textContent = 'Create Account';
        btn.disabled = false;
    } finally {
        btn.textContent = 'Create Account';
        btn.disabled = false;
    }
}

// ---- AUTO-LOGIN CHECK ----
async function checkAuthAndRedirect() {
    try {
        const supabaseClient = await waitForSupabase();
        
        if (!supabaseClient || !supabaseClient.auth) {
            console.warn('⚠️ supabase not available for auth check');
            return;
        }
        
        const { data: { session } } = await supabaseClient.auth.getSession();
        
        if (session) {
            const displayName = localStorage.getItem('neurolearn_display_name') || 
                               session.user.email.split('@')[0];
            const role = localStorage.getItem('neurolearn_user_role') || 'student';
            
            localStorage.setItem('neurolearn_display_name', displayName);
            localStorage.setItem('neurolearn_user_email', session.user.email);
            localStorage.setItem('neurolearn_user_id', session.user.id);
            localStorage.setItem('neurolearn_user_role', role);
            
            const currentPage = window.location.pathname.split('/').pop();
            
            const params = new URLSearchParams(window.location.search);

            if (params.get('role') === 'child') {
                console.log('Child signup mode - skipping auto redirect');
                return;
    }
            
            if (currentPage === 'index.html' || currentPage === 'signup.html' || currentPage === '') {
                console.log('🔄 Auto-redirecting based on role:', role);
                
                if (role === 'student') {
                    window.location.href = 'dashboard.html';
                } else if (role === 'parent') {
                    window.location.href = 'parent-dashboard.html';
                } else if (role === 'admin') {
                    window.location.href = 'admin-dashboard.html';
                } else {
                    window.location.href = 'dashboard.html';
                }
            }
        }
    } catch (error) {
        console.error('Auth check error:', error);
    }
}

// ---- CHECK IF USER IS LOGGED IN ----
async function checkAuth() {
    try {
        const supabaseClient = await waitForSupabase();
        if (!supabaseClient || !supabaseClient.auth) {
            return false;
        }
        const { data: { session } } = await supabaseClient.auth.getSession();
        return !!session;
    } catch (error) {
        console.error('Auth check error:', error);
        return false;
    }
}

// ---- LOGOUT ----
async function showLogout() {
    try {
        const supabaseClient = await waitForSupabase();
        if (supabaseClient && supabaseClient.auth) {
            const { error } = await supabaseClient.auth.signOut();
            if (error) console.error('Logout error:', error);
        }
    } catch (error) {
        console.error('Logout error:', error);
    }
    localStorage.removeItem('neurolearn_display_name');
    localStorage.removeItem('neurolearn_user_email');
    localStorage.removeItem('neurolearn_user_id');
    localStorage.removeItem('neurolearn_user_role');
    localStorage.removeItem('neurolearn_level');
    localStorage.removeItem('neurolearn_xp');
    localStorage.removeItem('neurolearn_full_name');
    localStorage.removeItem('neurolearn_birthday');
    localStorage.removeItem('neurolearn_grade');
    localStorage.removeItem('neurolearn_child_code');
    localStorage.removeItem('neurolearn_linked_child_id');
    localStorage.removeItem('neurolearn_linked_child_name');
    window.location.href = 'index.html';
    showToast('Logged out successfully 👋', '#FF8C42');
}

// ============================================
// NAVIGATION FUNCTIONS
// ============================================

function goToDashboard() {
    checkAuth().then(isLoggedIn => {
        if (isLoggedIn) {
            const role = localStorage.getItem('neurolearn_user_role') || 'student';
            if (role === 'student') {
                window.location.href = 'dashboard.html';
            } else if (role === 'parent') {
                window.location.href = 'parent-dashboard.html';
            } else if (role === 'admin') {
                window.location.href = 'admin-dashboard.html';
            } else {
                window.location.href = 'dashboard.html';
            }
        } else {
            showToast('Please login first!', '#FF6B6B');
            window.location.href = 'index.html';
        }
    });
}

function selectRole(btn) {
    document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

// ============================================
// LOAD USER INFO
// ============================================

function loadUserInfo() {
    const displayName = localStorage.getItem('neurolearn_display_name') || 'Student';
    console.log('🔵 loadUserInfo() - Display name:', displayName);
    
    const elements = ['welcome-username', 'nav-username', 'profile-username', 'lesson-username', 'report-name', 'parent-name'];
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
    const parentName = document.getElementById('parent-full-name');
    if (parentName) {
        parentName.textContent = displayName;
    }
}

// ============================================
// DASHBOARD FILTER FUNCTIONS
// ============================================

let currentDifficulty = 'all';
let currentSubject = 'all';

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
// LESSON FUNCTIONS
// ============================================

function startLesson(lessonType) {
    localStorage.setItem('currentLesson', lessonType);
    window.location.href = 'lesson.html';
}

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

        const savedProgress = localStorage.getItem(`progress_${lesson.id}`);
        let completed = false;
        if (savedProgress) {
            try {
                const progress = JSON.parse(savedProgress);
                completed = progress.completed || false;
            } catch(e) {}
        }

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
// ANIMATION FUNCTIONS
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
// PREFERENCE FUNCTIONS
// ============================================

function applyFontSize(val) {
    const map = { Small: '14px', Medium: '16px', Large: '18px' };
    document.documentElement.style.fontSize = map[val] || '16px';
    showToast(`Font size changed to ${val}`, '#4CAF7D');
}

// ============================================
// NAVIGATION LINK ACTIVE STATE
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
// ADMIN DASHBOARD FUNCTIONS
// ============================================

/**
 * Safely set text content of an element by ID.
 */
function adminSetText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = (text === null || text === undefined) ? '0' : String(text);
}

/**
 * Safely set innerHTML of an element by ID.
 */
function adminSetHTML(id, html) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
}

/**
 * Escape HTML special characters for safe innerHTML usage.
 */
function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/**
 * Check Supabase connection status and return the client.
 */
async function adminCheckConnection() {
    try {
        const client = await waitForSupabase();
        if (client && client.auth) {
            const { data: { session } } = await client.auth.getSession();
            if (session) {
                return client;
            }
        }
        return null;
    } catch (e) {
        console.error('Connection check error:', e);
        return null;
    }
}

/**
 * Load admin dashboard analytics from Supabase.
 */
async function adminLoadDashboard() {
    const client = await adminCheckConnection();
    if (!client) {
        ['stat-total-students','stat-total-parents','stat-total-lessons',
         'stat-completed-lessons','stat-avg-score','stat-daily-xp'].forEach(id => adminSetText(id, 'Disconnected'));
        return;
    }

    try {
        // Total Students
        const { count: studentCount } = await client
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('role', 'student');
        adminSetText('stat-total-students', studentCount || 0);

        // Total Parents
        const { count: parentCount } = await client
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('role', 'parent');
        adminSetText('stat-total-parents', parentCount || 0);

        // Total Lessons
        const { count: lessonCount } = await client
            .from('lessons')
            .select('*', { count: 'exact', head: true });
        adminSetText('stat-total-lessons', lessonCount || 0);

        // Completed Lessons
        const { count: completedCount } = await client
            .from('user_progress')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'completed');
        adminSetText('stat-completed-lessons', completedCount || 0);

        // Average Score
        const { data: scoreData } = await client
            .from('user_progress')
            .select('score')
            .not('score', 'is', null);
        let avgScore = 0;
        if (scoreData && scoreData.length > 0) {
            const total = scoreData.reduce((sum, row) => sum + (row.score || 0), 0);
            avgScore = Math.round(total / scoreData.length);
        }
        adminSetText('stat-avg-score', avgScore > 0 ? avgScore + '%' : '0%');

        // Daily XP
        const today = new Date().toISOString().slice(0, 10);
        const { data: dailyData } = await client
            .from('daily_stats')
            .select('xp_earned')
            .eq('date', today);
        let dailyXP = 0;
        if (dailyData && dailyData.length > 0) {
            dailyXP = dailyData.reduce((sum, row) => sum + (row.xp_earned || 0), 0);
        }
        adminSetText('stat-daily-xp', dailyXP > 0 ? dailyXP + ' XP' : '0 XP');

        // Update storage display
        const lCount = parseInt(document.getElementById('stat-total-lessons')?.textContent || '0');
        const storageEl = document.getElementById('storage-used-display');
        const storageBar = document.getElementById('storage-bar');
        const storageDetail = document.getElementById('storage-detail');
        if (storageEl) storageEl.textContent = (lCount * 0.05).toFixed(2) + ' GB';
        if (storageBar) storageBar.style.width = Math.min(100, lCount * 5) + '%';
        if (storageDetail) storageDetail.textContent = (lCount * 0.05).toFixed(2) + ' GB of 1 GB';

    } catch (e) {
        console.error('adminLoadDashboard error:', e);
        ['stat-total-students','stat-total-parents','stat-total-lessons',
         'stat-completed-lessons','stat-avg-score','stat-daily-xp'].forEach(id => adminSetText(id, 'Error'));
    }
}

/**
 * Load students table.
 */
async function adminLoadStudents() {
    const client = await adminCheckConnection();
    if (!client) {
        adminSetHTML('students-table-body', '<tr><td colspan="7" style="text-align:center;padding:30px;">No data available.</td></tr>');
        return;
    }

    try {
        const { data: students } = await client
            .from('users')
            .select('id, display_name, email, level, xp, adaptive_pacing, text_to_speech')
            .eq('role', 'student');

        if (!students || students.length === 0) {
            adminSetHTML('students-table-body', '<tr><td colspan="7" style="text-align:center;padding:30px;">No students found.</td></tr>');
            return;
        }

        const rows = await Promise.all(students.map(async (s) => {
            let lessonName = '—';
            let progressPct = 0;
            try {
                const { data: prog } = await client
                    .from('user_progress')
                    .select('lesson_id, progress_percentage, lessons(title)')
                    .eq('user_id', s.id)
                    .order('last_accessed', { ascending: false })
                    .limit(1)
                    .maybeSingle();
                if (prog) {
                    progressPct = prog.progress_percentage || 0;
                    if (prog.lessons?.title) lessonName = prog.lessons.title;
                }
            } catch (e) {}

            return `
                <tr>
                    <td data-label="Student"><strong>${escapeHtml(s.display_name || '—')}</strong></td>
                    <td data-label="Email">${escapeHtml(s.email || '—')}</td>
                    <td data-label="Level">${s.level || 0}</td>
                    <td data-label="XP">${s.xp || 0} XP</td>
                    <td data-label="Adaptive Pacing"><span class="badge ${s.adaptive_pacing ? 'green' : 'teal'}">${s.adaptive_pacing ? 'On' : 'Off'}</span></td>
                    <td data-label="TTS"><span class="badge ${s.text_to_speech ? 'green' : 'teal'}">${s.text_to_speech ? 'On' : 'Off'}</span></td>
                    <td data-label="Progress">${escapeHtml(lessonName)} (${progressPct}%)</td>
                </tr>
            `;
        }));

        adminSetHTML('students-table-body', rows.join(''));
    } catch (e) {
        console.error('adminLoadStudents error:', e);
        adminSetHTML('students-table-body', '<tr><td colspan="7" style="text-align:center;padding:30px;">Error loading data.</td></tr>');
    }
}

/**
 * Load parents table.
 */
async function adminLoadParents() {
    const client = await adminCheckConnection();
    if (!client) {
        adminSetHTML('parents-table-body', '<tr><td colspan="4" style="text-align:center;padding:30px;">No data available.</td></tr>');
        return;
    }

    try {
        const { data: parents } = await client
            .from('users')
            .select('id, display_name, email')
            .eq('role', 'parent');

        if (!parents || parents.length === 0) {
            adminSetHTML('parents-table-body', '<tr><td colspan="4" style="text-align:center;padding:30px;">No parents found.</td></tr>');
            return;
        }

        const rows = parents.map(p => `
            <tr>
                <td data-label="Parent"><strong>${escapeHtml(p.display_name || '—')}</strong></td>
                <td data-label="Email">${escapeHtml(p.email || '—')}</td>
                <td data-label="Linked Learners"><span class="badge teal">0 learners</span></td>
                <td data-label="Actions"><button class="btn btn-ghost btn-sm" onclick="showToast('View parent: ${escapeHtml(p.display_name || '')}', '#2E8C8C')">👁 View</button></td>
            </tr>
        `);

        adminSetHTML('parents-table-body', rows.join(''));
    } catch (e) {
        console.error('adminLoadParents error:', e);
        adminSetHTML('parents-table-body', '<tr><td colspan="4" style="text-align:center;padding:30px;">Error loading data.</td></tr>');
    }
}

/**
 * Load lessons list.
 */
async function adminLoadLessons() {
    const client = await adminCheckConnection();
    if (!client) {
        adminSetHTML('lessons-list-container', '<p style="text-align:center;padding:20px;">No data available.</p>');
        return;
    }

    try {
        const { data: lessons } = await client
            .from('lessons')
            .select('id, title, subject, difficulty, description, lesson_key');

        if (!lessons || lessons.length === 0) {
            adminSetHTML('lessons-list-container', '<p style="text-align:center;padding:20px;">No lessons found.</p>');
            return;
        }

        const html = lessons.map(lesson => {
            const diffClass = lesson.difficulty === 'beginner' ? 'beginner' : 
                             lesson.difficulty === 'intermediate' ? 'intermediate' : 'advanced';
            return `
                <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid rgba(110,198,245,0.1);flex-wrap:wrap;gap:8px;">
                    <div>
                        <strong style="font-size:0.92rem;color:var(--text-dark);">${escapeHtml(lesson.title)}</strong>
                        <div style="display:flex;gap:8px;margin-top:4px;flex-wrap:wrap;">
                            <span class="badge blue">${escapeHtml(lesson.subject || '—')}</span>
                            <span class="badge ${diffClass}">${escapeHtml(lesson.difficulty || '—')}</span>
                            <span class="badge teal">${escapeHtml(lesson.lesson_key || '—')}</span>
                        </div>
                        ${lesson.description ? '<p style="font-size:0.82rem;color:var(--text-light);margin-top:4px;">' + escapeHtml(lesson.description) + '</p>' : ''}
                    </div>
                </div>
            `;
        }).join('');

        adminSetHTML('lessons-list-container', html);
    } catch (e) {
        console.error('adminLoadLessons error:', e);
        adminSetHTML('lessons-list-container', '<p style="text-align:center;padding:20px;">Error loading data.</p>');
    }
}

/**
 * Load recent activity.
 */
async function adminLoadRecentActivity() {
    const client = await adminCheckConnection();
    if (!client) {
        adminSetHTML('recent-activity-list', '<p style="text-align:center;padding:20px;">No data available.</p>');
        return;
    }

    try {
        const { data: activities } = await client
            .from('user_progress')
            .select('id, score, completed_at, user_id, lesson_id, users(display_name), lessons(title)')
            .eq('status', 'completed')
            .not('completed_at', 'is', null)
            .order('completed_at', { ascending: false })
            .limit(10);

        if (!activities || activities.length === 0) {
            adminSetHTML('recent-activity-list', '<p style="text-align:center;padding:20px;">No recent activity.</p>');
            return;
        }

        const html = activities.map(a => {
            const studentName = a.users?.display_name || '—';
            const lessonTitle = a.lessons?.title || '—';
            const date = a.completed_at ? new Date(a.completed_at).toLocaleDateString() : '—';
            return `
                <div class="recent-upload-item">
                    <div class="ru-icon">✅</div>
                    <div class="ru-info">
                        <h4>${escapeHtml(studentName)} completed "${escapeHtml(lessonTitle)}"</h4>
                        <p>${date} · Score: ${a.score || 0}%</p>
                    </div>
                </div>
            `;
        }).join('');

        adminSetHTML('recent-activity-list', html);
    } catch (e) {
        console.error('adminLoadRecentActivity error:', e);
        adminSetHTML('recent-activity-list', '<p style="text-align:center;padding:20px;">Error loading data.</p>');
    }
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

        const params = new URLSearchParams(window.location.search);

        // If we're creating a child account from the parent onboarding
        if (params.get('role') === 'child') {

            // Automatically select Student (Child)
            document.querySelectorAll('.role-btn').forEach(btn => {
                btn.classList.remove('active');
            });

            const studentBtn = document.querySelector('[data-role="student"]');
            if (studentBtn) {
                studentBtn.classList.add('active');
            }

            console.log('🧒 Child signup mode enabled.');

            // Skip auto-redirect to the parent dashboard
            return;
        }

        // Normal signup page behavior
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
            showToast(`Welcome back, ${displayName}! 🎉`, '#4CAF7D');
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

// ---- Student Setup Page ----
if (document.querySelector('.setup-container')) {
    window.addEventListener('DOMContentLoaded', () => {
        const displayName = localStorage.getItem('neurolearn_display_name') || 'Student';
        const fullNameInput = document.getElementById('full-name');
        if (fullNameInput && displayName) {
            fullNameInput.value = displayName;
        }
    });
}

// ---- Parent Dashboard Page ----
if (document.querySelector('.report-layout')) {
    window.addEventListener('DOMContentLoaded', () => {
        loadUserInfo();
        const childName = localStorage.getItem('neurolearn_linked_child_name');
        if (childName) {
            const childInfo = document.querySelector('.rh-info p');
            if (childInfo) {
                childInfo.textContent = `Linked to ${childName}`;
            }
        }
    });
}

// ---- Admin Dashboard Page ----
if (document.querySelector('.admin-dashboard') || document.getElementById('admin-dashboard-screen')) {
    window.addEventListener('DOMContentLoaded', () => {
        loadUserInfo();
        adminLoadDashboard();
        adminLoadStudents();
        adminLoadParents();
        adminLoadLessons();
        adminLoadRecentActivity();
    });
}

// ---- General DOM Ready ----
document.addEventListener('DOMContentLoaded', () => {
    setActiveNav();
    animateProgressBars();
});
