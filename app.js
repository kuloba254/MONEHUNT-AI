// ================================================================
// DOLARHUNTER app.js Ã¢â‚¬â€ Clean Focused Build
// Auth: Amy-verified PKCE (DO NOT CHANGE)
// ================================================================

const DERIV_CLIENT_ID = "34943FQww3Fan7wd7NdB5";
const DERIV_APP_ID    = "34943FQww3Fan7wd7NdB5";
// Auto-detect domain Ã¢â‚¬â€ works for both DOLARHUNTER.com AND DOLARHUNTER.vercel.app
// Both must be registered as redirect URIs in your Deriv app dashboard
const DERIV_REDIRECT = (
    window.location.hostname === 'DOLARHUNTER.com' ||
    window.location.hostname === 'www.DOLARHUNTER.com'
) ? 'https://DOLARHUNTER.com/' : 'https://DOLARHUNTER.vercel.app/';

// Ã¢â€â‚¬Ã¢â€â‚¬ State Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
let derivWS          = null;
let accessToken      = null;
let accountId        = null;
let allAccounts      = [];
let isReconnecting   = false;
let reconnectTimer   = null;

// Bot state
let isBotRunning     = false;
let botDirection     = "over";
let currentStake     = 1.00;
let baseStake        = 1.00;
let totalPL          = 0;
let totalStake       = 0;
let totalPayout      = 0;
let totalRuns        = 0;
let totalWins        = 0;
let totalLosses      = 0;
let currentStreak    = 0;
let lastContractId   = null;
let lastEntrySpot    = null;
let aiAutoEnabled    = true;
let pendingContract  = false;

// Digit data Ã¢â‚¬â€ real ticks only
let digitData        = {};
let currentDigitMkt  = "R_10";
let activeTickSubs   = new Set();
let lastDigit        = null;
let consecutiveSame  = 0;
let marketMemory     = {};

// Signal tracking
let seenSignals      = new Set();
let signalHistory    = [];

// Audio Ã¢â‚¬â€ coins for win, cash register ding, realistic loss sound
const winAudio  = new Audio('https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3'); // coins
const lossAudio = new Audio('https://assets.mixkit.co/active_storage/sfx/2955/2955-preview.mp3'); // fail thud

// Preload
winAudio.volume  = 0.7;
lossAudio.volume = 0.6;
winAudio.load();
lossAudio.load();

function playWin() {
    try {
        winAudio.currentTime = 0;
        winAudio.play().catch(() => {
            // Fallback: Web Audio API coin sound
            playCoinSound();
        });
    } catch(e) { playCoinSound(); }
}

function playLoss() {
    try {
        lossAudio.currentTime = 0;
        lossAudio.play().catch(() => {
            playLossSound();
        });
    } catch(e) { playLossSound(); }
}

// Web Audio API fallback Ã¢â‚¬â€ coin jingle
function playCoinSound() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        // Play 3 quick coin pings
        [0, 0.08, 0.16].forEach((delay, i) => {
            const osc  = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type      = 'sine';
            osc.frequency.setValueAtTime(880 + (i * 220), ctx.currentTime + delay);
            osc.frequency.exponentialRampToValueAtTime(1200 + (i * 200), ctx.currentTime + delay + 0.1);
            gain.gain.setValueAtTime(0.4, ctx.currentTime + delay);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.2);
            osc.start(ctx.currentTime + delay);
            osc.stop(ctx.currentTime + delay + 0.2);
        });
    } catch(e) {}
}

// Web Audio API fallback Ã¢â‚¬â€ dull thud for loss
function playLossSound() {
    try {
        const ctx  = new (window.AudioContext || window.webkitAudioContext)();
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.4);
    } catch(e) {}
}

// Market labels Ã¢â‚¬â€ valid Deriv underlying_symbols only
const MKT = {
    "R_10":     "Volatility 10",
    "R_25":     "Volatility 25",
    "R_50":     "Volatility 50",
    "R_75":     "Volatility 75",
    "R_100":    "Volatility 100",
    "1HZ10V":   "Volatility 10 (1s)",
    "1HZ25V":   "Volatility 25 (1s)",
    "1HZ50V":   "Volatility 50 (1s)",
    "1HZ75V":   "Volatility 75 (1s)",
    "1HZ100V":  "Volatility 100 (1s)",
    "jump_10":  "Jump 10 Index",
    "jump_25":  "Jump 25 Index",
    "jump_50":  "Jump 50 Index",
    "jump_75":  "Jump 75 Index",
    "jump_100": "Jump 100 Index",
};

const ALL_MKTS = ["R_10","R_25","R_50","R_75","R_100","1HZ10V","1HZ25V","1HZ50V","1HZ75V","1HZ100V"];

// Pending proposal tracking
let pendingProposalId    = null;
let pendingProposalPrice = null;
let reqIdCounter         = 1;
function nextReqId() { return ++reqIdCounter; }

// Pip sizes per symbol Ã¢â‚¬â€ populated from active_symbols
let activePipSizes = {};

// Session tracking Ã¢â‚¬â€ resets on each "Reset & Continue"
let sessionBasePL = 0; // PL at the start of current session

// Smart Recovery System
// Tracks consecutive losses and switches to high-probability recovery trade
let consecutiveLosses  = 0;
let isInRecoveryMode   = false;
let originalDirection  = null;  // what user originally set
let originalPrediction = null;  // what user originally set
const RECOVERY_TRIGGER = 2;     // losses before switching to recovery
// Recovery map: if trading Over X, recover with Under (9-X) and vice versa
// e.g. Over 1 Ã¢â€ â€™ recover with Under 8 | Over 2 Ã¢â€ â€™ recover with Under 7
function getRecoveryTrade(direction, pred) {
    if (direction === 'over') {
        // Recovery: switch to Under (9 - pred) for high win probability
        const recoveryPred = Math.min(9, Math.max(5, 9 - pred));
        return { direction: 'under', pred: recoveryPred };
    } else if (direction === 'under') {
        // Recovery: switch to Over (9 - pred) for high win probability
        const recoveryPred = Math.max(0, Math.min(4, 9 - pred));
        return { direction: 'over', pred: recoveryPred };
    }
    return null;
}

// Contract type map
const CONTRACT_MAP = {
    over_under:     { over:"DIGITOVER", under:"DIGITUNDER" },
    even_odd:       { even:"DIGITEVEN", odd:"DIGITODD" },
    rise_fall:      { rise:"CALL", fall:"PUT" },
    only_ups_downs: { ups:"RUNHIGH", downs:"RUNLOW" }
};

// ================================================================
// PAGE LOAD
// ================================================================
window.addEventListener('load', async () => {
    onTypeChange();
    updateInfoBar();

    // Start public WebSocket for digit stats
    connectPublicWS();

    // MT5 signal lifecycle runs independently of which tab is open, so
    // signals keep generating/expiring correctly even if the user never
    // visits the MT5 tab first Ã¢â‚¬â€ give the public WS a moment to connect.
    loadMt5Signals();
    setTimeout(startMt5BackgroundScan, 4000);

    const params     = new URLSearchParams(window.location.search);
    const code       = params.get('code');
    const oauthState = params.get('state');

    if (code && oauthState) {
        // Fresh OAuth callback
        try { window.history.replaceState({}, document.title, window.location.pathname); } catch(e) {}
        await handleOAuthCallback(code, oauthState);

    } else {
        // Check for token set by callback.html
        const cbToken = sessionStorage.getItem('deriv_access_token');
        if (cbToken) {
            sessionStorage.removeItem('deriv_access_token');
            sessionStorage.removeItem('deriv_token_expiry');
            accessToken = cbToken;
            showStatus("Connecting...", 'info');
            await loadAccounts();

        } else {
            // Auto-reconnect from saved token (stays logged in for 30 days)
            const savedToken     = localStorage.getItem('bth_access_token');
            const savedAccountId = localStorage.getItem('bth_account_id');
            const connectedAt    = parseInt(localStorage.getItem('bth_connected_at') || '0');
            const ageHours       = (Date.now() - connectedAt) / 3600000;

            if (savedToken && ageHours < 720) {
                accessToken = savedToken;
                if (savedAccountId) accountId = savedAccountId;
                showStatus("Reconnecting to your account...", 'info');
                log("Ã°Å¸â€â€ž Auto-reconnecting from saved session...", 'i');
                await loadAccounts();
            }
        }
    }

    // Show risk disclaimer on first visit
    if (!localStorage.getItem('risk-accepted')) {
        setTimeout(() => {
            showLegal('risk');
            const origClose = window.closeLegal;
            window.closeLegal = function() {
                localStorage.setItem('risk-accepted', '1');
                origClose();
                window.closeLegal = origClose;
            };
        }, 1500);
    }
});;

// ================================================================
// TAB & PANEL NAVIGATION
// ================================================================
// Mobile bot settings panel toggle
function toggleMobileBotSettings() {
    const sidebar = document.querySelector('#bot-pane .sidebar');
    const btn     = document.getElementById('mobile-bot-settings-btn');
    if (!sidebar) return;
    const isOpen = sidebar.classList.contains('mobile-open');
    if (isOpen) {
        sidebar.classList.remove('mobile-open');
        if (btn) btn.textContent = 'Ã¢Å¡â„¢Ã¯Â¸Â Bot Settings';
    } else {
        sidebar.classList.add('mobile-open');
        if (btn) btn.textContent = 'Ã¢Å“â€¢ Close Settings';
        // Scroll to top of settings
        sidebar.scrollTop = 0;
    }
}

// Auto-close settings panel when bot starts running on mobile
function closeMobileBotSettings() {
    const sidebar = document.querySelector('#bot-pane .sidebar');
    const btn     = document.getElementById('mobile-bot-settings-btn');
    if (sidebar) sidebar.classList.remove('mobile-open');
    if (btn) btn.textContent = 'Ã¢Å¡â„¢Ã¯Â¸Â Bot Settings';
}

function switchTab(id) {
    document.querySelectorAll('.tab-pane').forEach(p => {
        p.style.display = 'none';
        p.classList.remove('active');
    });
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

    const pane = document.getElementById(id + '-pane');
    const btn  = document.getElementById('tab-btn-' + id);
    if (pane) {
        pane.classList.add('active');
        if (pane.classList.contains('scroll')) {
            pane.style.display = 'block';
        } else {
            pane.style.display = 'flex';
        }
    }
    if (btn) btn.classList.add('active');
    window.scrollTo(0, 0); // start each tab at the top now that the page scrolls as a whole

    if (id === 'digits') {
        changeDigitMarket(document.getElementById('digit-market')?.value || 'R_10');
    }
    if (id === 'scanner') runFullScan();
    if (id === 'mt5')     { loadApaPrefs(); startMt5BackgroundScan(); renderMt5SignalsUI(); populateMt5InstrumentFilter(); runApaAnalysis(); }
    if (id === 'chart')   { setTimeout(() => updateChartIndicators(), 500); }
    if (id === 'accu')    { onAccuMarketChange(document.getElementById('accu-market')?.value || 'R_10'); updateAccuProfitCalc(); }
    if (id === 'bulk')    { initBulkTab(); }
}

function switchPanel(name, el) {
    // Hide all panels
    ['summary','transactions','journal'].forEach(p => {
        const el2 = document.getElementById('panel-' + p);
        if (el2) el2.style.display = 'none';
    });
    document.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'));

    const target = document.getElementById('panel-' + name);
    if (target) {
        if (name === 'transactions' || name === 'journal') {
            target.style.display = 'flex';
        } else {
            target.style.display = 'block';
            target.style.overflow = 'auto';
        }
    }
    if (el) el.classList.add('active');
}

// ================================================================
// AUTH Ã¢â‚¬â€ STEP 1: PKCE Login (Amy-verified Ã¢â‚¬â€ DO NOT CHANGE)
// ================================================================
async function loginWithDeriv() {
    const loginBtn = document.getElementById('btn-login');
    if (loginBtn) { loginBtn.textContent = 'Connecting...'; loginBtn.disabled = true; }
    showStatus("Starting secure login...", 'info');

    try {
        // Call server to generate PKCE Ã¢â‚¬â€ no browser storage needed (Amy's fix)
        const resp = await fetch('/api/oauth-start', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!resp.ok) {
            const err = await resp.text();
            showStatus("Login server error. Please try again.", 'err');
            console.error('oauth-start failed:', resp.status, err);
            if (loginBtn) { loginBtn.textContent = 'Log in'; loginBtn.disabled = false; }
            return;
        }

        const cfg = await resp.json();

        if (!cfg.state || !cfg.code_challenge) {
            showStatus("Invalid server response. Please try again.", 'err');
            if (loginBtn) { loginBtn.textContent = 'Log in'; loginBtn.disabled = false; }
            return;
        }

        // Build auth URL with server-generated values
        const params = new URLSearchParams({
            response_type:         'code',
            client_id:             cfg.client_id,
            redirect_uri:          cfg.redirect_uri,
            scope:                 cfg.scope,
            state:                 cfg.state,
            code_challenge:        cfg.code_challenge,
            code_challenge_method: cfg.code_challenge_method
        });

        const authUrl = `${cfg.authorization_endpoint}?${params.toString()}`;
        console.log('Redirecting to:', authUrl.substring(0, 80) + '...');

        // Force open in browser tab Ã¢â‚¬â€ prevents Deriv app from intercepting on mobile
        // Using window.open with _blank forces browser, not installed app
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        if (isMobile) {
            // On mobile, open in same tab but with a small delay to prevent app interception
            setTimeout(() => {
                window.location.href = authUrl;
            }, 100);
        } else {
            window.location.replace(authUrl);
        }

    } catch(err) {
        showStatus("Network error. Please check your connection.", 'err');
        console.error('loginWithDeriv error:', err);
        if (loginBtn) { loginBtn.textContent = 'Log in'; loginBtn.disabled = false; }
    }
}


function signUpWithDeriv() {
    window.location.href = "https://track.deriv.com/_Yi8lkjLk8sFMjdsyM5hasGNd7ZgqdRLk/1/";
}

// ================================================================
// AUTH Ã¢â‚¬â€ STEP 2: Callback
// ================================================================
async function handleOAuthCallback(code, oauthState) {
    // Read from localStorage, sessionStorage, or cookie Ã¢â‚¬â€ whichever has the value
    function readAndClear(key) {
        let val = null;
        try { val = localStorage.getItem(key); localStorage.removeItem(key); } catch(e) {}
        if (!val) { try { val = sessionStorage.getItem(key); sessionStorage.removeItem(key); } catch(e) {} }
        if (!val) {
            // Try cookie fallback
            const cookieKey = key === 'oauth_state' ? 'pkce_st' : 'pkce_cv';
            const match = document.cookie.match(new RegExp(cookieKey + '=([^;]+)'));
            if (match) { val = decodeURIComponent(match[1]); document.cookie = `${cookieKey}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`; }
        }
        return val;
    }
    const savedState    = readAndClear('oauth_state');
    const code_verifier = readAndClear('pkce_code_verifier');

    if (oauthState !== savedState) {
        if (!savedState) {
            // Storage was fully cleared during redirect (common on mobile)
            // Continue anyway Ã¢â‚¬â€ the code itself is single-use so still secure
            log('PKCE state not found in storage Ã¢â‚¬â€ proceeding without state check', 'x');
        } else {
            // Real mismatch Ã¢â‚¬â€ reject
            showStatus("Security error. Please click Log in again.", 'err');
            return;
        }
    }
    showStatus("Authorizing...", 'info');

    try {
        const resp = await fetch('/api/deriv-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, code_verifier, redirect_uri: DERIV_REDIRECT, client_id: DERIV_CLIENT_ID })
        });
        const tokens = await resp.json();
        if (!resp.ok) { showStatus(`Auth failed: ${tokens.error || 'Unknown'}`, 'err'); return; }
        accessToken = tokens.access_token;
        showStatus("Loading accounts...", 'info');
        await loadAccounts();
    } catch(err) {
        showStatus("Connection error. Please try again.", 'err');
        console.error(err);
    }
}

// ================================================================
// AUTH Ã¢â‚¬â€ STEP 3: Load accounts
// ================================================================
async function loadAccounts() {
    try {
        const headers = { 'Authorization': `Bearer ${accessToken}`, 'Deriv-App-ID': DERIV_APP_ID };

        let resp = await fetch('https://api.derivws.com/trading/v1/options/accounts', { method: 'GET', headers });
        let data = await resp.json();
        allAccounts = Array.isArray(data?.data) ? data.data : [];

        if (allAccounts.length === 0) {
            showStatus("Creating demo account...", 'info');
            resp = await fetch('https://api.derivws.com/trading/v1/options/accounts', {
                method: 'POST',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({ currency: "USD", group: "row", account_type: "demo" })
            });
            data = await resp.json();
            if (!resp.ok || !data?.data) { showStatus("Failed to create account.", 'err'); return; }
            allAccounts = [data.data];
        }

        // Populate switcher
        const sw = document.getElementById('acct-switcher');
        if (sw) {
            sw.innerHTML = '';
            allAccounts.forEach(acc => {
                const opt = document.createElement('option');
                opt.value = acc.account_id;
                opt.text  = `${acc.account_type === 'demo' ? 'Ã°Å¸Å¸Â¡ Demo' : 'Ã°Å¸Å¸Â¢ Real'} Ã¢â‚¬â€ ${acc.currency || 'USD'}`;
                sw.appendChild(opt);
            });
        }

        // Real account appears first Ã¢â‚¬â€ then demo
        const real = allAccounts.find(a => a.account_type === 'real');
        const demo = allAccounts.find(a => a.account_type === 'demo');
        const preferred = real || demo || allAccounts[0];
        accountId  = preferred.account_id;
        if (sw) sw.value = accountId;

        await openWS();
    } catch(err) {
        showStatus("Failed to load accounts.", 'err');
        console.error(err);
    }
}

async function switchAccount(newId) {
    if (newId === accountId) return;
    accountId = newId;
    localStorage.setItem('bth_account_id', newId);
    log("Switching account...", 'i');
    if (derivWS) { derivWS.close(); derivWS = null; }
    activeTickSubs.clear();
    await openWS();
}

// ================================================================
// AUTH Ã¢â‚¬â€ STEP 4: OTP Ã¢â€ â€™ WebSocket
// ================================================================
async function openWS() {
    try {
        showStatus("Opening secure connection...", 'info');
        const headers = { 'Authorization': `Bearer ${accessToken}`, 'Deriv-App-ID': DERIV_APP_ID };

        const otpResp = await fetch(
            `https://api.derivws.com/trading/v1/options/accounts/${encodeURIComponent(accountId)}/otp`,
            { method: 'POST', headers }
        );
        const otpData = await otpResp.json();

        if (!otpResp.ok || !otpData?.data?.url) {
            showStatus(`Connection failed: ${otpData?.error?.message || 'No URL returned'}`, 'err');
            return;
        }

        derivWS = new WebSocket(otpData.data.url);

        derivWS.onopen = () => {
            isReconnecting = false;
            updateConnStatus(true);
            showStatus("Ã¢Å“â€¦ Connected!", 'ok');
            onConnected();
        };

        derivWS.onerror = () => updateConnStatus(false);

        derivWS.onclose = () => {
            updateConnStatus(false);
            clearInterval(pingInterval);
            log("WS closed. Will reconnect...", 'x');
            // If Auto Mode was running, pause it (do not lose settings) and notify Ã¢â‚¬â€
            // per spec, connection loss should stop Auto Mode automatically.
            if (accuAutoEnabled) {
                stopAccuAuto('connection_lost');
            }
            scheduleReconnect();
        };

        derivWS.onmessage = (msg) => {
            try { routeMsg(JSON.parse(msg.data)); } catch(e) {}
        };

    } catch(err) {
        showStatus("Failed to connect.", 'err');
        console.error(err);
        scheduleReconnect();
    }
}

function scheduleReconnect() {
    if (isReconnecting || !accessToken || !accountId) return;
    isReconnecting = true;
    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(async () => {
        log("Reconnecting...", 'x');
        await openWS();
    }, 4000);
}

function onConnected() {
    // Save token to localStorage so user stays logged in
    if (accessToken) {
        localStorage.setItem('bth_access_token', accessToken);
        localStorage.setItem('bth_account_id',   accountId || '');
        localStorage.setItem('bth_connected_at',  Date.now().toString());
    }

    // Hide login/signup buttons, show account UI
    const btnLogin  = document.getElementById('btn-login');
    const btnSignup = document.getElementById('btn-signup');
    if (btnLogin)  { btnLogin.style.display  = 'none'; }
    if (btnSignup) { btnSignup.style.display = 'none'; }

    const aw = document.getElementById('acct-wrap');
    if (aw) aw.style.display = 'flex';

    const authCard = document.getElementById('auth-card');
    if (authCard) authCard.style.display = 'none';

    const ds = document.getElementById('dash-stats');
    if (ds) ds.style.display = 'block';

    const bi = document.getElementById('bar-info');
    if (bi) bi.style.display = 'flex';

    // Subscribe to balance + ticks
    derivWS.send(JSON.stringify({ balance: 1, subscribe: 1 }));

    // Fetch valid active symbols from Deriv
    derivWS.send(JSON.stringify({
        active_symbols: "brief",
        product_type:   "basic",
        req_id:         nextReqId()
    }));

    // Digit stats run on public WS (already started on page load)
    // Ensure public WS is connected
    if (!publicWsReady) connectPublicWS();

    // Start AI scan loop
    startAILoop();
    startKeepAlivePing();
    log("Ã¢Å“â€¦ Connected to Deriv API", 'i');
}

// Keep-alive ping Ã¢â‚¬â€ Amy's recommendation to prevent silent disconnects
let pingInterval = null;
function startKeepAlivePing() {
    clearInterval(pingInterval);
    pingInterval = setInterval(() => {
        if (derivWS && derivWS.readyState === WebSocket.OPEN) {
            derivWS.send(JSON.stringify({ ping: 1, req_id: nextReqId() }));
        }
    }, 30000);
}

// ================================================================
// MESSAGE ROUTER
// ================================================================
function routeMsg(r) {
    // Balance update
    if (r.msg_type === 'balance' && r.balance) {
        const el = document.getElementById('balance');
        if (el) el.textContent = `${parseFloat(r.balance.balance).toFixed(2)} ${r.balance.currency}`;
        liveBalance = parseFloat(r.balance.balance); // tracked for Bulk Trading's insufficient-balance check
        if (document.getElementById('bulk-pane')?.classList.contains('active')) initBulkTab();
    }

    // Tick and history from authenticated WS Ã¢â‚¬â€ routed to stub
    // (real digit data comes from public WS)
    if (r.msg_type === 'tick' && r.tick) {
        processRealTick(r.tick.symbol, r.tick.quote);
    }
    if (r.msg_type === 'history' && r.history) {
        const sym = r.echo_req?.ticks_history;
        if (sym) processHistory(sym, r.history);
    }

    // Active symbols Ã¢â‚¬â€ store pip sizes per Amy's tip for correct last digit
    if (r.msg_type === 'active_symbols' && r.active_symbols) {
        const synthetics = r.active_symbols.filter(s =>
            s.market === 'synthetic_index'
        );
        synthetics.forEach(s => {
            if (s.pip) activePipSizes[s.symbol] = s.pip;
        });
        log(`Ã°Å¸â€œÂ¡ ${synthetics.length} synthetic markets loaded | pip sizes stored`, 'i');
    }

    // STEP 2: Proposal response Ã¢â‚¬â€ extract ID and ask_price, then buy
    if (r.msg_type === 'proposal') {
        clearProposalTimeout();
        if (r.error) {
            pendingContract = false;
            lastContractId  = null;
            log(`Ã¢ÂÅ’ Proposal rejected: ${r.error.message}`, 'x');
            log(`   Code: ${r.error.code} | Check market symbol and contract params`, 'x');
            // If accumulator proposal failed
            if (accuRunning) {
                accuRunning = false;
                notify("Accumulator Error", r.error.message, 'err');
                resetAccuUI();
                // Don't silently keep retrying auto mode against a rejected proposal Ã¢â‚¬â€
                // stop it and surface the error instead of looping forever.
                if (accuAutoEnabled) stopAccuAuto('api_error');
            }
        } else if (r.proposal) {
            // Accumulator proposal Ã¢â‚¬â€ buy immediately
            if (r.proposal.contract_type === 'ACCU' || accuRunning) {
                const proposalId = r.proposal.id;
                const askPrice   = r.proposal.ask_price;
                log(`Ã°Å¸â€œË† Accumulator proposal: ${proposalId} | Ask: $${askPrice}`, 'i');
                derivWS.send(JSON.stringify({ buy: proposalId, price: parseFloat(askPrice), req_id: nextReqId() }));
            } else if (isBotRunning) {
                // Regular bot proposal
                const proposalId = r.proposal.id;
                const askPrice   = r.proposal.ask_price;
                log(`Ã¢Å“â€¦ Proposal: ${proposalId} | Ask: $${askPrice}`, 'i');
                buyFromProposal(proposalId, parseFloat(askPrice));
            }
        }
    }

    // STEP 3: Buy response
    if (r.msg_type === 'buy') handleBuyResponse(r);

    // Sell response (for accumulator manual sell)
    if (r.msg_type === 'sell') {
        if (r.error) {
            log(`Ã¢ÂÅ’ Sell error: ${r.error.message}`, 'x');
        } else {
            log(`Ã¢Å“â€¦ Contract sold | Price: $${r.sell?.sold_for || 'Ã¢â‚¬â€'}`, 'w');
        }
    }

    // Contract update/settlement
    if (r.msg_type === 'proposal_open_contract' && r.proposal_open_contract) {
        const c = r.proposal_open_contract;
        // Full debug log on settlement Ã¢â‚¬â€ logs ALL fields so we can see what Deriv sends
        if (c.is_sold || c.is_expired) {
            const debugFields = {
                entry_tick:          c.entry_tick,
                entry_tick_display:  c.entry_tick_display_value,
                entry_spot:          c.entry_spot,
                entry_spot_display:  c.entry_spot_display_value,
                exit_tick:           c.exit_tick,
                exit_tick_display:   c.exit_tick_display_value,
                exit_spot:           c.exit_spot,
                exit_spot_display:   c.exit_spot_display_value,
                sell_spot:           c.sell_spot,
                sell_spot_display:   c.sell_spot_display_value,
                sell_price:          c.sell_price,
            };
            // Log only fields that have values
            const found = Object.entries(debugFields)
                .filter(([k,v]) => v !== undefined && v !== null && v !== '')
                .map(([k,v]) => `${k}=${v}`)
                .join(' | ');
            log(`Ã°Å¸â€œâ€¹ Spots: ${found || 'NO SPOT FIELDS FOUND'}`, 'd');
        }
        // Route to accumulator handler or bot handler
        if (c.contract_type === 'ACCU' || (accuContractId && c.contract_id === accuContractId)) {
            accuContractId = c.contract_id;
            handleAccuContractUpdate(c);
        } else {
            handleContractResult(c);
        }
    }
}

// ================================================================
// REAL TICK PROCESSING Ã¢â‚¬â€ no fake data ever
// ================================================================
// ================================================================
// DIGIT STATS Ã¢â‚¬â€ Amy's verified implementation (public WS)
// Uses separate public WebSocket for market data
// OTP authenticated WS used only for trading
// ================================================================

const ROLLING_WINDOW = 1000;
const PUBLIC_WS_URL  = 'wss://api.derivws.com/trading/v1/options/ws/public';

let publicWS      = null;
let publicWsReady = false;
let pubNextId     = 1;
function pubReqId() { return pubNextId++; }
// Symbols Deriv's own active_symbols response has actually confirmed as
// live/tradable Ã¢â‚¬â€ the APA engine treats this as the source of truth for
// "is this market available" rather than a hard-coded assumption.
let knownActiveSymbols = new Set();

// Ã¢â€â‚¬Ã¢â€â‚¬ Real OHLC candle fetch (Deriv ticks_history, style:"candles") Ã¢â€â‚¬Ã¢â€â‚¬
// This is a genuine Deriv API capability (not a synthetic approximation
// from ticks) and is what the APA multi-timeframe engine below is built on.
// granularity is in seconds: 60=M1, 300=M5, 900=M15, 1800=M30, 3600=H1,
// 14400=H4, 86400=D1.
function fetchCandles(sym, granularity, count = 120) {
    return new Promise((resolve, reject) => {
        if (!publicWS || publicWS.readyState !== WebSocket.OPEN) { reject(new Error('public WS not connected')); return; }
        const reqId = pubReqId();
        const timeout = setTimeout(() => {
            publicWS.removeEventListener('message', handler);
            reject(new Error('candle request timed out'));
        }, 8000);
        function handler(ev) {
            let data;
            try { data = JSON.parse(ev.data); } catch(e) { return; }
            if (data.req_id !== reqId) return;
            clearTimeout(timeout);
            publicWS.removeEventListener('message', handler);
            if (data.error) { reject(new Error(data.error.message || 'candle fetch error')); return; }
            resolve(data.candles || []);
        }
        publicWS.addEventListener('message', handler);
        publicWS.send(JSON.stringify({
            ticks_history: sym, style: 'candles', granularity,
            count, end: 'latest', req_id: reqId
        }));
    });
}

// Small TTL cache so the scanner and setup card don't re-request the same
// candles on every render Ã¢â‚¬â€ cache lifetime is a fraction of the timeframe
// itself so data still feels live.
let apaCandleCache = {}; // key: `${sym}_${granularity}` -> { candles, fetchedAt }
async function getCandles(sym, granularity, count = 120) {
    const key = `${sym}_${granularity}`;
    const cached = apaCandleCache[key];
    const ttl = Math.max(5000, granularity * 250); // e.g. M1(60s) -> 15s TTL, H4 -> ~1hr TTL
    if (cached && (Date.now() - cached.fetchedAt) < ttl) return cached.candles;
    const candles = await fetchCandles(sym, granularity, count);
    apaCandleCache[key] = { candles, fetchedAt: Date.now() };
    return candles;
}

// Amy's exact extractLastDigit Ã¢â‚¬â€ normalizes by decimals from pip_size
function extractLastDigit(quote, decimals) {
    const s = Number(quote).toFixed(decimals || 0);
    for (let i = s.length - 1; i >= 0; i--) {
        const ch = s[i];
        if (ch >= '0' && ch <= '9') return ch.charCodeAt(0) - 48;
    }
    return NaN;
}

// Amy's addDigit Ã¢â‚¬â€ exact rolling window implementation
function addDigitToRolling(sym, d) {
    if (!digitData[sym]) {
        digitData[sym] = { window: [], counts: Array(10).fill(0), ticks: 0, decimals: 2 };
    }
    const st = digitData[sym];
    st.window.push(d);
    st.counts[d]++;
    if (st.window.length > ROLLING_WINDOW) {
        const removed = st.window.shift();
        st.counts[removed]--;
    }
    st.ticks = st.window.length;
}

// Connect to public WebSocket for digit stats (separate from trading WS)
function connectPublicWS() {
    // Prevent duplicate connections.
    if (
        publicWS &&
        (
            publicWS.readyState === WebSocket.OPEN ||
            publicWS.readyState === WebSocket.CONNECTING
        )
    ) {
        return;
    }

    publicWS = new WebSocket(PUBLIC_WS_URL);

    publicWS.onopen = () => {
        // The browser should report OPEN here, but explicitly verify it
        // before every send so a reconnect/race cannot throw InvalidStateError.
        if (!publicWS || publicWS.readyState !== WebSocket.OPEN) {
            publicWsReady = false;
            log('Public WS opened callback fired before socket was OPEN; waiting...', 'w');
            return;
        }

        publicWsReady = true;
        log('Public WS connected for digit stats', 'i');

        // Step 1: Get active_symbols to read pip_size per symbol.
        if (publicWS.readyState === WebSocket.OPEN) {
            publicWS.send(JSON.stringify({
                active_symbols: 'brief',
                req_id: pubReqId()
            }));
        }

        // Keep-alive ping every 30 seconds.
        if (!window._publicWsPingTimer) {
            window._publicWsPingTimer = setInterval(() => {
                if (publicWS && publicWS.readyState === WebSocket.OPEN) {
                    try {
                        publicWS.send(JSON.stringify({ ping: 1 }));
                    } catch (err) {
                        console.warn('Public WS ping failed:', err);
                    }
                }
            }, 30000);
        }
    };

    publicWS.onmessage = (ev) => {
        let data;

        try {
            data = JSON.parse(ev.data);
        } catch (err) {
            console.warn('Public WS invalid JSON:', err);
            return;
        }

        if (data.error) {
            log(
                `Public WS error: ${data.error.code} ${data.error.message}`,
                'x'
            );
            return;
        }

        // Step 2: active_symbols — read pip_size and seed each symbol.
        if (data.msg_type === 'active_symbols') {
            (data.active_symbols || []).forEach(s => {
                if (s.underlying_symbol) {
                    knownActiveSymbols.add(s.underlying_symbol);
                }
            });

            const bySymbol = {};

            (data.active_symbols || []).forEach(s => {
                if (ALL_MKTS.includes(s.underlying_symbol)) {
                    bySymbol[s.underlying_symbol] = s;
                }
            });

            ALL_MKTS.forEach(sym => {
                const info = bySymbol[sym];
                if (!info) return;

                const pipSize = info.pip_size;

                const decimals = String(pipSize).includes('.')
                    ? String(pipSize).split('.')[1].length
                    : 0;

                digitData[sym] = {
                    window: [],
                    counts: Array(10).fill(0),
                    ticks: 0,
                    decimals
                };

                activePipSizes[sym] = pipSize;

                // Never send unless the socket is actually OPEN.
                if (publicWS && publicWS.readyState === WebSocket.OPEN) {
                    publicWS.send(JSON.stringify({
                        ticks_history: sym,
                        end: 'latest',
                        count: ROLLING_WINDOW,
                        style: 'ticks',
                        req_id: pubReqId()
                    }));
                }
            });

            return;
        }

        // Step 3: History response — seed rolling window.
        if (data.msg_type === 'history' && data.history) {
            const sym = data.echo_req?.ticks_history;

            if (!sym || !digitData[sym]) return;

            const st = digitData[sym];
            const quotes = data.history.prices || [];

            st.window = [];
            st.counts = Array(10).fill(0);

            quotes.forEach(price => {
                const d = extractLastDigit(price, st.decimals);

                if (!isNaN(d)) {
                    addDigitToRolling(sym, d);
                }
            });

            log(
                `${MKT[sym] || sym}: ${st.ticks} ticks seeded`,
                'i'
            );

            // Subscribe only while OPEN.
            if (publicWS && publicWS.readyState === WebSocket.OPEN) {
                publicWS.send(JSON.stringify({
                    ticks: sym,
                    subscribe: 1,
                    req_id: pubReqId()
                }));
            }

            if (sym === currentDigitMkt) {
                renderDigitCircles(sym);
                updateDigitStats(sym);
            }

            return;
        }

        // Step 4: Live tick — update rolling window.
        if (data.msg_type === 'tick' && data.tick) {
            const sym = data.tick.symbol;
            const st = digitData[sym];

            if (!st) return;

            const decimals = Number.isInteger(data.tick.pip_size)
                ? data.tick.pip_size
                : st.decimals;

            const d = extractLastDigit(
                data.tick.quote,
                decimals
            );

            if (isNaN(d)) return;

            addDigitToRolling(sym, d);

            // Update market memory for AI.
            if (!marketMemory[sym]) {
                marketMemory[sym] = {
                    prices: [],
                    digits: [],
                    ticks: 0
                };
            }

            const mm = marketMemory[sym];

            mm.prices.push(data.tick.quote);
            mm.digits.push(d);
            mm.ticks++;

            if (mm.prices.length > 500) {
                mm.prices.shift();
                mm.digits.shift();
            }

            // Consecutive tracking.
            if (d === lastDigit) {
                consecutiveSame++;
            } else {
                consecutiveSame = 1;
                lastDigit = d;
            }

            // Update digit stats UI.
            if (sym === currentDigitMkt) {
                const lastEl = document.getElementById('d-last');
                const tickEl = document.getElementById('d-ticks');

                if (lastEl) lastEl.textContent = d;
                if (tickEl) tickEl.textContent = st.ticks;

                renderDigitCircles(sym);
                updateDigitStats(sym);
            }

            // AI mini panel.
            if (sym === document.getElementById('bot-market')?.value) {
                updateAIMini(sym);
            }

            // Bot engine.
            const botMkt = document.getElementById('bot-market')?.value;

            if (isBotRunning && sym === botMkt) {
                runBotLogic(d, data.tick.quote);
            }

            // Accumulator live price + behaviour engine.
            if (sym === accuMarket) {
                const priceEl = document.getElementById('accu-price');
                const digitEl = document.getElementById('accu-last-digit');

                if (priceEl) {
                    priceEl.textContent = data.tick.quote;
                }

                if (digitEl) {
                    digitEl.textContent = `Last digit: ${d}`;
                }

                if (!accuTickTimes[sym]) {
                    accuTickTimes[sym] = [];
                }

                accuTickTimes[sym].push(Date.now());

                if (accuTickTimes[sym].length > 120) {
                    accuTickTimes[sym].shift();
                }

                const profile = getMarketProfile(sym);

                if (
                    st.ticks % profile.updateEveryTicks === 0
                ) {
                    updateAccuAnalysis(sym);
                }
            }
        }
    };

    publicWS.onerror = (e) => {
        publicWsReady = false;
        log('Public WS error', 'x');
        console.error(e);
    };

    publicWS.onclose = () => {
        publicWsReady = false;

        log(
            'Public WS closed. Reconnecting in 2s...',
            'x'
        );

        setTimeout(() => {
            ALL_MKTS.forEach(sym => {
                if (digitData[sym]) {
                    digitData[sym].window = [];
                    digitData[sym].counts = Array(10).fill(0);
                    digitData[sym].ticks = 0;
                }
            });

            connectPublicWS();
        }, 2000);
    };
}
// Legacy function Ã¢â‚¬â€ now routes to public WS
function subscribeDigitFeed(symbol) {
    // Digit feeds handled by public WS Ã¢â‚¬â€ just ensure it's connected
    if (!publicWsReady) connectPublicWS();
}

