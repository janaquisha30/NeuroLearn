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

// ---- Navigation Functions ----
function goToDashboard() {
    let username = 'Jake';
    const loginUsername = document.getElementById('login-username');
    if (loginUsername && loginUsername.value) {
        username = loginUsername.value;
    }
    const signupUsername = document.getElementById('signup-username');
    if (signupUsername && signupUsername.value) {
        username = signupUsername.value;
    }
    localStorage.setItem('neurolearn_username', username);
    window.location.href = 'dashboard.html';
}

function showLogout() {
    localStorage.removeItem('neurolearn_username');
    window.location.href = 'index.html';
    showToast('Logged out successfully 👋');
}

function selectRole(btn) {
    document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

// ---- Load Username on Pages ----
function loadUsername() {
    const username = localStorage.getItem('neurolearn_username');
    if (username) {
        const elements = ['welcome-username', 'nav-username', 'profile-username', 'lesson-username', 'report-name'];
        elements.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = username;
        });
        const studentName = document.getElementById('student-name');
        if (studentName && username) {
            studentName.textContent = username + ' J. Johnson';
        }
        const infoName = document.getElementById('info-name');
        if (infoName && username) {
            infoName.textContent = username + ' J. Johnson';
        }
    }
}

// ---- Dashboard Filter Functions ----
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

// ---- Animate Progress Bars ----
function animateProgressBars() {
    document.querySelectorAll('.progress-fill[data-width]').forEach(bar => {
        const target = bar.dataset.width;
        bar.style.width = '0%';
        setTimeout(() => {
            bar.style.width = target;
        }, 100);
    });
    document.querySelectorAll('.progress-fill:not([data-width])').forEach(bar => {
        const w = bar.style.width;
        if (w && w !== '0%') {
            bar.style.width = '0%';
            setTimeout(() => {
                bar.style.width = w;
            }, 100);
        }
    });
}

// ---- Font Size Preference ----
function applyFontSize(val) {
    const map = { Small: '14px', Medium: '16px', Large: '18px' };
    document.documentElement.style.fontSize = map[val] || '16px';
    showToast(`Font size changed to ${val}`);
}

// ---- Set Active Navigation Link ----
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

// ---- Dashboard Specific Initialization ----
if (document.getElementById('dashboard-screen')) {
    window.addEventListener('DOMContentLoaded', () => {
        loadUsername();
        animateProgressBars();
        const username = localStorage.getItem('neurolearn_username');
        if (username) {
            showToast(`Welcome back, ${username}! 🎉`);
        }
    });
}

// ---- Profile Page Initialization ----
if (document.querySelector('.profile-tabs')) {
    window.addEventListener('DOMContentLoaded', () => {
        loadUsername();
        animateProgressBars();
    });
}

// ---- Report Page Initialization ----
if (document.getElementById('bar-chart')) {
    window.addEventListener('DOMContentLoaded', () => {
        loadUsername();
        animateProgressBars();
    });
}

// ---- Lesson Page Initialization ----
if (document.getElementById('q-list')) {
    window.addEventListener('DOMContentLoaded', () => {
        loadUsername();
    });
}

// ---- General DOM Ready ----
document.addEventListener('DOMContentLoaded', () => {
    setActiveNav();
    animateProgressBars();
});

// ---- New script for testing ---- //

function showToast(message, color = "#2E8C8C") {
    const toast = document.getElementById("toast");
    if (!toast) return;

    toast.textContent = message;
    toast.style.background = color;
    toast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}

// ---------- Role ----------
let selectedRole = "student";

function selectRole(button) {
    document.querySelectorAll(".role-btn").forEach(btn => {
        btn.classList.remove("active");
    });

    button.classList.add("active");
    selectedRole = button.dataset.role;
}

// ---------- LOGIN ----------
async function goToDashboardWithCaptcha() {
    const username = document.getElementById("login-username").value.trim();
    const password = document.getElementById("login-password").value;

    if (!username || !password) {
        showToast("Please enter your username and password.", "#ff4d4d");
        return;
    }

    try {
        // Find email using username
        const { data: userRecord, error: lookupError } =
            await supabaseClient
                .from("users")
                .select("email, username")
                .eq("username", username)
                .single();

        if (lookupError || !userRecord) {
            showToast("Username not found.", "#ff4d4d");
            return;
        }

        // Sign in
        const { data, error } =
            await supabaseClient.auth.signInWithPassword({
                email: userRecord.email,
                password: password
            });

        if (error) {
            showToast(error.message, "#ff4d4d");
            return;
        }

        localStorage.setItem("neurolearn_username", userRecord.username);
        showToast("Login successful! 🎉", "#28a745");

        setTimeout(() => {
            window.location.href = "dashboard.html";
        }, 1000);

    } catch (err) {
        console.error(err);
        showToast("Unexpected error occurred.", "#ff4d4d");
    }
}

