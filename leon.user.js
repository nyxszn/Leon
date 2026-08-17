// ==UserScript==
// @name         Leon - YouTube Ad Skipper
// @namespace    http://tampermonkey.net/
// @version      3.0
// @description  Automatically clicks Skip Ad on YouTube. Leon is watching.
// @author       You
// @match        https://www.youtube.com/*
// @match        https://youtube.com/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    console.log('[Leon v3.0] Systems online. Watching YouTube...');

    // --- Config ---
    const COOLDOWN = 3000;
    const CHECK_INTERVAL = 500;

    // --- Stats (saved in localStorage) ---
    let totalSkipped = parseInt(localStorage.getItem('leon_total')) || 0;
    let sessionSkipped = 0;

    function saveStats() {
        localStorage.setItem('leon_total', totalSkipped);
    }

    // --- UI: Floating Badge ---
    let badge = null;
    function createBadge() {
        if (badge) return;
        badge = document.createElement('div');
        badge.id = 'leon-badge';
        badge.innerHTML = `
            <div style="
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
                color: #00f0ff;
                padding: 12px 18px;
                border-radius: 12px;
                font-family: 'Segoe UI', system-ui, sans-serif;
                font-size: 13px;
                font-weight: 600;
                z-index: 999999;
                box-shadow: 0 4px 20px rgba(0,240,255,0.3);
                border: 1px solid rgba(0,240,255,0.3);
                display: flex;
                align-items: center;
                gap: 8px;
                transition: all 0.3s ease;
                cursor: default;
                user-select: none;
            ">
                <span style="font-size: 16px;">🤖</span>
                <span id="leon-status">Leon is watching...</span>
                <span id="leon-count" style="
                    background: rgba(0,240,255,0.15);
                    padding: 2px 8px;
                    border-radius: 10px;
                    font-size: 11px;
                ">${totalSkipped}</span>
            </div>
        `;
        document.body.appendChild(badge);
    }

    function updateBadge(status, count) {
        if (!badge) return;
        const st = badge.querySelector('#leon-status');
        const ct = badge.querySelector('#leon-count');
        if (st) st.textContent = status || 'Leon is watching...';
        if (ct) ct.textContent = count !== undefined ? count : totalSkipped;
    }

    function flashBadge(msg, color) {
        if (!badge) return;
        const box = badge.firstElementChild;
        if (!box) return;
        const orig = box.style.borderColor;
        box.style.borderColor = color || '#00ff88';
        box.style.boxShadow = '0 4px 30px ' + (color || 'rgba(0,255,136,0.5)');
        updateBadge(msg, totalSkipped + sessionSkipped);
        setTimeout(() => {
            box.style.borderColor = orig;
            box.style.boxShadow = '';
            updateBadge('Leon is watching...', totalSkipped + sessionSkipped);
        }, 2000);
    }

    // --- Core: Skip Logic ---
    let lastSkipTime = 0;

    const SKIP_SELECTORS = [
        '.ytp-skip-ad-button',
        '.ytp-ad-skip-button',
        '.ytp-ad-skip-button-modern',
        'button[class*="skip-ad"]',
        'button[class*="ad-skip"]',
        '[class*="skip-ad-button"]'
    ];

    function findSkipButton() {
        for (const sel of SKIP_SELECTORS) {
            const btns = document.querySelectorAll(sel);
            for (const btn of btns) {
                if (!btn.offsetParent) continue;
                const style = window.getComputedStyle(btn);
                if (style.display === 'none' || style.visibility === 'hidden') continue;
                const text = (btn.textContent || '').toLowerCase();
                if (text.includes('skip') || text.includes('saltar') || text.includes('überspringen')) {
                    return btn;
                }
                if (btn.offsetWidth > 40 && btn.offsetHeight > 20) return btn;
            }
        }
        return null;
    }

    function attemptSkip() {
        const now = Date.now();
        if (now - lastSkipTime < COOLDOWN) return;

        const btn = findSkipButton();
        if (btn) {
            btn.click();
            lastSkipTime = now;
            sessionSkipped++;
            totalSkipped++;
            saveStats();
            flashBadge('Ad skipped!', '#00ff88');
            console.log('[Leon] Skip button clicked! Total: ' + totalSkipped);
        }
    }

    // --- Observers ---
    let checkInterval = null;

    function startLeon() {
        if (checkInterval) return;
        createBadge();

        // Watch for DOM changes
        const observer = new MutationObserver(() => {
            attemptSkip();
        });
        observer.observe(document.body, { childList: true, subtree: true });

        // Backup interval
        checkInterval = setInterval(attemptSkip, CHECK_INTERVAL);

        console.log('[Leon] Started watching.');
    }

    // --- Handle SPA navigation ---
    let lastUrl = location.href;
    new MutationObserver(() => {
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            if (!document.getElementById('leon-badge')) {
                createBadge();
                updateBadge('Leon is watching...', totalSkipped);
            }
        }
    }).observe(document, { subtree: true, childList: true });

    // --- Start ---
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startLeon);
    } else {
        startLeon();
    }

})();