// processRealTick still called from authenticated WS for bot logic
function processRealTick(symbol, quote) {
    // Digits now handled by public WS Ã¢â‚¬â€ this just feeds bot if needed
    const botMkt = document.getElementById('bot-market')?.value;
    if (isBotRunning && symbol === botMkt) {
        const st  = digitData[symbol];
        const dec = st?.decimals || 2;
        const d   = extractLastDigit(quote, dec);
        if (!isNaN(d)) runBotLogic(d, quote);
    }
}

// processHistory Ã¢â‚¬â€ now handled inside public WS onmessage
function processHistory(symbol, history) {
    // Handled by public WS Ã¢â‚¬â€ kept as stub to avoid errors
}

// ================================================================
// BOT LOGIC
// ================================================================
function toggleBot() {
    if (!derivWS || derivWS.readyState !== WebSocket.OPEN) {
        notify("Not Connected", "Please log in to your Deriv account first.", 'err');
        return;
    }
    if (!botDirection) {
        notify("No Direction", "Please select a trade direction first.", 'warn');
        return;
    }

    const btn = document.getElementById('run-btn');

    if (!isBotRunning) {
        // Pre-flight validation
        const err = validateBot();
        if (err) { notify("Cannot Start", err, 'err'); log("Ã¢ÂÅ’ " + err, 'x'); return; }

        isBotRunning = true;
        baseStake    = parseFloat(document.getElementById('bot-stake')?.value || 1);
        currentStake = baseStake;

        if (btn) { btn.textContent = 'Ã¢Â¬â€º Stop'; btn.classList.remove('btn-run'); btn.classList.add('btn-stop'); }

        // Subscribe to bot market feed
        const mkt = document.getElementById('bot-market')?.value || 'R_10';
        subscribeDigitFeed(mkt);

        updateActiveBotName();
        updateInfoBar();
        closeMobileBotSettings(); // close settings panel on mobile when bot starts
        log(`Ã°Å¸Å¸Â¢ Bot started | ${MKT[mkt]||mkt} | ${document.getElementById('bot-type')?.value} | ${botDirection.toUpperCase()}`, 'i');
        log(`   Stake: $${currentStake.toFixed(2)} | TP: $${document.getElementById('bot-tp')?.value} | SL: $${document.getElementById('bot-sl')?.value}`, 'i');

        // Switch to transactions tab
        switchPanel('transactions', document.querySelectorAll('.panel-tab')[1]);

    } else {
        isBotRunning = false;
        pendingContract = false;
        lastContractId  = null;

        // Reset recovery state when bot stops
        if (isInRecoveryMode && originalDirection !== null) {
            botDirection = originalDirection;
            const predEl = document.getElementById('bot-pred');
            if (predEl && originalPrediction !== null) predEl.value = originalPrediction;
            isInRecoveryMode   = false;
            originalDirection  = null;
            originalPrediction = null;
            renderDirButtons();
            updateInfoBar();
            log('Ã°Å¸â€â€ž Recovery mode reset Ã¢â‚¬â€ original settings restored', 'i');
        }
        consecutiveLosses = 0;

        if (btn) { btn.textContent = 'Ã¢â€“Â¶ Run'; btn.classList.remove('btn-stop'); btn.classList.add('btn-run'); }
        log("Ã°Å¸â€Â´ Bot stopped.", 'x');
    }

    updateBotBar();
}

function validateBot() {
    if (!derivWS || derivWS.readyState !== WebSocket.OPEN) return "API not connected.";
    if (!accountId) return "No trading account.";
    const stake = parseFloat(document.getElementById('bot-stake')?.value || 0);
    if (stake < 0.35) return `Stake $${stake.toFixed(2)} is below minimum $0.35.`;
    if (!document.getElementById('bot-market')?.value) return "No market selected.";
    if (!botDirection) return "No trade direction selected.";
    return null;
}

// Proposal timeout tracker
let proposalTimeout = null;

function runBotLogic(digit, quote) {
    if (!isBotRunning || pendingContract) return;

    const type = document.getElementById('bot-type')?.value || 'over_under';
    const pred = parseInt(document.getElementById('bot-pred')?.value || 5);

    // ALL contract types trade on every tick at full Deriv speed
    // Deriv's engine decides win/loss Ã¢â‚¬â€ we just fire as fast as possible
    switch(type) {
        case 'over_under':
            // Only trade when digit confirms direction (improves win rate)
            if (botDirection === 'over'  && digit > pred)  { lastEntrySpot = quote; executeContract(quote); }
            if (botDirection === 'under' && digit < pred)  { lastEntrySpot = quote; executeContract(quote); }
            break;

        case 'even_odd':
        case 'rise_fall':
        case 'only_ups_downs':
            // Trade on EVERY tick Ã¢â‚¬â€ maximum speed, same as Deriv
            lastEntrySpot = quote;
            executeContract(quote);
            break;
    }
}

// Auto-reset pendingContract if proposal takes too long (5 seconds)
function startProposalTimeout() {
    clearProposalTimeout();
    proposalTimeout = setTimeout(() => {
        if (pendingContract && lastContractId === "pending") {
            log("Ã¢ÂÂ± Proposal timed out Ã¢â‚¬â€ resetting", 'x');
            pendingContract = false;
            lastContractId  = null;
            // Retry immediately
            const mkt = document.getElementById('bot-market')?.value || 'R_10';
            const mm  = marketMemory[mkt];
            if (isBotRunning && mm && mm.prices.length > 0) {
                const lastPrice = mm.prices[mm.prices.length - 1];
                const lastDig   = mm.digits[mm.digits.length - 1];
                runBotLogic(lastDig, lastPrice);
            }
        }
    }, 3000);
}

function clearProposalTimeout() {
    if (proposalTimeout) {
        clearTimeout(proposalTimeout);
        proposalTimeout = null;
    }
}

// Ã¢â€â‚¬Ã¢â€â‚¬ STEP 1: Send proposal (Amy-verified flow) Ã¢â€â‚¬Ã¢â€â‚¬
function executeContract(entrySpot) {
    if (!isBotRunning || pendingContract) return;

    const market    = document.getElementById('bot-market')?.value || 'R_10';
    const type      = document.getElementById('bot-type')?.value   || 'over_under';
    const pred      = parseInt(document.getElementById('bot-pred')?.value || 5);
    const duration  = parseInt(document.getElementById('bot-dur')?.value  || 1);

    // Map to Deriv contract type
    const typeMap      = CONTRACT_MAP[type];
    const contractType = typeMap?.[botDirection];

    if (!contractType) {
        log(`Ã¢ÂÅ’ Invalid direction "${botDirection}" for type "${type}" Ã¢â‚¬â€ auto-fixing...`, 'x');
        // Auto-fix: pick first valid direction for this type
        const validDirs = Object.keys(typeMap || {});
        if (validDirs.length > 0) {
            botDirection = validDirs[0];
            log(`Ã°Å¸â€Â§ Auto-corrected direction to: ${botDirection}`, 'i');
            renderDirButtons();
            updateInfoBar();
            // Retry with fixed direction
            setTimeout(() => { if (isBotRunning && !pendingContract) executeContract(entrySpot); }, 200);
        }
        return;
    }

    // Validate stake minimum
    if (currentStake < 0.35) {
        currentStake = 0.35;
        log(`Ã¢Å¡Â Ã¯Â¸Â Stake adjusted to minimum $0.35`, 'x');
    }

    const isDigit    = ['DIGITEVEN','DIGITODD','DIGITOVER','DIGITUNDER','DIGITMATCH','DIGITDIFF'].includes(contractType);
    const isRiseFall = ['CALL','PUT'].includes(contractType);
    const isRunHL    = ['RUNHIGH','RUNLOW'].includes(contractType);

    // Build proposal Ã¢â‚¬â€ Amy confirmed: use underlying_symbol not symbol
    const proposal = {
        proposal:           1,
        amount:             parseFloat(currentStake.toFixed(2)),
        basis:              "stake",
        contract_type:      contractType,
        currency:           "USD",
        underlying_symbol:  market,
        req_id:             nextReqId()
    };

    // Duration rules per contract type
    if (isDigit) {
        proposal.duration      = Math.max(1, Math.min(10, duration));
        proposal.duration_unit = "t";
    } else if (isRunHL) {
        proposal.duration      = Math.max(2, Math.min(10, duration));
        proposal.duration_unit = "t";
    } else if (isRiseFall) {
        proposal.duration      = Math.max(1, duration);
        proposal.duration_unit = "m";
    }

    // Barrier for over/under
    if (type === 'over_under') {
        proposal.barrier = pred.toString();
    }

    pendingContract  = true;
    lastContractId   = "pending";
    lastEntrySpot    = entrySpot;

    log(`Ã°Å¸â€œâ€¹ Proposal: ${contractType} @ $${currentStake.toFixed(2)} | ${MKT[market]||market} | dur:${proposal.duration||'?'}${proposal.duration_unit||''}${proposal.barrier?' barrier:'+proposal.barrier:''}`, 'i');
    derivWS.send(JSON.stringify(proposal));

    // Start timeout Ã¢â‚¬â€ reset if proposal takes more than 5 seconds
    startProposalTimeout();
}

// Ã¢â€â‚¬Ã¢â€â‚¬ STEP 2: Buy using proposal ID (Amy-verified flow) Ã¢â€â‚¬Ã¢â€â‚¬
function buyFromProposal(proposalId, askPrice) {
    if (!isBotRunning) return;

    const buyOrder = {
        buy:    proposalId,
        price:  parseFloat(askPrice.toFixed(2)),
        req_id: nextReqId()
    };

    log(`Ã°Å¸Å½Â¯ Buying proposal ${proposalId} @ $${askPrice.toFixed(2)}`, 'i');
    derivWS.send(JSON.stringify(buyOrder));
}

function handleBuyResponse(r) {
    clearProposalTimeout();
    // Handle accumulator buy separately
    if (accuRunning && r.buy && !r.error) {
        accuContractId = r.buy.contract_id;
        // Reset the per-contract settlement guard for this brand-new contract
        accuSettledContractIds.delete(accuContractId);
        accuTickCount = 0;
        log(`Ã¢Å“â€¦ Accumulator #${accuContractId} started | Buy price: $${r.buy.buy_price}`, 'w');
        notify('Ã°Å¸â€œË† Accumulator Running!', `Contract started. Growth: ${(accuGrowthRate*100)}% per tick. Sell anytime!`, 'ok');
        // Subscribe to contract updates
        derivWS.send(JSON.stringify({ proposal_open_contract: 1, contract_id: accuContractId, subscribe: 1 }));
        return;
    }
    if (r.error) {
        pendingContract = false;
        lastContractId  = null;
        const reason = r.error.message || 'Unknown error';
        const code   = r.error.code   || '';
        log(`Ã¢ÂÅ’ Buy rejected: ${reason} (${code})`, 'x');
        log(`   Market: ${document.getElementById('bot-market')?.value} | Type: ${document.getElementById('bot-type')?.value} | Dir: ${botDirection}`, 'x');
        // Only notify on first rejection per minute to avoid spam
        const nKey = `buy-err-${Math.floor(Date.now()/60000)}`;
        if (!seenSignals.has(nKey)) {
            seenSignals.add(nKey);
            notify("Trade Rejected", `${reason}`, 'err');
        }
    } else if (r.buy) {
        lastContractId = r.buy.contract_id;
        totalRuns++;
        log(`Ã¢Å“â€¦ Contract #${lastContractId} confirmed | Buy price: $${r.buy.buy_price}`, 'w');
        updateAllStats();
        // Subscribe to contract updates Ã¢â‚¬â€ this gives us entry/exit spots
        derivWS.send(JSON.stringify({
            proposal_open_contract: 1,
            contract_id: lastContractId,
            subscribe: 1
        }));
    }
}

function handleContractResult(c) {
    if (!c) return;

    // Update exit spot on open contracts even before settlement
    if (c.contract_id && c.exit_tick_display_value) {
        updateTxRowExitSpot(c.contract_id, c.exit_tick_display_value);
    }

    // Only process final result when fully settled
    if (!c.is_sold && !c.is_expired) return;
    if (c.contract_id !== lastContractId) return;

    pendingContract = false;
    lastContractId  = null;

    const profit     = parseFloat(c.profit);
    const buyPrice   = parseFloat(c.buy_price || currentStake);
    const payout     = buyPrice + profit;

    // Deriv sends entry_spot and exit_spot (confirmed from debug log)
    const entrySpot2 = c.entry_spot
                    || c.entry_tick_display_value
                    || c.entry_spot_display_value
                    || lastEntrySpot
                    || 'Ã¢â‚¬â€';
    const exitSpot   = c.exit_spot
                    || c.exit_tick_display_value
                    || c.exit_spot_display_value
                    || c.sell_spot
                    || 'Ã¢â‚¬â€';

    totalStake  += buyPrice;
    totalPayout += Math.max(0, payout);
    totalPL     += profit;

    if (profit > 0) {
        playWin();
        totalWins++;
        currentStreak     = currentStreak < 0 ? 1 : currentStreak + 1;
        consecutiveLosses = 0;
        log(`Ã¢Å“â€¦ WIN +$${profit.toFixed(2)} | Payout: $${payout.toFixed(2)}`, 'w');
        addTxRow(c.contract_type, entrySpot2, exitSpot, buyPrice, profit, true);
        // Reset stake on win
        currentStake = baseStake;

        // If in recovery mode Ã¢â‚¬â€ switch BACK to original trade after win
        const currentType = document.getElementById('bot-type')?.value;
        if (currentType === 'over_under' && isInRecoveryMode && originalDirection !== null) {
            isInRecoveryMode  = false;
            botDirection      = originalDirection;
            const predEl      = document.getElementById('bot-pred');
            if (predEl && originalPrediction !== null) predEl.value = originalPrediction;
            originalDirection  = null;
            originalPrediction = null;
            consecutiveLosses  = 0;
            renderDirButtons();
            updateInfoBar();
            log(`Ã°Å¸â€â€ž Recovery complete! Back to ${botDirection.toUpperCase()} ${document.getElementById('bot-pred')?.value}`, 'i');
            notify('Ã¢Å“â€¦ Recovery Complete!', `Won in recovery!
Switched back to original: ${botDirection.toUpperCase()} ${document.getElementById('bot-pred')?.value}`, 'ok');
        }

    } else {
        playLoss();
        totalLosses++;
        currentStreak      = currentStreak > 0 ? -1 : currentStreak - 1;
        consecutiveLosses++;
        log(`Ã¢ÂÅ’ LOSS $${profit.toFixed(2)} | Consecutive: ${consecutiveLosses}`, 'l');
        addTxRow(c.contract_type, entrySpot2, exitSpot, buyPrice, profit, false);

        // Martingale
        const mg     = parseFloat(document.getElementById('bot-mg')?.value || 2.1);
        currentStake = parseFloat((currentStake * mg).toFixed(2));
        log(`Ã°Å¸â€œÂ Martingale: next stake $${currentStake.toFixed(2)}`, 'x');

        // Ã¢â€â‚¬Ã¢â€â‚¬ SMART RECOVERY Ã¢â‚¬â€ only for over_under Ã¢â€â‚¬Ã¢â€â‚¬
        // After 2 consecutive losses, switch to high-probability recovery trade
        // Over 1/2 Ã¢â€ â€™ recover with Under 8/7 and vice versa
        const currentType2 = document.getElementById('bot-type')?.value;
        if (currentType2 === 'over_under' &&
            consecutiveLosses >= RECOVERY_TRIGGER &&
            !isInRecoveryMode) {

            const currentPred = parseInt(document.getElementById('bot-pred')?.value || 0);
            const recovery    = getRecoveryTrade(botDirection, currentPred);

            if (recovery) {
                // Save original settings before switching
                originalDirection  = botDirection;
                originalPrediction = currentPred;
                isInRecoveryMode   = true;

                // Apply recovery trade
                botDirection = recovery.direction;
                const predEl = document.getElementById('bot-pred');
                if (predEl) predEl.value = recovery.pred;

                renderDirButtons();
                updateInfoBar();

                log(`Ã°Å¸Å¡Â¨ ${consecutiveLosses} losses! RECOVERY MODE: ${recovery.direction.toUpperCase()} ${recovery.pred}`, 'x');
                notify(
                    'Ã°Å¸Å¡Â¨ Recovery Mode Activated',
                    `${consecutiveLosses} consecutive losses!
Switching to ${recovery.direction.toUpperCase()} ${recovery.pred} to recover.
Will return to ${originalDirection.toUpperCase()} ${originalPrediction} after win.`,
                    'warn'
                );
            }
        }
    }
    updateAllStats();
    checkThresholds();

    // IMMEDIATELY fire next trade after result Ã¢â‚¬â€ no delay
    // This matches Deriv's own bot speed
    if (isBotRunning && !pendingContract) {
        const mkt = document.getElementById('bot-market')?.value || 'R_10';
        const mm  = marketMemory[mkt];
        if (mm && mm.prices.length > 0) {
            const lastPrice = mm.prices[mm.prices.length - 1];
            const lastDig   = mm.digits[mm.digits.length - 1];
            // Small 100ms delay to let Deriv breathe, then fire
            setTimeout(() => {
                if (isBotRunning && !pendingContract) {
                    runBotLogic(lastDig, lastPrice);
                }
            }, 100);
        }
    }

    // AI auto-update after result Ã¢â‚¬â€ NEVER for over_under (user controls direction+barrier)
    if (aiAutoEnabled) {
        const mkt         = document.getElementById('bot-market')?.value || 'R_10';
        const currentType = document.getElementById('bot-type')?.value || 'over_under';
        if (currentType !== 'over_under') {
            const sig = generateSignal(mkt);
            if (sig && sig.confidence >= 70 && sig.type === currentType) {
                const validDirs = Object.keys(CONTRACT_MAP[currentType] || {});
                if (validDirs.includes(sig.botDirection)) {
                    const oldDir = botDirection;
                    botDirection = sig.botDirection;
                    if (botDirection !== oldDir) {
                        log(`Ã°Å¸Â§Â  AI updated direction: ${oldDir.toUpperCase()} Ã¢â€ â€™ ${botDirection.toUpperCase()} (${sig.confidence}% confidence)`, 'i');
                        renderDirButtons();
                        updateInfoBar();
                    }
                }
            }
        }
    }
}


// ================================================================
// BULK TRADING ENGINE
// Configure one setup, execute N trades from it Ã¢â‚¬â€ strictly sequential
// (never parallel), each trade fully round-tripped through the real
// Deriv proposal -> buy -> settlement flow before the next one is sent,
// so there is no way for a double-click, re-render, or reconnect to
// fire a duplicate contract. Reuses CONTRACT_MAP and nextReqId() from
// the existing DBot implementation rather than duplicating contract logic.
// History persists to localStorage (this app has no backend/database).
// ================================================================

const BULK_MAX_TRADES      = 100;   // sensible hard cap on trades per batch
const BULK_MAX_TOTAL_STAKE = 1000;  // sensible hard cap on total stake per batch

let bulkDirection    = 'over';
let bulkStakeMode    = 'per';   // 'per' = stake per trade | 'total' = total budget
let bulkExecuting    = false;
let bulkCurrentBatch = null;
let bulkBatches      = [];
let liveBalance       = null;   // tracked from the real balance stream, used for the insufficient-balance check

function loadBulkBatches() {
    try { bulkBatches = JSON.parse(localStorage.getItem('bth_bulk_batches') || '[]'); }
    catch(e) { bulkBatches = []; }
}
function saveBulkBatches() {
    try { localStorage.setItem('bth_bulk_batches', JSON.stringify(bulkBatches.slice(-100))); } catch(e) {}
}
function makeBulkBatchId() {
    return `BT-${Date.now().toString(36).toUpperCase()}`;
}

// Ã¢â€â‚¬Ã¢â€â‚¬ Direction controls (namespaced separately from the DBot's so the two
// tools never fight over shared state) Ã¢â€â‚¬Ã¢â€â‚¬
function onBulkTypeChange() {
    const type = document.getElementById('bulk-type')?.value || 'over_under';
    const wrap = document.getElementById('bulk-dir-controls');
    const pred = document.getElementById('bulk-pred-wrap');
    if (!wrap) return;
    wrap.innerHTML = '';

    const dirMap = {
        over_under:     [['over','Over Only'],['under','Under Only']],
        even_odd:       [['even','Even Only'],['odd','Odd Only']],
        rise_fall:      [['rise','Rise Only'],['fall','Fall Only']],
        only_ups_downs: [['ups','Only Ups'],['downs','Only Downs']]
    };
    const opts = dirMap[type] || [];
    opts.forEach(([val, label]) => {
        const btn = document.createElement('button');
        btn.className = 'dir-btn';
        btn.textContent = label;
        btn.dataset.dir = val;
        btn.onclick = () => selectBulkDir(val);
        wrap.appendChild(btn);
    });
    if (pred) pred.style.display = type === 'over_under' ? 'block' : 'none';
    if (opts.length > 0) selectBulkDir(opts[0][0]);
    updateBulkPreview();
}
function selectBulkDir(dir) {
    bulkDirection = dir;
    const neg = ['under','odd','fall','downs'];
    document.querySelectorAll('#bulk-dir-controls .dir-btn').forEach(b => {
        b.classList.remove('pos','neg');
        if (b.dataset.dir === dir) b.classList.add(neg.includes(dir) ? 'neg' : 'pos');
    });
    updateBulkPreview();
}

// Ã¢â€â‚¬Ã¢â€â‚¬ Number of trades stepper Ã¢â€â‚¬Ã¢â€â‚¬
function stepBulkTrades(delta) {
    const el = document.getElementById('bulk-trades');
    if (!el) return;
    let v = parseInt(el.value || 1) + delta;
    v = Math.max(1, Math.min(BULK_MAX_TRADES, v));
    el.value = v;
    updateBulkPreview();
}
function setBulkTrades(n) {
    const el = document.getElementById('bulk-trades');
    if (el) el.value = Math.max(1, Math.min(BULK_MAX_TRADES, n));
    updateBulkPreview();
}

// Ã¢â€â‚¬Ã¢â€â‚¬ Stake mode toggle (Mode A: per-trade | Mode B: total budget) Ã¢â€â‚¬Ã¢â€â‚¬
function setBulkStakeMode(mode) {
    bulkStakeMode = mode;
    const btnPer = document.getElementById('bulk-mode-per');
    const btnTot = document.getElementById('bulk-mode-total');
    const label  = document.getElementById('bulk-stake-label');
    if (btnPer) { btnPer.classList.toggle('btn-teal', mode==='per');   btnPer.classList.toggle('btn-ghost', mode!=='per'); }
    if (btnTot) { btnTot.classList.toggle('btn-teal', mode==='total'); btnTot.classList.toggle('btn-ghost', mode!=='total'); }
    if (label) label.textContent = mode === 'per' ? 'Stake per Trade (USD)' : 'Total Budget (USD)';
    updateBulkPreview();
}

function getBulkConfig() {
    const trades  = Math.max(1, Math.min(BULK_MAX_TRADES, parseInt(document.getElementById('bulk-trades')?.value || 1)));
    const stakeIn = parseFloat(document.getElementById('bulk-stake')?.value || 1);
    const stakePerTrade = bulkStakeMode === 'per' ? stakeIn : (stakeIn / trades);
    const totalStake    = bulkStakeMode === 'per' ? stakeIn * trades : stakeIn;
    return {
        market: document.getElementById('bulk-market')?.value || 'R_10',
        type:   document.getElementById('bulk-type')?.value || 'over_under',
        direction: bulkDirection,
        pred:   parseInt(document.getElementById('bulk-pred')?.value || 5),
        duration: parseInt(document.getElementById('bulk-dur')?.value || 1),
        trades, stakePerTrade: Math.round(stakePerTrade * 100) / 100, totalStake: Math.round(totalStake * 100) / 100
    };
}

function updateBulkPreview() {
    const cfg = getBulkConfig();
    const body = document.getElementById('bulk-preview-body');
    const btn  = document.getElementById('bulk-execute-btn');
    if (!body) return;

    const acct   = allAccounts.find(a => a.account_id === accountId);
    const acctType = acct ? (acct.account_type === 'real' ? 'REAL' : 'DEMO') : 'Ã¢â‚¬â€';
    const acctColor = acctType === 'REAL' ? 'var(--red)' : 'var(--teal)';

    body.innerHTML = `
        <div style="display:flex;justify-content:space-between;"><span style="color:var(--muted);">Market</span><b>${MKT[cfg.market]||cfg.market}</b></div>
        <div style="display:flex;justify-content:space-between;"><span style="color:var(--muted);">Direction</span><b style="color:${['under','odd','fall','downs'].includes(cfg.direction)?'var(--red)':'var(--teal)'};">${cfg.direction.toUpperCase()}${cfg.type==='over_under'?' '+cfg.pred:''}</b></div>
        <div style="display:flex;justify-content:space-between;"><span style="color:var(--muted);">Number of Trades</span><b>${cfg.trades}</b></div>
        <div style="display:flex;justify-content:space-between;"><span style="color:var(--muted);">Stake per Trade</span><b>$${cfg.stakePerTrade.toFixed(2)}</b></div>
        <div style="display:flex;justify-content:space-between;border-top:1px solid var(--border);padding-top:4px;margin-top:2px;"><span style="color:var(--muted);">Total Stake</span><b style="color:var(--teal);">$${cfg.totalStake.toFixed(2)}</b></div>
        <div style="display:flex;justify-content:space-between;"><span style="color:var(--muted);">Account</span><b style="color:${acctColor};">${acctType}</b></div>`;

    if (btn && !bulkExecuting) btn.textContent = `EXECUTE ${cfg.trades} TRADE${cfg.trades===1?'':'S'}`;
}

// Populate from an AI Scanner signal Ã¢â‚¬â€ used by the two bridge functions below.
function populateBulkFromSignal(sig) {
    if (!sig) return;
    const marketSel = document.getElementById('bulk-market');
    const typeSel    = document.getElementById('bulk-type');
    const predEl     = document.getElementById('bulk-pred');
    const durEl      = document.getElementById('bulk-dur');
    if (sig.symbol && marketSel) marketSel.value = sig.symbol;
    if (typeSel) { typeSel.value = sig.type; onBulkTypeChange(); }
    selectBulkDir(sig.botDirection);
    if (sig.pred !== null && sig.pred !== undefined && predEl) predEl.value = sig.pred;
    if (sig.ticks && durEl) durEl.value = sig.ticks;

    const note = document.getElementById('bulk-signal-note');
    if (note) {
        note.style.display = 'block';
        note.textContent = `Ã°Å¸â€œÂ¡ Populated from AI Scanner: ${sig.label || MKT[sig.symbol] || sig.symbol || ''} Ã¢â‚¬â€ ${sig.direction} (${sig.confidence}% confidence). Review before executing.`;
    }
    updateBulkPreview();
    switchTab('bulk');
    notify('Ã°Å¸â€œÂ¦ Signal Sent to Bulk Trading', `${sig.direction} Ã‚Â· ${sig.confidence}% confidence Ã¢â‚¬â€ review the setup and choose your trade count.`, 'ok');
}
function applySignalToBulk(sig) {
    if (typeof sig === 'string') { try { sig = JSON.parse(sig); } catch(e) { return; } }
    populateBulkFromSignal(sig);
}
function applyBestSignalToBulk() {
    const results = ALL_MKTS.map(sym => ({ sym, signal: generateSignal(sym) }))
        .sort((a,b) => (b.signal?.confidence||0) - (a.signal?.confidence||0));
    if (results[0]?.signal) populateBulkFromSignal(results[0].signal);
}

// Ã¢â€â‚¬Ã¢â€â‚¬ Validation / risk protection Ã¢â€â‚¬Ã¢â€â‚¬
function validateBulkConfig(cfg) {
    if (!derivWS || derivWS.readyState !== WebSocket.OPEN) return 'Not connected to Deriv. Please log in first.';
    if (!accountId) return 'No trading account selected.';
    if (cfg.trades < 1 || cfg.trades > BULK_MAX_TRADES) return `Number of trades must be between 1 and ${BULK_MAX_TRADES}.`;
    if (!(cfg.stakePerTrade >= 0.35)) return 'Stake per trade is below the $0.35 minimum.';
    if (cfg.totalStake > BULK_MAX_TOTAL_STAKE) return `Total planned stake ($${cfg.totalStake.toFixed(2)}) exceeds the safety cap of $${BULK_MAX_TOTAL_STAKE}.`;
    if (liveBalance !== null && cfg.totalStake > liveBalance) return `Insufficient balance: total stake $${cfg.totalStake.toFixed(2)} exceeds your balance of $${liveBalance.toFixed(2)}.`;
    if (!cfg.market) return 'Select a market.';
    if (!CONTRACT_MAP[cfg.type]?.[cfg.direction]) return 'Select a valid trade direction.';
    return null;
}

// Ã¢â€â‚¬Ã¢â€â‚¬ Low-level, self-contained request helpers Ã¢â‚¬â€ decoupled from the DBot's
// global pendingContract/lastContractId state so Bulk Trading can never
// interfere with (or be interfered with by) the DBot or Accumulator. Ã¢â€â‚¬Ã¢â€â‚¬
function derivRequest(payload, timeoutMs = 10000) {
    return new Promise((resolve, reject) => {
        if (!derivWS || derivWS.readyState !== WebSocket.OPEN) { reject(new Error('Not connected')); return; }
        const reqId = nextReqId();
        const timer = setTimeout(() => { derivWS.removeEventListener('message', handler); reject(new Error('Request timed out')); }, timeoutMs);
        function handler(ev) {
            let data; try { data = JSON.parse(ev.data); } catch(e) { return; }
            if (data.req_id !== reqId) return;
            clearTimeout(timer);
            derivWS.removeEventListener('message', handler);
            if (data.error) { reject(new Error(data.error.message || 'API error')); return; }
            resolve(data);
        }
        derivWS.addEventListener('message', handler);
        derivWS.send(JSON.stringify({ ...payload, req_id: reqId }));
    });
}
function waitForBulkContractSettlement(contractId, timeoutMs = 120000) {
    return new Promise((resolve, reject) => {
        if (!derivWS || derivWS.readyState !== WebSocket.OPEN) { reject(new Error('Not connected')); return; }
        let subId = null;
        const timer = setTimeout(() => { cleanup(); reject(new Error('Settlement timed out')); }, timeoutMs);
        function cleanup() {
            clearTimeout(timer);
            derivWS.removeEventListener('message', handler);
            if (subId && derivWS.readyState === WebSocket.OPEN) derivWS.send(JSON.stringify({ forget: subId }));
        }
        function handler(ev) {
            let data; try { data = JSON.parse(ev.data); } catch(e) { return; }
            if (data.msg_type !== 'proposal_open_contract') return;
            const c = data.proposal_open_contract;
            if (!c || c.contract_id !== contractId) return;
            if (data.subscription?.id) subId = data.subscription.id;
            if (c.is_sold || c.is_expired) { cleanup(); resolve(c); }
        }
        derivWS.addEventListener('message', handler);
        derivWS.send(JSON.stringify({ proposal_open_contract: 1, contract_id: contractId, subscribe: 1, req_id: nextReqId() }));
    });
}

// One fully round-tripped trade: proposal -> buy -> settlement. The caller
// always awaits this before starting the next one, which is what makes the
// whole batch sequential and duplicate-proof.
async function executeSingleBulkTrade(cfg) {
    const contractType = CONTRACT_MAP[cfg.type]?.[cfg.direction];
    if (!contractType) throw new Error('Invalid contract configuration');

    const isDigit    = ['DIGITEVEN','DIGITODD','DIGITOVER','DIGITUNDER'].includes(contractType);
    const isRunHL    = ['RUNHIGH','RUNLOW'].includes(contractType);
    const isRiseFall = ['CALL','PUT'].includes(contractType);

    const proposalReq = {
        proposal: 1, amount: parseFloat(cfg.stakePerTrade.toFixed(2)), basis: 'stake',
        contract_type: contractType, currency: 'USD', underlying_symbol: cfg.market
    };
    if (isDigit)         { proposalReq.duration = Math.max(1, Math.min(10, cfg.duration)); proposalReq.duration_unit = 't'; }
    else if (isRunHL)    { proposalReq.duration = Math.max(2, Math.min(10, cfg.duration)); proposalReq.duration_unit = 't'; }
    else if (isRiseFall) { proposalReq.duration = Math.max(1, cfg.duration); proposalReq.duration_unit = 'm'; }
    if (cfg.type === 'over_under') proposalReq.barrier = String(cfg.pred);

    const proposalResp = await derivRequest(proposalReq);
    const proposalId = proposalResp.proposal.id;
    const askPrice    = parseFloat(proposalResp.proposal.ask_price);

    const buyResp   = await derivRequest({ buy: proposalId, price: askPrice });
    const contractId = buyResp.buy.contract_id;
    const buyPrice    = parseFloat(buyResp.buy.buy_price);

    const settled = await waitForBulkContractSettlement(contractId);
    const profit  = parseFloat(settled.profit || 0);
    return { contractType, stake: buyPrice, contractId, profit, isWin: profit > 0, timestamp: Date.now() };
}