// ---------- SIGN UP ----------
async function handleSignUpWithCaptcha() {
    const email = document.getElementById("signup-email").value.trim();
    const username = document.getElementById("signup-username").value.trim();
    const password = document.getElementById("signup-password").value;

    if (!email || !username || !password) {
        showToast("Please complete all fields.", "#ff4d4d");
        return;
    }

    if (password.length < 6) {
        showToast("Password must be at least 6 characters.", "#ff4d4d");
        return;
    }

    try {
        const { data: existingUsername } = await supabaseClient
            .from("users")
            .select("id")
            .eq("username", username)
            .maybeSingle();

        if (existingUsername) {
            showToast("Username already exists.", "#ff4d4d");
            return;
        }

        const { data, error } = await supabaseClient.auth.signUp({
            email: email,
            password: password
        });

        if (error) {
            showToast(error.message, "#ff4d4d");
            return;
        }

        if (!data.user) {
            showToast("Unable to create account.", "#ff4d4d");
            return;
        }

        // Insert profile into users table
        const { error: profileError } = await supabaseClient
            .from("users")
            .insert({
                id: data.user.id,
                email: email,
                username: username,
                role: selectedRole,
                level: 1,
                xp: 0,
                streak_days: 0
            });

        if (profileError) {
            console.error(profileError);
            showToast(profileError.message, "#ff4d4d");
            return;
        }

        const { error: loginError } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (loginError) {
            showToast(loginError.message, "#ff4d4d");
            return;
        }

        localStorage.setItem("neurolearn_username", username);
        showToast("Account created successfully! 🎉", "#28a745");

        setTimeout(() => {
            window.location.href = "dashboard.html";
        }, 1200);

    } catch (err) {
        console.error(err);
        showToast("Unexpected signup error.", "#ff4d4d");
    }
}

// ---------- LOGOUT ----------
async function showLogout() {
    try {
        await supabaseClient.auth.signOut();
    } catch (err) {
        console.error(err);
    }

    localStorage.removeItem("neurolearn_username");
    window.location.href = "index.html";
}

// ---------- CHECK SESSION ----------
async function checkSession() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    const isDashboard = document.getElementById("dashboard-screen");

    if (isDashboard && !session) {
        window.location.href = "index.html";
        return;
    }

    return session;
}

// ---------- LOAD USER ----------
async function loadUsername() {
    const session = await checkSession();
    if (!session) return;

    const userId = session.user.id;
    const { data: profile, error } = await supabaseClient
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

    if (error) {
        console.error(error);
        return;
    }

    localStorage.setItem("neurolearn_username", profile.username);

    const username = profile.username;
    const ids = [
        "welcome-username",
        "nav-username",
        "profile-username",
        "lesson-username",
        "report-name"
    ];

    ids.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = username;
        }
    });

    const studentName = document.getElementById("student-name");
    if (studentName) {
        studentName.textContent = username + " J. Johnson";
    }

    const infoName = document.getElementById("info-name");
    if (infoName) {
        infoName.textContent = username + " J. Johnson";
    }
}

// ---------- REDIRECT IF ALREADY LOGGED IN ----------
async function redirectIfLoggedIn() {
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (
        session &&
        (
            window.location.pathname.endsWith("index.html") ||
            window.location.pathname.endsWith("signup.html") ||
            window.location.pathname === "/"
        )
    ) {
        window.location.href = "dashboard.html";
    }
}

// ---------- LESSON FILTERS ----------
let currentDifficulty = "all";
let currentSubject = "math";

function filterSubject(btn, subject) {
    document.querySelectorAll(".subject-tab").forEach(tab => {
        tab.classList.remove("active");
    });

    btn.classList.add("active");
    filterLessons(subject, currentDifficulty);
}

function filterDifficulty(value) {
    currentDifficulty = value;
    filterLessons(currentSubject, value);
}

function filterLessons(subject, difficulty) {
    currentSubject = subject;
    const cards = document.querySelectorAll(".lesson-card");

    cards.forEach(card => {
        const cardSubject = card.dataset.subject;
        const cardDifficulty = card.dataset.difficulty;
        const matchSubject = subject === "all" || cardSubject === subject;
        const matchDifficulty = difficulty === "all" || cardDifficulty === difficulty;

        card.style.display = matchSubject && matchDifficulty ? "flex" : "none";
    });
}

// ---------- PROGRESS BARS ----------
function animateProgressBars() {
    document.querySelectorAll(".progress-fill").forEach(bar => {
        const target = bar.dataset.width || bar.style.width;
        bar.style.width = "0%";
        setTimeout(() => {
            bar.style.width = target;
        }, 150);
    });
}

// ---------- FONT SIZE ----------
function applyFontSize(size) {
    const map = {
        Small: "14px",
        Medium: "16px",
        Large: "18px"
    };

    document.documentElement.style.fontSize = map[size] || "16px";
    showToast("Font size changed to " + size);
}

// ---------- ACTIVE NAV ----------
function setActiveNav() {
    const page = window.location.pathname.split("/").pop();

    document.querySelectorAll(".nav-tab").forEach(link => {
        if (link.getAttribute("href") === page) {
            link.classList.add("active");
        } else {
            link.classList.remove("active");
        }
    });
}

// ---------- PAGE INITIALIZATION ----------
document.addEventListener("DOMContentLoaded", async () => {
    await redirectIfLoggedIn();
    await loadUsername();
    animateProgressBars();
    setActiveNav();
});

// ---------- AUTH STATE ----------
supabaseClient.auth.onAuthStateChange((event, session) => {
    console.log("Auth Event:", event);

    if (event === "SIGNED_OUT") {
        localStorage.removeItem("neurolearn_username");
    }
});

// ---------- DEBUG ----------
console.log("✅ NeuroLearn Authentication Loaded");
