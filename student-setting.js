const fontSizeSelect = document.querySelectorAll('.pref-select')[0];
const colorModeSelect = document.querySelectorAll('.pref-select')[1];
const ttsToggle = document.querySelector('.switch input');
const adjustBtn = document.querySelector('.btn-adjust');
const screenContainer = document.querySelector('.screen-container');

function applySettings() {
    const savedFontSize = localStorage.getItem('student-fontSize') || 'Medium';
    const savedColorMode = localStorage.getItem('student-colorMode') || 'Normal';
    const savedTTS = localStorage.getItem('student-tts') === 'true';

    fontSizeSelect.value = savedFontSize;
    colorModeSelect.value = savedColorMode;
    ttsToggle.checked = savedTTS;

    const textElements = document.querySelectorAll('.welcome-text, .user-name, .info-row, .divider, .pref-label, .pref-select, .parent-text, .btn-adjust');

    if (savedFontSize === 'Large') {
        textElements.forEach(el => {
            el.style.fontSize = '1.25rem';
        });
        document.querySelector('.welcome-text span').style.fontSize = '1.6rem';
    } else if (savedFontSize === 'Small') {
        textElements.forEach(el => {
            el.style.fontSize = '0.75rem';
        });
        document.querySelector('.welcome-text span').style.fontSize = '1.1rem';
    } else {
        textElements.forEach(el => {
            el.style.fontSize = '';
        });
        document.querySelector('.welcome-text span').style.fontSize = '';
    }

    if (savedColorMode === 'Dark Mode') {
        screenContainer.style.background = '#222222';
        document.querySelectorAll('.profile-card, .parent-profile-card').forEach(card => {
            card.style.backgroundColor = 'rgba(50, 50, 50, 0.9)';
            card.style.color = '#ffffff';
        });
        document.querySelectorAll('.info-label, .info-value, .pref-label, .parent-text, .divider').forEach(el => {
            el.style.color = '#ffffff';
        });
    } else if (savedColorMode === 'High Contrast') {
        screenContainer.style.background = '#ffffff';
        document.querySelectorAll('.profile-card, .parent-profile-card').forEach(card => {
            card.style.backgroundColor = '#000000';
            card.style.border = '3px solid #ffff00';
            card.style.color = '#ffff00';
        });
        document.querySelectorAll('.info-label, .info-value, .pref-label, .parent-text, .divider').forEach(el => {
            el.style.color = '#ffff00';
        });
    } else {
        screenContainer.style.background = 'linear-gradient(to bottom, #aae3f0, #e0f7fa 40%, #a3e6a3 75%, #62c370)';
        document.querySelectorAll('.profile-card, .parent-profile-card').forEach(card => {
            card.style.backgroundColor = 'rgba(255, 255, 255, 0.85)';
            card.style.border = '1px solid rgba(255, 255, 255, 0.6)';
            card.style.color = '';
        });
        document.querySelectorAll('.info-label').forEach(el => el.style.color = '#4a777a');
        document.querySelectorAll('.info-value, .pref-label').forEach(el => el.style.color = '#2a4d50');
        document.querySelectorAll('.parent-text').forEach(el => el.style.color = '#3e6164');
        document.querySelectorAll('.divider').forEach(el => el.style.color = '#639da1');
    }
}

adjustBtn.addEventListener('click', () => {
    localStorage.setItem('student-fontSize', fontSizeSelect.value);
    localStorage.setItem('student-colorMode', colorModeSelect.value);
    localStorage.setItem('student-tts', ttsToggle.checked);
    applySettings();
    alert('Learning preferences updated successfully!');
});

window.addEventListener('DOMContentLoaded', applySettings);