function computeBatchStatus(batch) {
    const done   = batch.results.filter(r => r.status === 'Completed').length;
    const failed = batch.results.filter(r => r.status === 'Failed').length;
    if (done === batch.trades) return 'Completed';
    if (done === 0 && failed > 0) return 'Failed';
    return 'Partially Completed';
}

// Ã¢â€â‚¬Ã¢â€â‚¬ Main entry point Ã¢â‚¬â€ guarded against double-click / re-entrant calls Ã¢â€â‚¬Ã¢â€â‚¬
async function startBulkExecution() {
    if (bulkExecuting) return; // idempotency guard Ã¢â‚¬â€ a second click while running does nothing
    const cfg = getBulkConfig();
    const err = validateBulkConfig(cfg);
    if (err) { notify('Cannot Execute', err, 'err'); return; }

    const acct = allAccounts.find(a => a.account_id === accountId);
    const isReal = acct && acct.account_type === 'real';

    if (isReal) {
        showApaModal(`
            <div style="text-align:center;padding:10px;">
                <div style="font-size:32px;margin-bottom:8px;">Ã¢Å¡Â Ã¯Â¸Â</div>
                <div style="font-size:14px;font-weight:900;margin-bottom:8px;">Confirm REAL Account Execution</div>
                <div style="font-size:12px;color:var(--muted);margin-bottom:16px;">You are about to execute <b style="color:var(--text);">${cfg.trades} trades</b> on your <b style="color:var(--red);">REAL</b> account. Total stake: <b style="color:var(--text);">$${cfg.totalStake.toFixed(2)}</b>.</div>
                <button class="btn btn-red" style="width:100%;padding:12px;margin-bottom:8px;font-weight:900;" onclick="closeApaModal();runBulkExecution();">Confirm Ã¢â‚¬â€ Execute on REAL Account</button>
                <button class="btn btn-ghost" style="width:100%;padding:10px;" onclick="closeApaModal();">Cancel</button>
            </div>`);
        return;
    }
    runBulkExecution();
}

async function runBulkExecution() {
    if (bulkExecuting) return;
    const cfg = getBulkConfig();
    const err = validateBulkConfig(cfg);
    if (err) { notify('Cannot Execute', err, 'err'); return; }

    bulkExecuting = true;
    const btn = document.getElementById('bulk-execute-btn');
    if (btn) { btn.disabled = true; btn.textContent = `Executing 1 / ${cfg.trades} Trades...`; btn.style.opacity = '0.7'; }

    const acct = allAccounts.find(a => a.account_id === accountId);
    const batch = {
        id: makeBulkBatchId(), createdAt: Date.now(), market: cfg.market, marketLabel: MKT[cfg.market] || cfg.market,
        type: cfg.type, direction: cfg.direction, pred: cfg.pred, trades: cfg.trades,
        stakePerTrade: cfg.stakePerTrade, totalStake: cfg.totalStake,
        account: acct ? (acct.account_type === 'real' ? 'REAL' : 'DEMO') : 'Ã¢â‚¬â€',
        status: 'RUNNING', results: []
    };
    bulkCurrentBatch = batch;
    bulkBatches.push(batch);
    saveBulkBatches();
    renderBulkHistory();

    const progressCard = document.getElementById('bulk-progress-card');
    if (progressCard) progressCard.style.display = 'block';
    renderBulkProgress(batch);

    for (let i = 0; i < cfg.trades; i++) {
        if (btn) btn.textContent = `Executing ${i+1} / ${cfg.trades} Trades...`;
        try {
            const result = await executeSingleBulkTrade(cfg);
            batch.results.push({ index: i+1, ...result, status: 'Completed' });
            log(`Ã°Å¸â€œÂ¦ Bulk trade ${i+1}/${cfg.trades} completed | ${result.isWin?'WIN':'LOSS'} $${result.profit.toFixed(2)}`, result.isWin ? 'w' : 'l');
        } catch(e) {
            batch.results.push({ index: i+1, status: 'Failed', error: e.message, timestamp: Date.now() });
            log(`Ã°Å¸â€œÂ¦ Bulk trade ${i+1}/${cfg.trades} FAILED: ${e.message}`, 'x');
        }
        saveBulkBatches();
        renderBulkProgress(batch);
    }

    batch.status = computeBatchStatus(batch);
    saveBulkBatches();
    bulkExecuting = false;
    bulkCurrentBatch = null;
    if (btn) { btn.disabled = false; btn.style.opacity = '1'; updateBulkPreview(); }

    const wins = batch.results.filter(r => r.isWin).length;
    const netResult = batch.results.reduce((s,r) => s + (r.profit || 0), 0);
    notify(
        batch.status === 'Completed' ? 'Ã¢Å“â€¦ Bulk Trade Completed' : batch.status === 'Failed' ? 'Ã¢ÂÅ’ Bulk Trade Failed' : 'Ã¢Å¡Â Ã¯Â¸Â Bulk Trade Partially Completed',
        `${batch.trades} requested Ã‚Â· ${batch.results.filter(r=>r.status==='Completed').length} executed Ã‚Â· ${wins} wins Ã‚Â· Net: ${netResult>=0?'+':''}$${netResult.toFixed(2)}`,
        batch.status === 'Completed' ? 'ok' : batch.status === 'Failed' ? 'err' : 'warn'
    );
    renderBulkHistory();
}

function renderBulkProgress(batch) {
    const total = batch.trades;
    const done  = batch.results.length;
    const success = batch.results.filter(r => r.status === 'Completed').length;
    const failed  = batch.results.filter(r => r.status === 'Failed').length;
    const pending = total - done;

    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('bulk-progress-label', `${done} / ${total}`);
    set('bulk-progress-status', done < total ? 'Running...' : (batch.status || 'Done'));
    set('bulk-count-success', success);
    set('bulk-count-failed', failed);
    set('bulk-count-pending', pending);
    const bar = document.getElementById('bulk-progress-bar');
    if (bar) bar.style.width = `${total ? (done/total)*100 : 0}%`;

    const body = document.getElementById('bulk-results-body');
    if (body) {
        body.innerHTML = batch.results.map(r => `
            <div style="display:flex;align-items:center;padding:6px 0;border-bottom:1px solid var(--border);font-size:11px;">
                <div style="width:32px;color:var(--muted);">${r.index}</div>
                <div style="flex:1;">${r.contractType || batch.type}</div>
                <div style="width:70px;font-family:monospace;">$${(r.stake ?? batch.stakePerTrade).toFixed(2)}</div>
                <div style="width:90px;color:${r.status==='Completed'?'var(--green)':'var(--red)'};">${r.status}</div>
                <div style="width:80px;text-align:right;font-family:monospace;font-weight:700;color:${r.status!=='Completed'?'var(--dim)':r.isWin?'var(--green)':'var(--red)'};">${r.status==='Completed' ? (r.isWin?'+':'')+'$'+r.profit.toFixed(2) : 'Ã¢â‚¬â€'}</div>
            </div>`).join('')
            + Array.from({length: Math.max(0, total-done)}).map((_,i) => `
            <div style="display:flex;align-items:center;padding:6px 0;border-bottom:1px solid var(--border);font-size:11px;color:var(--dim);">
                <div style="width:32px;">${done+i+1}</div><div style="flex:1;">Pending</div><div style="width:70px;">Ã¢â‚¬â€</div><div style="width:90px;">Pending</div><div style="width:80px;text-align:right;">Ã¢â‚¬â€</div>
            </div>`).join('');
    }
}

function renderBulkHistory() {
    const body = document.getElementById('bulk-history-body');
    if (!body) return;
    const batches = bulkBatches.slice().sort((a,b) => b.createdAt - a.createdAt);
    if (!batches.length) {
        body.innerHTML = `<div style="font-size:11px;color:var(--dim);text-align:center;padding:16px;">No bulk trades executed yet.</div>`;
        return;
    }
    body.innerHTML = batches.map(b => {
        const wins   = b.results.filter(r => r.isWin).length;
        const losses = b.results.filter(r => r.status === 'Completed' && !r.isWin).length;
        const net    = b.results.reduce((s,r) => s + (r.profit || 0), 0);
        const statusColor = b.status === 'Completed' ? 'var(--green)' : b.status === 'Failed' ? 'var(--red)' : b.status === 'RUNNING' ? 'var(--amber)' : 'var(--amber)';
        return `
        <div class="card-sm" style="padding:10px;">
            <div style="display:flex;justify-content:space-between;align-items:center;cursor:pointer;" onclick="toggleBulkBatchDetail('${b.id}')">
                <div>
                    <div style="font-size:11px;font-weight:900;">Batch #${b.id}</div>
                    <div style="font-size:9px;color:var(--muted);">${new Date(b.createdAt).toLocaleString()} Ã‚Â· ${b.marketLabel} Ã‚Â· ${b.direction.toUpperCase()}</div>
                </div>
                <span class="badge" style="background:${statusColor}22;color:${statusColor};border:1px solid ${statusColor}44;">${b.status}</span>
            </div>
            <div class="accu-row-3" style="margin-top:8px;">
                <div style="text-align:center;"><div style="font-size:8px;color:var(--muted);">TRADES</div><div style="font-size:12px;font-weight:900;">${b.trades}</div></div>
                <div style="text-align:center;"><div style="font-size:8px;color:var(--muted);">TOTAL STAKE</div><div style="font-size:12px;font-weight:900;">$${b.totalStake.toFixed(2)}</div></div>
                <div style="text-align:center;"><div style="font-size:8px;color:var(--muted);">NET RESULT</div><div style="font-size:12px;font-weight:900;color:${net>=0?'var(--green)':'var(--red)'};">${net>=0?'+':''}$${net.toFixed(2)}</div></div>
            </div>
            <div style="font-size:9px;color:var(--muted);margin-top:6px;">Wins: <b style="color:var(--green);">${wins}</b> Ã‚Â· Losses: <b style="color:var(--red);">${losses}</b> Ã‚Â· Account: <b>${b.account}</b></div>
            <div id="bulk-batch-detail-${b.id}" style="display:none;margin-top:8px;border-top:1px solid var(--border);padding-top:8px;">
                ${b.results.map(r => `
                <div style="display:flex;justify-content:space-between;font-size:10px;padding:3px 0;color:var(--muted);">
                    <span>#${r.index} ${r.contractType || b.type}</span>
                    <span>${new Date(r.timestamp).toLocaleTimeString()}</span>
                    <span style="color:${r.status!=='Completed'?'var(--red)':r.isWin?'var(--green)':'var(--red)'};">${r.status==='Completed' ? (r.isWin?'+':'')+'$'+r.profit.toFixed(2) : (r.error || 'Failed')}</span>
                </div>`).join('')}
            </div>
        </div>`;
    }).join('');
}
function toggleBulkBatchDetail(id) {
    const el = document.getElementById(`bulk-batch-detail-${id}`);
    if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
}
function clearBulkHistory() {
    bulkBatches = [];
    saveBulkBatches();
    renderBulkHistory();
    notify('Ã°Å¸â€”â€˜ Bulk History Cleared', 'All bulk trade batches have been removed from this browser.', 'ok');
}

function initBulkTab() {
    loadBulkBatches();
    onBulkTypeChange();
    setBulkStakeMode(bulkStakeMode);
    updateBulkPreview();
    renderBulkHistory();
    if (bulkCurrentBatch) { document.getElementById('bulk-progress-card').style.display = 'block'; renderBulkProgress(bulkCurrentBatch); }

    const acct = allAccounts.find(a => a.account_id === accountId);
    const accBadge = document.getElementById('bulk-account-badge');
    const balBadge = document.getElementById('bulk-balance-badge');
    if (accBadge) {
        if (acct) { accBadge.style.display = 'inline-flex'; accBadge.textContent = acct.account_type === 'real' ? 'REAL' : 'DEMO'; accBadge.className = acct.account_type === 'real' ? 'badge badge-red' : 'badge badge-teal'; }
        else accBadge.style.display = 'none';
    }
    if (balBadge) {
        if (liveBalance !== null) { balBadge.style.display = 'inline-flex'; balBadge.textContent = `$${liveBalance.toFixed(2)}`; }
        else balBadge.style.display = 'none';
    }
    const dot = document.getElementById('bulk-status-dot');
    const txt = document.getElementById('bulk-status-text');
    const live = derivWS && derivWS.readyState === WebSocket.OPEN;
    if (dot) dot.classList.toggle('live', live);
    if (txt) { txt.textContent = live ? 'LIVE' : 'OFFLINE'; txt.style.color = live ? 'var(--teal)' : 'var(--muted)'; }
}

// ================================================================
// TRANSACTION ROW Ã¢â‚¬â€ exactly like screenshot
// ================================================================
// Update exit spot on an existing transaction row
function updateTxRowExitSpot(contractId, exitSpot) {
    const rows = document.querySelectorAll('.tx-row[data-contract-id="' + contractId + '"]');
    rows.forEach(row => {
        const exitEl = row.querySelector('.tx-exit-spot');
        if (exitEl && exitSpot) exitEl.textContent = exitSpot;
    });
}

function addTxRow(contractType, entrySpot, exitSpot, stake, profit, isWin) {
    const container = document.getElementById('tx-list');
    if (!container) return;

    // Remove empty state
    const empty = container.querySelector('div[style*="text-align:center"]');
    if (empty) empty.remove();

    // Icons matching Deriv's style
    const icons = {
        DIGITOVER:'Ã¢â€ â€˜', DIGITUNDER:'Ã¢â€ â€œ', DIGITEVEN:'2x', DIGITODD:'!!',
        DIGITMATCH:'=', DIGITDIFF:'Ã¢â€°Â ',
        CALL:'Ã¢â€ â€˜', PUT:'Ã¢â€ â€œ', RUNHIGH:'Ã¢â€ â€˜Ã¢â€ â€˜', RUNLOW:'Ã¢â€ â€œÃ¢â€ â€œ'
    };
    const icon       = icons[contractType] || '?';
    const iconBg     = isWin ? '#00d79e18' : '#ff444f18';
    const iconColor  = isWin ? 'var(--green)' : 'var(--red)';
    const profitColor = isWin ? 'var(--green)' : 'var(--red)';

    // Format spots exactly like Deriv Ã¢â‚¬â€ show full price
    const fmtSpot = (s) => {
        if (!s || s === 'Ã¢â‚¬â€') return 'Ã¢â‚¬â€';
        // Return as-is Ã¢â‚¬â€ Deriv already formats it correctly
        return String(s);
    };

    const row = document.createElement('div');
    row.className = 'tx-row';
    if (lastContractId) row.dataset.contractId = lastContractId;
    row.innerHTML = `
        <div class="tx-type-icon" style="background:${iconBg};color:${iconColor};font-weight:900;font-size:14px;border-radius:8px;">
            ${icon}
        </div>
        <div class="tx-spots">
            <div class="tx-entry">
                <span class="spot-dot entry"></span>
                <span class="tx-price" style="font-family:monospace;">${fmtSpot(entrySpot)}</span>
            </div>
            <div class="tx-exit">
                <span class="spot-dot exit"></span>
                <span class="tx-price tx-exit-spot" style="color:var(--muted);font-family:monospace;">${fmtSpot(exitSpot)}</span>
            </div>
        </div>
        <div class="tx-pnl">
            <div class="tx-stake" style="color:var(--muted);font-size:11px;">$${stake.toFixed(2)} USD</div>
            <div class="tx-profit ${isWin?'':'loss'}" style="font-family:monospace;">${isWin?'+':''}$${profit.toFixed(2)} USD</div>
        </div>`;

    container.insertBefore(row, container.firstChild);
    if (container.children.length > 100) container.removeChild(container.lastChild);

    // Mirror to dashboard recent trades
    const rt = document.getElementById('recent-trades');
    if (rt) {
        const empty2 = rt.querySelector('[style*="text-align:center"]');
        if (empty2) empty2.remove();
        const r2 = document.createElement('div');
        r2.style.cssText = `display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:11px;`;
        r2.innerHTML = `<span style="color:var(--muted);">${contractType}</span><span style="color:${profitColor};font-weight:700;font-family:monospace;">${isWin?'+':''}$${profit.toFixed(2)}</span>`;
        rt.insertBefore(r2, rt.firstChild);
        if (rt.children.length > 6) rt.removeChild(rt.lastChild);
    }
}

function clearTransactions() {
    const c = document.getElementById('tx-list');
    if (c) c.innerHTML = '<div style="font-size:11px;color:var(--dim);text-align:center;padding:30px;">No transactions yet.</div>';
}

