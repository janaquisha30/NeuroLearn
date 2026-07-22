/* ============================================================
   NeuroLearn – Complete Shared JavaScript
   ============================================================ */

// ---- CHECK IF SUPABASE IS LOADED ----

// Wait for supabase to be available
function waitForSupabase(timeoutMs = 4000) {
    return new Promise((resolve) => {
        const startedAt = Date.now();

        const tryResolve = (candidate) => {
            if (candidate && candidate.auth) {
                if (window && !window.supabaseClient) {
                    window.supabaseClient = candidate;
                }
                resolve(candidate);
                return true;
            }
            return false;
        };

        const check = () => {
            if (tryResolve(window.supabaseClient)) return;
            if (tryResolve(supabase)) return;
            if (tryResolve(window.supabase)) return;

            if (Date.now() - startedAt >= timeoutMs) {
                resolve(null);
                return;
            }

            setTimeout(check, 500);
        };

        check();
    });
}

// ---- Toast Notification ----
let _toastTimer;

function showToast(msg, color) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    if (color) t.style.background = color;
    else t.style.background = '';
    t.setAttribute('role', 'status');
    t.setAttribute('aria-live', 'polite');
    t.setAttribute('aria-atomic', 'true');
    t.classList.add('show');
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}

function speakText(text) {
    const enabled = window.__ttsEnabled === true || getStoredBool('pref_tts', false);
    if (!text || !enabled) return;

    const synth = window.speechSynthesis || window.webkitSpeechSynthesis;
    const UtteranceCtor = window.SpeechSynthesisUtterance || window.webkitSpeechSynthesisUtterance;
    if (!synth || !UtteranceCtor) {
        console.warn('Speech synthesis is not available in this browser.');
        return;
    }

    try {
        synth.cancel();
        const utterance = new UtteranceCtor(text);
        utterance.lang = 'en-US';
        utterance.rate = 1;
        utterance.pitch = 1;
        synth.speak(utterance);
    } catch (error) {
        console.warn('Text-to-speech failed:', error);
    }
}

function getDailyTimeLimitSeconds() {
    const limit = localStorage.getItem('pref_time_limit') || '1 hour';
    switch (limit) {
        case '30 min':
            return 1800;
        case '1 hour':
            return 3600;
        case '2 hours':
            return 7200;
        default:
            return Number.MAX_SAFE_INTEGER;
    }
}

function getStoredDailyLearningSeconds() {
    const todayKey = new Date().toISOString().slice(0, 10);
    const storedDay = localStorage.getItem('daily_learning_day');
    if (storedDay !== todayKey) {
        localStorage.setItem('daily_learning_day', todayKey);
        localStorage.setItem('daily_learning_seconds', '0');
        return 0;
    }
    return parseInt(localStorage.getItem('daily_learning_seconds') || '0', 10);
}

function updateDailyLearningSeconds(delta) {
    const todayKey = new Date().toISOString().slice(0, 10);
    const storedDay = localStorage.getItem('daily_learning_day');
    let seconds = parseInt(localStorage.getItem('daily_learning_seconds') || '0', 10);
    if (storedDay !== todayKey) {
        seconds = 0;
    }
    seconds = Math.max(0, seconds + delta);
    localStorage.setItem('daily_learning_day', todayKey);
    localStorage.setItem('daily_learning_seconds', String(seconds));
    return seconds;
}

function checkDailyTimeLimit() {
    const limitSeconds = getDailyTimeLimitSeconds();
    if (!Number.isFinite(limitSeconds) || limitSeconds >= Number.MAX_SAFE_INTEGER) return false;
    return getStoredDailyLearningSeconds() >= limitSeconds;
}

window.speakText = speakText;
window.getDailyTimeLimitSeconds = getDailyTimeLimitSeconds;
window.updateDailyLearningSeconds = updateDailyLearningSeconds;
window.checkDailyTimeLimit = checkDailyTimeLimit;
window.__ttsEnabled = getStoredBool('pref_tts', false);

// ============================================
// SUPABASE AUTHENTICATION FUNCTIONS
// ============================================

// ---- LOGIN WITH SUPABASE ----
async function handleLogin() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const btn = document.getElementById('login-btn');
   