function downloadTransactions() {
    const rows = document.querySelectorAll('#tx-list .tx-row');
    let csv = 'Type,Entry,Exit,Stake,Profit\n';
    rows.forEach(r => {
        const prices = r.querySelectorAll('.tx-price');
        const stake  = r.querySelector('.tx-stake')?.textContent || '';
        const profit = r.querySelector('.tx-profit')?.textContent || '';
        csv += `${r.querySelector('.tx-type-icon')?.textContent?.trim()},${prices[0]?.textContent},${prices[1]?.textContent},${stake},${profit}\n`;
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type:'text/csv' }));
    a.download = `DOLARHUNTER_transactions_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
}

// ================================================================
// STATS UPDATE
// ================================================================
function updateAllStats() {
    const wr  = totalRuns > 0 ? ((totalWins / totalRuns) * 100).toFixed(1) : "0.0";
    const set = (id, val, col) => {
        const el = document.getElementById(id);
        if (el) { el.textContent = val; if (col) el.style.color = col; }
    };

    // Summary panel
    set('sum-wr',          `${wr}%`, parseFloat(wr) >= 50 ? 'var(--teal)' : 'var(--red)');
    set('sum-pl',          `${totalPL >= 0 ? '+' : ''}$${totalPL.toFixed(2)}`, totalPL >= 0 ? 'var(--green)' : 'var(--red)');
    set('sum-runs',        totalRuns);
    set('sum-wins',        totalWins);
    set('sum-losses',      totalLosses);
    set('sum-total-stake', `$${totalStake.toFixed(2)}`);
    set('sum-total-payout',`$${totalPayout.toFixed(2)}`, 'var(--green)');
    set('sum-no-runs',     totalRuns);
    set('sum-won2',        totalWins);
    set('sum-pl2',         `${totalPL >= 0 ? '+' : ''}$${totalPL.toFixed(2)}`, totalPL >= 0 ? 'var(--green)' : 'var(--red)');

    const wrBar = document.getElementById('sum-wr-bar');
    if (wrBar) wrBar.style.width = `${wr}%`;

    // Dashboard
    set('ds-runs', totalRuns);
    set('ds-wr',   `${wr}%`, parseFloat(wr) >= 50 ? 'var(--teal)' : 'var(--red)');
    set('ds-pl',   `$${totalPL.toFixed(2)}`, totalPL >= 0 ? 'var(--green)' : 'var(--red)');

    updateBotBar();
}

function checkThresholds() {
    const tp = parseFloat(document.getElementById('bot-tp')?.value || 0);
    const sl = parseFloat(document.getElementById('bot-sl')?.value || 0);

    // Use session PL Ã¢â‚¬â€ measured from last reset, not all-time total
    const sessionPL = totalPL - sessionBasePL;

    if (tp > 0 && sessionPL >= tp) {
        log(`Ã°Å¸Ââ€  TAKE PROFIT $${tp} HIT! Session P/L: $${sessionPL.toFixed(2)}`, 'w');
        isBotRunning   = false;
        pendingContract = false;
        lastContractId  = null;
        const btn = document.getElementById('run-btn');
        if (btn) { btn.textContent = 'Ã¢â€“Â¶ Run'; btn.classList.remove('btn-stop'); btn.classList.add('btn-run'); }
        updateBotBar();
        showTargetModal('tp', tp, sessionPL);

    } else if (sl > 0 && sessionPL <= -sl) {
        log(`Ã¢â€ºâ€ STOP LOSS $${sl} HIT! Session P/L: $${sessionPL.toFixed(2)}`, 'x');
        isBotRunning   = false;
        pendingContract = false;
        lastContractId  = null;
        const btn = document.getElementById('run-btn');
        if (btn) { btn.textContent = 'Ã¢â€“Â¶ Run'; btn.classList.remove('btn-stop'); btn.classList.add('btn-run'); }
        updateBotBar();
        showTargetModal('sl', sl, sessionPL);
    }
}

function showTargetModal(type, amount, sessionPL) {
    sessionPL = sessionPL || totalPL;
    // Remove existing modal if any
    const existing = document.getElementById('target-modal');
    if (existing) existing.remove();

    const isTP   = type === 'tp';
    const color  = isTP ? '#00d2c8' : '#ff444f';
    const emoji  = isTP ? 'Ã°Å¸Ââ€ ' : 'Ã¢â€ºâ€';
    const title  = isTP ? 'TAKE PROFIT HIT!' : 'STOP LOSS HIT!';
    const msg    = isTP
        ? `Congratulations! You reached your profit target of $${amount.toFixed(2)}.`
        : `Your stop loss of $${amount.toFixed(2)} has been reached.`;
    const sub    = isTP
        ? 'Would you like to reset and continue trading or stop here?'
        : 'Would you like to reset and try again or stop trading?';

    const modal = document.createElement('div');
    modal.id    = 'target-modal';
    modal.style.cssText = `
        position:fixed;inset:0;z-index:999999;
        background:#000000cc;
        display:flex;align-items:center;justify-content:center;
        padding:16px;animation:fadeInModal .3s ease;
    `;
    modal.innerHTML = `
        <style>
            @keyframes fadeInModal{from{opacity:0;transform:scale(.9);}to{opacity:1;transform:scale(1);}}
            @keyframes pulse-ring{0%{box-shadow:0 0 0 0 ${color}66;}70%{box-shadow:0 0 0 20px transparent;}100%{box-shadow:0 0 0 0 transparent;}}
        </style>
        <div style="background:#161b27;border:2px solid ${color};border-radius:16px;padding:30px 24px;
                    max-width:400px;width:100%;text-align:center;
                    box-shadow:0 0 40px ${color}44;animation:pulse-ring 1.5s infinite;">
            <div style="font-size:56px;margin-bottom:12px;">${emoji}</div>
            <div style="font-size:22px;font-weight:900;color:${color};margin-bottom:8px;">${title}</div>
            <div style="font-size:14px;color:#e2e8f0;margin-bottom:6px;">${msg}</div>
            <div style="font-size:12px;color:#718096;margin-bottom:8px;">${sub}</div>

            <!-- Current session stats -->
            <div style="background:#0e1118;border:1px solid #2d3748;border-radius:10px;padding:14px;margin:16px 0;display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">
                <div>
                    <div style="font-size:9px;color:#718096;text-transform:uppercase;margin-bottom:4px;">Runs</div>
                    <div style="font-size:18px;font-weight:900;color:#e2e8f0;">${totalRuns}</div>
                </div>
                <div>
                    <div style="font-size:9px;color:#718096;text-transform:uppercase;margin-bottom:4px;">Win Rate</div>
                    <div style="font-size:18px;font-weight:900;color:${color};">${totalRuns>0?((totalWins/totalRuns)*100).toFixed(1):0}%</div>
                </div>
                <div>
                    <div style="font-size:9px;color:#718096;text-transform:uppercase;margin-bottom:4px;">Session P/L</div>
                    <div style="font-size:18px;font-weight:900;color:${color};">$${sessionPL.toFixed(2)}</div>
                </div>
            </div>

            <div style="display:flex;gap:10px;flex-direction:column;">
                <button onclick="resetAndContinue()" style="
                    background:${color};color:${isTP?'#000':'#fff'};border:none;
                    border-radius:10px;padding:14px;font-size:14px;font-weight:900;
                    cursor:pointer;width:100%;letter-spacing:.03em;">
                    Ã°Å¸â€â€ž Reset & Continue Trading
                </button>
                <button onclick="stopAndClose()" style="
                    background:transparent;color:#718096;border:1px solid #2d3748;
                    border-radius:10px;padding:12px;font-size:13px;font-weight:700;
                    cursor:pointer;width:100%;">
                    Ã¢Å“â€¹ Stop Trading
                </button>
            </div>
        </div>`;

    document.body.appendChild(modal);

    // Play sound
    if (isTP) { try { winAudio.currentTime=0; winAudio.play(); } catch(e){} }
    else       { try { lossAudio.currentTime=0; lossAudio.play(); } catch(e){} }
}

function resetAndContinue() {
    // Remove modal
    document.getElementById('target-modal')?.remove();

    // Reset session tracking Ã¢â‚¬â€ totalPL keeps accumulating but session resets
    // TP/SL checks against sessionPL (profit since last reset) not totalPL
    sessionBasePL     = totalPL; // new session starts from current PL
    totalRuns         = 0;
    totalWins         = 0;
    totalLosses       = 0;
    totalStake        = 0;
    totalPayout       = 0;
    currentStreak     = 0;
    consecutiveLosses = 0;
    currentStake      = parseFloat(document.getElementById('bot-stake')?.value || 1);
    baseStake         = currentStake;
    lastContractId    = null;
    pendingContract   = false;
    log(`Ã°Å¸â€â€ž New session started. TP/SL reset. Cumulative P/L: $${totalPL.toFixed(2)}`, 'i');

    // Reset recovery state
    if (isInRecoveryMode && originalDirection !== null) {
        botDirection = originalDirection;
        const predEl = document.getElementById('bot-pred');
        if (predEl && originalPrediction !== null) predEl.value = originalPrediction;
        renderDirButtons();
        updateInfoBar();
    }
    isInRecoveryMode   = false;
    originalDirection  = null;
    originalPrediction = null;

    // Clear transactions list
    const txList = document.getElementById('tx-list');
    if (txList) txList.innerHTML = '<div style="font-size:11px;color:var(--dim);text-align:center;padding:30px;">No transactions yet.</div>';

    // Reset summary stats display
    updateAllStats();
    log('Ã°Å¸â€â€ž Stats reset Ã¢â‚¬â€ continuing trading session', 'i');

    // Auto-start bot again
    toggleBot();
}

function stopAndClose() {
    document.getElementById('target-modal')?.remove();
    log('Ã¢Å“â€¹ Trading stopped by user after target.', 'i');
}

function updateBotBar() {
    const wr  = totalRuns > 0 ? ((totalWins / totalRuns) * 100).toFixed(1) : "0.0";
    const set = (id, val, col) => { const el = document.getElementById(id); if (el) { el.textContent = val; if (col) el.style.color = col; } };
    set('bar-bot',  document.getElementById('active-bot-name')?.textContent || 'Ã¢â‚¬â€');
    set('bar-runs', totalRuns);
    set('bar-pl',   `$${totalPL.toFixed(2)}`, totalPL >= 0 ? 'var(--green)' : 'var(--red)');
    set('bar-wr',   `${wr}%`);
    set('ds-bot',   document.getElementById('active-bot-name')?.textContent || 'None');
}

function updateActiveBotName() {
    const mkt  = MKT[document.getElementById('bot-market')?.value] || 'Ã¢â‚¬â€';
    const type = document.getElementById('bot-type')?.value?.replace(/_/g,' ') || 'Ã¢â‚¬â€';
    const name = `${mkt} Ã‚Â· ${type} Ã‚Â· ${botDirection?.toUpperCase() || 'Ã¢â‚¬â€'}`;
    const el   = document.getElementById('active-bot-name');
    if (el) el.textContent = name;
}

// ================================================================
// DIRECTION CONTROLS
// ================================================================
function onTypeChange() {
    const type = document.getElementById('bot-type')?.value || 'over_under';
    const wrap = document.getElementById('dir-controls');
    const pred = document.getElementById('pred-wrap');
    if (!wrap) return;

    wrap.innerHTML = '';

    const dirMap = {
        over_under:     [['over','Over Only'],['under','Under Only']],
        even_odd:       [['even','Even Only'],['odd','Odd Only']],
        rise_fall:      [['rise','Rise Only'],['fall','Fall Only']],
        only_ups_downs: [['ups','Only Ups'],['downs','Only Downs']]
    };

    const opts = dirMap[type] || [];
    opts.forEach(([val, label]) => {
        const btn = document.createElement('button');
        btn.className    = 'dir-btn';
        btn.textContent  = label;
        btn.dataset.dir  = val;
        btn.onclick      = () => selectDir(val);
        wrap.appendChild(btn);
    });

    // Show prediction for digit types
    if (pred) pred.style.display = ['over_under'].includes(type) ? 'block' : 'none';

    if (opts.length > 0) selectDir(opts[0][0]);
    updateInfoBar();
}

function selectDir(dir) {
    botDirection = dir;
    const neg = ['under','odd','fall','downs'];
    document.querySelectorAll('#dir-controls .dir-btn').forEach(b => {
        b.classList.remove('pos','neg');
        if (b.dataset.dir === dir) b.classList.add(neg.includes(dir) ? 'neg' : 'pos');
    });
    updateInfoBar();
}

function renderDirButtons() {
    // Re-render after AI update
    document.querySelectorAll('#dir-controls .dir-btn').forEach(b => {
        b.classList.remove('pos','neg');
        if (b.dataset.dir === botDirection) {
            b.classList.add(['under','odd','fall','downs'].includes(botDirection) ? 'neg' : 'pos');
        }
    });
}

function onMarketChange() {
    const mkt = document.getElementById('bot-market')?.value || 'R_10';
    subscribeDigitFeed(mkt);
    updateInfoBar();
    updateActiveBotName();
    // Update AI panel
    setTimeout(() => { updateAIMini(mkt); runAIScan(); }, 500);
}

function updateInfoBar() {
    const mkt  = document.getElementById('bot-market')?.value || 'Ã¢â‚¬â€';
    const type = document.getElementById('bot-type')?.value || 'Ã¢â‚¬â€';
    const set  = (id, val, col) => { const el=document.getElementById(id); if(el){el.textContent=val;if(col)el.style.color=col;} };
    set('info-market', MKT[mkt] || mkt);
    set('info-type',   type.replace(/_/g,' '));
    set('info-dir',    botDirection?.toUpperCase() || 'Ã¢â‚¬â€',
        ['under','odd','fall','downs'].includes(botDirection) ? 'var(--red)' : 'var(--teal)');
    set('info-stake',  `$${parseFloat(document.getElementById('bot-stake')?.value||1).toFixed(2)}`);
}

// ================================================================
// AI ENGINE Ã¢â‚¬â€ real data driven, realistic probability
// ================================================================
function generateSignal(symbol) {
    const data = digitData[symbol];
    const mm = marketMemory[symbol];

    if (!data || data.ticks < 100) return null;

    const counts = Array.isArray(data.counts)
        ? data.counts.slice(0, 10)
        : Array(10).fill(0);

    const total = Math.max(
        counts.reduce((a, b) => a + b, 0),
        data.ticks || 0,
        1
    );

    const ranked = counts
        .map((c, d) => ({ d, c, pct: (c / total) * 100 }))
        .sort((a, b) => b.c - a.c);

    const evenCount = counts.reduce(
        (sum, c, d) => sum + (d % 2 === 0 ? c : 0),
        0
    );

    const evenPct = (evenCount / total) * 100;
    const oddPct = 100 - evenPct;

    const recentDigits = mm?.digits?.slice(-30) || [];
    const recentPrices = mm?.prices?.slice(-60) || [];

    // --------------------------------------------------------
    // Recent digit bias
    // --------------------------------------------------------
    const recentCounts = Array(10).fill(0);

    recentDigits.forEach(d => {
        if (Number.isInteger(d) && d >= 0 && d <= 9) {
            recentCounts[d]++;
        }
    });

    const recentTotal = recentDigits.length;

    // --------------------------------------------------------
    // Consecutive digit tracking
    // --------------------------------------------------------
    let consecutive = 0;

    if (recentDigits.length) {
        const last = recentDigits[recentDigits.length - 1];

        for (let i = recentDigits.length - 1; i >= 0; i--) {
            if (recentDigits[i] === last) consecutive++;
            else break;
        }
    }

    // --------------------------------------------------------
    // Recent parity momentum
    // --------------------------------------------------------
    const last10 = recentDigits.slice(-10);

    let recentEven = 0;

    last10.forEach(d => {
        if (d % 2 === 0) recentEven++;
    });

    const recentEvenPct = last10.length
        ? (recentEven / last10.length) * 100
        : evenPct;

    // --------------------------------------------------------
    // Price momentum
    // --------------------------------------------------------
    let momentum = 0;

    if (recentPrices.length >= 10) {
        const first = Number(recentPrices[0]);
        const last = Number(recentPrices[recentPrices.length - 1]);

        if (Number.isFinite(first) && Number.isFinite(last) && first !== last) {
            momentum = last > first ? 1 : -1;
        }
    }

    // --------------------------------------------------------
    // Short-term price direction
    // --------------------------------------------------------
    let rising = 0;
    let falling = 0;

    for (let i = 1; i < recentPrices.length; i++) {
        const a = Number(recentPrices[i - 1]);
        const b = Number(recentPrices[i]);

        if (!Number.isFinite(a) || !Number.isFinite(b)) continue;

        if (b > a) rising++;
        else if (b < a) falling++;
    }

    const movementTotal = rising + falling;

    const priceUpPct = movementTotal
        ? (rising / movementTotal) * 100
        : 50;

    const priceDownPct = 100 - priceUpPct;

    // --------------------------------------------------------
    // Signal collection
    // --------------------------------------------------------
    const signals = [];

    function addSignal(signal) {
        if (!signal) return;

        if (
            Number.isFinite(signal.confidence) &&
            signal.confidence >= 55
        ) {
            signals.push({
                ...signal,
                confidence: Math.max(
                    55,
                    Math.min(92, Math.round(signal.confidence))
                )
            });
        }
    }

    // --------------------------------------------------------
    // EVEN
    // --------------------------------------------------------
    if (evenPct >= 53) {
        let confidence = 50 + (evenPct - 50) * 1.25;

        if (recentEvenPct >= 60) confidence += 5;
        if (consecutive >= 2 && recentDigits.at(-1) % 2 === 0) confidence += 2;

        addSignal({
            type: 'even_odd',
            botDirection: 'even',
            direction: 'Even Only',
            confidence,
            reason:
                `Even digits ${evenPct.toFixed(1)}% overall | ` +
                `${recentEvenPct.toFixed(1)}% in last ${last10.length || 0} ticks`,
            color: 'var(--green)',
            pred: null
        });
    }

    // --------------------------------------------------------
    // ODD
    // --------------------------------------------------------
    if (oddPct >= 53) {
        let confidence = 50 + (oddPct - 50) * 1.25;

        if ((100 - recentEvenPct) >= 60) confidence += 5;
        if (consecutive >= 2 && recentDigits.at(-1) % 2 === 1) confidence += 2;

        addSignal({
            type: 'even_odd',
            botDirection: 'odd',
            direction: 'Odd Only',
            confidence,
            reason:
                `Odd digits ${oddPct.toFixed(1)}% overall | ` +
                `${(100 - recentEvenPct).toFixed(1)}% in last ${last10.length || 0} ticks`,
            color: 'var(--teal)',
            pred: null
        });
    }

    // --------------------------------------------------------
    // OVER / UNDER
    //
    // Require a meaningful edge but reject extremely extreme
    // probabilities because payout becomes poor.
    // --------------------------------------------------------
    for (let barrier = 0; barrier <= 9; barrier++) {

        const overCount = counts
            .slice(barrier + 1)
            .reduce((a, b) => a + b, 0);

        const underCount = counts
            .slice(0, barrier)
            .reduce((a, b) => a + b, 0);

        const overPct = (overCount / total) * 100;
        const underPct = (underCount / total) * 100;

        if (barrier < 9 && overPct >= 55 && overPct <= 84) {

            let confidence = 50 + (overPct - 50) * 1.15;

            const recentOver =
                recentTotal > 0
                    ? (recentDigits.filter(d => d > barrier).length / recentTotal) * 100
                    : overPct;

            if (recentOver >= overPct) confidence += 3;

            addSignal({
                type: 'over_under',
                botDirection: 'over',
                direction: `Over ${barrier}`,
                confidence,
                reason:
                    `${overPct.toFixed(1)}% historical probability | ` +
                    `${recentOver.toFixed(1)}% recent`,
                color: 'var(--blue)',
                pred: barrier
            });
        }

        if (barrier > 0 && underPct >= 55 && underPct <= 84) {

            let confidence = 50 + (underPct - 50) * 1.15;

            const recentUnder =
                recentTotal > 0
                    ? (recentDigits.filter(d => d < barrier).length / recentTotal) * 100
                    : underPct;

            if (recentUnder >= underPct) confidence += 3;

            addSignal({
                type: 'over_under',
                botDirection: 'under',
                direction: `Under ${barrier}`,
                confidence,
                reason:
                    `${underPct.toFixed(1)}% historical probability | ` +
                    `${recentUnder.toFixed(1)}% recent`,
                color: 'var(--purple)',
                pred: barrier
            });
        }
    }

    // --------------------------------------------------------
    // HOT DIGIT / MATCH
    // --------------------------------------------------------
    ranked.slice(0, 3).forEach(item => {

        if (item.pct < 12) return;

        const recentPct = recentTotal
            ? (recentCounts[item.d] / recentTotal) * 100
            : item.pct;

        let confidence =
            50 +
            Math.max(0, item.pct - 10) * 2 +
            Math.max(0, recentPct - 10) * 1.5;

        confidence = Math.min(86, confidence);

        addSignal({
            type: 'matches',
            botDirection: 'matches',
            direction: `Matches ${item.d}`,
            confidence,
            reason:
                `Digit ${item.d}: ${item.pct.toFixed(1)}% overall | ` +
                `${recentPct.toFixed(1)}% recent`,
            color: 'var(--amber)',
            pred: item.d
        });
    });

    // --------------------------------------------------------
    // RISE / FALL
    // --------------------------------------------------------
    if (movementTotal >= 15) {

        if (priceUpPct >= 62) {
            addSignal({
                type: 'rise_fall',
                botDirection: 'rise',
                direction: 'Rise Only',
                confidence: 55 + (priceUpPct - 62) * 0.9,
                reason:
                    `Upward tick movement ${priceUpPct.toFixed(1)}%`,
                color: 'var(--green)',
                pred: null
            });
        }

        if (priceDownPct >= 62) {
            addSignal({
                type: 'rise_fall',
                botDirection: 'fall',
                direction: 'Fall Only',
                confidence: 55 + (priceDownPct - 62) * 0.9,
                reason:
                    `Downward tick movement ${priceDownPct.toFixed(1)}%`,
                color: 'var(--red)',
                pred: null
            });
        }
    }

    // --------------------------------------------------------
    // Sort by confidence
    // --------------------------------------------------------
    signals.sort((a, b) => b.confidence - a.confidence);

    const best = signals[0];

    if (!best) return null;

    best.symbol = symbol;
    best.label = MKT[symbol] || symbol;
    best.hotDigit = ranked[0]?.d ?? null;
    best.coldDigit = ranked[ranked.length - 1]?.d ?? null;
    best.evenPct = evenPct.toFixed(1);
    best.oddPct = oddPct.toFixed(1);
    best.totalTicks = total;
    best.allSignals = signals.slice(0, 5);

    return best;
}

// ================================================================
// BOLLINGER BANDS + RSI ENGINE
// For Only Ups / Only Downs 3-tick signal generation
// ================================================================

function calcRSI(prices, period = 14) {
    if (prices.length < period + 1) return null;
    const recent = prices.slice(-period - 1);
    let gains = 0, losses = 0;
    for (let i = 1; i < recent.length; i++) {
        const diff = recent[i] - recent[i-1];
        if (diff > 0) gains  += diff;
        else          losses -= diff;
    }
    const avgGain = gains  / period;
    const avgLoss = losses / period;
    if (avgLoss === 0) return 100;
    const rs  = avgGain / avgLoss;
    return parseFloat((100 - (100 / (1 + rs))).toFixed(2));
}

function calcBollingerBands(prices, period = 20, multiplier = 2) {
    if (prices.length < period) return null;
    const recent = prices.slice(-period);
    const sma    = recent.reduce((a,b) => a+b, 0) / period;
    const variance = recent.reduce((sum, p) => sum + Math.pow(p - sma, 2), 0) / period;
    const stdDev   = Math.sqrt(variance);
    return {
        upper:  parseFloat((sma + multiplier * stdDev).toFixed(5)),
        middle: parseFloat(sma.toFixed(5)),
        lower:  parseFloat((sma - multiplier * stdDev).toFixed(5)),
        stdDev: parseFloat(stdDev.toFixed(5)),
        bandwidth: parseFloat(((multiplier * 2 * stdDev / sma) * 100).toFixed(2))
    };
}

// Ã¢â€â‚¬Ã¢â€â‚¬ EMA (Exponential Moving Average) Ã¢â‚¬â€ used by the accumulator trend filter Ã¢â€â‚¬Ã¢â€â‚¬
function calcEMA(prices, period) {
    if (!prices || prices.length < period) return null;
    const k = 2 / (period + 1);
    // Seed with SMA of the first `period` values
    let ema = prices.slice(0, period).reduce((a,b) => a+b, 0) / period;
    for (let i = period; i < prices.length; i++) {
        ema = prices[i] * k + ema * (1 - k);
    }
    return ema;
}

// Ã¢â€â‚¬Ã¢â€â‚¬ ATR (Average True Range) approximation from tick data Ã¢â€â‚¬Ã¢â€â‚¬
// Real ATR needs OHLC bars. Ticks only give us a price stream, so we
// approximate "true range" per tick as the absolute price change from the
// previous tick Ã¢â‚¬â€ this is a reasonable proxy for short-horizon volatility
// on synthetic indices, which move on every tick rather than in bars.
function calcATR(prices, period = 14) {
    if (!prices || prices.length < period + 1) return null;
    const recent = prices.slice(-(period + 1));
    let sum = 0;
    for (let i = 1; i < recent.length; i++) sum += Math.abs(recent[i] - recent[i-1]);
    return sum / period;
}

// Ã¢â€â‚¬Ã¢â€â‚¬ ADX (Average Directional Index) approximation from tick data Ã¢â€â‚¬Ã¢â€â‚¬
// Standard ADX needs high/low/close bars. We approximate directional
// movement using consecutive tick-to-tick price changes as a simplified
// +DM/-DM proxy, smoothed with Wilder's method. This gives a workable
// 0-100 trend-strength reading for a continuous tick stream.
function calcADX(prices, period = 14) {
    if (!prices || prices.length < period * 2) return null;
    const plusDM = [], minusDM = [], tr = [];
    for (let i = 1; i < prices.length; i++) {
        const change = prices[i] - prices[i-1];
        plusDM.push(change > 0 ? change : 0);
        minusDM.push(change < 0 ? Math.abs(change) : 0);
        tr.push(Math.abs(change) || 1e-9);
    }
    const smooth = (arr, p) => {
        const out = [];
        let sum = arr.slice(0, p).reduce((a,b)=>a+b, 0);
        out.push(sum);
        for (let i = p; i < arr.length; i++) {
            sum = sum - (sum / p) + arr[i];
            out.push(sum);
        }
        return out;
    };
    const smTR    = smooth(tr, period);
    const smPlus  = smooth(plusDM, period);
    const smMinus = smooth(minusDM, period);
    const dx = [];
    for (let i = 0; i < smTR.length; i++) {
        const plusDI  = (smPlus[i]  / smTR[i]) * 100;
        const minusDI = (smMinus[i] / smTR[i]) * 100;
        const sumDI   = plusDI + minusDI;
        dx.push(sumDI === 0 ? 0 : (Math.abs(plusDI - minusDI) / sumDI) * 100);
    }
    if (dx.length < period) return null;
    const adxSeries = dx.slice(-period);
    const adx = adxSeries.reduce((a,b)=>a+b, 0) / adxSeries.length;
    return parseFloat(adx.toFixed(1));
}

// Ã¢â€â‚¬Ã¢â€â‚¬ Tick stability Ã¢â‚¬â€ analyse the last 100 ticks for smoothness Ã¢â€â‚¬Ã¢â€â‚¬
function calcTickStability(prices) {
    if (!prices || prices.length < 10) return null;
    const recent = prices.slice(-100);
    const moves  = [];
    for (let i = 1; i < recent.length; i++) moves.push(Math.abs(recent[i] - recent[i-1]));
    if (moves.length === 0) return null;
    const avgMove = moves.reduce((a,b)=>a+b, 0) / moves.length;
    const variance = moves.reduce((s,m) => s + Math.pow(m - avgMove, 2), 0) / moves.length;
    const stdDev   = Math.sqrt(variance);
    // A "jump" is a move more than 3x the average tick move
    const jumpThreshold = avgMove * 3;
    const jumps    = moves.filter(m => m > jumpThreshold).length;
    const jumpFreq = jumps / moves.length; // 0..1
    // Stability score: lower relative std dev + fewer jumps = higher score
    const relStd   = avgMove > 0 ? stdDev / avgMove : 0;
    const score    = Math.max(0, Math.min(100, 100 - (relStd * 40) - (jumpFreq * 300)));
    return { avgMove, stdDev, jumpFreq, jumps, sampleSize: moves.length, score: Math.round(score) };
}
function generateOnlyUpsDownsSignal(symbol) {
    const mm = marketMemory[symbol];

    if (!mm || !mm.prices || mm.prices.length < 40) {
        return null;
    }

    const prices = mm.prices
        .map(Number)
        .filter(Number.isFinite);

    if (prices.length < 40) return null;

    const last = prices.at(-1);

    const rsi = calcRSI(prices, 14);
    const bb = calcBollingerBands(prices, 20, 2);
    const atr = calcATR(prices, 14);
    const adx = calcADX(prices, 14);

    if (rsi === null || !bb) return null;

    const last5 = prices.slice(-5);

    let upMoves = 0;
    let downMoves = 0;

    for (let i = 1; i < last5.length; i++) {
        if (last5[i] > last5[i - 1]) upMoves++;
        if (last5[i] < last5[i - 1]) downMoves++;
    }

    const momentumUp = upMoves / Math.max(1, last5.length - 1);
    const momentumDown = downMoves / Math.max(1, last5.length - 1);

    const aboveMiddle = last > bb.middle;
    const belowMiddle = last < bb.middle;

    const bandWidth = Number(bb.bandwidth) || 0;
    const expanding = bandWidth >= 0.08;

    let upScore = 0;
    let downScore = 0;

    // RSI
    if (rsi >= 50 && rsi <= 68) upScore += 20;
    if (rsi >= 32 && rsi <= 50) downScore += 20;

    // Bollinger middle
    if (aboveMiddle) upScore += 20;
    if (belowMiddle) downScore += 20;

    // Short momentum
    upScore += momentumUp * 25;
    downScore += momentumDown * 25;

    // Trend strength
    if (adx !== null) {
        if (adx >= 18) {
            if (momentumUp > momentumDown) upScore += 12;
            if (momentumDown > momentumUp) downScore += 12;
        }
    }

    // Band expansion
    if (expanding) {
        upScore += 5;
        downScore += 5;
    }

    const stability = calcTickStability(prices);

    if (stability && stability.score >= 60) {
        upScore += 3;
        downScore += 3;
    }

    // --------------------------------------------------------
    // ONLY UPS
    // --------------------------------------------------------
    if (
        upScore >= 68 &&
        upScore > downScore + 8 &&
        rsi >= 48 &&
        rsi <= 68 &&
        aboveMiddle &&
        momentumUp >= 0.60
    ) {
        return {
            direction: 'Only Ups',
            botDirection: 'ups',
            type: 'only_ups_downs',
            confidence: Math.min(90, Math.round(upScore)),
            ticks: momentumUp >= 0.75 ? 2 : 3,
            rsi,
            adx,
            atr,
            bb,
            lastPrice: last,
            reason:
                `Bullish setup | RSI ${rsi} | ` +
                `Up momentum ${(momentumUp * 100).toFixed(0)}% | ` +
                `Price above BB middle`,
            color: 'var(--green)',
            pred: null
        };
    }

    // --------------------------------------------------------
    // ONLY DOWNS
    // --------------------------------------------------------
    if (
        downScore >= 68 &&
        downScore > upScore + 8 &&
        rsi >= 32 &&
        rsi <= 52 &&
        belowMiddle &&
        momentumDown >= 0.60
    ) {
        return {
            direction: 'Only Downs',
            botDirection: 'downs',
            type: 'only_ups_downs',
            confidence: Math.min(90, Math.round(downScore)),
            ticks: momentumDown >= 0.75 ? 2 : 3,
            rsi,
            adx,
            atr,
            bb,
            lastPrice: last,
            reason:
                `Bearish setup | RSI ${rsi} | ` +
                `Down momentum ${(momentumDown * 100).toFixed(0)}% | ` +
                `Price below BB middle`,
            color: 'var(--red)',
            pred: null
        };
    }

    return null;
}

// ================================================================
// PROFESSIONAL TRADING STRATEGIES
// Based on digit bar analysis (Red/Yellow/Green/Blue)
// ================================================================
function analyzeStrategies(symbol) {
    const data = digitData[symbol];
    const mm = marketMemory[symbol];

    if (!data || data.ticks < 100) return [];

    const counts = data.counts || Array(10).fill(0);
    const total = Math.max(
        counts.reduce((a, b) => a + b, 0),
        data.ticks,
        1
    );

    const pcts = counts.map(c => (c / total) * 100);

    const ranked = pcts
        .map((p, d) => ({ d, p }))
        .sort((a, b) => b.p - a.p);

    const green = ranked[0];
    const blue = ranked[1];
    const yellow = ranked[8];
    const red = ranked[9];

    const recent = mm?.digits?.slice(-10) || [];
    const signals = [];

    // --------------------------------------------------------
    // OVER 3
    // --------------------------------------------------------
    const low = [0, 1, 2, 3];
    const high = [4, 5, 6, 7, 8, 9];

    const lowWeak = low.every(d => pcts[d] < 10);
    const highStrong = high.filter(d => pcts[d] >= 11);

    if (
        lowWeak &&
        highStrong.length >= 2 &&
        high.includes(green.d) &&
        high.includes(blue.d)
    ) {
        signals.push({
            strategy: 'OVER 1,2,3',
            direction: 'Over 3',
            type: 'over_under',
            botDirection: 'over',
            pred: 3,
            confidence: Math.min(
                90,
                65 + highStrong.length * 3
            ),
            color: 'var(--blue)',
            reason:
                `Digits 0-3 below 10% | ` +
                `${highStrong.length} high digits at 11%+`,
            entryHint:
                'Wait for confirmation before entering Over 3',
            priority: true
        });
    }

    // --------------------------------------------------------
    // UNDER 6
    // --------------------------------------------------------
    const highWeak = [6, 7, 8, 9].every(d => pcts[d] < 10);
    const lowStrong = [0, 1, 2, 3, 4, 5]
        .filter(d => pcts[d] >= 11);

    if (
        highWeak &&
        lowStrong.length >= 2 &&
        [0,1,2,3,4,5].includes(green.d) &&
        [0,1,2,3,4,5].includes(blue.d)
    ) {
        signals.push({
            strategy: 'UNDER 8,7,6',
            direction: 'Under 6',
            type: 'over_under',
            botDirection: 'under',
            pred: 6,
            confidence: Math.min(
                90,
                65 + lowStrong.length * 3
            ),
            color: 'var(--purple)',
            reason:
                `Digits 6-9 below 10% | ` +
                `${lowStrong.length} low digits at 11%+`,
            entryHint:
                'Wait for confirmation before entering Under 6',
            priority: true
        });
    }

    // --------------------------------------------------------
    // ODD
    // --------------------------------------------------------
    const odd = [1,3,5,7,9];
    const even = [0,2,4,6,8];

    const oddStrong =
        odd.includes(green.d) &&
        odd.includes(blue.d) &&
        green.p >= 11 &&
        blue.p >= 11;

    const evenWeak =
        even.includes(red.d) &&
        even.includes(yellow.d) &&
        red.p <= 9.5 &&
        yellow.p <= 9.5;

    if (oddStrong && evenWeak) {

        let consecutiveOdd = 0;
        let maxOdd = 0;

        recent.forEach(d => {
            if (odd.includes(d)) {
                consecutiveOdd++;
                maxOdd = Math.max(maxOdd, consecutiveOdd);
            } else {
                consecutiveOdd = 0;
            }
        });

        const triggered = maxOdd >= 2;

        signals.push({
            strategy: 'ODD STRATEGY',
            direction: 'Odd Only',
            type: 'even_odd',
            botDirection: 'odd',
            pred: null,
            confidence: Math.min(
                90,
                68 + (triggered ? 10 : 0)
            ),
            color: 'var(--teal)',
            reason:
                `Top digits are odd | ` +
                `weak digits are even | ` +
                `${triggered ? 'trigger confirmed' : 'waiting for trigger'}`,
            entryHint: triggered
                ? 'ENTER CONDITION DETECTED - verify before trading'
                : 'Wait for 2 consecutive odd digits',
            priority: triggered,
            warning: 'Re-check conditions after several trades'
        });
    }

    // --------------------------------------------------------
    // EVEN
    // --------------------------------------------------------
    const evenStrong =
        even.includes(green.d) &&
        even.includes(blue.d) &&
        green.p >= 11 &&
        blue.p >= 11;

    const oddWeak =
        odd.includes(red.d) &&
        odd.includes(yellow.d) &&
        red.p <= 9.5 &&
        yellow.p <= 9.5;

    if (evenStrong && oddWeak) {

        let triggered = false;

        for (let i = 0; i < recent.length - 1; i++) {
            if (odd.includes(recent[i])) {
                const next = recent.slice(i + 1, i + 4);

                if (next.some(d => even.includes(d))) {
                    triggered = true;
                    break;
                }
            }
        }

        signals.push({
            strategy: 'EVEN STRATEGY',
            direction: 'Even Only',
            type: 'even_odd',
            botDirection: 'even',
            pred: null,
            confidence: Math.min(
                90,
                68 + (triggered ? 10 : 0)
            ),
            color: 'var(--green)',
            reason:
                `Top digits are even | ` +
                `weak digits are odd | ` +
                `${triggered ? 'trigger confirmed' : 'waiting for trigger'}`,
            entryHint: triggered
                ? 'ENTRY CONDITION DETECTED - verify before trading'
                : 'Wait for odd digit followed by even digit',
            priority: triggered,
            warning: 'Re-check conditions after several trades'
        });
    }

    signals.sort((a, b) => {
        if (a.priority && !b.priority) return -1;
        if (!a.priority && b.priority) return 1;
        return b.confidence - a.confidence;
    });

    return signals;
}

// Return top N signals for a symbol (used by scanner tab)
function getTopSignals(symbol, n = 5) {
    const data = digitData[symbol];

    if (!data || data.ticks < 50) return [];

    const signals = [];
    const counts = data.counts || Array(10).fill(0);
    const total = Math.max(
        counts.reduce((a, b) => a + b, 0),
        data.ticks,
        1
    );

    const evenCount = counts.reduce(
        (sum, c, d) => sum + (d % 2 === 0 ? c : 0),
        0
    );

    const evenPct = (evenCount / total) * 100;
    const oddPct = 100 - evenPct;

    if (evenPct >= 53) {
        signals.push({
            direction: 'Even Only',
            confidence: Math.min(92, Math.round(50 + (evenPct - 50) * 1.2)),
            type: 'even_odd',
            botDirection: 'even',
            color: 'var(--green)',
            pred: null,
            reason: `Even ${evenPct.toFixed(1)}% of ${total} ticks`
        });
    }

    if (oddPct >= 53) {
        signals.push({
            direction: 'Odd Only',
            confidence: Math.min(92, Math.round(50 + (oddPct - 50) * 1.2)),
            type: 'even_odd',
            botDirection: 'odd',
            color: 'var(--teal)',
            pred: null,
            reason: `Odd ${oddPct.toFixed(1)}% of ${total} ticks`
        });
    }

    for (let b = 0; b <= 9; b++) {

        const over =
            counts.slice(b + 1).reduce((a, c) => a + c, 0) /
            total * 100;

        const under =
            counts.slice(0, b).reduce((a, c) => a + c, 0) /
            total * 100;

        if (b < 9 && over >= 55 && over <= 84) {
            signals.push({
                direction: `Over ${b}`,
                confidence: Math.min(
                    88,
                    Math.round(50 + (over - 50) * 1.15)
                ),
                type: 'over_under',
                botDirection: 'over',
                color: 'var(--blue)',
                pred: b,
                reason: `${over.toFixed(1)}% of historical digits are above ${b}`
            });
        }

        if (b > 0 && under >= 55 && under <= 84) {
            signals.push({
                direction: `Under ${b}`,
                confidence: Math.min(
                    88,
                    Math.round(50 + (under - 50) * 1.15)
                ),
                type: 'over_under',
                botDirection: 'under',
                color: 'var(--purple)',
                pred: b,
                reason: `${under.toFixed(1)}% of historical digits are below ${b}`
            });
        }
    }

    const ranked = counts
        .map((c, d) => ({
            d,
            pct: c / total * 100
        }))
        .sort((a, b) => b.pct - a.pct);

    ranked.slice(0, 3).forEach(x => {
        if (x.pct >= 12) {
            signals.push({
                direction: `Matches ${x.d}`,
                confidence: Math.min(
                    86,
                    Math.round(50 + (x.pct - 10) * 2)
                ),
                type: 'matches',
                botDirection: 'matches',
                color: 'var(--amber)',
                pred: x.d,
                reason: `Digit ${x.d} appears ${x.pct.toFixed(1)}%`
            });
        }
    });

    // Add professional strategies
    analyzeStrategies(symbol).forEach(s => {
        signals.push({
            ...s,
            strategy: s.strategy || 'Professional Strategy'
        });
    });

    // Add Only Ups / Downs when enough price data exists
    const directional = generateOnlyUpsDownsSignal(symbol);

    if (directional) {
        signals.push(directional);
    }

    signals.sort((a, b) => b.confidence - a.confidence);

    return signals.slice(0, Math.max(1, n));
}

function runAIScan() {
    const mkt = document.getElementById('bot-market')?.value || 'R_10';
    const sig = generateSignal(mkt);
    updateAIPanel(sig, mkt);
}

function startAILoop() {
    // Run AI analysis every 30 seconds
    setInterval(() => {
        if (!derivWS || derivWS.readyState !== WebSocket.OPEN) return;
        const mkt = document.getElementById('bot-market')?.value || 'R_10';
        const sig = generateSignal(mkt);
        updateAIPanel(sig, mkt);

        // AI auto-update Ã¢â‚¬â€ ONLY for even_odd and rise_fall types
        // NEVER auto-change direction for over_under (user must set barrier+direction manually)
        if (aiAutoEnabled && isBotRunning && sig && sig.confidence >= 75) {
            const currentType = document.getElementById('bot-type')?.value || 'over_under';
            const validDirs   = Object.keys(CONTRACT_MAP[currentType] || {});

            // Skip auto-update for over_under Ã¢â‚¬â€ direction+barrier must be set by user
            if (currentType === 'over_under') {
                log(`Ã°Å¸Â§Â  AI signal: ${sig.direction} (${sig.confidence}%) Ã¢â‚¬â€ over/under direction locked by user`, 'd');
            }
            else if (sig.type === currentType && validDirs.includes(sig.botDirection)) {
                const oldDir = botDirection;
                botDirection = sig.botDirection;
                if (botDirection !== oldDir) {
                    log(`Ã°Å¸Â§Â  AI updated direction: ${oldDir.toUpperCase()} Ã¢â€ â€™ ${botDirection.toUpperCase()} (${sig.confidence}% confidence)`, 'i');
                    renderDirButtons();
                    updateInfoBar();
                }
            }
        }

        // Notify on strong signals Ã¢â‚¬â€ show top 3
        const topSigsForNotif = getTopSignals(mkt, 3);
        topSigsForNotif.forEach(s => {
            if (s.confidence >= 78) {
                const key = `${mkt}-${s.direction}-${Math.floor(Date.now()/90000)}`;
                if (!seenSignals.has(key)) {
                    seenSignals.add(key);
                    notify(`Ã°Å¸Â§Â  ${MKT[mkt]||mkt}`, `${s.direction} | ${s.confidence}% confidence\n${s.reason}`, 'ok');
                    addSignalHistory(s);
                }
            }
        });
    }, 30000);

    // Initial scan after 2 seconds
    setTimeout(runAIScan, 2000);
}

function updateAIPanel(sig, symbol) {
    const data    = digitData[symbol] || { counts: new Array(10).fill(0), ticks: 0 };
    const topSigs = getTopSignals(symbol, 5);

    // Confidence meter Ã¢â‚¬â€ best signal
    const confVal = document.getElementById('ai-confidence-val');
    const confBar = document.getElementById('ai-conf-bar');
    const confLbl = document.getElementById('ai-conf-label');

    if (sig) {
        const col = sig.confidence >= 75 ? 'var(--teal)' : sig.confidence >= 60 ? 'var(--amber)' : 'var(--red)';
        if (confVal) { confVal.textContent = `${sig.confidence}%`; confVal.style.color = col; }
        if (confBar) { confBar.style.width = `${sig.confidence}%`; confBar.style.background = col; }
        if (confLbl) confLbl.textContent = sig.confidence >= 75 ? 'Ã°Å¸â€Â¥ High probability setup' : sig.confidence >= 60 ? 'Ã¢Å¡Â¡ Moderate setup' : 'Ã°Å¸â€œâ€° Weak signal';

        const st = document.getElementById('ai-signal-text');
        const sd = document.getElementById('ai-signal-detail');
        if (st) { st.textContent = sig.direction; st.style.color = sig.color || 'var(--teal)'; }
        if (sd) sd.textContent = `${sig.reason}${sig.hotDigit !== undefined ? ' | Hot: ' + sig.hotDigit + ' Cold: ' + sig.coldDigit : ''}`;
    } else {
        if (confVal) { confVal.textContent = 'Ã¢â‚¬â€%'; confVal.style.color = 'var(--muted)'; }
        if (confBar) confBar.style.width = '0%';
        if (confLbl) confLbl.textContent = data.ticks < 50 ? `Collecting... (${data.ticks}/50 ticks)` : 'No strong signal';
        const st = document.getElementById('ai-signal-text');
        if (st) { st.textContent = 'No clear signal'; st.style.color = 'var(--muted)'; }
    }

    // Market state
    const state = classifyMarket(symbol);
    const ms = document.getElementById('ai-market-state');
    const md = document.getElementById('ai-market-detail');
    if (ms) ms.textContent = state.label;
    if (md) md.textContent = `${data.ticks} ticks | Even: ${sig?.evenPct || 'Ã¢â‚¬â€'}%`;

    // Show ALL top signals in sidebar
    const sigBox = document.getElementById('ai-signal-box');
    if (sigBox && topSigs.length > 0) {
        const sigsHtml = topSigs.map((s, i) => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:5px 8px;
                        background:var(--bg3);border-radius:6px;margin-bottom:4px;cursor:pointer;
                        border-left:3px solid ${s.color};"
                 onclick="applySignalToBot(${JSON.stringify(s).replace(/"/g,'&quot;')})">
                <div>
                    <div style="font-size:11px;font-weight:900;color:${s.color};">${s.direction}</div>
                    <div style="font-size:9px;color:var(--muted);">${s.reason}</div>
                </div>
                <div style="text-align:right;flex-shrink:0;margin-left:8px;">
                    <div style="font-size:12px;font-weight:900;color:${s.color};">${s.confidence}%</div>
                    <div style="font-size:9px;color:var(--teal);">Apply Ã¢â€“Â¶</div>
                </div>
            </div>`).join('');

        sigBox.innerHTML = `
            <div style="font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;margin-bottom:8px;">
                Top Signals Ã¢â‚¬â€ ${MKT[symbol]||symbol}
            </div>
            ${sigsHtml}
            ${data.ticks < 50 ? `<div style="font-size:10px;color:var(--dim);text-align:center;padding:8px;">Loading... ${data.ticks}/50 ticks</div>` : ''}`;
    }
}

function updateAIMini(symbol) {
    const data = digitData[symbol];
    if (!data) return;
    const counts = data.counts;
    const total  = Math.max(data.ticks, 1);
    const ranked = counts.map((c,d)=>({d,c})).sort((a,b)=>b.c-a.c);

    const el = document.getElementById('ai-digit-mini');
    if (!el) return;
    el.innerHTML = '';

    counts.forEach((count, digit) => {
        const pct  = ((count/total)*100).toFixed(0);
        const rank = ranked.findIndex(r => r.d === digit);
        const col  = rank===0?'var(--green)':rank===9?'var(--red)':'var(--muted)';
        const span = document.createElement('div');
        span.style.cssText = `text-align:center;width:22px;`;
        span.innerHTML = `<div style="font-size:9px;font-weight:700;color:${col};">${digit}</div><div style="font-size:8px;color:var(--dim);">${pct}%</div>`;
        el.appendChild(span);
    });
}
function classifyMarket(symbol) {
    const data = digitData[symbol];
    const mm = marketMemory[symbol];

    if (!data || data.ticks < 50) {
        return {
            symbol,
            name: MKT[symbol] || symbol,
            class: 'warming',
            label: 'Warming Up',
            score: 0,
            confidence: 0,
            reason: 'Waiting for sufficient tick data'
        };
    }

    const counts = data.counts || Array(10).fill(0);

    const total = Math.max(
        counts.reduce((a, b) => a + b, 0),
        data.ticks,
        1
    );

    const pcts = counts.map(c => c / total * 100);

    const maxPct = Math.max(...pcts);
    const minPct = Math.min(...pcts);

    const spread = maxPct - minPct;

    let even = 0;

    counts.forEach((c, d) => {
        if (d % 2 === 0) even += c;
    });

    const evenPct = even / total * 100;

    let trend = 'neutral';
    let trendScore = 0;

    if (mm?.prices?.length >= 20) {
        const prices = mm.prices.slice(-20).map(Number);

        let up = 0;
        let down = 0;

        for (let i = 1; i < prices.length; i++) {
            if (prices[i] > prices[i - 1]) up++;
            else if (prices[i] < prices[i - 1]) down++;
        }

        if (up > down + 3) {
            trend = 'bullish';
            trendScore = Math.round(up / Math.max(1, up + down) * 100);
        }
        else if (down > up + 3) {
            trend = 'bearish';
            trendScore = Math.round(down / Math.max(1, up + down) * 100);
        }
    }

    let marketClass = 'balanced';
    let label = 'Balanced';

    if (spread >= 6) {
        marketClass = 'biased';
        label = 'Digit Biased';
    }

    if (trend === 'bullish' && trendScore >= 62) {
        marketClass = 'bullish';
        label = 'Bullish Trend';
    }

    if (trend === 'bearish' && trendScore >= 62) {
        marketClass = 'bearish';
        label = 'Bearish Trend';
    }

    if (spread < 3 && Math.abs(evenPct - 50) < 3) {
        marketClass = 'neutral';
        label = 'Neutral';
    }

    const score = Math.round(
        Math.min(
            100,
            Math.max(
                0,
                50 +
                Math.min(25, spread * 3) +
                (Math.abs(evenPct - 50) * 1.5) +
                (trendScore >= 62 ? 10 : 0)
            )
        )
    );

    return {
        symbol,
        name: MKT[symbol] || symbol,
        class: marketClass,
        label,
        score,
        confidence: score,
        trend,
        trendScore,
        evenPct: Number(evenPct.toFixed(1)),
        digitSpread: Number(spread.toFixed(2)),
        hotDigit: pcts.indexOf(maxPct),
        coldDigit: pcts.indexOf(minPct),
        reason:
            `${label} | digit spread ${spread.toFixed(1)}% | ` +
            `even ${evenPct.toFixed(1)}% | trend ${trend}`
    };
}

function addSignalHistory(sig) {
    signalHistory.unshift({ ...sig, time: new Date().toLocaleTimeString() });
    if (signalHistory.length > 15) signalHistory.pop();

    const el = document.getElementById('ai-signal-history');
    if (!el) return;
    el.innerHTML = '';
    signalHistory.slice(0,6).forEach(s => {
        const row = document.createElement('div');
        row.style.cssText = 'background:var(--bg2);border:1px solid var(--border);border-radius:6px;padding:6px 8px;font-size:10px;';
        row.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <span style="color:${s.color||'var(--teal)'};font-weight:700;">${s.direction}</span>
                <span class="badge badge-teal">${s.confidence}%</span>
            </div>
            <div style="color:var(--muted);margin-top:2px;display:flex;justify-content:space-between;">
                <span>${s.reason || s.label || ''}</span>
                <span style="color:var(--dim);">${s.time || ''}</span>
            </div>`;
        el.appendChild(row);
    });
}

// ================================================================
// AI SCANNER TAB Ã¢â‚¬â€ all markets
// ================================================================
function runFullScan() {
    const container = document.getElementById('scan-results');
    const bestBox   = document.getElementById('best-signal-content');
    if (!container) return;

    // Subscribe to all markets
    ALL_MKTS.forEach(sym => subscribeDigitFeed(sym));

    // Build results with ALL signals per market
    const results = ALL_MKTS.map(sym => ({
        sym,
        signal:     generateSignal(sym),
        topSignals: getTopSignals(sym, 4),
        data:       digitData[sym] || { ticks: 0 },
        state:      classifyMarket(sym)
    })).sort((a,b) => (b.signal?.confidence||0) - (a.signal?.confidence||0));

    // Ã¢â€â‚¬Ã¢â€â‚¬ Strategy signals box (priority) Ã¢â€â‚¬Ã¢â€â‚¬
    // Scan all markets for professional strategy conditions
    const allStrategySignals = [];
    ALL_MKTS.forEach(sym => {
        const strats = analyzeStrategies(sym);
        strats.forEach(s => { s.symbol = sym; s.label = MKT[sym]||sym; allStrategySignals.push(s); });
    });
    allStrategySignals.sort((a,b) => {
        if (a.priority && !b.priority) return -1;
        if (!a.priority && b.priority) return 1;
        return b.confidence - a.confidence;
    });

    // Show strategy signals panel if any found
    const stratBox = document.getElementById('best-signal-box');
    if (stratBox && allStrategySignals.length > 0) {
        const topStrat = allStrategySignals[0];
        const stratHtml = allStrategySignals.slice(0,4).map(s => `
            <div style="background:var(--bg3);border:1px solid ${s.priority?'var(--teal)':'var(--border)'};border-radius:8px;padding:10px;margin-bottom:6px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                    <div>
                        <span style="font-size:11px;font-weight:900;color:${s.color};">${s.strategy}</span>
                        ${s.priority ? '<span style="background:#00d2c822;color:var(--teal);font-size:9px;font-weight:700;padding:2px 6px;border-radius:4px;margin-left:6px;">Ã¢Å“â€¦ TRIGGERED</span>' : '<span style="background:#f59e0b22;color:#f59e0b;font-size:9px;font-weight:700;padding:2px 6px;border-radius:4px;margin-left:6px;">Ã¢ÂÂ³ WATCHING</span>'}
                    </div>
                    <span style="font-size:11px;font-weight:900;color:var(--teal);">${s.confidence}%</span>
                </div>
                <div style="font-size:12px;font-weight:900;color:${s.color};margin-bottom:3px;">${s.direction} Ã¢â‚¬â€ ${s.label}</div>
                <div style="font-size:10px;color:var(--muted);margin-bottom:4px;">${s.reason}</div>
                <div style="font-size:10px;color:var(--teal);font-style:italic;margin-bottom:6px;">Ã°Å¸â€™Â¡ ${s.entryHint}</div>
                ${s.warning ? `<div style="font-size:9px;color:#f59e0b;">Ã¢Å¡Â Ã¯Â¸Â ${s.warning}</div>` : ''}
                <div style="display:flex;gap:6px;margin-top:4px;">
                    <button onclick="applySignalToBot(${JSON.stringify(s).replace(/"/g,'&quot;')})"
                        style="flex:1;background:var(--teal);color:#000;border:none;border-radius:6px;padding:5px 8px;font-size:10px;font-weight:700;cursor:pointer;">
                        Ã¢Å“â€¦ Apply to Bot
                    </button>
                    <button onclick="applySignalToBulk(${JSON.stringify(s).replace(/"/g,'&quot;')})"
                        style="flex:1;background:var(--bg2);color:var(--teal);border:1px solid var(--teal);border-radius:6px;padding:5px 8px;font-size:10px;font-weight:700;cursor:pointer;">
                        Ã°Å¸â€œÂ¦ Use in Bulk
                    </button>
                </div>
            </div>`).join('');

        stratBox.innerHTML = `
            <div style="font-size:10px;font-weight:900;color:var(--teal);text-transform:uppercase;margin-bottom:10px;">Ã°Å¸Å½Â¯ Professional Strategy Signals</div>
            ${stratHtml}
            ${allStrategySignals.length === 0 ? '<div style="color:var(--muted);font-size:12px;">No strategy conditions met yet. Markets need more data.</div>' : ''}`;
    } else if (stratBox) {
        stratBox.innerHTML = `<div style="font-size:10px;font-weight:900;color:var(--teal);text-transform:uppercase;margin-bottom:8px;">Ã°Å¸Å½Â¯ Professional Strategy Signals</div>
            <div style="color:var(--muted);font-size:12px;padding:10px 0;">Analyzing market conditions... Strategies need 100+ ticks per market.</div>`;
    }

    // Ã¢â€â‚¬Ã¢â€â‚¬ Best opportunity box Ã¢â€â‚¬Ã¢â€â‚¬
    const best = results[0];
    if (bestBox) {
        if (best.signal && best.signal.confidence > 0) {
            const topSigs = best.topSignals || [];
            const sigsHtml = topSigs.map(s => `
                <div style="display:flex;align-items:center;justify-content:space-between;padding:5px 8px;background:var(--bg3);border-radius:6px;cursor:pointer;"
                     onclick="applySignalToBot(${JSON.stringify(s).replace(/"/g,'&quot;')})">
                    <span style="font-size:12px;font-weight:700;color:${s.color};">${s.direction}</span>
                    <div style="display:flex;align-items:center;gap:6px;">
                        <span style="font-size:10px;color:var(--muted);">${s.confidence}%</span>
                        <span style="font-size:10px;background:${s.color}22;color:${s.color};padding:2px 6px;border-radius:4px;font-weight:700;">Apply</span>
                    </div>
                </div>`).join('');

            bestBox.innerHTML = `
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
                    <div>
                        <div style="font-size:13px;font-weight:900;color:var(--text);">Ã°Å¸Â¥â€¡ ${best.signal.label}</div>
                        <div style="font-size:10px;color:var(--muted);margin-top:2px;">${best.state.label} | ${best.signal.totalTicks} real ticks</div>
                    </div>
                    <span class="badge badge-teal" style="font-size:12px;padding:4px 10px;">${best.signal.confidence}%</span>
                </div>
                <div style="font-size:15px;font-weight:900;color:${best.signal.color};margin-bottom:6px;">${best.signal.direction}</div>
                <div style="font-size:11px;color:var(--muted);margin-bottom:6px;">${best.signal.reason}${best.signal.hotDigit !== undefined ? ` | Hot: <b style="color:var(--green);">${best.signal.hotDigit}</b> Cold: <b style="color:var(--red);">${best.signal.coldDigit}</b>` : ''}</div>
                ${best.signal.rsi ? `
                <div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap;">
                    <div style="background:#4299e122;border:1px solid #4299e144;border-radius:8px;padding:8px 12px;text-align:center;">
                        <div style="font-size:9px;color:#60a5fa;font-weight:700;margin-bottom:2px;">RSI</div>
                        <div style="font-size:18px;font-weight:900;color:#60a5fa;">${best.signal.rsi}</div>
                        <div style="font-size:9px;color:var(--muted);">${best.signal.rsi > 70 ? 'Overbought' : best.signal.rsi < 30 ? 'Oversold' : best.signal.rsi > 50 ? 'Bullish' : 'Bearish'}</div>
                    </div>
                    ${best.signal.bb ? `
                    <div style="background:#9f7aea22;border:1px solid #9f7aea44;border-radius:8px;padding:8px 12px;text-align:center;">
                        <div style="font-size:9px;color:#c4b5fd;font-weight:700;margin-bottom:2px;">BB Width</div>
                        <div style="font-size:18px;font-weight:900;color:#c4b5fd;">${best.signal.bb.bandwidth}%</div>
                        <div style="font-size:9px;color:var(--muted);">${best.signal.bb.bandwidth > 0.2 ? 'Expanding' : 'Squeezing'}</div>
                    </div>
                    <div style="background:#00d2c822;border:1px solid #00d2c844;border-radius:8px;padding:8px 12px;text-align:center;">
                        <div style="font-size:9px;color:var(--teal);font-weight:700;margin-bottom:2px;">Duration</div>
                        <div style="font-size:18px;font-weight:900;color:var(--teal);">${best.signal.ticks || 3}</div>
                        <div style="font-size:9px;color:var(--muted);">Ticks</div>
                    </div>` : ''}
                </div>` : ''}
                ${topSigs.length > 1 ? `<div style="font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;margin-bottom:6px;">All Signals for this market:</div><div style="display:flex;flex-direction:column;gap:4px;">${sigsHtml}</div>` : ''}
                <div style="display:flex;gap:8px;margin-top:12px;">
                    <button onclick="applyBestSignal()" class="btn btn-teal" style="flex:1;padding:8px 20px;font-size:12px;">Ã¢Å“â€¦ Apply Best Signal to Bot</button>
                    <button onclick="applyBestSignalToBulk()" class="btn btn-ghost" style="flex:1;padding:8px 20px;font-size:12px;border:1px solid var(--teal);color:var(--teal);">Ã°Å¸â€œÂ¦ Use in Bulk Trading</button>
                </div>`;
        } else {
            bestBox.innerHTML = '<div style="color:var(--muted);font-size:12px;">Loading tick data... Each market needs 50+ ticks. Please wait.</div>';
        }
    }

    // Ã¢â€â‚¬Ã¢â€â‚¬ All markets grid Ã¢â€â‚¬Ã¢â€â‚¬
    container.innerHTML = '';
    results.forEach((r, idx) => {
        const sig      = r.signal;
        const topSigs  = r.topSignals || [];
        const color    = sig ? (sig.color || 'var(--teal)') : 'var(--border)';
        const medals   = ['Ã°Å¸Â¥â€¡','Ã°Å¸Â¥Ë†','Ã°Å¸Â¥â€°'];

        const card = document.createElement('div');
        card.className = 'scanner-signal' + (sig && sig.confidence >= 75 ? ' strong' : sig && sig.confidence >= 60 ? ' medium' : '');
        card.style.borderColor = color;

        // Build mini signal list
        const miniSigs = topSigs.slice(0,3).map(s =>
            `<div style="display:flex;justify-content:space-between;align-items:center;padding:3px 0;border-bottom:1px solid var(--border);">
                <span style="font-size:10px;color:${s.color};font-weight:700;">${s.direction}</span>
                <span style="font-size:9px;color:var(--muted);">${s.confidence}%
                    <span onclick="event.stopPropagation();applySignalToBot(${JSON.stringify(s).replace(/"/g,'&quot;')})"
                          style="color:var(--teal);cursor:pointer;margin-left:4px;font-weight:700;">Apply</span>
                </span>
            </div>`
        ).join('');

        card.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
                <div style="display:flex;align-items:center;gap:5px;">
                    <span>${medals[idx] || 'Ã°Å¸â€œÅ '}</span>
                    <span style="font-size:12px;font-weight:900;">${MKT[r.sym]||r.sym}</span>
                </div>
                <div style="display:flex;align-items:center;gap:5px;">
                    ${sig ? `<span class="badge badge-teal" style="font-size:10px;">${sig.confidence}%</span>` : ''}
                    <span style="font-size:9px;color:var(--dim);">${r.data.ticks}t</span>
                </div>
            </div>
            <div style="font-size:13px;font-weight:900;color:${color};margin-bottom:4px;">${sig ? sig.direction : 'Collecting data...'}</div>
            <div style="font-size:9px;color:var(--muted);margin-bottom:6px;">${r.state.label}${sig ? ' | ' + sig.reason : ''}</div>
            ${miniSigs ? `<div style="margin-top:4px;">${miniSigs}</div>` : ''}`;

        card.onclick = () => { if (sig) applySignalToBot(sig); };
        container.appendChild(card);
    });
}

function applyBestSignal() {
    const results = ALL_MKTS.map(sym => ({
        sym, signal: generateSignal(sym)
    })).sort((a,b) => (b.signal?.confidence||0) - (a.signal?.confidence||0));
    if (results[0]?.signal) applySignalToBot(results[0].signal);
}

function applySignalToBot(sig) {
    if (!sig) return;

    // Parse if passed as string from onclick
    if (typeof sig === 'string') {
        try { sig = JSON.parse(sig); } catch(e) { return; }
    }

    const mktSel  = document.getElementById('bot-market');
    const typeSel = document.getElementById('bot-type');
    const predEl  = document.getElementById('bot-pred');
    const durEl   = document.getElementById('bot-dur');

    // Apply market if signal has one
    if (sig.symbol && mktSel) mktSel.value = sig.symbol;

    // Apply trade type
    if (typeSel) { typeSel.value = sig.type; onTypeChange(); }

    // Apply direction
    selectDir(sig.botDirection);

    // Apply prediction/barrier value for over_under
    if (sig.pred !== null && sig.pred !== undefined && predEl) {
        predEl.value = sig.pred;
    }

    // Apply ticks from signal (BB/RSI sets 2 or 3 for Only Ups/Downs)
    if (sig.ticks && durEl) {
        durEl.value = sig.ticks;
        log(`Ã¢ÂÂ± Duration set to ${sig.ticks} ticks from signal`, 'i');
    }

    updateInfoBar();
    updateActiveBotName();
    log(`Ã°Å¸Â§Â  Applied: ${sig.label||sig.symbol||''} | ${sig.direction} | Pred: ${sig.pred!==null&&sig.pred!==undefined?sig.pred:'Ã¢â‚¬â€'} | ${sig.confidence}%`, 'i');
    notify("AI Signal Applied Ã¢Å“â€¦", `${sig.direction}
Confidence: ${sig.confidence}%${sig.pred!==null&&sig.pred!==undefined?' | Barrier: '+sig.pred:''}`, 'ok');
    switchTab('bot');
    // On mobile, open settings panel so user can review and adjust
    setTimeout(() => {
        const sidebar = document.querySelector('#bot-pane .sidebar');
        if (sidebar && window.innerWidth <= 768) {
            sidebar.classList.add('mobile-open');
            const btn = document.getElementById('mobile-bot-settings-btn');
            if (btn) btn.textContent = 'Ã¢Å“â€¢ Close Settings';
            sidebar.scrollTop = 0;
        }
    }, 300);
}

function updateScannerResults() {
    // Lightweight update of scan results if scanner tab active
    const container = document.getElementById('scan-results');
    if (!container || !container.children.length) return;
    // Full refresh
    runFullScan();
}

// ================================================================
// AI AUTO TOGGLE
// ================================================================
function toggleAIAuto() {
    aiAutoEnabled = !aiAutoEnabled;
    const track = document.getElementById('ai-toggle-track');
    const thumb = document.getElementById('ai-toggle-thumb');
    const badge = document.getElementById('ai-status-badge');
    if (track) track.style.background = aiAutoEnabled ? 'var(--teal)' : 'var(--border)';
    if (thumb) thumb.style.left       = aiAutoEnabled ? '18px' : '3px';
    if (badge) { badge.textContent    = aiAutoEnabled ? 'Ã°Å¸Â§Â  AI Active' : 'Ã°Å¸Â§Â  AI Off'; badge.className = aiAutoEnabled ? 'badge badge-teal' : 'badge badge-amber'; }
    log(`Ã°Å¸Â§Â  AI Auto-Update: ${aiAutoEnabled ? 'ON' : 'OFF'}`, 'i');
}

// ================================================================
// DIGIT STATS TAB
// ================================================================
function changeDigitMarket(symbol) {
    currentDigitMkt = symbol;
    // Data comes from public WS Ã¢â‚¬â€ just update display
    const data = digitData[symbol];
    if (data && data.ticks > 0) {
        renderDigitCircles(symbol);
        updateDigitStats(symbol);
        const lastEl = document.getElementById('d-last');
        const tickEl = document.getElementById('d-ticks');
        if (tickEl) tickEl.textContent = data.ticks;
    } else {
        const c = document.getElementById('d-circles');
        if (c) c.innerHTML = '<div style="font-size:11px;color:var(--dim);padding:10px;">Loading tick data from Deriv... please wait.</div>';
    }
}

function renderDigitCircles(symbol) {
    const circlesEl = document.getElementById('d-circles');
    const barsEl    = document.getElementById('d-bars');
    if (!circlesEl) return;

    const data   = digitData[symbol] || { counts: new Array(10).fill(0), ticks: 0, window: [] };
    const counts = data.counts;
    const total  = Math.max(data.ticks, 1); // real rolling window size
    const pred   = parseInt(document.getElementById('bot-pred')?.value ?? -1);
    const ranked = counts.map((c,d) => ({d,c})).sort((a,b) => b.c - a.c);

    circlesEl.innerHTML = '';
    if (barsEl) barsEl.innerHTML = '';

    counts.forEach((count, digit) => {
        const rank = ranked.findIndex(r => r.d === digit);
        const pct  = ((count / total) * 100).toFixed(1);

        let cls = '';
        if (rank === 0) cls = 'r0';
        else if (rank === 1) cls = 'r1';
        else if (rank === 8) cls = 'r8';
        else if (rank === 9) cls = 'r9';

        const circle = document.createElement('div');
        circle.className = `d-circle ${cls} ${digit === pred ? 'pred' : ''}`;
        circle.title     = `Digit ${digit}: ${count} times (${pct}% of ${total} ticks)`;
        circle.onclick   = () => {
            const p = document.getElementById('bot-pred');
            if (p) { p.value = digit; renderDigitCircles(symbol); log(`Prediction set to: ${digit}`, 'i'); }
        };
        circle.innerHTML = `
            <span style="font-size:19px;font-weight:900;line-height:1;">${digit}</span>
            <span style="font-size:9px;opacity:.8;">${pct}%</span>
            <span style="font-size:8px;color:rgba(255,255,255,.4);">${count}</span>`;
        circlesEl.appendChild(circle);

        // Bar
        if (barsEl) {
            const col  = cls==='r0'?'var(--teal)':cls==='r9'?'var(--red)':'var(--muted)';
            const row  = document.createElement('div');
            row.style.cssText = 'display:flex;align-items:center;gap:8px;font-size:10px;';
            row.innerHTML = `
                <span style="width:14px;text-align:right;font-weight:900;">${digit}</span>
                <div style="flex:1;height:5px;background:var(--border);border-radius:2px;">
                    <div style="height:100%;border-radius:2px;background:${col};width:${pct}%;transition:width .5s;"></div>
                </div>
                <span style="width:36px;text-align:right;font-family:monospace;color:var(--muted);">${pct}%</span>
                <span style="width:28px;text-align:right;font-family:monospace;color:var(--dim);">${count}</span>`;
            barsEl.appendChild(row);
        }
    });

    // Update hot/cold
    const set = (id,v) => { const el=document.getElementById(id); if(el) el.textContent=v; };
    set('d-hot',  ranked[0]?.d ?? 'Ã¢â‚¬â€');
    set('d-cold', ranked[9]?.d ?? 'Ã¢â‚¬â€');
}

function updateDigitStats(symbol) {
    const data   = digitData[symbol] || { counts: new Array(10).fill(0), ticks: 0 };
    const counts = data.counts;
    const total  = Math.max(data.ticks, 1);

    const even     = counts.filter((_,i) => i%2===0).reduce((a,b)=>a+b,0);
    const odd      = total - even;
    const over     = counts.slice(5).reduce((a,b)=>a+b,0);
    const under    = total - over;

    const evenPct  = parseFloat(((even/total)*100).toFixed(1));
    const oddPct   = parseFloat(((odd/total)*100).toFixed(1));
    const overPct  = parseFloat(((over/total)*100).toFixed(1));
    const underPct = parseFloat(((under/total)*100).toFixed(1));

    const set = (id,v) => { const el=document.getElementById(id); if(el) el.textContent=v; };

    // Update text values
    set('d-even',  `${evenPct}%`);
    set('d-odd',   `${oddPct}%`);
    set('d-over',  `${overPct}%`);
    set('d-under', `${underPct}%`);

    // Update Even/Odd bar widths
    const evenBar  = document.getElementById('d-even-bar');
    const oddBar   = document.getElementById('d-odd-bar');
    if (evenBar) evenBar.style.width = `${evenPct}%`;
    if (oddBar)  oddBar.style.width  = `${oddPct}%`;

    // Color the higher side green, lower side red
    if (evenBar && oddBar) {
        if (evenPct > oddPct) {
            evenBar.style.background = 'var(--green)';
            oddBar.style.background  = 'var(--red)';
        } else {
            evenBar.style.background = 'var(--red)';
            oddBar.style.background  = 'var(--green)';
        }
    }

    // Update Over/Under bar widths
    const overBar  = document.getElementById('d-over-bar');
    const underBar = document.getElementById('d-under-bar');
    if (overBar)  overBar.style.width  = `${overPct}%`;
    if (underBar) underBar.style.width = `${underPct}%`;

    if (overBar && underBar) {
        if (overPct > underPct) {
            overBar.style.background  = 'var(--green)';
            underBar.style.background = 'var(--red)';
        } else {
            overBar.style.background  = 'var(--red)';
            underBar.style.background = 'var(--green)';
        }
    }
}

// ================================================================
// CHART TAB
// ================================================================
function loadChart(sym) {
    const f = document.getElementById('chart-frame');
    if (f) f.src = `https://charts.deriv.com/?symbol=${sym}&granularity=60`;
}

// ================================================================
// CONNECTION STATUS
// ================================================================
function updateConnStatus(on) {
    ['status-dot','bar-dot'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.classList.toggle('live', on); }
    });
    ['status-text','bar-status'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.textContent = on ? 'LIVE' : 'OFFLINE'; el.style.color = on ? 'var(--teal)' : 'var(--muted)'; }
    });
}

// ================================================================
// UI HELPERS
// ================================================================
function showStatus(msg, type) {
    const el = document.getElementById('conn-status');
    if (!el) return;
    const colors = { info:'var(--blue)', ok:'var(--teal)', err:'var(--red)' };
    const c = colors[type] || 'var(--muted)';
    el.style.cssText = `display:block;border-color:${c};color:${c};background:${c}14;font-size:11px;padding:10px;border-radius:8px;border:1px solid;margin-top:12px;`;
    el.textContent = msg;
}

function notify(title, body, type = 'info') {
    const container = document.getElementById('notif-wrap');
    if (!container) return;
    const colors = { ok:'var(--teal)', err:'var(--red)', warn:'var(--amber)', info:'var(--blue)' };
    const color  = colors[type] || 'var(--teal)';
    const notif  = document.createElement('div');
    notif.className = `notif ${type==='err'?'err':type==='warn'?'warn':''}`;
    notif.style.borderColor = color;
    notif.innerHTML = `
        <div style="display:flex;justify-content:space-between;gap:8px;">
            <div>
                <div style="font-size:12px;font-weight:900;color:${color};margin-bottom:4px;">${title}</div>
                <div style="font-size:10px;color:var(--muted);white-space:pre-line;line-height:1.4;">${body}</div>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" style="background:none;border:none;color:var(--dim);cursor:pointer;font-size:14px;padding:0;flex-shrink:0;">Ã¢Å“â€¢</button>
        </div>`;
    container.appendChild(notif);
    setTimeout(() => { try { notif.remove(); } catch(e){} }, 8000);
}

function log(text, type='d') {
    const container = document.getElementById('journal-log');
    if (!container) return;
    const line = document.createElement('div');
    line.className = `jline ${type}`;
    line.textContent = `[${new Date().toLocaleTimeString()}] ${text}`;
    container.appendChild(line);
    container.scrollTop = container.scrollHeight;
    if (container.children.length > 500) container.removeChild(container.firstChild);
}

function revokeAccess() {
    // Clear all saved tokens and disconnect
    localStorage.removeItem('bth_access_token');
    localStorage.removeItem('bth_account_id');
    localStorage.removeItem('bth_connected_at');
    sessionStorage.clear();

    // Close WebSocket
    if (derivWS) { derivWS.close(); derivWS = null; }
    if (publicWS) { publicWS.close(); publicWS = null; }

    accessToken = null;
    accountId   = null;
    allAccounts = [];

    // Reset UI
    const btnLogin  = document.getElementById('btn-login');
    const btnSignup = document.getElementById('btn-signup');
    if (btnLogin)  btnLogin.style.display  = 'block';
    if (btnSignup) btnSignup.style.display = 'block';

    const aw = document.getElementById('acct-wrap');
    if (aw) aw.style.display = 'none';

    const authCard = document.getElementById('auth-card');
    if (authCard) authCard.style.display = 'block';

    const ds = document.getElementById('dash-stats');
    if (ds) ds.style.display = 'none';

    updateConnStatus(false);
    switchTab('dashboard');

    notify('Ã¢Å“â€¦ Disconnected', 'Your Deriv account has been disconnected. You can reconnect anytime.', 'ok');
    log('Ã°Å¸â€â€œ Access revoked Ã¢â‚¬â€ token cleared', 'i');
}

function clearJournal() {
    const el = document.getElementById('journal-log');
    if (el) el.innerHTML = '<div class="jline d">[Cleared]</div>';
}

function resetBotStats() {
    totalPL       = 0;
    totalRuns     = 0;
    totalWins     = 0;
    totalLosses   = 0;
    totalStake    = 0;
    totalPayout   = 0;
    currentStreak = 0;
    consecutiveLosses = 0;
    sessionBasePL = 0;
    currentStake  = parseFloat(document.getElementById('bot-stake')?.value || 1);
    baseStake     = currentStake;

    // Clear transaction list
    const txList = document.getElementById('tx-list');
    if (txList) txList.innerHTML = '<div style="font-size:11px;color:var(--dim);text-align:center;padding:30px;">No transactions yet.</div>';

    updateAllStats();
    log('Ã°Å¸â€â€ž Stats reset by user', 'i');
    notify('Ã°Å¸â€â€ž Stats Reset', 'All trading stats have been cleared.', 'ok');
}

function showStrategyGuide() {
    const modal = document.getElementById('strategy-modal');
    if (modal) { modal.style.display = 'flex'; document.body.style.overflow = 'hidden'; }
}

function closeStrategyGuide() {
    const modal = document.getElementById('strategy-modal');
    if (modal) { modal.style.display = 'none'; document.body.style.overflow = ''; }
}

// ================================================================
// LEGAL Ã¢â‚¬â€ Terms, Privacy, Risk Disclaimer
// ================================================================

const LEGAL_CONTENT = {

    terms: {
        title: "Ã°Å¸â€œâ€ž Terms of Service",
        body: `
<h3 style="color:#e2e8f0;font-size:15px;margin-bottom:12px;">Terms of Service</h3>
<p style="margin-bottom:10px;"><b style="color:#e2e8f0;">Effective Date:</b> 1 January 2026</p>

<h4 style="color:#00d2c8;margin:14px 0 6px;">1. Acceptance of Terms</h4>
<p>By accessing or using DOLARHUNTER ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Platform.</p>

<h4 style="color:#00d2c8;margin:14px 0 6px;">2. Description of Service</h4>
<p>DOLARHUNTER is a third-party trading interface that connects to the Deriv API. We provide automated trading tools, market analysis, and AI-powered signals. We are not affiliated with, endorsed by, or part of Deriv Ltd.</p>

<h4 style="color:#00d2c8;margin:14px 0 6px;">3. Eligibility</h4>
<p>You must be at least 18 years old and legally permitted to trade financial instruments in your jurisdiction to use this Platform. It is your responsibility to verify local laws before trading.</p>

<h4 style="color:#00d2c8;margin:14px 0 6px;">4. No Financial Advice</h4>
<p>Nothing on DOLARHUNTER constitutes financial, investment, or trading advice. All AI signals, market analysis, and bot strategies are for informational purposes only. You trade at your own risk.</p>

<h4 style="color:#00d2c8;margin:14px 0 6px;">5. User Responsibilities</h4>
<p>You are solely responsible for:</p>
<ul style="margin:6px 0 6px 20px;">
    <li>All trades executed through your Deriv account</li>
    <li>Setting appropriate risk parameters (stake, stop loss, take profit)</li>
    <li>Ensuring your Deriv account has sufficient funds</li>
    <li>Compliance with applicable laws and regulations</li>
</ul>

<h4 style="color:#00d2c8;margin:14px 0 6px;">6. Limitation of Liability</h4>
<p>DOLARHUNTER, its owners, developers, and affiliates shall not be liable for any trading losses, lost profits, or damages arising from the use of this Platform, including but not limited to losses caused by bot malfunction, API errors, connectivity issues, or market conditions.</p>

<h4 style="color:#00d2c8;margin:14px 0 6px;">7. Modifications</h4>
<p>We reserve the right to modify these Terms at any time. Continued use of the Platform constitutes acceptance of updated Terms.</p>

<h4 style="color:#00d2c8;margin:14px 0 6px;">8. Termination</h4>
<p>We reserve the right to suspend or terminate access to the Platform at our discretion, without notice, for any reason including violation of these Terms.</p>

<h4 style="color:#00d2c8;margin:14px 0 6px;">9. Governing Law</h4>
<p>These Terms are governed by applicable international law. Any disputes shall be resolved through binding arbitration.</p>

<p style="margin-top:16px;color:#4a5568;font-size:11px;">For questions: support@DOLARHUNTER.com</p>`
    },

    privacy: {
        title: "Ã°Å¸â€â€™ Privacy Policy",
        body: `
<h3 style="color:#e2e8f0;font-size:15px;margin-bottom:12px;">Privacy Policy</h3>
<p style="margin-bottom:10px;"><b style="color:#e2e8f0;">Effective Date:</b> 1 January 2026</p>

<h4 style="color:#00d2c8;margin:14px 0 6px;">1. Information We Collect</h4>
<p>DOLARHUNTER does <b style="color:#e2e8f0;">not</b> collect, store, or process your personal data on our servers. All authentication is handled directly between your browser and Deriv's servers via OAuth 2.0 PKCE.</p>
<p style="margin-top:8px;">We do not store:</p>
<ul style="margin:6px 0 6px 20px;">
    <li>Your Deriv account credentials</li>
    <li>Your trading history or account balance</li>
    <li>Personal identification information</li>
    <li>Payment or financial data</li>
</ul>

<h4 style="color:#00d2c8;margin:14px 0 6px;">2. Session Data</h4>
<p>We temporarily store the following in your browser's <b style="color:#e2e8f0;">sessionStorage</b> only during the login process:</p>
<ul style="margin:6px 0 6px 20px;">
    <li>PKCE code verifier (deleted immediately after login)</li>
    <li>OAuth state parameter (deleted immediately after login)</li>
</ul>
<p>This data never leaves your browser and is automatically cleared when you close the tab.</p>

<h4 style="color:#00d2c8;margin:14px 0 6px;">3. Deriv API</h4>
<p>Your trading data is processed directly by Deriv Ltd. through their API. Please review <a href="https://deriv.com/privacy/" target="_blank" style="color:var(--teal);">Deriv's Privacy Policy</a> for information on how they handle your data.</p>

<h4 style="color:#00d2c8;margin:14px 0 6px;">4. Cookies</h4>
<p>DOLARHUNTER does not use cookies or tracking technologies.</p>

<h4 style="color:#00d2c8;margin:14px 0 6px;">5. Third-Party Services</h4>
<p>We use the following third-party services:</p>
<ul style="margin:6px 0 6px 20px;">
    <li><b style="color:#e2e8f0;">Deriv API</b> Ã¢â‚¬â€ for trade execution and market data</li>
    <li><b style="color:#e2e8f0;">Vercel</b> Ã¢â‚¬â€ for hosting (subject to Vercel's privacy policy)</li>
    <li><b style="color:#e2e8f0;">TradingView</b> Ã¢â‚¬â€ for charting widgets</li>
</ul>

<h4 style="color:#00d2c8;margin:14px 0 6px;">6. Affiliate Disclosure</h4>
<p>DOLARHUNTER participates in the Deriv affiliate program. When you create a new Deriv account through our platform, we may receive a commission. This does not affect your trading costs or experience.</p>

<h4 style="color:#00d2c8;margin:14px 0 6px;">7. Contact</h4>
<p>For privacy concerns: <a href="mailto:support@DOLARHUNTER.com" style="color:var(--teal);">support@DOLARHUNTER.com</a></p>`
    },

    risk: {
        title: "Ã¢Å¡Â Ã¯Â¸Â Risk Disclaimer",
        body: `
<div style="background:#ff444f14;border:1px solid #ff444f44;border-radius:8px;padding:14px;margin-bottom:16px;">
    <p style="color:#ff444f;font-weight:700;font-size:14px;">Ã¢Å¡Â Ã¯Â¸Â HIGH RISK WARNING</p>
    <p style="margin-top:6px;">Trading binary options and synthetic indices carries a high level of risk and may not be suitable for all investors. You may lose some or all of your invested capital.</p>
</div>

<h4 style="color:#00d2c8;margin:14px 0 6px;">1. Nature of Risk</h4>
<p>Binary options and CFDs are complex instruments. The majority of retail traders lose money when trading these products. You should consider whether you understand how these instruments work and whether you can afford to take the high risk of losing your money.</p>

<h4 style="color:#00d2c8;margin:14px 0 6px;">2. Automated Trading Risk</h4>
<p>Automated trading bots, including those provided or configured on DOLARHUNTER, carry additional risks:</p>
<ul style="margin:6px 0 6px 20px;">
    <li>Past performance of a bot does NOT guarantee future results</li>
    <li>Bots can malfunction due to connectivity issues, API changes, or software bugs</li>
    <li>Market conditions can change rapidly in ways a bot cannot anticipate</li>
    <li>The Martingale strategy can result in rapid and total loss of capital</li>
    <li>AI signals are based on statistical patterns and are NOT guaranteed</li>
</ul>

<h4 style="color:#00d2c8;margin:14px 0 6px;">3. AI Signal Disclaimer</h4>
<p>AI-generated signals and win probability estimates are based on historical tick data analysis. They are <b style="color:#e2e8f0;">not</b> financial advice and do not guarantee any particular outcome. Confidence percentages represent statistical patterns only and should not be relied upon as predictions.</p>

<h4 style="color:#00d2c8;margin:14px 0 6px;">4. Capital at Risk</h4>
<p>Never trade with money you cannot afford to lose. We strongly recommend:</p>
<ul style="margin:6px 0 6px 20px;">
    <li>Starting with a <b style="color:#e2e8f0;">demo account</b> before trading real money</li>
    <li>Setting strict stop loss limits before running any bot</li>
    <li>Never using borrowed money or funds needed for essential expenses</li>
    <li>Limiting bot stake to a small percentage of your total capital</li>
</ul>

<h4 style="color:#00d2c8;margin:14px 0 6px;">5. Regulatory Notice</h4>
<p>DOLARHUNTER is a third-party tool and is not regulated by any financial authority. Trading through Deriv is subject to Deriv's own regulatory framework. Please ensure trading is legal in your jurisdiction.</p>

<h4 style="color:#00d2c8;margin:14px 0 6px;">6. No Guarantee of Profit</h4>
<p>DOLARHUNTER makes no representation or warranty that use of the platform will result in profits. All trading results depend on market conditions, your settings, and factors beyond our control.</p>

<div style="background:#00d2c814;border:1px solid #00d2c844;border-radius:8px;padding:14px;margin-top:16px;">
    <p style="color:#00d2c8;font-weight:700;">Ã¢Å“â€¦ By using DOLARHUNTER, you confirm that:</p>
    <ul style="margin:8px 0 0 20px;color:#a0aec0;">
        <li>You are 18 years or older</li>
        <li>You understand the risks of binary options trading</li>
        <li>You are trading with money you can afford to lose</li>
        <li>You have read and accepted the Terms of Service</li>
    </ul>
</div>`
    }
};