if (typeof grecaptcha === 'undefined' || typeof grecaptcha.getResponse !== 'function') {
        showToast('reCAPTCHA is not ready yet. Please refresh and try again.', '#FF6B6B');
        return;
    }

    const captcha = grecaptcha.getResponse();
    if (!captcha) {
        showToast('Please complete the CAPTCHA.', '#FF6B6B');
        return;
    }
    
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
        // Wait for supabase to be available
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
            
            // Get user data from users table (including role)
            const { data: userData, error: userError } = await supabaseClient
                .from('users')
                .select('display_name, level, xp, role')
                .eq('id', data.user.id)
                .single();
            
            if (userError || !userData) {
                console.error('❌ User record not found in users table. Cannot determine role.');
                showToast('Account setup incomplete. Please contact support.', '#FF6B6B');
                btn.textContent = 'Login';
                btn.disabled = false;
                return;
            }

            const displayName = userData.display_name || email.split('@')[0];
            const role = (userData.role || 'student').toLowerCase();
            localStorage.setItem('neurolearn_display_name', displayName);
            localStorage.setItem('neurolearn_level', userData.level || 1);
            localStorage.setItem('neurolearn_xp', userData.xp || 0);
            localStorage.setItem('neurolearn_user_email', email);
            localStorage.setItem('neurolearn_user_id', data.user.id);
            
            // Redirect based on role
            const redirectMap = {
                admin: 'admin-dashboard.html',
                parent: 'parent-profile.html',
                student: 'dashboard.html'
            };
            const targetPage = redirectMap[role] || 'dashboard.html';
            
            showToast(`Welcome back, ${displayName}! 🎉`, '#4CAF7D');
            console.log(`🔀 Redirecting to ${targetPage} (role: ${role})`);
            
            setTimeout(() => {
                window.location.href = targetPage;
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

// ---- SIGNUP WITH SUPABASE ----
async function handleSignup() {
    const displayName = document.getElementById('signup-displayname').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm-password').value;
    const btn = document.getElementById('signup-btn');

    const activeRoleBtn = document.querySelector('.role-btn.active');
    const role = activeRoleBtn ? activeRoleBtn.dataset.role : 'student';

    if (typeof grecaptcha === 'undefined' || typeof grecaptcha.getResponse !== 'function') {
        showToast('reCAPTCHA is not ready yet. Please refresh and try again.', '#FF6B6B');
        return;
    }

    const captcha = grecaptcha.getResponse();
    if (!captcha) {
        showToast('Please complete the CAPTCHA.', '#FF6B6B');
        return;
    }

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
        // Wait for supabase to be available
        const supabaseClient = await waitForSupabase();
        
        if (!supabaseClient || !supabaseClient.auth) {
            showToast('Supabase not ready. Please refresh.', '#FF6B6B');
            btn.textContent = 'Create Account';
            btn.disabled = false;
            return;
        }
        
        console.log('🔵 Attempting Supabase auth signup...');
        
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
                // Check if user already exists in users table
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
            localStorage.setItem('neurolearn_level', '1');
            localStorage.setItem('neurolearn_xp', '0');

            if (data.session) {
                showToast(`Account created successfully, ${displayName}! 🎉`, '#4CAF7D');
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
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
        // Wait for supabase to be available
        const supabaseClient = await waitForSupabase();
        
        if (!supabaseClient || !supabaseClient.auth) {
            console.warn('⚠️ supabase not available for auth check');
            return;
        }
        
        const { data: { session } } = await supabaseClient.auth.getSession();
        
        if (session) {
            // Fetch user role from the users table
            const { data: userData, error: userError } = await supabaseClient
                .from('users')
                .select('display_name, role')
                .eq('id', session.user.id)
                .single();

            if (userError || !userData) {
                console.error('❌ checkAuthAndRedirect: User record not found. Cannot determine role.');
                return;
            }

            const displayName = userData.display_name || session.user.email.split('@')[0];
            const role = (userData.role || 'student').toLowerCase();
            localStorage.setItem('neurolearn_display_name', displayName);
            localStorage.setItem('neurolearn_user_email', session.user.email);
            localStorage.setItem('neurolearn_user_id', session.user.id);
            
            // Redirect based on role
            const redirectMap = {
                admin: 'admin-dashboard.html',
                parent: 'parent-profile.html',
                student: 'dashboard.html'
            };
            const targetPage = redirectMap[role] || 'dashboard.html';
            
            const currentPage = window.location.pathname.split('/').pop();
            if (currentPage === 'index.html' || currentPage === 'signup.html' || currentPage === '') {
                console.log(`🔀 checkAuthAndRedirect: Redirecting to ${targetPage} (role: ${role})`);
                window.location.href = targetPage;
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
    localStorage.removeItem('neurolearn_level');
    localStorage.removeItem('neurolearn_xp');
    window.location.href = 'index.html';
    showToast('Logged out successfully 👋');
}

// ============================================
// NAVIGATION FUNCTIONS
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

function selectRole(btn) {
    document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

// ============================================
// LOAD USER INFO (FIXED - No "J. Johnson")
// ============================================

function loadUserInfo() {
    const displayName = localStorage.getItem('neurolearn_display_name') || 'Student';
    
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
// DASHBOARD FILTER FUNCTIONS
// ============================================

let dashboardDifficulty = 'all';
let currentSubject = 'math';

function filterSubject(btn, subject) {
    document.querySelectorAll('.subject-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    filterLessons(subject, dashboardDifficulty);
}

function filterDifficulty(val) {
    dashboardDifficulty = val;
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

let currentParentId = null;
let parentProfileOriginalData = {};

function getStoredString(key, fallback) {
    const value = localStorage.getItem(key);
    return value || fallback;
}

function getStoredBool(key, fallback) {
    const value = localStorage.getItem(key);
    if (value === null) return fallback;
    return value === 'true';
}

function persistPreference(key, value) {
    if (value === null || value === undefined) {
        localStorage.removeItem(key);
    } else {
        localStorage.setItem(key, String(value));
    }
}

async function getCurrentUserContext(supabaseClient) {
    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return null;

        let profile = null;
        try {
            const { data } = await supabaseClient
                .from('users')
                .select('*')
                .eq('id', user.id)
                .maybeSingle();
            profile = data || null;
        } catch (error) {
            console.warn('Could not load user profile row:', error);
        }

        return { user, profile };
    } catch (error) {
        console.warn('Could not resolve current user context:', error);
        return null;
    }
}

async function resolveParentProfileForUser(supabaseClient, authUser, userProfile = null) {
    if (!supabaseClient || !authUser) return null;

    const role = (userProfile?.role || authUser.user_metadata?.role || 'student').toLowerCase();
    const candidateColumns = ['id'];

    for (const column of candidateColumns) {
        try {
            const { data, error } = await supabaseClient
                .from('users')
                .select('*')
                .eq(column, authUser.id)
                .maybeSingle();

            if (!error && data) {
                return { profile: data, source: column, created: false };
            }
        } catch (error) {
            // Ignore and continue to the next candidate column.
        }
    }

    if (role !== 'parent') {
        return null;
    }

    const displayName = userProfile?.display_name || authUser.user_metadata?.display_name || authUser.email?.split('@')[0] || '';
    const email = authUser.email || userProfile?.email || '';
    const relationship = userProfile?.relationship || authUser.user_metadata?.relationship || '';

    try {
        const { data, error } = await supabaseClient
            .from('users')
            .insert([{
                user_id: authUser.id,
                fullname: displayName,
                email,
                relationship,
                font_size: getStoredString('pref_font_size', 'Large'),
                time_limit: getStoredString('pref_time_limit', '1 hour'),
                color_mode: getStoredString('pref_color_mode', 'High Contrast'),
                tts_enabled: getStoredBool('pref_tts', false),
                adaptive_pacing: getStoredBool('pref_adaptive', true),
                daily_summary: getStoredBool('notif_daily_summary', true),
                weekly_report: getStoredBool('notif_weekly_report', true),
                achievement_alerts: getStoredBool('notif_achievement_alerts', true),
                missed_day_alert: getStoredBool('notif_missed_day', false),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }])
            .select()
            .single();

        if (error) {
            console.warn('Could not create parent profile row:', error);
            return null;
        }

        return { profile: data, source: 'created', created: true };
    } catch (error) {
        console.warn('Failed to create parent profile row:', error);
        return null;
    }
}

function applyFontSize(val) {
    const fontSize = val || getStoredString('pref_font_size', 'Large');
    const map = {
        Small: '14px',
        Medium: '16px',
        Large: '18px'
    };

    const size = map[fontSize] || '16px';
    document.documentElement.style.fontSize = size;
    document.body.style.fontSize = size;
    persistPreference('pref_font_size', fontSize);
    return fontSize;
}

function applyColorMode(mode) {
    const colorMode = mode || getStoredString('pref_color_mode', 'High Contrast');
    document.body.classList.remove('dark-mode', 'high-contrast-mode');

    switch (colorMode) {
        case 'Dark':
            document.body.classList.add('dark-mode');
            break;
        case 'High Contrast':
            document.body.classList.add('high-contrast-mode');
            break;
        default:
            break;
    }

    persistPreference('pref_color_mode', colorMode);
    return colorMode;
}

function applyTTS(enabled) {
    const isEnabled = enabled === true || enabled === 'true';
    window.__ttsEnabled = isEnabled;
    persistPreference('pref_tts', isEnabled ? 'true' : 'false');
    if (!isEnabled && typeof window.speechSynthesis !== 'undefined') {
        window.speechSynthesis.cancel();
    }
    return isEnabled;
}

async function getProfileDataFromSchema(supabaseClient) {
    const context = await getCurrentUserContext(supabaseClient);
    if (!context?.user || !context.profile) return null;

    const result = { viewer: context.profile, parent: null, learner: null };
    if ((context.profile.role || '').toLowerCase() !== 'student') {
        result.parent = context.profile;
        return result;
    }

    const { data: learner, error: learnerError } = await supabaseClient
        .from('learner_profile')
        .select('*')
        .eq('user_id', context.user.id)
        .maybeSingle();
    if (learnerError || !learner) return result;
    result.learner = learner;

    const { data: link, error: linkError } = await supabaseClient
        .from('parent_link')
        .select('parent_user_id')
        .eq('learner_profile_id', learner.id)
        .maybeSingle();
    if (linkError || !link?.parent_user_id) return result;

    const { data: parent, error: parentError } = await supabaseClient
        .from('users')
        .select('*')
        .eq('id', link.parent_user_id)
        .maybeSingle();
    if (!parentError && parent) result.parent = parent;
    return result;
}

function applyAdaptivePacing(enabled) {
    const isEnabled = enabled === true || enabled === 'true';
    window.__adaptivePacingEnabled = isEnabled;
    persistPreference('pref_adaptive', isEnabled ? 'true' : 'false');
    return isEnabled;
}

function applyTimeLimit(limit) {
    const timeLimit = limit || getStoredString('pref_time_limit', '1 hour');
    persistPreference('pref_time_limit', timeLimit);
    return timeLimit;
}

function applyCustomizationSettings(settings = {}) {
    const fontSize = settings.font_size || settings.fontSize || getStoredString('pref_font_size', 'Large');
    const colorMode = settings.color_mode || settings.colorMode || getStoredString('pref_color_mode', 'High Contrast');
    const ttsEnabled = settings.tts_enabled ?? settings.ttsEnabled ?? getStoredBool('pref_tts', false);
    const adaptivePacingEnabled = settings.adaptive_pacing ?? settings.adaptivePacing ?? getStoredBool('pref_adaptive', true);
    const timeLimit = settings.time_limit || settings.timeLimit || getStoredString('pref_time_limit', '1 hour');

    applyFontSize(fontSize);
    applyColorMode(colorMode);
    applyTTS(ttsEnabled);
    applyAdaptivePacing(adaptivePacingEnabled);
    applyTimeLimit(timeLimit);
}

function syncPreferenceControls(settings = {}) {
    const fontSelect = document.getElementById('font-size-select');
    if (fontSelect) {
        fontSelect.value = settings.font_size || settings.fontSize || getStoredString('pref_font_size', 'Large');
    }

    const timeSelect = document.getElementById('time-limit-select');
    if (timeSelect) {
        timeSelect.value = settings.time_limit || settings.timeLimit || getStoredString('pref_time_limit', '1 hour');
    }

    const colorSelect = document.getElementById('color-mode-select');
    if (colorSelect) {
        colorSelect.value = settings.color_mode || settings.colorMode || getStoredString('pref_color_mode', 'High Contrast');
    }

    const ttsToggle = document.getElementById('tts-toggle');
    if (ttsToggle) {
        ttsToggle.checked = settings.tts_enabled ?? settings.ttsEnabled ?? getStoredBool('pref_tts', false);
    }

    const adaptiveToggle = document.getElementById('adaptive-toggle');
    if (adaptiveToggle) {
        adaptiveToggle.checked = settings.adaptive_pacing ?? settings.adaptivePacing ?? getStoredBool('pref_adaptive', true);
    }

    const dailySummaryToggle = document.getElementById('daily-summary-toggle');
    if (dailySummaryToggle) {
        dailySummaryToggle.checked = settings.daily_summary ?? getStoredBool('notif_daily_summary', true);
    }

    const weeklyReportToggle = document.getElementById('weekly-report-toggle');
    if (weeklyReportToggle) {
        weeklyReportToggle.checked = settings.weekly_report ?? getStoredBool('notif_weekly_report', true);
    }

    const achievementAlertsToggle = document.getElementById('achievement-alerts-toggle');
    if (achievementAlertsToggle) {
        achievementAlertsToggle.checked = settings.achievement_alerts ?? getStoredBool('notif_achievement_alerts', true);
    }

    const missedDayToggle = document.getElementById('missed-day-toggle');
    if (missedDayToggle) {
        missedDayToggle.checked = settings.missed_day_alert ?? getStoredBool('notif_missed_day', false);
    }
}

function saveParentPreferencesToStorage(preferences = {}) {
    persistPreference('pref_font_size', preferences.font_size || preferences.fontSize || getStoredString('pref_font_size', 'Large'));
    persistPreference('pref_time_limit', preferences.time_limit || preferences.timeLimit || getStoredString('pref_time_limit', '1 hour'));
    persistPreference('pref_color_mode', preferences.color_mode || preferences.colorMode || getStoredString('pref_color_mode', 'High Contrast'));
    persistPreference('pref_tts', preferences.tts_enabled !== undefined ? (preferences.tts_enabled ? 'true' : 'false') : getStoredString('pref_tts', 'false'));
    persistPreference('pref_adaptive', preferences.adaptive_pacing !== undefined ? (preferences.adaptive_pacing ? 'true' : 'false') : getStoredString('pref_adaptive', 'true'));
}

function saveParentNotificationsToStorage(notifications = {}) {
    persistPreference('notif_daily_summary', notifications.daily_summary !== undefined ? (notifications.daily_summary ? 'true' : 'false') : getStoredString('notif_daily_summary', 'true'));
    persistPreference('notif_weekly_report', notifications.weekly_report !== undefined ? (notifications.weekly_report ? 'true' : 'false') : getStoredString('notif_weekly_report', 'true'));
    persistPreference('notif_achievement_alerts', notifications.achievement_alerts !== undefined ? (notifications.achievement_alerts ? 'true' : 'false') : getStoredString('notif_achievement_alerts', 'true'));
    persistPreference('notif_missed_day', notifications.missed_day_alert !== undefined ? (notifications.missed_day_alert ? 'true' : 'false') : getStoredString('notif_missed_day', 'false'));
}

function saveParentAccountToStorage(accountData = {}) {
    if (accountData.fullname) {
        persistPreference('parent_fullname', accountData.fullname);
        persistPreference('parent_display_name', accountData.fullname);
    }
    if (accountData.email) {
        persistPreference('parent_email', accountData.email);
    }
    if (accountData.relationship) {
        persistPreference('parent_relationship', accountData.relationship);
    }
}

function updateLearnerName() {
    const displayName = localStorage.getItem('neurolearn_display_name') || 'Student';
    const learnerName = document.getElementById('learner-name');
    const prefLearnerName = document.getElementById('pref-learner-name');
    if (learnerName) learnerName.textContent = displayName;
    if (prefLearnerName) prefLearnerName.textContent = displayName;
}

function loadFromLocalStorage() {
    const savedName = localStorage.getItem('parent_fullname') || localStorage.getItem('parent_display_name');
    const savedEmail = localStorage.getItem('parent_email');
    const savedRelationship = localStorage.getItem('parent_relationship');

    const parentFullName = document.getElementById('parent-full-name');
    const infoFullName = document.getElementById('info-fullname');
    const accountFullName = document.getElementById('account-fullname');
    const infoEmail = document.getElementById('info-email');
    const accountEmail = document.getElementById('account-email');
    const infoRelationship = document.getElementById('info-relationship');
    const accountRelationship = document.getElementById('account-relationship');
    const parentNameDisplay = document.getElementById('parent-name-display');

    if (savedName) {
        if (parentFullName) parentFullName.textContent = savedName;
        if (infoFullName) infoFullName.textContent = savedName;
        if (accountFullName) accountFullName.value = savedName;
        if (parentNameDisplay) parentNameDisplay.textContent = savedName.split(' ')[0];
    }
    if (savedEmail) {
        if (infoEmail) infoEmail.textContent = savedEmail;
        if (accountEmail) accountEmail.value = savedEmail;
    }
    if (savedRelationship) {
        if (infoRelationship) infoRelationship.textContent = savedRelationship;
        if (accountRelationship) accountRelationship.value = savedRelationship;
    }

    const settings = {
        font_size: getStoredString('pref_font_size', 'Large'),
        time_limit: getStoredString('pref_time_limit', '1 hour'),
        color_mode: getStoredString('pref_color_mode', 'High Contrast'),
        tts_enabled: getStoredBool('pref_tts', false),
        adaptive_pacing: getStoredBool('pref_adaptive', true)
    };

    syncPreferenceControls(settings);
    applyCustomizationSettings(settings);
}

async function loadParentPreferencesFromSupabase() {
    try {
        const supabaseClient = await waitForSupabase();
        if (!supabaseClient || !supabaseClient.auth) return false;

        const userContext = await getCurrentUserContext(supabaseClient);
        if (!userContext?.user) return false;

        const resolved = await resolveParentProfileForUser(supabaseClient, userContext.user, userContext.profile);
        if (!resolved?.profile) return false;

        const data = resolved.profile;
        currentParentId = data.id;
        parentProfileOriginalData = {
            fullname: data.fullname || '',
            email: data.email || '',
            relationship: data.relationship || '',
            font_size: data.font_size || 'Large',
            time_limit: data.time_limit || '1 hour',
            color_mode: data.color_mode || 'High Contrast',
            tts_enabled: data.tts_enabled ?? false,
            adaptive_pacing: data.adaptive_pacing ?? true,
            daily_summary: data.daily_summary ?? true,
            weekly_report: data.weekly_report ?? true,
            achievement_alerts: data.achievement_alerts ?? true,
            missed_day_alert: data.missed_day_alert ?? false
        };

        if (data.fullname) {
            localStorage.setItem('parent_fullname', data.fullname);
            localStorage.setItem('parent_display_name', data.fullname);
        }
        if (data.email) localStorage.setItem('parent_email', data.email);
        if (data.relationship) localStorage.setItem('parent_relationship', data.relationship);

        const settings = {
            font_size: data.font_size || 'Large',
            time_limit: data.time_limit || '1 hour',
            color_mode: data.color_mode || 'High Contrast',
            tts_enabled: data.tts_enabled ?? false,
            adaptive_pacing: data.adaptive_pacing ?? true,
            daily_summary: data.daily_summary ?? true,
            weekly_report: data.weekly_report ?? true,
            achievement_alerts: data.achievement_alerts ?? true,
            missed_day_alert: data.missed_day_alert ?? false
        };

        saveParentPreferencesToStorage(settings);
        saveParentNotificationsToStorage({
            daily_summary: settings.daily_summary,
            weekly_report: settings.weekly_report,
            achievement_alerts: settings.achievement_alerts,
            missed_day_alert: settings.missed_day_alert
        });
        syncPreferenceControls(settings);
        applyCustomizationSettings(settings);
        return true;
    } catch (error) {
        console.warn('Could not load parent preferences:', error);
        return false;
    }
}

async function loadParentData() {
    try {
        const supabaseClient = await waitForSupabase();
        if (!supabaseClient || !supabaseClient.auth) {
            loadFromLocalStorage();
            return;
        }

        const userContext = await getCurrentUserContext(supabaseClient);
        if (!userContext?.user) {
            loadFromLocalStorage();
            return;
        }

        const resolved = await resolveParentProfileForUser(supabaseClient, userContext.user, userContext.profile);
        if (!resolved?.profile) {
            loadFromLocalStorage();
            return;
        }

        const data = resolved.profile;
        currentParentId = data.id;
        parentProfileOriginalData = {
            fullname: data.fullname || '',
            email: data.email || '',
            relationship: data.relationship || '',
            font_size: data.font_size || 'Large',
            time_limit: data.time_limit || '1 hour',
            color_mode: data.color_mode || 'High Contrast',
            tts_enabled: data.tts_enabled ?? false,
            adaptive_pacing: data.adaptive_pacing ?? true,
            daily_summary: data.daily_summary ?? true,
            weekly_report: data.weekly_report ?? true,
            achievement_alerts: data.achievement_alerts ?? true,
            missed_day_alert: data.missed_day_alert ?? false
        };

        const profileName = data.fullname || userContext.profile?.display_name || userContext.user.user_metadata?.display_name || userContext.user.email?.split('@')[0] || 'User';
        const profileEmail = data.email || userContext.user.email || '';
        const profileRelationship = data.relationship || userContext.profile?.relationship || '';
        const parentFullName = document.getElementById('parent-full-name');
        const infoFullName = document.getElementById('info-fullname');
        const infoEmail = document.getElementById('info-email');
        const infoRelationship = document.getElementById('info-relationship');
        const parentNameDisplay = document.getElementById('parent-name-display');
        const accountFullName = document.getElementById('account-fullname');
        const accountEmail = document.getElementById('account-email');
        const accountRelationship = document.getElementById('account-relationship');

        if (parentFullName) parentFullName.textContent = profileName || 'Loading profile…';
        if (infoFullName) infoFullName.textContent = profileName || '—';
        if (infoEmail) infoEmail.textContent = profileEmail || '—';
        if (infoRelationship) infoRelationship.textContent = profileRelationship || '—';
        if (parentNameDisplay) parentNameDisplay.textContent = (profileName || 'Account').split(' ')[0];
        if (accountFullName) accountFullName.value = profileName || '';
        if (accountEmail) accountEmail.value = profileEmail || '';
        if (accountRelationship) accountRelationship.value = profileRelationship || '';

        localStorage.setItem('parent_fullname', profileName);
        localStorage.setItem('parent_display_name', profileName);
        if (profileEmail) localStorage.setItem('parent_email', profileEmail);
        if (profileRelationship) localStorage.setItem('parent_relationship', profileRelationship);

        const settings = {
            font_size: data.font_size || 'Large',
            time_limit: data.time_limit || '1 hour',
            color_mode: data.color_mode || 'High Contrast',
            tts_enabled: data.tts_enabled ?? false,
            adaptive_pacing: data.adaptive_pacing ?? true,
            daily_summary: data.daily_summary ?? true,
            weekly_report: data.weekly_report ?? true,
            achievement_alerts: data.achievement_alerts ?? true,
            missed_day_alert: data.missed_day_alert ?? false
        };

        saveParentPreferencesToStorage(settings);
        saveParentNotificationsToStorage({
            daily_summary: settings.daily_summary,
            weekly_report: settings.weekly_report,
            achievement_alerts: settings.achievement_alerts,
            missed_day_alert: settings.missed_day_alert
        });
        syncPreferenceControls(settings);
        applyCustomizationSettings(settings);
    } catch (error) {
        console.error('Error loading parent data:', error);
        loadFromLocalStorage();
    }

    updateLearnerStats();
    updateRecentNotifications();
}

async function createParentProfile(userId, userEmail) {
    const supabaseClient = window.supabaseClient || supabase || await waitForSupabase();
    const userContext = await getCurrentUserContext(supabaseClient);
    if (!userContext?.user) return;

    const resolved = await resolveParentProfileForUser(supabaseClient, userContext.user, userContext.profile);
    if (resolved?.profile) {
        currentParentId = resolved.profile.id;
        await loadParentData();
    }
}

async function savePreferences() {
    const preferences = {
        font_size: document.getElementById('font-size-select').value,
        time_limit: document.getElementById('time-limit-select').value,
        color_mode: document.getElementById('color-mode-select').value,
        tts_enabled: document.getElementById('tts-toggle').checked,
        adaptive_pacing: document.getElementById('adaptive-toggle').checked,
        updated_at: new Date().toISOString()
    };

    saveParentPreferencesToStorage(preferences);
    syncPreferenceControls(preferences);
    applyCustomizationSettings(preferences);

    const supabaseClient = window.supabaseClient || supabase || await waitForSupabase();
    if (!supabaseClient || !supabaseClient.auth) {
        showToast('Preferences saved locally. Supabase is unavailable.', '#FF8C42');
        return;
    }

    if (!currentParentId) {
        const userContext = await getCurrentUserContext(supabaseClient);
        if (!userContext?.user) {
            showToast('Preferences saved locally. Please login to sync to Supabase.', '#FF8C42');
            return;
        }

        const resolved = await resolveParentProfileForUser(supabaseClient, userContext.user, userContext.profile);
        if (!resolved?.profile) {
            showToast('Preferences saved locally. Unable to sync to Supabase.', '#FF8C42');
            return;
        }
        currentParentId = resolved.profile.id;
    }

    showSaving(true);

    try {
        const { error } = await supabaseClient
            .from('users')
            .update(preferences)
            .eq('id', currentParentId);

        showSaving(false);

        if (error) {
            console.error('Error saving preferences:', error);
            showToast('Error saving preferences! ❌', '#FF6B6B');
        } else {
            showToast('Preferences saved successfully! ✅', '#4CAF7D');
        }
    } catch (error) {
        showSaving(false);
        console.error('Error saving preferences:', error);
        showToast('Error saving preferences! ❌', '#FF6B6B');
    }
}

async function saveNotifications() {
    const notifications = {
        daily_summary: document.getElementById('daily-summary-toggle').checked,
        weekly_report: document.getElementById('weekly-report-toggle').checked,
        achievement_alerts: document.getElementById('achievement-alerts-toggle').checked,
        missed_day_alert: document.getElementById('missed-day-toggle').checked,
        updated_at: new Date().toISOString()
    };

    saveParentNotificationsToStorage(notifications);

    const supabaseClient = window.supabaseClient || supabase || await waitForSupabase();
    if (!supabaseClient || !supabaseClient.auth) {
        showToast('Notifications saved locally. Supabase is unavailable.', '#FF8C42');
        return;
    }

    if (!currentParentId) {
        const userContext = await getCurrentUserContext(supabaseClient);
        if (!userContext?.user) {
            showToast('Notifications saved locally. Please login to sync to Supabase.', '#FF8C42');
            return;
        }

        const resolved = await resolveParentProfileForUser(supabaseClient, userContext.user, userContext.profile);
        if (!resolved?.profile) {
            showToast('Notifications saved locally. Unable to sync to Supabase.', '#FF8C42');
            return;
        }
        currentParentId = resolved.profile.id;
    }

    showSaving(true);

    try {
        const { error } = await supabaseClient
            .from('users')
            .update(notifications)
            .eq('id', currentParentId);

        showSaving(false);

        if (error) {
            console.error('Error saving notifications:', error);
            showToast('Error saving notifications! ❌', '#FF6B6B');
        } else {
            showToast('Notification settings saved! ✅', '#4CAF7D');
        }
    } catch (error) {
        showSaving(false);
        console.error('Error saving notifications:', error);
        showToast('Error saving notifications! ❌', '#FF6B6B');
    }
}

async function saveAccount() {
    const accountData = {
        fullname: document.getElementById('account-fullname').value,
        email: document.getElementById('account-email').value,
        relationship: document.getElementById('account-relationship').value,
        updated_at: new Date().toISOString()
    };

    saveParentAccountToStorage(accountData);

    const parentFullName = document.getElementById('parent-full-name');
    const infoFullName = document.getElementById('info-fullname');
    const infoEmail = document.getElementById('info-email');
    const infoRelationship = document.getElementById('info-relationship');
    const parentNameDisplay = document.getElementById('parent-name-display');

    if (parentFullName) parentFullName.textContent = accountData.fullname;
    if (infoFullName) infoFullName.textContent = accountData.fullname;
    if (infoEmail) infoEmail.textContent = accountData.email;
    if (infoRelationship) infoRelationship.textContent = accountData.relationship;
    if (parentNameDisplay) parentNameDisplay.textContent = accountData.fullname.split(' ')[0];

    const supabaseClient = window.supabaseClient || supabase || await waitForSupabase();
    if (!supabaseClient || !supabaseClient.auth) {
        showToast('Account saved locally. Supabase is unavailable.', '#FF8C42');
        return;
    }

    if (!currentParentId) {
        const userContext = await getCurrentUserContext(supabaseClient);
        if (!userContext?.user) {
            showToast('Account saved locally. Please login to sync to Supabase.', '#FF8C42');
            return;
        }

        const resolved = await resolveParentProfileForUser(supabaseClient, userContext.user, userContext.profile);
        if (!resolved?.profile) {
            showToast('Account saved locally. Unable to sync to Supabase.', '#FF8C42');
            return;
        }
        currentParentId = resolved.profile.id;
    }

    showSaving(true);

    try {
        const { error } = await supabaseClient
            .from('users')
            .update(accountData)
            .eq('id', currentParentId);

        showSaving(false);

        if (error) {
            console.error('Error saving account:', error);
            showToast('Error updating account! ❌', '#FF6B6B');
        } else {
            showToast('Account updated successfully! ✅', '#4CAF7D');
        }
    } catch (error) {
        showSaving(false);
        console.error('Error saving account:', error);
        showToast('Error updating account! ❌', '#FF6B6B');
    }
}

function discardPreferences() {
    loadParentData();
    showToast('Changes discarded.', '#FF8C42');
}

function discardNotifications() {
    loadParentData();
    showToast('Changes discarded.', '#FF8C42');
}

function discardAccount() {
    loadParentData();
    showToast('Changes discarded.', '#FF8C42');
}

function updateLearnerStats() {
    const additionProgress = localStorage.getItem('progress_addition');
    const subtractionProgress = localStorage.getItem('progress_subtraction');
    const plantProgress = localStorage.getItem('progress_plant');
    const readingProgress = localStorage.getItem('progress_reading');
    const ancientProgress = localStorage.getItem('progress_ancient');

    let totalXP = 0;
    const allProgress = [additionProgress, subtractionProgress, plantProgress, readingProgress, ancientProgress];

    allProgress.forEach(progress => {
        if (progress) {
            try {
                const data = JSON.parse(progress);
                totalXP += (data.correctCount || 0) * 10;
            } catch (e) {}
        }
    });

    const level = Math.floor(totalXP / 100) + 1;
    const learnerStats = document.getElementById('learner-stats');
    if (learnerStats) {
        learnerStats.textContent = `Grade 3 · Level ${level} · ${totalXP} XP`;
    }
}

function updateRecentNotifications() {
    const notificationsDiv = document.getElementById('recent-notifications');
    if (!notificationsDiv) return;

    const notifications = [];
    const additionProgress = localStorage.getItem('progress_addition');
    if (additionProgress) {
        try {
            const progress = JSON.parse(additionProgress);
            if (progress.correctCount === 5) {
                notifications.push({ text: 'Learner completed Addition with 100%! 🎉', time: 'Recently', color: 'green' });
            } else if (progress.correctCount > 0) {
                notifications.push({ text: `Learner scored ${progress.correctCount}/5 on Addition`, time: 'Recently', color: 'blue' });
            }
        } catch (e) {}
    }

    const subtractionProgress = localStorage.getItem('progress_subtraction');
    if (subtractionProgress) {
        try {
            const progress = JSON.parse(subtractionProgress);
            if (progress.correctCount === 5) {
                notifications.push({ text: 'Learner completed Subtraction with 100%! 🎯', time: 'Recently', color: 'green' });
            } else if (progress.correctCount > 0) {
                notifications.push({ text: `Learner scored ${progress.correctCount}/5 on Subtraction`, time: 'Recently', color: 'blue' });
            }
        } catch (e) {}
    }

    if (notifications.length === 0) {
        notifications.push({ text: 'Complete a lesson to see notifications', time: '—', color: 'orange' });
    }

    notificationsDiv.innerHTML = '';
    notifications.slice(0, 3).forEach(notif => {
        const notifItem = document.createElement('div');
        notifItem.className = 'notif-item';
        notifItem.innerHTML = `
            <div class="notif-dot ${notif.color}"></div>
            <div class="notif-info"><h4>${notif.text}</h4></div>
            <span style="font-size:0.75rem;color:var(--text-light);">${notif.time}</span>
        `;
        notificationsDiv.appendChild(notifItem);
    });
}

function showSaving(isSaving) {
    const buttons = document.querySelectorAll('.btn-teal');
    buttons.forEach(btn => {
        if (isSaving) {
            btn.classList.add('saving');
            btn.dataset.originalText = btn.dataset.originalText || btn.textContent;
            btn.textContent = 'Saving...';
        } else {
            btn.classList.remove('saving');
            btn.textContent = btn.dataset.originalText || 'Save Changes';
        }
    });
}

function switchParentTab(name, btn) {
    document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
    document.querySelectorAll('.profile-tab').forEach(tab => tab.classList.remove('active'));
    const targetPanel = document.getElementById('tab-' + name);
    if (targetPanel) targetPanel.classList.add('active');
    if (btn) btn.classList.add('active');
}

async function initParentProfilePage() {
    updateLearnerName();

    const parentName = localStorage.getItem('parent_display_name') || localStorage.getItem('parent_fullname') || '';
    const parentNameDisplay = document.getElementById('parent-name-display');
    const parentFullName = document.getElementById('parent-full-name');
    const infoFullName = document.getElementById('info-fullname');
    const accountFullName = document.getElementById('account-fullname');

    if (parentNameDisplay) parentNameDisplay.textContent = parentName || 'Loading…';
    if (parentFullName) parentFullName.textContent = parentName || 'Loading profile…';
    if (infoFullName) infoFullName.textContent = parentName || '—';
    if (accountFullName) accountFullName.value = parentName || '';

    document.querySelectorAll('.btn-teal').forEach(btn => {
        btn.dataset.originalText = btn.dataset.originalText || btn.textContent;
    });

    await loadParentData();
}

async function loadSavedCustomization() {
    const localSettings = {
        font_size: getStoredString('pref_font_size', 'Large'),
        time_limit: getStoredString('pref_time_limit', '1 hour'),
        color_mode: getStoredString('pref_color_mode', 'High Contrast'),
        tts_enabled: getStoredBool('pref_tts', false),
        adaptive_pacing: getStoredBool('pref_adaptive', true)
    };

    applyCustomizationSettings(localSettings);
    syncPreferenceControls(localSettings);
    await loadParentPreferencesFromSupabase();
}
// Schema-backed Parent Profile overrides use users, learner_profile and parent_link.
async function loadParentData() {
    const supabaseClient = await waitForSupabase();
    if (!supabaseClient?.auth) { loadFromLocalStorage(); return false; }
    const data = await getProfileDataFromSchema(supabaseClient);
    if (!data) { loadFromLocalStorage(); return false; }

    const display = data.parent || data.viewer;
    const name = display.display_name || data.viewer.display_name || data.viewer.email || '';
    const email = display.email || data.viewer.email || '';
    const relationship = display.relationship || '';
    const setText = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value || '—'; };
    setText('parent-full-name', name); setText('info-fullname', name); setText('info-email', email); setText('info-relationship', relationship);
    const nameDisplay = document.getElementById('parent-name-display'); if (nameDisplay) nameDisplay.textContent = name.split(' ')[0] || 'Account';
    const accountName = document.getElementById('account-fullname'); if (accountName) accountName.value = name;
    const accountEmail = document.getElementById('account-email'); if (accountEmail) accountEmail.value = email;
    const accountRelationship = document.getElementById('account-relationship'); if (accountRelationship) accountRelationship.value = relationship;

    const settings = { font_size: data.viewer.font_size || 'Large', color_mode: data.viewer.color_mode || 'High Contrast', tts_enabled: data.viewer.text_to_speech ?? false, adaptive_pacing: data.viewer.adaptive_pacing ?? true };
    saveParentPreferencesToStorage(settings); syncPreferenceControls(settings); applyCustomizationSettings(settings);
    return true;
}

async function loadParentPreferencesFromSupabase() { return loadParentData(); }

async function savePreferences() {
    const preferences = {
        font_size: document.getElementById('font-size-select').value,
        color_mode: document.getElementById('color-mode-select').value,
        text_to_speech: document.getElementById('tts-toggle').checked,
        adaptive_pacing: document.getElementById('adaptive-toggle').checked,
        updated_at: new Date().toISOString()
    };
    const supabaseClient = await waitForSupabase();
    const context = supabaseClient ? await getCurrentUserContext(supabaseClient) : null;
    if (!context?.user) { showToast('Please log in to save preferences.', '#FF8C42'); return; }
    showSaving(true);
    const { error } = await supabaseClient.from('users').update(preferences).eq('id', context.user.id);
    showSaving(false);
    if (error) { console.error('Preference save failed:', error); showToast('Could not save preferences to Supabase.', '#FF6B6B'); return; }
    const cached = { ...preferences, tts_enabled: preferences.text_to_speech };
    saveParentPreferencesToStorage(cached); syncPreferenceControls(cached); applyCustomizationSettings(cached);
    showToast('Preferences saved successfully!', '#4CAF7D');
}

async function saveAccount() {
    const displayName = document.getElementById('account-fullname').value.trim();
    const supabaseClient = await waitForSupabase();
    const context = supabaseClient ? await getCurrentUserContext(supabaseClient) : null;
    if (!context?.user) { showToast('Please log in to update your account.', '#FF8C42'); return; }
    const { error } = await supabaseClient.from('users').update({ display_name: displayName, updated_at: new Date().toISOString() }).eq('id', context.user.id);
    if (error) { console.error('Account save failed:', error); showToast('Could not update your account.', '#FF6B6B'); return; }
    localStorage.setItem('parent_display_name', displayName);
    await loadParentData();
    showToast('Account updated successfully!', '#4CAF7D');
}

function saveNotifications() {
    saveParentNotificationsToStorage({
        daily_summary: document.getElementById('daily-summary-toggle').checked,
        weekly_report: document.getElementById('weekly-report-toggle').checked,
        achievement_alerts: document.getElementById('achievement-alerts-toggle').checked,
        missed_day_alert: document.getElementById('missed-day-toggle').checked
    });
    showToast('Notification choices saved on this device.', '#FF8C42');
}

// ============================================
// ADMIN DASHBOARD – SUPABASE HELPERS
// ============================================

/**
 * Safely set text content of an element by ID.
 * Used by admin dashboard panels.
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
 * Check Supabase connection status and return the client.
 * Displays green/red indicator in the settings panel.
 */
async function adminCheckConnection() {
    const indicator = document.getElementById('conn-indicator');
    const text = document.getElementById('conn-text');
    try {
        const client = await waitForSupabase(3000);
        if (client && client.auth) {
            const { data: { session } } = await client.auth.getSession();
            if (session) {
                if (indicator) { indicator.style.background = '#4CAF7D'; indicator.style.boxShadow = '0 0 6px #4CAF7D'; }
                if (text) text.textContent = 'Connected to Supabase';
                return client;
            }
        }
        if (indicator) { indicator.style.background = '#FF6B6B'; indicator.style.boxShadow = '0 0 6px #FF6B6B'; }
        if (text) text.textContent = 'Disconnected';
        return null;
    } catch (e) {
        if (indicator) { indicator.style.background = '#FF6B6B'; indicator.style.boxShadow = '0 0 6px #FF6B6B'; }
        if (text) text.textContent = 'Disconnected';
        return null;
    }
}

/**
 * Load admin dashboard analytics from Supabase.
 * Displays: Total Students, Total Parents, Total Lessons,
 * Completed Lessons, Average Score, Daily XP (today).
 * All queries use only existing tables.
 */
async function adminLoadDashboard() {
    const client = await adminCheckConnection();
    if (!client) {
        const msg = 'Disconnected from Supabase.';
        ['stat-total-students','stat-total-parents','stat-total-lessons',
         'stat-completed-lessons','stat-avg-score','stat-daily-xp',
         'analytics-total-students','analytics-total-parents','analytics-total-lessons',
         'analytics-completed-lessons','analytics-avg-score','analytics-daily-xp'].forEach(id => adminSetText(id, msg));
        return;
    }

    try {
        // ---- DIAGNOSTIC: Log all distinct roles in users table ----
        const { data: allUsers, error: roleErr } = await client
            .from('users')
            .select('id, email, role');
        if (roleErr) {
            console.error('❌ adminLoadDashboard [role diagnostic] error:', roleErr.message, roleErr);
        } else {
            console.log('📊 adminLoadDashboard [role diagnostic] — all users (id, email, role):', JSON.stringify(allUsers, null, 2));
            const distinctRoles = [...new Set(allUsers.map(u => u.role))];
            console.log('📊 adminLoadDashboard [role diagnostic] — distinct role values:', distinctRoles);
        }

        // Total Students (users.role = 'student')
        const { count: studentCount, error: err1 } = await client
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('role', 'student');
        console.log('📊 adminLoadDashboard [students count]:', { count: studentCount, error: err1 });
        if (err1) {
            console.error('❌ adminLoadDashboard [students count] error:', err1.message, err1);
            adminSetText('stat-total-students', 'Error: ' + err1.message);
        } else {
            adminSetText('stat-total-students', studentCount !== null ? String(studentCount) : '0');
        }
        adminSetText('analytics-total-students', document.getElementById('stat-total-students')?.textContent || '0');

        // Total Parents (users.role = 'parent')
        const { count: parentCount, error: err2 } = await client
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('role', 'parent');
        console.log('📊 adminLoadDashboard [parents count]:', { count: parentCount, error: err2 });
        if (err2) {
            console.error('❌ adminLoadDashboard [parents count] error:', err2.message, err2);
            adminSetText('stat-total-parents', 'Error: ' + err2.message);
        } else {
            adminSetText('stat-total-parents', parentCount !== null ? String(parentCount) : '0');
        }
        adminSetText('analytics-total-parents', document.getElementById('stat-total-parents')?.textContent || '0');

        // Total Lessons
        const { count: lessonCount, error: err3 } = await client
            .from('lessons')
            .select('*', { count: 'exact', head: true });
        if (err3) { console.error('❌ adminLoadDashboard [lessons count]:', err3.message, err3); adminSetText('stat-total-lessons', 'Error: ' + err3.message); } else { adminSetText('stat-total-lessons', lessonCount !== null ? String(lessonCount) : '0'); }
        adminSetText('analytics-total-lessons', document.getElementById('stat-total-lessons')?.textContent || '0');

        // Completed Lessons (user_progress where status = 'completed')
        const { count: completedCount, error: err4 } = await client
            .from('user_progress')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'completed');
        if (err4) { console.error('❌ adminLoadDashboard [completed lessons]:', err4.message, err4); adminSetText('stat-completed-lessons', 'Error: ' + err4.message); } else { adminSetText('stat-completed-lessons', completedCount !== null ? String(completedCount) : '0'); }
        adminSetText('analytics-completed-lessons', document.getElementById('stat-completed-lessons')?.textContent || '0');

        // Average Score
        let avgScore = 0;
        const { data: scoreData, error: err5 } = await client
            .from('user_progress')
            .select('score')
            .not('score', 'is', null);
        if (err5) {
            console.error('❌ adminLoadDashboard [average score]:', err5.message, err5);
            adminSetText('stat-avg-score', 'Error: ' + err5.message);
        } else {
            if (scoreData && scoreData.length > 0) {
                const total = scoreData.reduce((sum, row) => sum + (row.score || 0), 0);
                avgScore = Math.round(total / scoreData.length);
            }
            adminSetText('stat-avg-score', avgScore > 0 ? avgScore + '%' : '0');
        }
        adminSetText('analytics-avg-score', document.getElementById('stat-avg-score')?.textContent || '0');

        // Daily XP (today from daily_stats)
        let dailyXP = 0;
        const today = new Date().toISOString().slice(0, 10);
        const { data: dailyData, error: err6 } = await client
            .from('daily_stats')
            .select('xp_earned')
            .eq('date', today);
        console.log('📊 adminLoadDashboard [daily XP]:', { data: dailyData, error: err6 });
        if (err6) {
            console.error('❌ adminLoadDashboard [daily XP]:', err6.message, err6);
            adminSetText('stat-daily-xp', 'Error: ' + err6.message);
        } else {
            if (dailyData && dailyData.length > 0) {
                dailyXP = dailyData.reduce((sum, row) => sum + (row.xp_earned || 0), 0);
            }
            adminSetText('stat-daily-xp', dailyXP > 0 ? dailyXP + ' XP' : '0 XP');
        }
        adminSetText('analytics-daily-xp', document.getElementById('stat-daily-xp')?.textContent || '0');

        // Storage sidebar (estimated from lessons count)
        const lCount = document.getElementById('stat-total-lessons')?.textContent || '0';
        const storageEl = document.getElementById('storage-used-display');
        const storageBar = document.getElementById('storage-bar');
        const storageDetail = document.getElementById('storage-detail');
        if (storageEl) storageEl.textContent = lCount !== '0' && !lCount.startsWith('E') ? (parseInt(lCount) * 0.05).toFixed(2) + ' GB' : '0 GB';
        if (storageBar) storageBar.style.width = lCount !== '0' && !lCount.startsWith('E') ? Math.min(100, parseInt(lCount) * 5) + '%' : '0%';
        if (storageDetail) storageDetail.textContent = lCount !== '0' && !lCount.startsWith('E') ? (parseInt(lCount) * 0.05).toFixed(2) + ' GB of 1 GB' : '0 GB of 1 GB';

    } catch (e) {
        console.error('❌ adminLoadDashboard unexpected error:', e);
        ['stat-total-students','stat-total-parents','stat-total-lessons',
         'stat-completed-lessons','stat-avg-score','stat-daily-xp',
         'analytics-total-students','analytics-total-parents','analytics-total-lessons',
         'analytics-completed-lessons','analytics-avg-score','analytics-daily-xp'].forEach(id => adminSetText(id, 'Error: ' + e.message));
    }
}

/**
 * Load students from Supabase.
 * Tables: users (role='student') + user_progress + lessons.
 */
async function adminLoadStudents() {
    const client = await adminCheckConnection();
    if (!client) {
        adminSetHTML('students-table-body', '<tr><td colspan="7" style="text-align:center;color:var(--text-light);padding:30px;">No data available.</td></tr>');
        return;
    }

    try {
        const { data: students, error } = await client
            .from('users')
            .select('id, display_name, email, level, xp, adaptive_pacing, text_to_speech')
            .eq('role', 'student');

        if (error || !students || students.length === 0) {
            adminSetHTML('students-table-body', '<tr><td colspan="7" style="text-align:center;color:var(--text-light);padding:30px;">No data available.</td></tr>');
            return;
        }

        // For each student, get latest progress with lesson name
        const rows = await Promise.all(students.map(async (s) => {
            let lessonName = '—';
            let progressPct = 0;
            try {
                const { data: prog } = await client
                    .from('user_progress')
                    .select('lesson_id, progress_percentage, status, lessons(title)')
                    .eq('user_id', s.id)
                    .order('last_accessed', { ascending: false })
                    .limit(1)
                    .maybeSingle();
                if (prog) {
                    progressPct = prog.progress_percentage || 0;
                    if (prog.lessons && prog.lessons.title) {
                        lessonName = prog.lessons.title;
                    }
                }
            } catch (e) { /* ignore */ }

            return `
                <tr>
                    <td data-label="Student"><strong>${escapeHtml(s.display_name || '—')}</strong></td>
                    <td data-label="Email">${escapeHtml(s.email || '—')}</td>
                    <td data-label="Level">${s.level || 0}</td>
                    <td data-label="XP">${s.xp || 0} XP</td>
                    <td data-label="Adaptive Pacing"><span class="badge ${s.adaptive_pacing ? 'green' : 'teal'}">${s.adaptive_pacing ? 'On' : 'Off'}</span></td>
                    <td data-label="TTS"><span class="badge ${s.text_to_speech ? 'green' : 'teal'}">${s.text_to_speech ? 'On' : 'Off'}</span></td>
                    <td data-label="Current Lesson">${escapeHtml(lessonName)}</td>
                    <td data-label="Progress">
                        <div style="display:flex;align-items:center;gap:8px;">
                            <div class="progress-bar" style="flex:1;height:6px;max-width:80px;">
                                <div class="progress-fill green" style="width:${progressPct}%;"></div>
                            </div>
                            <span style="font-size:0.78rem;font-weight:700;color:var(--text-light);">${progressPct}%</span>
                        </div>
                    </td>
                </tr>
            `;
        }));

        adminSetHTML('students-table-body', rows.join(''));
    } catch (e) {
        console.error('adminLoadStudents error:', e);
        adminSetHTML('students-table-body', '<tr><td colspan="7" style="text-align:center;color:var(--text-light);padding:30px;">No data available.</td></tr>');
    }
}

/**
 * Load parents from Supabase with linked learner count.
 * Tables: users (role='parent'), parent_link, learner_profile.
 */
async function adminLoadParents() {
    const client = await adminCheckConnection();
    if (!client) {
        adminSetHTML('parents-table-body', '<tr><td colspan="5" style="text-align:center;color:var(--text-light);padding:30px;">No data available.</td></tr>');
        return;
    }

    try {
        const { data: parents, error } = await client
            .from('users')
            .select('id, display_name, email')
            .eq('role', 'parent');

        if (error || !parents || parents.length === 0) {
            adminSetHTML('parents-table-body', '<tr><td colspan="5" style="text-align:center;color:var(--text-light);padding:30px;">No data available.</td></tr>');
            return;
        }

        const rows = await Promise.all(parents.map(async (p) => {
            let linkedCount = 0;
            try {
                // Count linked learners via parent_link → learner_profile
                const { count, error: linkErr } = await client
                    .from('parent_link')
                    .select('*', { count: 'exact', head: true })
                    .eq('parent_user_id', p.id);
                if (!linkErr) linkedCount = count || 0;
            } catch (e) { /* ignore */ }

            return `
                <tr>
                    <td data-label="Parent"><strong>${escapeHtml(p.display_name || '—')}</strong></td>
                    <td data-label="Email">${escapeHtml(p.email || '—')}</td>
                    <td data-label="Linked Learners"><span class="badge teal">${linkedCount} learner${linkedCount !== 1 ? 's' : ''}</span></td>
                    <td data-label="Actions">
                        <div class="actions-cell">
                            <button class="btn btn-ghost btn-sm" onclick="showToast('Parent: ${escapeHtml(p.display_name || '')}', '#2E8C8C')">👁 View</button>
                        </div>
                    </td>
                </tr>
            `;
        }));

        adminSetHTML('parents-table-body', rows.join(''));
    } catch (e) {
        console.error('adminLoadParents error:', e);
        adminSetHTML('parents-table-body', '<tr><td colspan="5" style="text-align:center;color:var(--text-light);padding:30px;">No data available.</td></tr>');
    }
}

/**
 * Load lessons from Supabase with completion counts.
 * Tables: lessons, user_progress.
 */
async function adminLoadLessons() {
    const client = await adminCheckConnection();
    if (!client) {
        adminSetHTML('lessons-list-container', '<p style="color:var(--text-light);font-size:0.85rem;font-weight:600;text-align:center;padding:20px;">No data available.</p>');
        return;
    }

    try {
        const { data: lessons, error } = await client
            .from('lessons')
            .select('id, title, subject, difficulty, description');

        if (error || !lessons || lessons.length === 0) {
            adminSetHTML('lessons-list-container', '<p style="color:var(--text-light);font-size:0.85rem;font-weight:600;text-align:center;padding:20px;">No data available.</p>');
            return;
        }

        const rows = await Promise.all(lessons.map(async (lesson) => {
            let completedCount = 0;
            try {
                const { count, error: cntErr } = await client
                    .from('user_progress')
                    .select('*', { count: 'exact', head: true })
                    .eq('lesson_id', lesson.id)
                    .eq('status', 'completed');
                if (!cntErr) completedCount = count || 0;
            } catch (e) { /* ignore */ }

            const diffClass = lesson.difficulty === 'beginner' ? 'beginner' : lesson.difficulty === 'intermediate' ? 'intermediate' : 'advanced';
            return `
                <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid rgba(110,198,245,0.1);flex-wrap:wrap;gap:8px;">
                    <div>
                        <strong style="font-size:0.92rem;color:var(--text-dark);">${escapeHtml(lesson.title)}</strong>
                        <div style="display:flex;gap:8px;margin-top:4px;flex-wrap:wrap;">
                            <span class="badge blue">${escapeHtml(lesson.subject || '—')}</span>
                            <span class="badge ${diffClass}">${escapeHtml(lesson.difficulty || '—')}</span>
                            <span class="badge teal">${completedCount} completed</span>
                        </div>
                        ${lesson.description ? '<p style="font-size:0.82rem;color:var(--text-light);margin-top:4px;">' + escapeHtml(lesson.description) + '</p>' : ''}
                    </div>
                </div>
            `;
        }));

        adminSetHTML('lessons-list-container', rows.join(''));
    } catch (e) {
        console.error('adminLoadLessons error:', e);
        adminSetHTML('lessons-list-container', '<p style="color:var(--text-light);font-size:0.85rem;font-weight:600;text-align:center;padding:20px;">No data available.</p>');
    }
}

/**
 * Load recent activity from user_progress (completed, ordered by completed_at DESC, limit 10).
 */
async function adminLoadRecentActivity() {
    const client = await adminCheckConnection();
    const containerIds = ['recent-activity-list', 'analytics-recent-activity'];

    if (!client) {
        containerIds.forEach(id => {
            adminSetHTML(id, '<p style="color:var(--text-light);font-size:0.85rem;font-weight:600;text-align:center;padding:20px;">No data available.</p>');
        });
        return;
    }

    try {
        const { data: activities, error } = await client
            .from('user_progress')
            .select('id, score, completed_at, user_id, lesson_id, users(display_name), lessons(title)')
            .eq('status', 'completed')
            .not('completed_at', 'is', null)
            .order('completed_at', { ascending: false })
            .limit(10);

        if (error || !activities || activities.length === 0) {
            containerIds.forEach(id => {
                adminSetHTML(id, '<p style="color:var(--text-light);font-size:0.85rem;font-weight:600;text-align:center;padding:20px;">No data available.</p>');
            });
            return;
        }

        const html = activities.map(a => {
            const studentName = a.users ? (a.users.display_name || '—') : '—';
            const lessonTitle = a.lessons ? (a.lessons.title || '—') : '—';
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

        containerIds.forEach(id => {
            adminSetHTML(id, html);
        });
    } catch (e) {
        console.error('adminLoadRecentActivity error:', e);
        containerIds.forEach(id => {
            adminSetHTML(id, '<p style="color:var(--text-light);font-size:0.85rem;font-weight:600;text-align:center;padding:20px;">No data available.</p>');
        });
    }
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

// ============================================
// NAVIGATION LINK ACTIVE STATE
// ============================================

function setActiveNav() {
    const currentPage = window.location.pathname.split('/').pop();
    document.querySelectorAll('.nav-tab').forEach(tab => {
        const href = tab.getAttribute('href');
        const isActive = (href && href === currentPage) || (currentPage === '' || currentPage === 'index.html') && href === 'dashboard.html';
        tab.classList.toggle('active', isActive);
        tab.setAttribute('aria-current', isActive ? 'page' : 'false');
    });
}

function enhanceAccessibility() {
    const toast = document.getElementById('toast');
    if (toast && !toast.hasAttribute('role')) {
        toast.setAttribute('role', 'status');
        toast.setAttribute('aria-live', 'polite');
        toast.setAttribute('aria-atomic', 'true');
    }

    document.querySelectorAll('.icon-btn').forEach(button => {
        if (!button.getAttribute('aria-label') && button.title) {
            button.setAttribute('aria-label', button.title);
        }
    });
}

// ============================================
// PAGE INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    enhanceAccessibility();
    setActiveNav();
    loadSavedCustomization();
    animateProgressBars();
    loadUserInfo();

    if (document.getElementById('login-screen') || document.getElementById('signup-screen')) {
        checkAuthAndRedirect();
    }

    if (document.getElementById('dashboard-screen')) {
        loadLessonProgress();
        const displayName = localStorage.getItem('neurolearn_display_name');
        if (displayName) {
            showToast(`Welcome back, ${displayName}! 🎉`);
        }
    }

    if (document.getElementById('student-name') || document.getElementById('profile-username')) {
        if (typeof initStudentProfilePage === 'function') {
            initStudentProfilePage();
        }
    }

    if (document.getElementById('parent-full-name') || document.getElementById('info-fullname')) {
        if (typeof initParentProfilePage === 'function') {
            initParentProfilePage();
        }
    }

    if (document.querySelector('.profile-tabs')) {
        animateProgressBars();
    }

    if (document.getElementById('bar-chart')) {
        animateProgressBars();
    }
});