function showLegal(type) {
    const modal   = document.getElementById('legal-modal');
    const title   = document.getElementById('legal-title');
    const content = document.getElementById('legal-content');
    const data    = LEGAL_CONTENT[type];
    if (!modal || !data) return;
    title.textContent  = data.title;
    content.innerHTML  = data.body;
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeLegal() {
    const modal = document.getElementById('legal-modal');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = '';
}

// Close modal on backdrop click
document.addEventListener('click', (e) => {
    const modal = document.getElementById('legal-modal');
    if (e.target === modal) closeLegal();
});

// Risk disclaimer shown from main load event (no duplicate listener needed)

// ================================================================
// MT5 + ADVANCED PRICE ACTION (APA) ENGINE
// Replaces the old "Coming Soon" / momentum-signal MT5 tab with a real
// multi-timeframe price-action analysis + Deriv MT5 hand-off flow.
//
// HONEST SCOPE NOTE (see chat write-up for the full audit): Deriv's public
// API has no method to place or manage an MT5 order from a browser Ã¢â‚¬â€ MT5
// execution only happens inside the real MT5 terminal. So "Apply to MT5"
// here validates the account, market, and signal, then hands the user a
// ready-to-place trade inside the real MT5 terminal via deep link. It
// never claims a trade was executed, because this app cannot confirm that.
// ================================================================

// Ã¢â€â‚¬Ã¢â€â‚¬ Market configuration: Display name -> Deriv symbol -> MT5 symbol -> category Ã¢â€â‚¬Ã¢â€â‚¬
// `confirmed` markets are ones we're confident exist on Deriv's synthetic
// index list; others are included per your requested market list but are
// validated live against `knownActiveSymbols` (from the real active_symbols
// API response) before ever being shown as tradable Ã¢â‚¬â€ never assumed.
const APA_MARKETS = [
    // Volatility Indices
    { deriv:'R_10',     mt5:'Volatility 10 Index',      display:'Volatility 10 Index',      cat:'volatility',    confirmed:true },
    { deriv:'R_25',     mt5:'Volatility 25 Index',      display:'Volatility 25 Index',      cat:'volatility',    confirmed:true },
    { deriv:'R_50',     mt5:'Volatility 50 Index',      display:'Volatility 50 Index',      cat:'volatility',    confirmed:true },
    { deriv:'R_75',     mt5:'Volatility 75 Index',      display:'Volatility 75 Index',      cat:'volatility',    confirmed:true },
    { deriv:'R_100',    mt5:'Volatility 100 Index',     display:'Volatility 100 Index',     cat:'volatility',    confirmed:true },
    { deriv:'1HZ10V',   mt5:'Volatility 10 (1s) Index', display:'Volatility 10 (1s) Index', cat:'volatility_1s', confirmed:true },
    { deriv:'1HZ25V',   mt5:'Volatility 25 (1s) Index', display:'Volatility 25 (1s) Index', cat:'volatility_1s', confirmed:true },
    { deriv:'1HZ50V',   mt5:'Volatility 50 (1s) Index', display:'Volatility 50 (1s) Index', cat:'volatility_1s', confirmed:true },
    { deriv:'1HZ75V',   mt5:'Volatility 75 (1s) Index', display:'Volatility 75 (1s) Index', cat:'volatility_1s', confirmed:true },
    { deriv:'1HZ100V',  mt5:'Volatility 100 (1s) Index',display:'Volatility 100 (1s) Index',cat:'volatility_1s', confirmed:true },
    // Step Indices Ã¢â‚¬â€ Deriv's actual live symbol list only has ONE Step
    // Index (stpRNG). "Step Index 200/300/400/500" are included below
    // because they were requested, but they have no real Deriv symbol to
    // fetch live data from Ã¢â‚¬â€ `deriv:null` means they can never pass the
    // live-availability check and will always show as unavailable rather
    // than being faked. See the chat write-up for the full explanation.
    { deriv:'stpRNG',   mt5:'Step Index',       display:'Step Index',     cat:'step', confirmed:true },
    { deriv:null,       mt5:'Step Index 100',   display:'Step Index 100', cat:'step', confirmed:false },
    { deriv:null,       mt5:'Step Index 200',   display:'Step Index 200', cat:'step', confirmed:false },
    { deriv:null,       mt5:'Step Index 300',   display:'Step Index 300', cat:'step', confirmed:false },
    { deriv:null,       mt5:'Step Index 400',   display:'Step Index 400', cat:'step', confirmed:false },
    { deriv:null,       mt5:'Step Index 500',   display:'Step Index 500', cat:'step', confirmed:false },
    // Boom / Crash Ã¢â‚¬â€ symbol codes below are validated live; anything not
    // confirmed by Deriv's own active_symbols response is shown as
    // unavailable rather than assumed to exist.
    { deriv:'BOOM300N', mt5:'Boom 300 Index',   display:'Boom 300 Index',   cat:'boom',  confirmed:false },
    { deriv:'BOOM500',  mt5:'Boom 500 Index',   display:'Boom 500 Index',   cat:'boom',  confirmed:false },
    { deriv:'BOOM600',  mt5:'Boom 600 Index',   display:'Boom 600 Index',   cat:'boom',  confirmed:false },
    { deriv:'BOOM900',  mt5:'Boom 900 Index',   display:'Boom 900 Index',   cat:'boom',  confirmed:false },
    { deriv:'BOOM1000', mt5:'Boom 1000 Index',  display:'Boom 1000 Index',  cat:'boom',  confirmed:false },
    { deriv:'CRASH300N',mt5:'Crash 300 Index',  display:'Crash 300 Index',  cat:'crash', confirmed:false },
    { deriv:'CRASH500', mt5:'Crash 500 Index',  display:'Crash 500 Index',  cat:'crash', confirmed:false },
    { deriv:'CRASH600', mt5:'Crash 600 Index',  display:'Crash 600 Index',  cat:'crash', confirmed:false },
    { deriv:'CRASH900', mt5:'Crash 900 Index',  display:'Crash 900 Index',  cat:'crash', confirmed:false },
    { deriv:'CRASH1000',mt5:'Crash 1000 Index', display:'Crash 1000 Index', cat:'crash', confirmed:false },
];
const APA_CATEGORY_LABEL = { volatility:'Volatility', volatility_1s:'Volatility 1s', step:'Step', boom:'Boom', crash:'Crash' };

// A market is only ever presented as tradable once Deriv's own
// active_symbols response has confirmed it (see connectPublicWS above).
// Until then Ã¢â‚¬â€ or if Deriv never confirms it Ã¢â‚¬â€ it's shown as unavailable.
function isMarketAvailable(mkt) {
    if (!mkt.deriv) return false; // no real Deriv symbol to check at all
    return knownActiveSymbols.size > 0 && knownActiveSymbols.has(mkt.deriv);
}

// Ã¢â€â‚¬Ã¢â€â‚¬ Trading styles Ã¢â€ â€™ timeframe stack + expiry Ã¢â€â‚¬Ã¢â€â‚¬
// granularities in seconds: M1=60 M5=300 M15=900 M30=1800 H1=3600 H4=14400 D1=86400
const APA_STYLES = {
    quick: { label: 'Quick Profit',  desc: 'High-quality setups, closed out relatively quickly.', bias: 900,   setup: 300,  entry: 60,   expiryMin: 4  },
    day:   { label: 'Day Trading',   desc: 'Capture intraday moves, closed within the session.',   bias: 14400, setup: 900,  entry: 300,  expiryMin: 20 },
    swing: { label: 'Swing Trading', desc: 'Fewer, larger setups Ã¢â‚¬â€ willing to hold longer.',        bias: 86400, setup: 14400,entry: 900,  expiryMin: 90 },
};
const GRAN_LABEL = { 60:'M1', 300:'M5', 900:'M15', 1800:'M30', 3600:'H1', 14400:'H4', 86400:'D1' };

let apaStyle          = 'day';
let apaMarket         = 'R_75';
let apaCurrentSignal  = null;
let apaNotifiedIds    = new Set();
let apaAuditLog       = [];
try { apaAuditLog = JSON.parse(localStorage.getItem('bth_apa_audit') || '[]'); } catch(e) { apaAuditLog = []; }

function saveApaAudit() {
    try { localStorage.setItem('bth_apa_audit', JSON.stringify(apaAuditLog.slice(-200))); } catch(e) {}
}
function logApaAudit(entry) {
    apaAuditLog.push({ ...entry, time: new Date().toISOString() });
    if (apaAuditLog.length > 200) apaAuditLog.shift();
    saveApaAudit();
}

// Ã¢â€â‚¬Ã¢â€â‚¬ User preferences (client-side only Ã¢â‚¬â€ no server DB exists to persist to) Ã¢â€â‚¬Ã¢â€â‚¬
function loadApaPrefs() {
    try {
        const p = JSON.parse(localStorage.getItem('bth_apa_prefs') || '{}');
        if (p.style) apaStyle = p.style;
        if (p.market) apaMarket = p.market;
        if (p.risk) { const el = document.getElementById('apa-risk'); if (el) el.value = p.risk; }
    } catch(e) {}
}
function saveApaPrefs() {
    try {
        localStorage.setItem('bth_apa_prefs', JSON.stringify({
            style: apaStyle, market: apaMarket,
            risk: document.getElementById('apa-risk')?.value || '1'
        }));
    } catch(e) {}
}

// ================================================================
// PRICE-ACTION PRIMITIVES (operate on real OHLC candle arrays)
// ================================================================

// Fractal swing points Ã¢â‚¬â€ a 5-candle pivot high/low
function findSwings(candles) {
    const swings = [];
    for (let i = 2; i < candles.length - 2; i++) {
        const c = candles[i];
        if (c.high > candles[i-1].high && c.high > candles[i-2].high && c.high > candles[i+1].high && c.high > candles[i+2].high) {
            swings.push({ i, type: 'high', price: c.high, epoch: c.epoch });
        }
        if (c.low < candles[i-1].low && c.low < candles[i-2].low && c.low < candles[i+1].low && c.low < candles[i+2].low) {
            swings.push({ i, type: 'low', price: c.low, epoch: c.epoch });
        }
    }
    return swings;
}

// Market structure: HH/HL/LH/LL, BOS, CHoCH
function analyzeStructure(candles) {
    if (!candles || candles.length < 15) return null;
    const swings = findSwings(candles);
    const highs  = swings.filter(s => s.type === 'high');
    const lows   = swings.filter(s => s.type === 'low');
    const last   = candles[candles.length - 1];

    let highLabel = null, lowLabel = null;
    if (highs.length >= 2) highLabel = highs[highs.length-1].price > highs[highs.length-2].price ? 'HH' : 'LH';
    if (lows.length  >= 2) lowLabel  = lows[lows.length-1].price  > lows[lows.length-2].price  ? 'HL' : 'LL';

    let bias = 'neutral';
    if (highLabel === 'HH' && lowLabel === 'HL') bias = 'bullish';
    else if (highLabel === 'LH' && lowLabel === 'LL') bias = 'bearish';
    else if (highLabel === 'HH' || lowLabel === 'HL') bias = 'bullish';
    else if (highLabel === 'LH' || lowLabel === 'LL') bias = 'bearish';

    // BOS Ã¢â‚¬â€ close breaks beyond the most recent swing in the bias direction
    const lastSwingHigh = highs[highs.length-1];
    const lastSwingLow  = lows[lows.length-1];
    let bos = false, choch = false;
    if (bias === 'bullish' && lastSwingHigh && last.close > lastSwingHigh.price) bos = true;
    if (bias === 'bearish' && lastSwingLow  && last.close < lastSwingLow.price)  bos = true;
    // CHoCH Ã¢â‚¬â€ price breaks structure opposite to the prevailing bias
    if (bias === 'bullish' && lastSwingLow && last.close < lastSwingLow.price) choch = true;
    if (bias === 'bearish' && lastSwingHigh && last.close > lastSwingHigh.price) choch = true;

    return { bias, highLabel, lowLabel, bos, choch, swings, highs, lows, lastSwingHigh, lastSwingLow };
}

// Liquidity pools + sweep detection
function analyzeLiquidity(candles, structure) {
    if (!structure) return null;
    const { highs, lows } = structure;
    const last = candles[candles.length - 1];
    const prev = candles[candles.length - 2];
    if (!prev) return null;

    const tol = (() => {
        const avg = candles.slice(-20).reduce((s,c) => s + (c.high - c.low), 0) / Math.min(20, candles.length);
        return avg * 0.15;
    })();

    // Equal highs/lows Ã¢â‚¬â€ swings within tolerance of each other
    const equalHighs = highs.filter((h,i) => highs.some((h2,j) => j !== i && Math.abs(h.price - h2.price) < tol));
    const equalLows  = lows.filter((l,i) => lows.some((l2,j) => j !== i && Math.abs(l.price - l2.price) < tol));

    const nearestHigh = highs.length ? highs[highs.length-1] : null;
    const nearestLow  = lows.length  ? lows[lows.length-1]  : null;

    // Sweep: wick pierces a pool, body closes back inside
    let sweep = null;
    if (nearestLow && last.low < nearestLow.price && last.close > nearestLow.price) {
        sweep = { type: 'sell_side', label: 'Sell-side liquidity swept (bullish)', pool: nearestLow.price };
    } else if (nearestHigh && last.high > nearestHigh.price && last.close < nearestHigh.price) {
        sweep = { type: 'buy_side', label: 'Buy-side liquidity swept (bearish)', pool: nearestHigh.price };
    }

    return { equalHighs, equalLows, nearestHigh, nearestLow, sweep };
}

// Displacement Ã¢â‚¬â€ body significantly larger than recent average, breaking structure
function analyzeDisplacement(candles, structure) {
    if (!candles || candles.length < 10 || !structure) return null;
    const bodies = candles.slice(-15, -1).map(c => Math.abs(c.close - c.open));
    const avgBody = bodies.reduce((a,b)=>a+b,0) / Math.max(1, bodies.length);
    const last = candles[candles.length - 1];
    const lastBody = Math.abs(last.close - last.open);
    const isBullish = last.close > last.open;

    const strong = avgBody > 0 && lastBody > avgBody * 1.6;
    const alignedWithBias = (structure.bias === 'bullish' && isBullish) || (structure.bias === 'bearish' && !isBullish);
    return { strong, alignedWithBias, isBullish, lastBody, avgBody, confirmsBreak: strong && (structure.bos || structure.choch) };
}

// Fair Value Gap Ã¢â‚¬â€ classic 3-candle imbalance
function findFVG(candles) {
    if (!candles || candles.length < 3) return null;
    for (let i = candles.length - 1; i >= 2; i--) {
        const a = candles[i-2], c = candles[i];
        if (a.high < c.low) return { direction: 'bullish', top: c.low, bottom: a.high, epoch: c.epoch, i, mitigated: false };
        if (a.low > c.high) return { direction: 'bearish', top: a.low, bottom: c.high, epoch: c.epoch, i, mitigated: false };
    }
    return null;
}

// Order block Ã¢â‚¬â€ last opposite candle before the displacement move
function findOrderBlock(candles, displacement) {
    if (!candles || candles.length < 5 || !displacement || !displacement.strong) return null;
    const idx = candles.length - 2; // candle immediately before the displacement candle
    for (let i = idx; i >= Math.max(0, idx - 5); i--) {
        const c = candles[i];
        const isBull = c.close > c.open;
        if (displacement.isBullish && !isBull) return { direction: 'bullish', high: c.high, low: c.low, epoch: c.epoch };
        if (!displacement.isBullish && isBull) return { direction: 'bearish', high: c.high, low: c.low, epoch: c.epoch };
    }
    return null;
}

// Premium/discount positioning within the recent dealing range
function analyzePremiumDiscount(candles) {
    const recent = candles.slice(-50);
    const hi = Math.max(...recent.map(c => c.high));
    const lo = Math.min(...recent.map(c => c.low));
    const last = candles[candles.length-1].close;
    const pct = hi > lo ? (last - lo) / (hi - lo) : 0.5;
    return { pct, zone: pct < 0.5 ? 'discount' : 'premium', high: hi, low: lo };
}

// ================================================================
// APA SIGNAL Ã¢â‚¬â€ combines everything into a scored, directional setup
// (or an honest "no trade")
// ================================================================
async function computeApaSignal(sym, styleKey) {
    const style = APA_STYLES[styleKey] || APA_STYLES.day;
    let biasC, setupC, entryC;
    try {
        [biasC, setupC, entryC] = await Promise.all([
            getCandles(sym, style.bias, 80),
            getCandles(sym, style.setup, 100),
            getCandles(sym, style.entry, 120)
        ]);
    } catch (e) {
        return { noTrade: true, reason: 'Live candle data unavailable right now', score: 0 };
    }
    if (!setupC || setupC.length < 20 || !entryC || entryC.length < 20) {
        return { noTrade: true, reason: 'Not enough candle history yet for this market', score: 0 };
    }

    const biasStruct  = analyzeStructure(biasC);
    const setupStruct = analyzeStructure(setupC);
    const entryStruct = analyzeStructure(entryC);
    if (!setupStruct) return { noTrade: true, reason: 'Structure unclear on the setup timeframe', score: 0 };

    const liquidity     = analyzeLiquidity(setupC, setupStruct);
    const displacement   = analyzeDisplacement(entryC, entryStruct || setupStruct);
    const fvg            = findFVG(entryC);
    const ob              = findOrderBlock(entryC, displacement);
    const premiumDiscount = analyzePremiumDiscount(setupC);

    // Direction requires setup-TF bias AND (a valid sweep OR a confirmed BOS)
    let direction = null;
    if (setupStruct.bias === 'bullish' && (liquidity?.sweep?.type === 'sell_side' || setupStruct.bos)) direction = 'BUY';
    else if (setupStruct.bias === 'bearish' && (liquidity?.sweep?.type === 'buy_side' || setupStruct.bos)) direction = 'SELL';

    // Ã¢â€â‚¬Ã¢â€â‚¬ MARKET STRUCTURE (20) Ã¢â€â‚¬Ã¢â€â‚¬
    let structureScore = 0;
    if (setupStruct.bias !== 'neutral') structureScore += 8;
    if (setupStruct.bos) structureScore += 7;
    if (!setupStruct.choch) structureScore += 3; // no conflicting fresh CHoCH
    if (direction === 'BUY' && premiumDiscount.zone === 'discount') structureScore += 2;
    if (direction === 'SELL' && premiumDiscount.zone === 'premium') structureScore += 2;
    structureScore = Math.min(20, structureScore);

    // Ã¢â€â‚¬Ã¢â€â‚¬ LIQUIDITY (20) Ã¢â€â‚¬Ã¢â€â‚¬
    let liquidityScore = 0;
    if (liquidity?.sweep) liquidityScore += 12;
    if (liquidity?.nearestHigh || liquidity?.nearestLow) liquidityScore += 4;
    if ((liquidity?.equalHighs?.length || 0) + (liquidity?.equalLows?.length || 0) > 0) liquidityScore += 4;
    liquidityScore = Math.min(20, liquidityScore);

    // Ã¢â€â‚¬Ã¢â€â‚¬ DISPLACEMENT (15) Ã¢â€â‚¬Ã¢â€â‚¬
    let displacementScore = 0;
    if (displacement?.strong) displacementScore += 8;
    if (displacement?.alignedWithBias) displacementScore += 4;
    if (displacement?.confirmsBreak) displacementScore += 3;
    displacementScore = Math.min(15, displacementScore);

    // Ã¢â€â‚¬Ã¢â€â‚¬ FVG / IMBALANCE (10) Ã¢â€â‚¬Ã¢â€â‚¬
    let fvgScore = 0;
    if (fvg) {
        const aligned = (direction === 'BUY' && fvg.direction === 'bullish') || (direction === 'SELL' && fvg.direction === 'bearish');
        fvgScore = aligned ? 10 : 4;
    }

    // Ã¢â€â‚¬Ã¢â€â‚¬ ORDER BLOCK / SUPPLY-DEMAND (10) Ã¢â€â‚¬Ã¢â€â‚¬
    let obScore = 0;
    if (ob) {
        const aligned = (direction === 'BUY' && ob.direction === 'bullish') || (direction === 'SELL' && ob.direction === 'bearish');
        obScore = aligned ? 10 : 3;
    }

    // Ã¢â€â‚¬Ã¢â€â‚¬ MULTI-TIMEFRAME ALIGNMENT (15) Ã¢â€â‚¬Ã¢â€â‚¬
    let mtfScore = 0;
    const biasDir = biasStruct?.bias, entryDir = entryStruct?.bias;
    if (direction) {
        const wantBias = direction === 'BUY' ? 'bullish' : 'bearish';
        if (biasDir === wantBias) mtfScore += 8;
        if (entryDir === wantBias) mtfScore += 7;
        else if (entryDir === 'neutral') mtfScore += 3;
    }
    mtfScore = Math.min(15, mtfScore);

    // Ã¢â€â‚¬Ã¢â€â‚¬ ENTRY / SL / TP + RISK:REWARD (10) Ã¢â€â‚¬Ã¢â€â‚¬
    const lastPrice = entryC[entryC.length-1].close;
    let entry = lastPrice, sl = null, tp1 = null, tp2 = null, rr = 0, rrScore = 0;
    if (direction === 'BUY') {
        const obLow = ob?.direction === 'bullish' ? ob.low : null;
        sl  = (obLow ?? liquidity?.nearestLow?.price ?? entry * 0.997) * 0.999;
        tp1 = liquidity?.nearestHigh?.price ?? entry + (entry - sl) * 2;
        tp2 = premiumDiscount.high;
    } else if (direction === 'SELL') {
        const obHigh = ob?.direction === 'bearish' ? ob.high : null;
        sl  = (obHigh ?? liquidity?.nearestHigh?.price ?? entry * 1.003) * 1.001;
        tp1 = liquidity?.nearestLow?.price ?? entry - (sl - entry) * 2;
        tp2 = premiumDiscount.low;
    }
    if (direction && sl && tp1) {
        const risk   = Math.abs(entry - sl);
        const reward = Math.abs(tp1 - entry);
        rr = risk > 0 ? reward / risk : 0;
        rrScore = rr >= 2 ? 10 : rr >= 1.5 ? 7 : rr >= 1 ? 4 : 0;
    }

    const score = Math.round(structureScore + liquidityScore + displacementScore + fvgScore + obScore + mtfScore + rrScore);

    if (!direction || score < 55) {
        const reasons = [];
        if (!direction) reasons.push('No aligned structure + liquidity setup');
        if (rr && rr < 1) reasons.push('Poor risk/reward');
        if (setupStruct.choch) reasons.push('Structure just shifted (CHoCH) Ã¢â‚¬â€ bias unclear');
        return { noTrade: true, reason: reasons[0] || 'Setup quality below threshold', score, breakdown: { structureScore, liquidityScore, displacementScore, fvgScore, obScore, mtfScore, rrScore } };
    }

    let label, color;
    if (score >= 85)      { label = 'Ã°Å¸Å¸Â¢ GREAT ENTRY'; color = 'var(--green)'; }
    else if (score >= 70) { label = 'Ã°Å¸Å¸Â¡ GOOD SETUP';  color = 'var(--amber)'; }
    else                  { label = 'Ã°Å¸Å¸Â  WATCH';        color = '#f97316'; }

    const tags = [];
    if (liquidity?.sweep) tags.push('Liquidity Sweep');
    if (setupStruct.bos) tags.push('BOS');
    if (setupStruct.choch) tags.push('CHoCH');
    if (displacement?.strong) tags.push('Displacement');
    if (fvg) tags.push('FVG');
    if (ob) tags.push('Order Block');

    const mkt = APA_MARKETS.find(m => m.deriv === sym);
    return {
        noTrade: false, id: `${sym}_${styleKey}_${Date.now()}`,
        market: sym, mt5Symbol: mkt?.mt5 || sym, display: mkt?.display || sym,
        style: styleKey, styleLabel: style.label,
        direction, score, label, color, tags,
        entry, sl, tp1, tp2, rr: rr.toFixed(2),
        htfBias: biasStruct?.bias || 'unclear',
        confidence: score >= 85 ? 'HIGH' : score >= 70 ? 'MEDIUM' : 'LOW',
        breakdown: { structureScore, liquidityScore, displacementScore, fvgScore, obScore, mtfScore, rrScore },
        entryGranLabel: GRAN_LABEL[style.entry], setupGranLabel: GRAN_LABEL[style.setup], biasGranLabel: GRAN_LABEL[style.bias],
        generatedAt: Date.now(), expiresAt: Date.now() + style.expiryMin * 60000
    };
}

// ================================================================
// UI Ã¢â‚¬â€ Style selector, scanner, setup card
// ================================================================
// ================================================================
// MT5 SIGNAL LIFECYCLE ENGINE
// Generated signals are never deleted when they go stale Ã¢â‚¬â€ they move
// NEW -> ACTIVE -> EXPIRED and stay in Signal History. Persisted to
// localStorage (no server DB exists in this app) so history survives a
// page refresh. The underlying strategy math is untouched Ã¢â‚¬â€ this layer
// just wraps computeApaSignal() with persistence, lifecycle and dedup.
// ================================================================

// Configurable, not hard-coded through the app Ã¢â‚¬â€ change these two knobs only.
const MT5_SIGNAL_VALIDITY_MINUTES        = 15; // how long a signal stays ACTIVE
const MT5_SIGNAL_HISTORY_RETENTION_DAYS  = 7;  // how long EXPIRED signals stay in History
const MT5_SIGNAL_MIN_SCORE               = 70; // generation threshold (APA "Good Setup" or better)
const MT5_SCAN_INTERVAL_MS               = 25000; // background re-scan cadence

let mt5Signals        = [];          // the persisted signal list Ã¢â‚¬â€ single source of truth
let mt5HistoryFilter   = { cat: 'all', instrument: 'all', status: 'all', range: 'all' };
let mt5HistoryTab      = 'active';   // 'active' | 'history'
let mt5ScanTimer       = null;
let mt5ScanInFlight    = false;

function loadMt5Signals() {
    try { mt5Signals = JSON.parse(localStorage.getItem('bth_mt5_signals') || '[]'); }
    catch(e) { mt5Signals = []; }
    pruneMt5Signals();
}
function saveMt5Signals() {
    try { localStorage.setItem('bth_mt5_signals', JSON.stringify(mt5Signals.slice(-500))); } catch(e) {}
}
function pruneMt5Signals() {
    const cutoff = Date.now() - MT5_SIGNAL_HISTORY_RETENTION_DAYS * 86400000;
    mt5Signals = mt5Signals.filter(s => s.generatedAt >= cutoff);
}

function makeSignalId(mkt, date) {
    const code  = (mkt.display || mkt.mt5).replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 8);
    const stamp = date.toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
    return `${code}-${stamp}`;
}

// Idempotent upsert Ã¢â‚¬â€ never creates a duplicate ACTIVE signal for the same
// market+direction. A genuinely new signal event only happens when this
// market currently has no ACTIVE signal, or the direction has reversed
// (in which case the old one is expired immediately, not deleted).
function upsertMt5Signal(mkt, sig) {
    const existingActive = mt5Signals.find(s => s.market === mkt.deriv && s.status === 'ACTIVE');
    if (existingActive) {
        if (existingActive.direction === sig.direction) return; // same setup still developing Ã¢â‚¬â€ no duplicate
        existingActive.status = 'EXPIRED'; // direction reversed Ã¢â‚¬â€ retire the old one into History
    }
    const now = new Date();
    const record = {
        id: makeSignalId(mkt, now),
        market: mkt.deriv, mt5Symbol: mkt.mt5, display: mkt.display, category: mkt.cat,
        direction: sig.direction, confidence: sig.score, strategy: 'Advanced Price Action (APA)',
        style: sig.style, styleLabel: sig.styleLabel,
        generatedAt: now.getTime(), expiresAt: now.getTime() + MT5_SIGNAL_VALIDITY_MINUTES * 60000,
        status: 'ACTIVE',
        entry: sig.entry, target: sig.tp1, target2: sig.tp2, invalidation: sig.sl, rr: sig.rr,
        tags: sig.tags, htfBias: sig.htfBias
    };
    mt5Signals.push(record);
    saveMt5Signals();
    notify('Ã°Å¸Å¸Â¢ NEW SIGNAL', `${mkt.display} ${sig.direction} Ã¢â‚¬â€ ${sig.score}% confidence`, 'ok');
    return record;
}

function updateMt5SignalStatuses() {
    let changed = false;
    const now = Date.now();
    mt5Signals.forEach(s => { if (s.status === 'ACTIVE' && now > s.expiresAt) { s.status = 'EXPIRED'; changed = true; } });
    if (changed) { saveMt5Signals(); renderMt5SignalsUI(); }
}

// Background scan Ã¢â‚¬â€ evaluates every confirmed/available market on the
// currently-selected style and lets upsertMt5Signal() decide whether a new
// record is warranted. Runs independently of which internal tab is open.
async function mt5BackgroundScan() {
    if (mt5ScanInFlight) return;
    mt5ScanInFlight = true;
    try {
        const markets = APA_MARKETS.filter(m => m.confirmed || isMarketAvailable(m));
        for (const mkt of markets) {
            try {
                const sig = await computeApaSignal(mkt.deriv, apaStyle);
                if (!sig.noTrade && sig.score >= MT5_SIGNAL_MIN_SCORE) upsertMt5Signal(mkt, sig);
            } catch(e) {}
            await new Promise(r => setTimeout(r, 150)); // pacing Ã¢â‚¬â€ avoid hammering the candle API
        }
    } finally {
        mt5ScanInFlight = false;
        renderMt5SignalsUI();
    }
}
function startMt5BackgroundScan() {
    if (mt5ScanTimer) return;
    loadMt5Signals();
    mt5BackgroundScan();
    mt5ScanTimer = setInterval(mt5BackgroundScan, MT5_SCAN_INTERVAL_MS);
}

// Age ticks every second without a full re-render Ã¢â‚¬â€ just updates the text.
setInterval(() => {
    updateMt5SignalStatuses();
    document.querySelectorAll('.mt5-age[data-t]').forEach(el => {
        el.textContent = formatSignalAge(parseInt(el.dataset.t, 10));
    });
}, 1000);

function formatSignalAge(sinceMs) {
    const secs = Math.max(0, Math.floor((Date.now() - sinceMs) / 1000));
    const m = Math.floor(secs / 60), s = secs % 60;
    return `${String(m).padStart(2,'0')}m ${String(s).padStart(2,'0')}s`;
}

// ================================================================
// UI Ã¢â‚¬â€ Style selector, market picker, on-demand setup card
// ================================================================
function selectApaStyle(styleKey, btn) {
    apaStyle = styleKey;
    document.querySelectorAll('.apa-style-btn').forEach(b => b.classList.remove('apa-style-active'));
    if (btn) btn.classList.add('apa-style-active');
    saveApaPrefs();
    runApaAnalysis();
}

function onApaMarketChange(sym) {
    apaMarket = sym;
    saveApaPrefs();
    runApaAnalysis();
}

async function runApaAnalysis() {
    const card = document.getElementById('apa-setup-card');
    if (!card) return;
    card.innerHTML = `<div style="font-size:12px;color:var(--muted);text-align:center;padding:20px;">Ã°Å¸â€Å½ Analyzing ${MKT[apaMarket]||apaMarket} on ${APA_STYLES[apaStyle].label} timeframes...</div>`;

    const mkt = APA_MARKETS.find(m => m.deriv === apaMarket);
    if (mkt && !mkt.confirmed && !isMarketAvailable(mkt)) {
        card.innerHTML = `<div style="font-size:12px;color:var(--red);text-align:center;padding:20px;">Market currently unavailable Ã¢â‚¬â€ Deriv hasn't confirmed a live symbol for this instrument.</div>`;
        apaCurrentSignal = null;
        return;
    }

    const sig = await computeApaSignal(apaMarket, apaStyle);
    if (!sig.noTrade) { sig.style = apaStyle; sig.styleLabel = APA_STYLES[apaStyle].label; }
    apaCurrentSignal = sig.noTrade ? null : sig;
    renderApaSetupCard(sig);
}

function renderApaSetupCard(sig) {
    const card = document.getElementById('apa-setup-card');
    if (!card) return;

    if (!sig || sig.noTrade) {
        card.innerHTML = `
            <div style="text-align:center;padding:24px 16px;">
                <div style="font-size:32px;margin-bottom:8px;">Ã°Å¸â€Â´</div>
                <div style="font-size:15px;font-weight:900;color:var(--red);margin-bottom:4px;">NO TRADE</div>
                <div style="font-size:11px;color:var(--muted);">${sig?.reason || 'No qualifying setup right now'}${sig?.score !== undefined ? ` (score ${sig.score}/100)` : ''}</div>
            </div>`;
        return;
    }

    const dirColor = sig.direction === 'BUY' ? 'var(--green)' : 'var(--red)';
    const fmt = (n) => n !== null && n !== undefined ? Number(n).toFixed(5) : 'Ã¢â‚¬â€';
    const expiresIn = Math.max(0, Math.round((sig.expiresAt - Date.now()) / 60000));

    card.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;flex-wrap:wrap;gap:8px;">
            <div>
                <div style="font-size:15px;font-weight:900;">${sig.display}</div>
                <div style="font-size:10px;color:var(--muted);">${sig.styleLabel} Ã‚Â· Bias ${sig.biasGranLabel} / Setup ${sig.setupGranLabel} / Entry ${sig.entryGranLabel}</div>
            </div>
            <div style="text-align:right;">
                <div style="font-size:20px;font-weight:900;color:${sig.color};">${sig.score}/100</div>
                <div style="font-size:11px;font-weight:700;color:${sig.color};">${sig.label}</div>
            </div>
        </div>
        <div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap;">
            <span class="badge" style="background:${dirColor}22;color:${dirColor};border:1px solid ${dirColor}44;font-size:12px;padding:4px 10px;">${sig.direction === 'BUY' ? 'Ã°Å¸â€œË†' : 'Ã°Å¸â€œâ€°'} ${sig.direction}</span>
            <span class="badge badge-blue">HTF Bias: ${sig.htfBias}</span>
            <span class="badge badge-teal">Confidence: ${sig.confidence}</span>
            <span class="badge badge-amber">Ã¢ÂÂ± Expires in ${expiresIn}m</span>
        </div>
        <div class="accu-row-3" style="margin-bottom:10px;">
            <div class="card-sm" style="padding:8px;text-align:center;"><div style="font-size:9px;color:var(--muted);">ENTRY</div><div style="font-size:13px;font-weight:900;font-family:monospace;">${fmt(sig.entry)}</div></div>
            <div class="card-sm" style="padding:8px;text-align:center;"><div style="font-size:9px;color:var(--muted);">STOP LOSS</div><div style="font-size:13px;font-weight:900;font-family:monospace;color:var(--red);">${fmt(sig.sl)}</div></div>
            <div class="card-sm" style="padding:8px;text-align:center;"><div style="font-size:9px;color:var(--muted);">R:R</div><div style="font-size:13px;font-weight:900;">1:${sig.rr}</div></div>
        </div>
        <div class="accu-row-2" style="margin-bottom:10px;">
            <div class="card-sm" style="padding:8px;text-align:center;"><div style="font-size:9px;color:var(--muted);">TAKE PROFIT 1</div><div style="font-size:13px;font-weight:900;font-family:monospace;color:var(--green);">${fmt(sig.tp1)}</div></div>
            <div class="card-sm" style="padding:8px;text-align:center;"><div style="font-size:9px;color:var(--muted);">TAKE PROFIT 2</div><div style="font-size:13px;font-weight:900;font-family:monospace;color:var(--green);">${fmt(sig.tp2)}</div></div>
        </div>
        <div style="font-size:10px;color:var(--muted);margin-bottom:10px;">Setup: <b style="color:var(--text);">${sig.tags.join(' + ') || 'Ã¢â‚¬â€'}</b></div>
        <button onclick="copySignalText({display:'${sig.display.replace(/'/g,"\\'")}',direction:'${sig.direction}',confidence:${sig.score},generatedAt:${Date.now()},entry:${sig.entry},target:${sig.tp1},invalidation:${sig.sl},id:'ondemand-${Date.now()}'})" class="btn btn-teal" style="width:100%;padding:12px;font-size:14px;font-weight:900;border-radius:8px;">Ã°Å¸â€œâ€¹ COPY SIGNAL</button>
        <div style="font-size:9px;color:var(--muted);text-align:center;margin-top:6px;">Deriv doesn't allow this site to place MT5 orders directly Ã¢â‚¬â€ copy these levels into the real MT5 terminal to enter manually.</div>`;
}

// ================================================================
// COPY SIGNAL Ã¢â‚¬â€ replaces the old "Apply to MT5" flow. Deriv's public API
// cannot place or manage MT5 orders from a browser, so instead of a
// misleading execute button, every signal offers a clean, copyable summary
// for fast manual entry.
// ================================================================
function formatSignalText(sig) {
    const fmt = (n) => n !== null && n !== undefined ? Number(n).toFixed(5) : 'Ã¢â‚¬â€';
    const risk = document.getElementById('apa-risk')?.value;
    return [
        'DOLARHUNTER Signal',
        `Market: ${sig.display}`,
        `Direction: ${sig.direction}`,
        `Generated: ${new Date(sig.generatedAt).toLocaleString()}`,
        `Confidence: ${sig.confidence}%`,
        `Entry: ${fmt(sig.entry)}`,
        `Target: ${fmt(sig.target)}`,
        sig.target2 !== undefined ? `Target 2: ${fmt(sig.target2)}` : null,
        `Invalidation: ${fmt(sig.invalidation)}`,
        risk ? `Suggested risk: ${risk}%` : null,
        `Signal ID: ${sig.id}`
    ].filter(Boolean).join('\n');
}
function copySignalText(sig) {
    const text = formatSignalText(sig);
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text)
            .then(() => notify('Ã°Å¸â€œâ€¹ Signal Copied', 'Paste it into MT5 or your notes to enter the trade manually.', 'ok'))
            .catch(() => window.prompt('Copy this signal:', text));
    } else {
        window.prompt('Copy this signal:', text);
    }
}
function copySignalById(id) {
    const sig = mt5Signals.find(s => s.id === id);
    if (sig) copySignalText(sig);
}

// ================================================================
// ACTIVE SIGNALS + SIGNAL HISTORY UI
// ================================================================
function switchMt5HistoryTab(tab, btn) {
    mt5HistoryTab = tab;
    document.querySelectorAll('.mt5-tab-btn').forEach(b => {
        b.classList.remove('mt5-tab-active', 'btn-teal');
        b.classList.add('btn-ghost');
    });
    if (btn) { btn.classList.add('mt5-tab-active'); btn.classList.remove('btn-ghost'); btn.classList.add('btn-teal'); }
    document.getElementById('mt5-active-section').style.display = tab === 'active' ? 'block' : 'none';
    document.getElementById('mt5-history-section').style.display = tab === 'history' ? 'block' : 'none';
}

function setMt5HistoryFilter(key, value) {
    mt5HistoryFilter[key] = value;
    if (key === 'cat') mt5HistoryFilter.instrument = 'all'; // reset instrument when category changes
    renderMt5SignalsUI();
    if (key === 'cat') populateMt5InstrumentFilter();
}

function populateMt5InstrumentFilter() {
    const sel = document.getElementById('mt5-filter-instrument');
    if (!sel) return;
    const markets = APA_MARKETS.filter(m => mt5HistoryFilter.cat === 'all' || m.cat === mt5HistoryFilter.cat);
    sel.innerHTML = `<option value="all">All Instruments</option>` +
        markets.map(m => `<option value="${m.deriv || m.mt5}">${m.display}</option>`).join('');
}

function signalCardHtml(sig, opts) {
    opts = opts || {};
    const dirColor = sig.direction === 'BUY' ? 'var(--green)' : 'var(--red)';
    const statusColor = sig.status === 'ACTIVE' ? 'var(--green)' : 'var(--muted)';
    const fmt = (n) => n !== null && n !== undefined ? Number(n).toFixed(5) : 'Ã¢â‚¬â€';
    return `
    <div class="card-sm" style="padding:12px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;">
            <div>
                <div style="font-size:13px;font-weight:900;">${sig.display}</div>
                <div style="font-size:9px;color:var(--muted);">${sig.strategy || 'APA'} Ã‚Â· ${sig.styleLabel || ''}</div>
            </div>
            <span class="badge" style="background:${dirColor}22;color:${dirColor};border:1px solid ${dirColor}44;">${sig.direction === 'BUY' ? 'Ã°Å¸â€œË†' : 'Ã°Å¸â€œâ€°'} ${sig.direction}</span>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;">
            <span class="badge badge-teal">Confidence: ${sig.confidence}%</span>
            <span class="badge" style="background:${statusColor}22;color:${statusColor};border:1px solid ${statusColor}44;">Ã¢â€”Â ${sig.status}</span>
        </div>
        <div style="font-size:10px;color:var(--muted);margin-bottom:4px;">Generated: ${new Date(sig.generatedAt).toLocaleString()}</div>
        <div style="font-size:10px;color:var(--muted);margin-bottom:8px;">Age: <span class="mt5-age" data-t="${sig.generatedAt}">${formatSignalAge(sig.generatedAt)}</span></div>
        ${opts.showLevels ? `
        <div class="accu-row-3" style="margin-bottom:8px;">
            <div style="text-align:center;"><div style="font-size:8px;color:var(--muted);">ENTRY</div><div style="font-size:10px;font-family:monospace;font-weight:700;">${fmt(sig.entry)}</div></div>
            <div style="text-align:center;"><div style="font-size:8px;color:var(--muted);">TARGET</div><div style="font-size:10px;font-family:monospace;font-weight:700;color:var(--green);">${fmt(sig.target)}</div></div>
            <div style="text-align:center;"><div style="font-size:8px;color:var(--muted);">INVALID.</div><div style="font-size:10px;font-family:monospace;font-weight:700;color:var(--red);">${fmt(sig.invalidation)}</div></div>
        </div>` : ''}
        <div style="display:flex;gap:6px;">
            <button onclick="showSignalDetail('${sig.id}')" class="btn btn-ghost" style="flex:1;font-size:10px;padding:6px;">View</button>
            <button onclick="copySignalById('${sig.id}')" class="btn btn-teal" style="flex:1;font-size:10px;padding:6px;">Ã°Å¸â€œâ€¹ Copy</button>
        </div>
    </div>`;
}

function applyMt5HistoryFilters(list) {
    const now = Date.now();
    const rangeMs = { '1h': 3600000, '6h': 21600000, '24h': 86400000 }[mt5HistoryFilter.range];
    return list.filter(s => {
        if (mt5HistoryFilter.cat !== 'all' && s.category !== mt5HistoryFilter.cat) return false;
        if (mt5HistoryFilter.instrument !== 'all' && s.market !== mt5HistoryFilter.instrument && s.mt5Symbol !== mt5HistoryFilter.instrument) return false;
        if (mt5HistoryFilter.status !== 'all' && s.status !== mt5HistoryFilter.status.toUpperCase()) return false;
        if (rangeMs && (now - s.generatedAt) > rangeMs) return false;
        return true;
    });
}

function renderMt5SignalsUI() {
    // Ã¢â€â‚¬Ã¢â€â‚¬ Active Signals Ã¢â€â‚¬Ã¢â€â‚¬
    const activeList = mt5Signals.filter(s => s.status === 'ACTIVE').sort((a,b) => b.generatedAt - a.generatedAt);
    const activeBody  = document.getElementById('mt5-active-body');
    const activeCount = document.getElementById('mt5-active-count');
    if (activeCount) activeCount.textContent = `(${activeList.length})`;
    if (activeBody) {
        activeBody.innerHTML = activeList.length
            ? `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px;">${activeList.map(s => signalCardHtml(s, { showLevels: true })).join('')}</div>`
            : `<div style="font-size:11px;color:var(--dim);text-align:center;padding:20px;">No active signals right now. The scanner keeps checking every ${Math.round(MT5_SCAN_INTERVAL_MS/1000)}s across all available markets.</div>`;
    }

    // Ã¢â€â‚¬Ã¢â€â‚¬ Signal History Ã¢â€â‚¬Ã¢â€â‚¬
    const historyAll = mt5Signals.slice().sort((a,b) => b.generatedAt - a.generatedAt);
    const filtered = applyMt5HistoryFilters(historyAll);
    const histBody  = document.getElementById('mt5-history-body');
    const histCount = document.getElementById('mt5-history-count');
    if (histCount) histCount.textContent = `${filtered.length} signal${filtered.length===1?'':'s'}`;
    if (histBody) {
        histBody.innerHTML = filtered.length
            ? `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px;">${filtered.slice(0,150).map(s => signalCardHtml(s, { showLevels: false })).join('')}</div>`
            : `<div style="font-size:11px;color:var(--dim);text-align:center;padding:20px;">No signals match this filter.</div>`;
    }
}

function showSignalDetail(id) {
    const sig = mt5Signals.find(s => s.id === id);
    if (!sig) return;
    const fmt = (n) => n !== null && n !== undefined ? Number(n).toFixed(5) : 'Ã¢â‚¬â€';
    const dirColor = sig.direction === 'BUY' ? 'var(--green)' : 'var(--red)';
    showApaModal(`
        <div style="font-size:14px;font-weight:900;text-align:center;margin-bottom:12px;">SIGNAL DETAILS</div>
        <div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:12px;margin-bottom:14px;font-size:12px;line-height:2;">
            <div style="display:flex;justify-content:space-between;"><span style="color:var(--muted);">Market</span><b>${sig.display}</b></div>
            <div style="display:flex;justify-content:space-between;"><span style="color:var(--muted);">Direction</span><b style="color:${dirColor};">${sig.direction}</b></div>
            <div style="display:flex;justify-content:space-between;"><span style="color:var(--muted);">Generated</span><b>${new Date(sig.generatedAt).toLocaleString()}</b></div>
            <div style="display:flex;justify-content:space-between;"><span style="color:var(--muted);">Confidence</span><b>${sig.confidence}%</b></div>
            <div style="display:flex;justify-content:space-between;"><span style="color:var(--muted);">Status</span><b>${sig.status}</b></div>
            <div style="display:flex;justify-content:space-between;"><span style="color:var(--muted);">Signal Age</span><b class="mt5-age" data-t="${sig.generatedAt}">${formatSignalAge(sig.generatedAt)}</b></div>
            <div style="display:flex;justify-content:space-between;"><span style="color:var(--muted);">Strategy</span><b>${sig.strategy}</b></div>
            <div style="display:flex;justify-content:space-between;"><span style="color:var(--muted);">Entry</span><b style="font-family:monospace;">${fmt(sig.entry)}</b></div>
            <div style="display:flex;justify-content:space-between;"><span style="color:var(--muted);">Target</span><b style="font-family:monospace;color:var(--green);">${fmt(sig.target)}</b></div>
            <div style="display:flex;justify-content:space-between;"><span style="color:var(--muted);">Invalidation</span><b style="font-family:monospace;color:var(--red);">${fmt(sig.invalidation)}</b></div>
            <div style="display:flex;justify-content:space-between;"><span style="color:var(--muted);">Setup</span><b style="text-align:right;max-width:60%;">${(sig.tags||[]).join(' + ') || 'Ã¢â‚¬â€'}</b></div>
            <div style="display:flex;justify-content:space-between;"><span style="color:var(--muted);">Signal ID</span><b style="font-size:10px;">${sig.id}</b></div>
        </div>
        <button class="btn btn-teal" style="width:100%;padding:12px;margin-bottom:8px;font-weight:900;" onclick="copySignalById('${sig.id}')">Ã°Å¸â€œâ€¹ COPY SIGNAL</button>
        <button class="btn btn-ghost" style="width:100%;padding:10px;" onclick="closeApaModal()">Close</button>
    `);
}

function showApaModal(html) {
    let modal = document.getElementById('apa-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'apa-modal';
        modal.style.cssText = 'display:flex;position:fixed;inset:0;z-index:99999;background:#000000cc;align-items:center;justify-content:center;padding:16px;';
        modal.innerHTML = `<div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;width:100%;max-width:420px;max-height:88vh;overflow-y:auto;padding:20px;" id="apa-modal-inner"></div>`;
        document.body.appendChild(modal);
        modal.addEventListener('click', (e) => { if (e.target === modal) closeApaModal(); });
    }
    document.getElementById('apa-modal-inner').innerHTML = html;
    modal.style.display = 'flex';
}
function closeApaModal() {
    const modal = document.getElementById('apa-modal');
    if (modal) modal.style.display = 'none';
}

// Refresh the on-demand setup card every 45s when the MT5 tab is active.
// The Active Signals / History engine itself runs independently via
// startMt5BackgroundScan()/setInterval above, regardless of which tab is open.
setInterval(() => {
    if (document.getElementById('mt5-pane')?.classList.contains('active') && apaCurrentSignal) {
        runApaAnalysis();
    }
}, 45000);
// ================================================================

function updateChartIndicators(symbol) {
    const sym = symbol || document.getElementById('chart-market-sel')?.value || 'R_10';
    const mm  = marketMemory[sym];
    if (!mm || mm.prices.length < 20) {
        document.getElementById('chart-signal')?.setAttribute('style','font-size:12px;font-weight:900;color:var(--muted)');
        const s = document.getElementById('chart-signal');
        if (s) s.textContent = 'Collecting data...';
        return;
    }

    const rsi = calcRSI(mm.prices, 14);
    const bb  = calcBollingerBands(mm.prices, 20, 2);

    if (rsi !== null) {
        const rsiEl    = document.getElementById('chart-rsi');
        const rsiLabel = document.getElementById('chart-rsi-label');
        if (rsiEl) {
            rsiEl.textContent = rsi;
            rsiEl.style.color = rsi > 70 ? '#f87171' : rsi < 30 ? '#34d399' : rsi > 50 ? '#60a5fa' : '#fbbf24';
        }
        if (rsiLabel) {
            const label = rsi > 70 ? 'Overbought' : rsi < 30 ? 'Oversold' : rsi > 60 ? 'Bullish' : rsi < 40 ? 'Bearish' : 'Neutral';
            rsiLabel.textContent = label;
        }
    }

    if (bb !== null) {
        const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        set('chart-bb-upper', bb.upper.toFixed(4));
        set('chart-bb-mid',   bb.middle.toFixed(4));
        set('chart-bb-lower', bb.lower.toFixed(4));
        set('chart-bb-width', bb.bandwidth.toFixed(2) + '%');
        const bbLabel = document.getElementById('chart-bb-label');
        if (bbLabel) bbLabel.textContent = bb.bandwidth > 0.2 ? 'Expanding Ã°Å¸â€œË†' : bb.bandwidth < 0.05 ? 'Squeezing Ã¢Å¡Â Ã¯Â¸Â' : 'Normal';
    }

    // Show BB+RSI signal for Only Ups/Downs
    const sig     = generateOnlyUpsDownsSignal(sym);
    const sigEl   = document.getElementById('chart-signal');
    if (sigEl) {
        if (sig) {
            sigEl.textContent  = `${sig.direction} ${sig.confidence}% Ã¢â‚¬â€ ${sig.ticks} ticks`;
            sigEl.style.color  = sig.color;
        } else {
            sigEl.textContent  = 'No clear signal';
            sigEl.style.color  = 'var(--muted)';
        }
    }
}

// Auto-update chart indicators every 5 seconds when chart tab is active
setInterval(() => {
    if (document.getElementById('chart-pane')?.classList.contains('active')) {
        const sym = document.getElementById('chart-market-sel')?.value || 'R_10';
        updateChartIndicators(sym);
    }
}, 5000);

// ================================================================
// ACCUMULATOR ENGINE
// Full accumulator trading directly on DOLARHUNTER.com
// ================================================================

let accuRunning      = false;
let accuContractId   = null;
let accuGrowthRate   = 0.02; // default 2%
let accuTickCount    = 0;
let accuCurrentProfit = 0;
let accuMarket       = 'R_10';
let accuAnalysisTimer = null;
let accuTickTimes    = {}; // sym -> [timestamps] Ã¢â‚¬â€ feeds the Tick Flow analysis

// Idempotency guard Ã¢â‚¬â€ Deriv can (and does) send more than one
// proposal_open_contract update for the same settled contract. Without this
// guard the settlement branch below would run twice for one trade, which is
// what caused duplicate TP/Loss notifications and double-counted stats, and
// could also knock Auto Mode into an inconsistent state (looking like it
// "stopped unexpectedly"). We only ever process a given contract_id's
// settlement once.
let accuSettledContractIds = new Set();

// Rolling bandwidth history per market Ã¢â‚¬â€ used to detect a BB squeeze
// followed by a healthy expansion (the "compression Ã¢â€ â€™ breakout" filter).
let accuBandwidthHistory = {};

// Cache of the latest confidence breakdown per market so the history table
// and any future "trade analytics" view can reference exactly what the
// engine saw when a trade was opened.
let accuLastConfidence = {};
let accuTradeAnalytics = []; // log of factors for every completed trade

function onAccuMarketChange(sym) {
    accuMarket = sym;
    updateAccuAnalysis(sym);
    updateAccuProfitCalc();
    // Subscribe to ticks for analysis
    subscribeDigitFeed(sym);
}

function selectAccuGrowth(rate, btn) {
    accuGrowthRate = rate;
    document.querySelectorAll('#accu-pane .btn').forEach(b => {
        if (['1%','2%','3%','4%','5%'].includes(b.textContent)) {
            b.classList.remove('btn-teal');
            b.classList.add('btn-ghost');
        }
    });
    if (btn) { btn.classList.remove('btn-ghost'); btn.classList.add('btn-teal'); }
    updateAccuProfitCalc();
}

// ================================================================
// ADAPTIVE MARKET PROFILES
// Detects market "speed class" from the symbol and returns indicator
// periods tuned for it, so the same engine works sensibly on fast 1s
// indices as well as slow Volatility 75/100 and Jump/Step indices Ã¢â‚¬â€
// without any manual per-market configuration.
// ================================================================
function getMarketProfile(sym) {
    const is1s   = /^1HZ/.test(sym);
    const isSlow = ['R_75','R_100','jump_75','jump_100','stpRNG'].includes(sym);

    if (is1s) {
        // Fast markets Ã¢â‚¬â€ shorter lookbacks, faster confidence refresh
        return { speedClass: 'fast', emaFast: 5, emaSlow: 13, rsiPeriod: 7, bbPeriod: 10, atrPeriod: 7, updateEveryTicks: 2, volTolerance: 1.4 };
    }
    if (isSlow) {
        // Slow / high-volatility markets Ã¢â‚¬â€ longer smoothing, wider tolerance
        return { speedClass: 'slow', emaFast: 12, emaSlow: 26, rsiPeriod: 21, bbPeriod: 30, atrPeriod: 21, updateEveryTicks: 8, volTolerance: 0.7 };
    }
    // Balanced medium-speed markets (R_10/25/50, jump_10/25/50)
    return { speedClass: 'balanced', emaFast: 9, emaSlow: 21, rsiPeriod: 14, bbPeriod: 20, atrPeriod: 14, updateEveryTicks: 5, volTolerance: 1.0 };
}

// ================================================================
// ADAPTIVE LEARNING Ã¢â‚¬â€ nudges factor weights based on completed-trade
// history. Every 100 trades (per market) we compare the average score
// of each factor between winning and losing trades; factors that ran
// meaningfully higher on wins get a small weight boost next time,
// factors that didn't help get trimmed. Adjustments are capped so the
// model drifts gradually rather than overfitting to a short streak.
// ================================================================
let accuAdaptiveWeights = {}; // sym -> { trend, momentum, volatility, priceBehavior, structure }
const ACCU_BASE_WEIGHTS = { trend: 0.25, momentum: 0.20, volatility: 0.20, priceBehavior: 0.20, structure: 0.15 };

function getAdaptiveWeights(sym) {
    return accuAdaptiveWeights[sym] || { ...ACCU_BASE_WEIGHTS };
}

function runAdaptiveLearning(sym) {
    const trades = accuTradeAnalytics.filter(t => t.market === sym);
    if (trades.length < 100 || trades.length % 100 !== 0) return;

    const wins   = trades.filter(t => t.result === 'TP');
    const losses = trades.filter(t => t.result === 'Loss');
    if (wins.length < 10 || losses.length < 10) return; // not enough of both to learn from

    const avg = (arr, key) => arr.length ? arr.reduce((s,t) => s + (t.factors?.[key] || 0), 0) / arr.length : 0;
    const factors = ['trend','momentum','volatility','priceBehavior','structure'];
    const weights = getAdaptiveWeights(sym);
    let total = 0;

    factors.forEach(f => {
        const winAvg  = avg(wins, f);
        const lossAvg = avg(losses, f);
        const edge    = winAvg - lossAvg; // positive = factor correlates with wins
        // Nudge by up to Ã‚Â±0.03 per learning pass, bounded to [0.08, 0.35]
        const delta   = Math.max(-0.03, Math.min(0.03, edge / 400));
        weights[f]    = Math.max(0.08, Math.min(0.35, (weights[f] ?? ACCU_BASE_WEIGHTS[f]) + delta));
        total += weights[f];
    });
    // Renormalize so weights still sum to 1
    factors.forEach(f => weights[f] = weights[f] / total);

    accuAdaptiveWeights[sym] = weights;
    log(`Ã°Å¸Â§Â  Adaptive learning: recalibrated weights for ${MKT[sym]||sym} after ${trades.length} trades`, 'i');
}

// ================================================================
// MARKET BEHAVIOUR ENGINE
// Looks at raw tick flow rather than lagging indicators Ã¢â‚¬â€ speed,
// acceleration, directional-change frequency, stability/noise, a
// short-horizon micro-trend read, and spike/reversal detection.
// ================================================================
function analyzeTickFlow(sym) {
    const times  = accuTickTimes[sym] || [];
    const mm     = marketMemory[sym];
    const prices = mm?.prices || [];
    if (prices.length < 10) return null;

    // Tick speed Ã¢â‚¬â€ ticks per second from real arrival timestamps
    let ticksPerSec = null;
    if (times.length >= 5) {
        const span = (times[times.length-1] - times[0]) / 1000;
        ticksPerSec = span > 0 ? (times.length - 1) / span : null;
    }

    // Acceleration Ã¢â‚¬â€ is tick speed increasing or decreasing?
    let accel = 'steady';
    if (times.length >= 10) {
        const half = Math.floor(times.length / 2);
        const firstSpan = (times[half] - times[0]) / 1000;
        const secondSpan = (times[times.length-1] - times[half]) / 1000;
        const firstRate  = firstSpan > 0 ? half / firstSpan : 0;
        const secondRate = secondSpan > 0 ? (times.length - half) / secondSpan : 0;
        if (secondRate > firstRate * 1.2) accel = 'accelerating';
        else if (secondRate < firstRate * 0.8) accel = 'decelerating';
    }

    // Directional change frequency Ã¢â‚¬â€ how often does tick-to-tick direction flip?
    const recent = prices.slice(-30);
    let flips = 0;
    for (let i = 2; i < recent.length; i++) {
        const prevDir = recent[i-1] - recent[i-2];
        const curDir  = recent[i] - recent[i-1];
        if ((prevDir > 0 && curDir < 0) || (prevDir < 0 && curDir > 0)) flips++;
    }
    const flipRate = recent.length > 2 ? flips / (recent.length - 2) : 0;

    // Momentum Ã¢â‚¬â€ net directional bias over the recent window
    const netMove  = recent.length > 1 ? recent[recent.length-1] - recent[0] : 0;
    const avgAbs   = recent.length > 1
        ? recent.slice(1).reduce((s,p,i) => s + Math.abs(p - recent[i]), 0) / (recent.length - 1)
        : 0;
    const tickMomentum = avgAbs > 0 ? netMove / (avgAbs * recent.length) : 0; // roughly -1..1

    return { ticksPerSec, accel, flipRate, tickMomentum };
}

// Micro trend over the last 20-100 ticks Ã¢â‚¬â€ up / down / sideways bias
function detectMicroTrend(prices) {
    if (!prices || prices.length < 20) return { bias: 'unknown', strength: 0, label: 'Ã¢â‚¬â€' };
    const window = prices.slice(-Math.min(100, prices.length));
    const up   = window.filter((p,i) => i > 0 && p > window[i-1]).length;
    const down = window.filter((p,i) => i > 0 && p < window[i-1]).length;
    const total = window.length - 1;
    const upPct = total > 0 ? up / total : 0.5;
    const downPct = total > 0 ? down / total : 0.5;

    let bias = 'sideways', label = 'Ã¢Å¾Â¡ Sideways';
    if (upPct >= 0.58) { bias = 'up'; label = 'Ã°Å¸â€œË† Upward bias'; }
    else if (downPct >= 0.58) { bias = 'down'; label = 'Ã°Å¸â€œâ€° Downward bias'; }
    const strength = Math.round(Math.abs(upPct - downPct) * 100);
    return { bias, strength, label };
}

// Reversal / spike guard Ã¢â‚¬â€ true when the market just did something the
// engine should wait out rather than trade into immediately.
function detectReversalRisk(prices) {
    if (!prices || prices.length < 12) return { risk: false, reason: null };
    const recent = prices.slice(-12);
    const moves  = [];
    for (let i = 1; i < recent.length; i++) moves.push(recent[i] - recent[i-1]);
    const avgAbsMove = moves.reduce((s,m) => s + Math.abs(m), 0) / moves.length;
    const lastMove    = moves[moves.length - 1];
    const prevMove    = moves[moves.length - 2] || 0;

    // Very large spike on the last tick
    if (avgAbsMove > 0 && Math.abs(lastMove) > avgAbsMove * 4) {
        return { risk: true, reason: 'Very large spike on the last tick' };
    }
    // Rapid reversal Ã¢â‚¬â€ sharp move immediately followed by an opposite sharp move
    if (avgAbsMove > 0 && Math.abs(prevMove) > avgAbsMove * 2.5 &&
        Math.sign(prevMove) !== Math.sign(lastMove) && Math.abs(lastMove) > avgAbsMove * 2) {
        return { risk: true, reason: 'Rapid reversal just occurred' };
    }
    // Unusually long directional run Ã¢â‚¬â€ market is stretched, due for a pause
    let runLen = 1;
    for (let i = moves.length - 1; i > 0; i--) {
        if (Math.sign(moves[i]) === Math.sign(moves[i-1]) && Math.sign(moves[i]) !== 0) runLen++;
        else break;
    }
    if (runLen >= 9) {
        return { risk: true, reason: `Unusually long ${runLen}-tick directional run` };
    }
    return { risk: false, reason: null };
}

// Market regime classification Ã¢â‚¬â€ combines trend strength and volatility
// into one label, and the confidence threshold adapts to it (calm markets
// can trade at a lower bar, explosive markets need a much higher one).
function classifyRegime(trendStrength, stabilityScore, flipRate) {
    // trendStrength: 0-100 (how directional), stabilityScore: 0-100 (higher = calmer)
    if (stabilityScore >= 80 && trendStrength < 20) return { regime: 'Calm',      icon: 'Ã°Å¸Å¸Â¢', thresholdAdj: -5  };
    if (stabilityScore >= 55 && trendStrength >= 35) return { regime: 'Trending', icon: 'Ã°Å¸Å¸Â¢', thresholdAdj: 0   };
    if (stabilityScore < 30 || flipRate > 0.65)      return { regime: 'Explosive',icon: 'Ã°Å¸â€Â´', thresholdAdj: 15  };
    if (stabilityScore < 50)                          return { regime: 'Volatile', icon: 'Ã°Å¸Å¸Â ', thresholdAdj: 8   };
    return { regime: 'Normal', icon: 'Ã°Å¸Å¸Â¡', thresholdAdj: 0 };
}

// ================================================================
// DYNAMIC WEIGHTED CONFIDENCE ENGINE
// Every factor contributes partial credit rather than gating the trade Ã¢â‚¬â€
// this keeps trade frequency healthy (including on fast 1s markets)
// while still steering away from poor-quality entries.
// Weighting: Trend 25% | Momentum 20% | Volatility 20% | Price Behaviour 20% | Market Structure 15%
// ================================================================
function calcAccuConfidence(sym) {
    const mm = marketMemory[sym] || { prices: [] };
    const prices = mm.prices || [];
    const profile = getMarketProfile(sym);
    const minTicks = Math.max(20, profile.bbPeriod);

    if (prices.length < minTicks) {
        return { ready: false, ticksNeeded: minTicks - prices.length, profile };
    }

    const last    = prices[prices.length - 1];
    const emaFast = calcEMA(prices, profile.emaFast);
    const emaSlow = calcEMA(prices, Math.min(profile.emaSlow, prices.length - 1));
    const rsi     = calcRSI(prices, profile.rsiPeriod);
    const rsiPrev = prices.length > 2 ? calcRSI(prices.slice(0, -1), profile.rsiPeriod) : null;
    const bb      = calcBollingerBands(prices, profile.bbPeriod, 2);
    const atr     = calcATR(prices, profile.atrPeriod);
    const stab    = calcTickStability(prices);
    const flow    = analyzeTickFlow(sym);
    const micro   = detectMicroTrend(prices);
    const reversal = detectReversalRisk(prices);

    // Ã¢â€â‚¬Ã¢â€â‚¬ TREND (25%) Ã¢â‚¬â€ EMA fast>slow +15, price above EMA +10 Ã¢â€â‚¬Ã¢â€â‚¬
    let trendScore = 0;
    let emaTrendLabel = 'Ã¢â‚¬â€';
    if (emaFast !== null && emaSlow !== null) {
        const aligned = emaFast > emaSlow;
        emaTrendLabel = aligned ? `Ã°Å¸â€œË† Bullish (EMA${profile.emaFast}>${profile.emaSlow})` : `Ã°Å¸â€œâ€° Bearish (EMA${profile.emaFast}<${profile.emaSlow})`;
        if (aligned) trendScore += 60; // scaled to 100, weighted below (15/25 of trend)
        if (last > emaFast) trendScore += 40; // (10/25 of trend)
    }
    trendScore = Math.min(100, trendScore);

    // Ã¢â€â‚¬Ã¢â€â‚¬ MOMENTUM (20%) Ã¢â‚¬â€ RSI 48-65 +10, RSI rising +10 Ã¢â€â‚¬Ã¢â€â‚¬
    let momentumScore = 0;
    if (rsi !== null) {
        if (rsi >= 48 && rsi <= 65) momentumScore += 50;
        else if (rsi > 65 && rsi <= 72) momentumScore += 20;
        else if (rsi >= 40 && rsi < 48) momentumScore += 20;
        if (rsiPrev !== null && rsi > rsiPrev) momentumScore += 50;
    }
    momentumScore = Math.min(100, momentumScore);

    // Ã¢â€â‚¬Ã¢â€â‚¬ VOLATILITY (20%) Ã¢â‚¬â€ BB not excessively wide +10, stable volatility +10 Ã¢â€â‚¬Ã¢â€â‚¬
    let volatilityScore = 0;
    if (bb) {
        const wideCeiling = 0.5 * profile.volTolerance;
        if (bb.bandwidth < wideCeiling) volatilityScore += 50;
        else if (bb.bandwidth < wideCeiling * 1.5) volatilityScore += 20;
    }
    if (stab) volatilityScore += Math.round(stab.score * 0.5);
    volatilityScore = Math.min(100, volatilityScore);

    // Ã¢â€â‚¬Ã¢â€â‚¬ PRICE BEHAVIOUR (20%) Ã¢â‚¬â€ no sudden spikes +10, smooth tick movement +10 Ã¢â€â‚¬Ã¢â€â‚¬
    let priceBehaviorScore = 0;
    if (!reversal.risk) priceBehaviorScore += 50;
    if (stab) priceBehaviorScore += Math.round(Math.max(0, 100 - stab.jumpFreq * 300) * 0.5);
    priceBehaviorScore = Math.min(100, priceBehaviorScore);

    // Ã¢â€â‚¬Ã¢â€â‚¬ MARKET STRUCTURE (15%) Ã¢â‚¬â€ directional consistency +10, not right after a big move +5 Ã¢â€â‚¬Ã¢â€â‚¬
    let structureScore = 0;
    if (micro.bias !== 'sideways' && micro.bias !== 'unknown') structureScore += Math.min(67, 40 + micro.strength);
    else structureScore += 20;
    if (!reversal.risk) structureScore += 33;
    structureScore = Math.min(100, structureScore);

    // Ã¢â€â‚¬Ã¢â€â‚¬ REGIME DETECTION Ã¢â‚¬â€ adjusts the effective entry threshold Ã¢â€â‚¬Ã¢â€â‚¬
    const trendStrength = Math.abs((micro.strength || 0));
    const regimeInfo = classifyRegime(trendStrength, stab ? stab.score : 50, flow ? flow.flipRate : 0.3);

    // Ã¢â€â‚¬Ã¢â€â‚¬ WEIGHTED SCORE (adaptive weights, learned per market over time) Ã¢â€â‚¬Ã¢â€â‚¬
    const w = getAdaptiveWeights(sym);
    const score = Math.round(
        trendScore         * w.trend +
        momentumScore       * w.momentum +
        volatilityScore     * w.volatility +
        priceBehaviorScore  * w.priceBehavior +
        structureScore      * w.structure
    );

    const effectiveThreshold = 75 + regimeInfo.thresholdAdj; // baseline "Good Entry" bar, shifted by regime

    let label, color;
    if (score >= 90)      { label = 'Ã°Å¸Å¸Â¢ Excellent Entry'; color = 'var(--green)'; }
    else if (score >= 80) { label = 'Ã°Å¸Å¸Â¢ Great Entry';     color = 'var(--green)'; }
    else if (score >= 75) { label = 'Ã°Å¸Å¸Â¡ Good Entry';      color = 'var(--amber)'; }
    else                  { label = 'Ã°Å¸â€Â´ No Trade';        color = 'var(--red)';   }

    // Loss-prevention overrides Ã¢â‚¬â€ these can block a trade even if the
    // weighted score alone looks acceptable.
    const blockers = [];
    if (reversal.risk) blockers.push(reversal.reason);
    if (stab && stab.jumpFreq > 0.15) blockers.push('Erratic tick movement (frequent jumps)');
    if (regimeInfo.regime === 'Explosive') blockers.push('Market regime is Explosive');
    const lossPreventionBlocked = blockers.length > 0;

    const tradeOk = score >= effectiveThreshold && !lossPreventionBlocked;

    return {
        ready: true, score, label, color, tradeOk, effectiveThreshold,
        emaFast, emaSlow, emaTrendLabel, rsi, bb, atr, stab, flow, micro, reversal,
        regime: regimeInfo, blockers, profile,
        breakdown: { trendScore, momentumScore, volatilityScore, priceBehaviorScore, structureScore },
        weights: w
    };
}

// Human-readable spike-risk label for the dashboard
function spikeRiskLabel(conf) {
    if (!conf.ready) return { text: 'Ã¢â‚¬â€', color: 'var(--muted)' };
    if (conf.reversal?.risk) return { text: 'High', color: 'var(--red)' };
    if (conf.stab && conf.stab.jumpFreq > 0.08) return { text: 'Elevated', color: 'var(--amber)' };
    return { text: 'Low', color: 'var(--green)' };
}

function updateAccuAnalysis(sym) {
    const conf = calcAccuConfidence(sym);
    accuLastConfidence[sym] = conf;

    const set = (id,v,col) => { const el=document.getElementById(id); if(el){ el.textContent=v; if(col) el.style.color=col; } };

    if (!conf.ready) {
        set('accu-rsi', 'Ã¢â‚¬â€'); set('accu-rsi-label', 'Collecting...');
        set('accu-bb-width', 'Ã¢â‚¬â€'); set('accu-bb-label', 'Collecting...');
        set('accu-adx', 'Ã¢â‚¬â€'); set('accu-adx-label', 'Collecting...');
        set('accu-ema-trend', 'Ã¢â‚¬â€');
        set('accu-atr', 'Ã¢â‚¬â€');
        set('accu-tick-stability', 'Ã¢â‚¬â€');
        set('accu-regime', 'Ã¢â‚¬â€'); set('accu-spike-risk', 'Ã¢â‚¬â€'); set('accu-micro-trend', 'Ã¢â‚¬â€');
        const sigBox = document.getElementById('accu-signal-box');
        if (sigBox) sigBox.innerHTML = `<div style="font-size:11px;color:var(--muted);">Collecting data... need ${conf.ticksNeeded} more ticks (${conf.profile.speedClass} market profile)</div>`;
        return;
    }

    // RSI
    set('accu-rsi', conf.rsi ?? 'Ã¢â‚¬â€', conf.rsi > 70 ? 'var(--red)' : conf.rsi < 30 ? 'var(--green)' : '#60a5fa');
    set('accu-rsi-label', conf.rsi > 70 ? 'Overbought' : conf.rsi < 30 ? 'Oversold' : (conf.rsi >= 48 && conf.rsi <= 65) ? 'Sweet spot' : 'Neutral');

    // BB
    if (conf.bb) {
        set('accu-bb-width', conf.bb.bandwidth.toFixed(2) + '%', conf.breakdown.volatilityScore >= 60 ? 'var(--green)' : conf.breakdown.volatilityScore >= 35 ? 'var(--amber)' : 'var(--red)');
        set('accu-bb-label', conf.bb.bandwidth < 0.1 ? 'Squeezing Ã¢Å“â€¦' : conf.bb.bandwidth < 0.4 ? 'Normal' : 'Wide Ã¢Å¡Â Ã¯Â¸Â');
    }

    // Tick speed (repurposed "ADX" tile)
    const tps = conf.flow?.ticksPerSec;
    set('accu-adx', tps !== null && tps !== undefined ? `${tps.toFixed(1)}/s` : 'Ã¢â‚¬â€', 'var(--amber)');
    set('accu-adx-label', conf.flow ? (conf.flow.accel === 'accelerating' ? 'Accelerating' : conf.flow.accel === 'decelerating' ? 'Decelerating' : 'Steady') : 'Ã¢â‚¬â€');

    // EMA trend
    set('accu-ema-trend', conf.emaTrendLabel, conf.emaFast > conf.emaSlow ? 'var(--green)' : 'var(--red)');

    // ATR
    set('accu-atr', conf.atr !== null ? conf.atr.toFixed(5) : 'Ã¢â‚¬â€', 'var(--muted)');

    // Tick stability
    if (conf.stab) {
        set('accu-tick-stability', `${conf.stab.score}/100`, conf.stab.score >= 70 ? 'var(--green)' : conf.stab.score >= 40 ? 'var(--amber)' : 'var(--red)');
    }

    // Market regime
    set('accu-regime', `${conf.regime.icon} ${conf.regime.regime}`, conf.regime.regime === 'Calm' || conf.regime.regime === 'Trending' ? 'var(--green)' : conf.regime.regime === 'Explosive' ? 'var(--red)' : 'var(--amber)');

    // Spike risk
    const spike = spikeRiskLabel(conf);
    set('accu-spike-risk', spike.text, spike.color);

    // Micro trend
    set('accu-micro-trend', conf.micro.label, conf.micro.bias === 'up' ? 'var(--green)' : conf.micro.bias === 'down' ? 'var(--red)' : 'var(--muted)');

    // Volatility meter Ã¢â‚¬â€ driven by the volatility sub-score
    const volBar   = document.getElementById('accu-vol-bar');
    const volLabel = document.getElementById('accu-vol-label');
    const volPct   = 100 - conf.breakdown.volatilityScore;
    if (volBar)   { volBar.style.width = Math.max(5, volPct) + '%'; volBar.style.background = conf.breakdown.volatilityScore >= 60 ? 'var(--green)' : conf.breakdown.volatilityScore >= 35 ? 'var(--amber)' : 'var(--red)'; }
    if (volLabel) { volLabel.textContent = conf.breakdown.volatilityScore >= 60 ? 'Low Ã¢Å“â€¦' : conf.breakdown.volatilityScore >= 35 ? 'Medium Ã¢Å¡Â Ã¯Â¸Â' : 'High Ã¢ÂÅ’'; volLabel.style.color = volBar ? volBar.style.background : ''; }

    // Safe ticks in a row (kept for the "Live Price" card context)
    const safeTicks = document.getElementById('accu-safe-ticks');
    const mm = marketMemory[sym];
    if (safeTicks && mm && mm.prices.length >= 5) {
        const recent = mm.prices.slice(-20);
        let consecutive = 0;
        for (let i = recent.length-1; i > 0; i--) {
            const change = Math.abs((recent[i] - recent[i-1]) / recent[i-1]) * 100;
            if (change < 0.5) consecutive++;
            else break;
        }
        safeTicks.textContent = consecutive;
        safeTicks.style.color = consecutive > 10 ? 'var(--green)' : consecutive > 5 ? 'var(--amber)' : 'var(--red)';
    }

    // Ã¢â€â‚¬Ã¢â€â‚¬ AI Market Scanner dashboard Ã¢â‚¬â€ Market Health + Recommendation Ã¢â€â‚¬Ã¢â€â‚¬
    const sigBox    = document.getElementById('accu-signal-box');
    const growthRec = document.getElementById('accu-growth-rec');
    if (sigBox) {
        const b = conf.breakdown;
        const recommend = conf.tradeOk
            ? `<span style="color:var(--green);">Ã°Å¸Å¸Â¢ ENTER</span>`
            : conf.blockers.length > 0
                ? `<span style="color:var(--red);">Ã°Å¸â€Â´ WAIT Ã¢â‚¬â€ ${conf.blockers[0]}</span>`
                : `<span style="color:var(--amber);">Ã°Å¸Å¸Â¡ WAIT Ã¢â‚¬â€ below ${conf.effectiveThreshold}% threshold</span>`;

        sigBox.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
                <div style="font-size:16px;font-weight:900;color:${conf.color};">Market Health: ${conf.score}%</div>
                <div style="font-size:12px;font-weight:900;color:${conf.color};">${conf.label}</div>
            </div>
            <div class="pbar" style="margin-bottom:8px;"><div class="pbar-fill" style="width:${conf.score}%;background:${conf.color};"></div></div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:9px;color:var(--muted);text-align:left;margin-bottom:8px;">
                <div>Regime: <b style="color:var(--text);">${conf.regime.icon} ${conf.regime.regime}</b></div>
                <div>Threshold (adaptive): <b style="color:var(--text);">${conf.effectiveThreshold}%</b></div>
                <div>Trend (${Math.round(conf.weights.trend*100)}%): <b style="color:var(--text);">${Math.round(b.trendScore)}</b></div>
                <div>Momentum (${Math.round(conf.weights.momentum*100)}%): <b style="color:var(--text);">${Math.round(b.momentumScore)}</b></div>
                <div>Volatility (${Math.round(conf.weights.volatility*100)}%): <b style="color:var(--text);">${Math.round(b.volatilityScore)}</b></div>
                <div>Price Behaviour (${Math.round(conf.weights.priceBehavior*100)}%): <b style="color:var(--text);">${Math.round(b.priceBehaviorScore)}</b></div>
                <div>Structure (${Math.round(conf.weights.structure*100)}%): <b style="color:var(--text);">${Math.round(b.structureScore)}</b></div>
                <div>Tick Stability: <b style="color:var(--text);">${conf.stab ? conf.stab.score : 'Ã¢â‚¬â€'}%</b></div>
            </div>
            <div style="font-size:11px;font-weight:700;text-align:left;">Recommendation: ${recommend}</div>`;

        // Recommend growth rate based on the volatility sub-score
        const recRate = b.volatilityScore >= 75 ? '3%' : b.volatilityScore >= 50 ? '2%' : '1%';
        if (growthRec) growthRec.textContent = `AI recommends: ${recRate} for this market`;
    }
}

function updateAccuProfitCalc() {
    const stake  = parseFloat(document.getElementById('accu-stake')?.value || 1);
    const table  = document.getElementById('accu-profit-table');
    if (!table) return;

    const milestones = [5, 10, 15, 20, 25, 30, 50];
    table.innerHTML = milestones.map(ticks => {
        const profit = stake * (Math.pow(1 + accuGrowthRate, ticks) - 1);
        const total  = stake + profit;
        return `<div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid var(--border);">
            <span style="color:var(--muted);">${ticks} ticks</span>
            <span style="color:var(--green);font-weight:700;font-family:monospace;">+$${profit.toFixed(2)}</span>
            <span style="color:var(--text);font-family:monospace;">= $${total.toFixed(2)}</span>
        </div>`;
    }).join('');
}

function toggleAccumulator() {
    if (!derivWS || derivWS.readyState !== WebSocket.OPEN) {
        notify("Not Connected", "Please log in to your Deriv account first.", 'err');
        return;
    }

    // If waiting for great entry, cancel
    if (accuWaiting) { cancelWaiting(); return; }

    const btn = document.getElementById('accu-run-btn');
    const sellBtn = document.getElementById('accu-sell-btn');

    if (!accuRunning) {
        const stake = parseFloat(document.getElementById('accu-stake')?.value || 1);
        const tp    = parseFloat(document.getElementById('accu-tp')?.value || 0.10);
        if (stake < 1) { notify("Invalid Stake", "Minimum accumulator stake is $1.", 'err'); return; }

        // Check confidence score before starting
        const conf = calcAccuConfidence(accuMarket);
        if (conf.ready && !conf.tradeOk) {
            notify('Ã¢Å¡Â Ã¯Â¸Â Poor Entry Conditions', `Confidence ${conf.score}% (${conf.label}). Waiting for a better entry...`, 'warn');
            log(`Ã¢ÂÂ³ Waiting for a qualifying entry (current: ${conf.score}%)...`, 'x');
            startWatchingForGreatEntry(stake, tp);
            return;
        }

        accuRunning       = true;
        accuTickCount     = 0;
        accuCurrentProfit = 0;

        if (btn)     { btn.textContent = 'Ã¢Â¬â€º Stop Accumulator'; btn.classList.remove('btn-teal'); btn.classList.add('btn-red'); }
        if (sellBtn)  sellBtn.style.display = 'block';

        // Send accumulator proposal
        const proposal = {
            proposal:          1,
            amount:            stake,
            basis:             "stake",
            contract_type:     "ACCU",
            currency:          "USD",
            underlying_symbol: accuMarket,
            growth_rate:       accuGrowthRate,
            limit_order:       { take_profit: tp },
            req_id:            nextReqId()
        };

        log(`Ã°Å¸â€œË† Accumulator proposal: ${MKT[accuMarket]||accuMarket} | Growth: ${(accuGrowthRate*100)}% | Stake: $${stake} | TP: $${tp} | Confidence: ${conf.ready ? conf.score+'%' : 'n/a'}`, 'i');
        derivWS.send(JSON.stringify(proposal));

    } else {
        // Stop Ã¢â‚¬â€ sell the contract
        sellAccumulator();
    }
}

function sellAccumulator() {
    if (!accuContractId) {
        accuRunning = false;
        resetAccuUI();
        return;
    }
    // Sell contract to take profit
    derivWS.send(JSON.stringify({ sell: accuContractId, price: 0, req_id: nextReqId() }));
    log(`Ã°Å¸â€™Â° Selling accumulator contract #${accuContractId}`, 'i');
}

function resetAccuUI() {
    const btn     = document.getElementById('accu-run-btn');
    const sellBtn = document.getElementById('accu-sell-btn');
    accuRunning    = false;
    accuContractId = null;
    if (btn)     { btn.textContent = 'Ã¢â€“Â¶ Start Accumulator'; btn.classList.remove('btn-red'); btn.classList.add('btn-teal'); }
    if (sellBtn)  sellBtn.style.display = 'none';
    const info = document.getElementById('accu-contract-info');
    if (info) info.textContent = 'No active contract';
}

// Ã¢â€â‚¬Ã¢â€â‚¬ FULL RESET Ã¢â‚¬â€ clears everything for a fresh Accumulator session
// without reloading the page, similar to DBot's Reset button. Ã¢â€â‚¬Ã¢â€â‚¬
function resetAccumulator() {
    // Stop any running contract / watcher / auto mode first
    if (accuWatchInterval) { clearInterval(accuWatchInterval); accuWatchInterval = null; }
    accuWaiting = false;
    if (accuAutoEnabled) {
        // Silent stop Ã¢â‚¬â€ we're about to reset everything anyway
        accuAutoEnabled = false;
        const track = document.getElementById('accu-auto-track');
        const thumb = document.getElementById('accu-auto-thumb');
        const bar   = document.getElementById('accu-auto-bar');
        if (track) track.style.background = 'var(--border)';
        if (thumb) thumb.style.left       = '3px';
        if (bar)   bar.style.display      = 'none';
    }
    accuAutoRunning = false;
    if (accuRunning && accuContractId && derivWS && derivWS.readyState === WebSocket.OPEN) {
        derivWS.send(JSON.stringify({ sell: accuContractId, price: 0, req_id: nextReqId() }));
    }

    // Reset session state
    accuRunning        = false;
    accuContractId     = null;
    accuTickCount       = 0;
    accuCurrentProfit   = 0;
    accuSessions        = 0;
    accuTpHits          = 0;
    accuTotalPL         = 0;
    accuNotifFired      = false;
    accuSettledContractIds = new Set();
    accuTradeAnalytics  = [];

    // Reset UI
    resetAccuUI();
    updateAccuAutoStats();
    const priceEl  = document.getElementById('accu-price');
    const digitEl  = document.getElementById('accu-last-digit');
    const tickEl   = document.getElementById('accu-tick-count');
    const profitEl = document.getElementById('accu-current-profit');
    if (priceEl)  priceEl.textContent  = 'Ã¢â‚¬â€';
    if (digitEl)  digitEl.textContent  = 'Last digit: Ã¢â‚¬â€';
    if (tickEl)   tickEl.textContent   = '0';
    if (profitEl) { profitEl.textContent = '$0.00'; profitEl.style.color = 'var(--green)'; }

    const h = document.getElementById('accu-history');
    if (h) h.innerHTML = '<div style="font-size:11px;color:var(--dim);text-align:center;padding:16px;">No accumulator trades yet</div>';

    // Clear any leftover notification suppression keys for a clean slate
    const btn = document.getElementById('accu-run-btn');
    if (btn) { btn.style.opacity = '1'; }

    log('Ã°Å¸â€â€ž Accumulator session reset Ã¢â‚¬â€ ready for a fresh start', 'i');
    notify('Ã°Å¸â€â€ž Accumulator Reset', 'Session cleared. Profit/loss, history and counters are back to zero.', 'ok');
}

function handleAccuContractUpdate(c) {
    if (!c) return;

    // Update tick count and current profit
    const tickEl   = document.getElementById('accu-tick-count');
    const profitEl = document.getElementById('accu-current-profit');
    const infoEl   = document.getElementById('accu-contract-info');

    if (c.tick_count !== undefined && tickEl) {
        accuTickCount = c.tick_count;
        tickEl.textContent = accuTickCount;
        tickEl.style.color = accuTickCount > 15 ? 'var(--green)' : accuTickCount > 5 ? 'var(--amber)' : 'var(--teal)';
    }

    if (c.profit !== undefined) {
        accuCurrentProfit = parseFloat(c.profit);
        if (profitEl) {
            profitEl.textContent = `$${accuCurrentProfit.toFixed(2)}`;
            profitEl.style.color = accuCurrentProfit >= 0 ? 'var(--green)' : 'var(--red)';
        }
    }

    if (infoEl) {
        infoEl.innerHTML = `
            <div style="font-size:11px;">Contract: <b style="color:var(--teal);">#${c.contract_id||'Ã¢â‚¬â€'}</b></div>
            <div style="font-size:11px;">Growth Rate: <b style="color:var(--teal);">${((accuGrowthRate||0.02)*100)}%</b></div>
            <div style="font-size:11px;">Ticks: <b style="color:var(--green);">${accuTickCount}</b></div>`;
    }

    // Contract settled Ã¢â‚¬â€ this path is superseded by the idempotent override
    // installed below, which is the one actually wired up at runtime.
    if (c.is_sold || c.is_expired) {
        if (accuSettledContractIds.has(c.contract_id)) return; // already processed
        accuSettledContractIds.add(c.contract_id);

        const profit   = parseFloat(c.profit || 0);
        const stake    = parseFloat(document.getElementById('accu-stake')?.value || 1);
        const isWin    = profit > 0;

        // Add to history
        addAccuHistory(accuMarket, accuGrowthRate, stake, accuTickCount, profit, isWin);

        log(`${isWin ? 'Ã¢Å“â€¦' : 'Ã¢ÂÅ’'} Accumulator ${isWin ? 'sold' : 'knocked out'} | ${accuTickCount} ticks | P/L: $${profit.toFixed(2)}`, isWin ? 'w' : 'l');

        if (isWin) { try { playWin(); } catch(e) {} }
        else       { try { playLoss(); } catch(e) {} }

        resetAccuUI();
        if (profitEl) { profitEl.textContent = `$${profit.toFixed(2)}`; profitEl.style.color = isWin ? 'var(--green)' : 'var(--red)'; }
    }
}

function addAccuHistory(market, growth, stake, ticks, profit, isWin, confidence) {
    const container = document.getElementById('accu-history');
    if (!container) return;
    const empty = container.querySelector('[style*="text-align:center"]');
    if (empty) empty.remove();

    const confStr = (confidence !== undefined && confidence !== null) ? `${confidence}%` : 'Ã¢â‚¬â€';

    const row = document.createElement('div');
    row.style.cssText = `display:flex;align-items:center;padding:6px 0;border-bottom:1px solid var(--border);font-size:11px;`;
    row.innerHTML = `
        <div style="width:70px;color:var(--muted);">${MKT[market]?.replace('Volatility','V')||market}</div>
        <div style="flex:1;color:var(--muted);">${(growth*100)}%</div>
        <div style="width:60px;font-family:monospace;">$${stake.toFixed(2)}</div>
        <div style="width:60px;color:var(--teal);">${ticks}</div>
        <div style="width:60px;color:var(--amber);">${confStr}</div>
        <div style="width:90px;text-align:right;font-weight:700;font-family:monospace;color:${isWin?'var(--green)':'var(--red)'};">${isWin?'+':''}$${profit.toFixed(2)}</div>`;
    container.insertBefore(row, container.firstChild);
}

// Wire into routeMsg for accumulator proposal + contract updates
// handled in existing proposal and proposal_open_contract handlers

// ================================================================
// ACCUMULATOR ENTRY QUALITY CHECK Ã¢â‚¬â€ now backed by the multi-factor
// confidence engine above. Kept as a thin wrapper for readability at
// call sites and for backwards compatibility with existing code paths.
// ================================================================

function getAccuEntryQuality(sym) {
    const conf = calcAccuConfidence(sym);
    if (!conf.ready) return 'loading';
    if (conf.score >= 90) return 'excellent';
    if (conf.score >= 80) return 'great';
    if (conf.score >= 75) return 'good';
    return 'bad';
}

// Does the current confidence reading clear BOTH the engine's own adaptive
// threshold (regime-adjusted, loss-prevention aware) AND the user's Auto
// Mode threshold setting? Manual starts only need the engine's own bar.
// Also enforces a brief stabilization cooldown after the previous trade
// closed, per the loss-prevention rule: don't re-enter into a market that
// hasn't settled down yet.
const ACCU_STABILIZE_COOLDOWN_MS = 1200;
let accuLastSettleTime = 0;

function meetsAutoThreshold(conf) {
    if (!conf.ready) return false;
    if (Date.now() - accuLastSettleTime < ACCU_STABILIZE_COOLDOWN_MS) return false;
    const userThreshold = parseFloat(document.getElementById('accu-conf-threshold')?.value || 75);
    return conf.tradeOk && conf.score >= userThreshold;
}

let accuWatchInterval = null;
let accuWaiting       = false;

// Continuous market monitor Ã¢â‚¬â€ this is the "Smart Auto Mode" watcher.
// It keeps re-evaluating market health (not just polling for one static
// condition), automatically pausing through Explosive/blocked regimes and
// resuming the instant a qualifying reading returns.
function startWatchingForGreatEntry(stake, tp) {
    if (accuWatchInterval) clearInterval(accuWatchInterval);
    accuWaiting = true;

    // Update run button to show waiting state
    const btn = document.getElementById('accu-run-btn');
    if (btn) { btn.textContent = 'Ã¢ÂÂ³ Monitoring market...'; btn.style.opacity = '0.7'; }

    log('Ã¢ÂÂ³ Smart monitor active Ã¢â‚¬â€ watching for a qualifying entry...', 'i');

    accuWatchInterval = setInterval(() => {
        if (!accuWaiting) { clearInterval(accuWatchInterval); return; }

        const conf = calcAccuConfidence(accuMarket);
        if (!conf.ready) { log('Ã°Å¸â€œÅ  Still collecting data for confidence score...', 'd'); return; }

        const isAutoRestart = accuAutoRunning;
        const qualifies = isAutoRestart ? meetsAutoThreshold(conf) : conf.tradeOk;

        if (!qualifies) {
            const why = conf.blockers.length ? conf.blockers[0] : `score ${conf.score}% below ${conf.effectiveThreshold}% threshold`;
            log(`Ã°Å¸â€œÅ  Waiting Ã¢â‚¬â€ ${conf.regime.icon} ${conf.regime.regime} | ${why}`, 'd');
            return;
        }

        clearInterval(accuWatchInterval);
        accuWaiting = false;
        const btn2 = document.getElementById('accu-run-btn');
        if (btn2) { btn2.textContent = 'Ã¢â€“Â¶ Start Accumulator'; btn2.style.opacity = '1'; }
        notify('Ã¢Å“â€¦ Qualifying Entry Found!', `Confidence ${conf.score}% (${conf.label}) | Regime: ${conf.regime.regime}. Starting accumulator now!`, 'ok');
        log(`Ã¢Å“â€¦ Qualifying entry detected (${conf.score}%, ${conf.regime.regime}) Ã¢â‚¬â€ starting accumulator!`, 'w');
        toggleAccumulator();
    }, 1500); // fast poll Ã¢â‚¬â€ Smart Auto Mode reacts quickly to changing conditions
}

// Stop watching if user clicks run button again
function cancelWaiting() {
    if (accuWatchInterval) clearInterval(accuWatchInterval);
    accuWaiting = false;
    const btn = document.getElementById('accu-run-btn');
    if (btn) { btn.textContent = 'Ã¢â€“Â¶ Start Accumulator'; btn.style.opacity = '1'; }
    log('Ã¢ÂÅ’ Entry watch cancelled', 'x');
}

// ================================================================
// ACCUMULATOR AUTO MODE
// Runs continuously Ã¢â‚¬â€ entering a new trade whenever a qualifying signal
// appears Ã¢â‚¬â€ until Take Profit, Stop Loss, manual stop, connection loss,
// or an unrecoverable API error. See toggleAccuAuto / stopAccuAuto and the
// idempotent settlement handler below for the restart / stop logic.
// ================================================================

let accuAutoEnabled    = false;
let accuSessions       = 0;
let accuTpHits         = 0;
let accuTotalPL        = 0;
let accuAutoRunning    = false;
let accuNotifFired     = false; // prevents duplicate notifications

function toggleAccuAuto() {
    accuAutoEnabled = !accuAutoEnabled;
    const track = document.getElementById('accu-auto-track');
    const thumb = document.getElementById('accu-auto-thumb');
    const stats = document.getElementById('accu-auto-stats');
    const bar   = document.getElementById('accu-auto-bar');

    if (track) track.style.background = accuAutoEnabled ? 'var(--teal)' : 'var(--border)';
    if (thumb) thumb.style.left       = accuAutoEnabled ? '23px' : '3px';
    if (stats) stats.style.display    = accuAutoEnabled ? 'block' : 'none';
    if (bar)   bar.style.display      = accuAutoEnabled && accuAutoRunning ? 'flex' : 'none';

    log(`Ã°Å¸Â¤â€“ Accumulator Auto Mode: ${accuAutoEnabled ? 'ON' : 'OFF'}`, 'i');
    if (accuAutoEnabled) {
        const sl = parseFloat(document.getElementById('accu-sl')?.value || 0);
        notify('Ã°Å¸Â¤â€“ Auto Mode ON', `Bot will trade continuously.\nTP: $${document.getElementById('accu-tp')?.value || 0.10} per session${sl > 0 ? ` | SL: -$${sl.toFixed(2)} total` : ''}`, 'ok');
    }
}

// reason is optional Ã¢â‚¬â€ 'connection_lost' | 'api_error' | 'stop_loss' | undefined (manual)
function stopAccuAuto(reason) {
    accuAutoEnabled  = false;
    accuAutoRunning  = false;
    if (accuWatchInterval) { clearInterval(accuWatchInterval); accuWatchInterval = null; }
    accuWaiting = false;

    const track = document.getElementById('accu-auto-track');
    const thumb = document.getElementById('accu-auto-thumb');
    const bar   = document.getElementById('accu-auto-bar');
    if (track) track.style.background = 'var(--border)';
    if (thumb) thumb.style.left       = '3px';
    if (bar)   bar.style.display      = 'none';

    // Stop current contract if running (skip for connection loss Ã¢â‚¬â€ socket is already gone)
    if (accuRunning && reason !== 'connection_lost') sellAccumulator();

    const summary = `Sessions: ${accuSessions} | TP Hits: ${accuTpHits} | Total P/L: $${accuTotalPL.toFixed(2)}`;
    log(`Ã°Å¸Â¤â€“ Auto Mode stopped${reason ? ' (' + reason + ')' : ''}. ${summary}`, 'i');

    if (reason === 'stop_loss') {
        notify('Ã¢â€ºâ€ Stop Loss Reached', `Auto Mode stopped Ã¢â‚¬â€ Stop Loss hit.\n${summary}`, 'err');
    } else if (reason === 'connection_lost') {
        notify('Ã°Å¸â€œÂ¡ Connection Lost', `Auto Mode stopped Ã¢â‚¬â€ API connection dropped.\n${summary}`, 'err');
    } else if (reason === 'api_error') {
        notify('Ã¢Å¡Â Ã¯Â¸Â API Error', `Auto Mode stopped Ã¢â‚¬â€ unrecoverable API error.\n${summary}`, 'err');
    } else {
        notify('Ã°Å¸Â¤â€“ Auto Mode Stopped', summary, 'ok');
    }
}

function updateAccuAutoStats() {
    const set = (id, val, col) => {
        const el = document.getElementById(id);
        if (el) { el.textContent = val; if (col) el.style.color = col; }
    };
    set('accu-sessions',      accuSessions);
    set('accu-auto-sessions', accuSessions);
    set('accu-tp-hits',       accuTpHits);
    set('accu-total-pl',      `$${accuTotalPL.toFixed(2)}`, accuTotalPL >= 0 ? 'var(--green)' : 'var(--red)');
    set('accu-auto-pl',       `$${accuTotalPL.toFixed(2)}`, accuTotalPL >= 0 ? 'var(--green)' : 'var(--red)');
}

// Idempotent, single source of truth for accumulator settlement.
// Every proposal_open_contract update for a settled contract is routed
// here; accuSettledContractIds ensures we only act on it ONCE no matter
// how many duplicate update messages Deriv sends for the same contract_id.
// This is also what fixes "Auto Mode stops unexpectedly" Ã¢â‚¬â€ before this
// guard, a duplicate settlement message could re-enter the settlement
// branch, sell/reset state a second time, and desync accuRunning from
// what the UI showed, silently breaking the restart chain.
handleAccuContractUpdate = function(c) {
    if (!c) return;

    // Update tick count and profit display
    const tickEl   = document.getElementById('accu-tick-count');
    const profitEl = document.getElementById('accu-current-profit');
    const infoEl   = document.getElementById('accu-contract-info');

    // Count ticks ourselves Ã¢â‚¬â€ increment on every contract update message
    // Deriv sends proposal_open_contract on every tick while contract is active
    if (!c.is_sold && !c.is_expired && accuContractId && c.contract_id === accuContractId) {
        accuTickCount++;
    }

    // On settlement, use the most reliable source available
    if (c.is_sold || c.is_expired) {
        const derivedFromRemaining = c.tick_count_remaining !== undefined
            ? (c.tick_count - (c.tick_count_remaining || 0))
            : null;
        accuTickCount = parseInt(c.current_spot_count || c.number_of_ticks || derivedFromRemaining || accuTickCount) || accuTickCount;
    }

    if (tickEl) {
        tickEl.textContent = accuTickCount;
        tickEl.style.color = accuTickCount > 15 ? 'var(--green)' : accuTickCount > 5 ? 'var(--amber)' : 'var(--teal)';
    }
    if (c.profit !== undefined) {
        accuCurrentProfit = parseFloat(c.profit);
        if (profitEl) {
            profitEl.textContent = `$${accuCurrentProfit.toFixed(2)}`;
            profitEl.style.color = accuCurrentProfit >= 0 ? 'var(--green)' : 'var(--red)';
        }
    }
    if (infoEl && c.contract_id) {
        infoEl.innerHTML = `
            <div style="font-size:11px;">Contract: <b style="color:var(--teal);">#${c.contract_id}</b></div>
            <div style="font-size:11px;">Growth Rate: <b style="color:var(--teal);">${((accuGrowthRate||0.02)*100)}%</b></div>
            <div style="font-size:11px;">Ticks: <b style="color:var(--green);">${accuTickCount}</b></div>`;
    }

    // Contract settled (sold or knocked out) Ã¢â‚¬â€ IDEMPOTENT GUARD
    if (c.is_sold || c.is_expired) {
        if (!c.contract_id || accuSettledContractIds.has(c.contract_id)) {
            // Either no contract id to key on, or we've already fully
            // processed this settlement Ã¢â‚¬â€ ignore the duplicate update.
            return;
        }
        accuSettledContractIds.add(c.contract_id);

        const profit = parseFloat(c.profit || 0);
        const stake  = parseFloat(document.getElementById('accu-stake')?.value || 1);
        const isWin  = profit > 0;
        const tp     = parseFloat(document.getElementById('accu-tp')?.value || 0.10);
        const sl     = parseFloat(document.getElementById('accu-sl')?.value || 0);

        // Final tick count from contract Ã¢â‚¬â€ check all possible fields
        const finalTicks = c.current_spot_count || c.number_of_ticks || accuTickCount || 0;
        accuTickCount = parseInt(finalTicks) || accuTickCount;

        // Snapshot the confidence score that was live when this trade was opened
        const confSnapshot = accuLastConfidence[accuMarket];
        const confScore    = confSnapshot && confSnapshot.ready ? confSnapshot.score : undefined;

        // Update auto stats
        accuSessions++;
        accuTotalPL += profit;
        if (isWin && profit >= tp) accuTpHits++;
        updateAccuAutoStats();

        // Trade analytics log Ã¢â‚¬â€ confidence + underlying factors for this trade.
        // `factors` stores the 0-100 sub-scores that runAdaptiveLearning()
        // compares between wins and losses to recalibrate weights over time.
        accuTradeAnalytics.push({
            time: new Date().toISOString(),
            market: accuMarket,
            confidence: confScore,
            regime: confSnapshot?.regime?.regime,
            rsi: confSnapshot?.rsi, atr: confSnapshot?.atr,
            bbWidth: confSnapshot?.bb?.bandwidth, emaTrend: confSnapshot?.emaTrendLabel,
            tickStability: confSnapshot?.stab?.score,
            factors: confSnapshot?.breakdown ? {
                trend: confSnapshot.breakdown.trendScore,
                momentum: confSnapshot.breakdown.momentumScore,
                volatility: confSnapshot.breakdown.volatilityScore,
                priceBehavior: confSnapshot.breakdown.priceBehaviorScore,
                structure: confSnapshot.breakdown.structureScore
            } : undefined,
            ticks: accuTickCount, result: isWin ? 'TP' : 'Loss', profit
        });
        if (accuTradeAnalytics.length > 500) accuTradeAnalytics.shift();

        // Adaptive learning Ã¢â‚¬â€ recalibrate this market's factor weights every 100 trades
        runAdaptiveLearning(accuMarket);

        // Add to history (with confidence column)
        addAccuHistory(accuMarket, accuGrowthRate, stake, accuTickCount, profit, isWin, confScore);

        log(`${isWin ? 'Ã¢Å“â€¦' : 'Ã¢ÂÅ’'} Accumulator ${isWin?'sold':'knocked out'} | ${accuTickCount} ticks | P/L: $${profit.toFixed(2)} | Total: $${accuTotalPL.toFixed(2)}`, isWin ? 'w' : 'l');

        if (isWin) { try { playWin(); } catch(e) {} }
        else       { try { playLoss(); } catch(e) {} }

        // Reset UI Ã¢â‚¬â€ exactly once per settled contract, thanks to the guard above
        resetAccuUI();
        accuLastSettleTime = Date.now(); // starts the stabilization cooldown before the next entry
        if (profitEl) { profitEl.textContent = `$${profit.toFixed(2)}`; profitEl.style.color = isWin ? 'var(--green)' : 'var(--red)'; }

        // Ã¢â€â‚¬Ã¢â€â‚¬ STOP LOSS CHECK Ã¢â‚¬â€ takes priority over auto-restart Ã¢â€â‚¬Ã¢â€â‚¬
        if (accuAutoEnabled && sl > 0 && accuTotalPL <= -sl) {
            stopAccuAuto('stop_loss');
            return; // do not restart Ã¢â‚¬â€ Stop Loss reached
        }

        // AUTO MODE Ã¢â‚¬â€ restart after TP hit or after any settled contract
        if (accuAutoEnabled) {
            if (isWin) {
                if (!accuNotifFired) { accuNotifFired = true; notify('Ã¢Å“â€¦ TP Hit Ã¢â‚¬â€ Auto Restarting!', `+$${profit.toFixed(2)} | Session ${accuSessions} | Total: $${accuTotalPL.toFixed(2)}`, 'ok'); setTimeout(()=>{accuNotifFired=false;},3000); }
                log(`Ã°Å¸Â¤â€“ Auto restart in 1 second... (Session ${accuSessions + 1})`, 'i');
                setTimeout(() => {
                    if (accuAutoEnabled && derivWS && derivWS.readyState === WebSocket.OPEN) {
                        accuAutoRunning = true;
                        const bar = document.getElementById('accu-auto-bar');
                        if (bar) bar.style.display = 'flex';
                        const conf = calcAccuConfidence(accuMarket);
                        if (meetsAutoThreshold(conf)) {
                            toggleAccumulator();
                        } else {
                            const threshold = parseFloat(document.getElementById('accu-conf-threshold')?.value || 75);
                            log(`Ã¢ÂÂ³ Auto mode: waiting for a qualifying entry (Ã¢â€°Â¥${threshold}%, regime-aware) before next session...`, 'i');
                            const stakeVal = parseFloat(document.getElementById('accu-stake')?.value || 1);
                            startWatchingForGreatEntry(stakeVal, tp);
                        }
                    }
                }, 1500);
            } else {
                // Knocked out Ã¢â‚¬â€ notify but also auto restart if still enabled and SL not hit
                if (!accuNotifFired) {
                    accuNotifFired = true;
                    notify('Ã°Å¸â€™Â¥ Knocked Out Ã¢â‚¬â€ Auto Restarting!', `Lost $${Math.abs(profit).toFixed(2)} | Total: $${accuTotalPL.toFixed(2)}`, 'warn');
                    setTimeout(() => { accuNotifFired = false; }, 3000);
                }
                log(`Ã°Å¸Â¤â€“ Knocked out! Auto restarting in 2 seconds...`, 'x');
                setTimeout(() => {
                    if (accuAutoEnabled && derivWS && derivWS.readyState === WebSocket.OPEN) {
                        accuAutoRunning = true;
                        const conf = calcAccuConfidence(accuMarket);
                        if (meetsAutoThreshold(conf)) {
                            toggleAccumulator();
                        } else {
                            const stakeVal = parseFloat(document.getElementById('accu-stake')?.value || 1);
                            startWatchingForGreatEntry(stakeVal, tp);
                        }
                    }
                }, 2000);
            }
        } else {
            // Manual mode notification
            notify(
                isWin ? 'Ã°Å¸â€™Â° Accumulator Profit!' : 'Ã°Å¸â€™Â¥ Accumulator Knocked Out!',
                `${accuTickCount} ticks | P/L: ${isWin?'+':''}$${profit.toFixed(2)}`,
                isWin ? 'ok' : 'err'
            );
        }
    }
};


