// inject.js - Runs in the MAIN WORLD (Page Context)
(function () {
    console.log('🚀 SF Loader: Inject script running in Main World');

    function getHighQualitySession() {
        // Method 1: Lightning Experience (Primary)
        try {
            if (window.$Api && window.$Api.getClient) {
                const sessionId = window.$Api.getClient().getSessionId();
                if (sessionId) {
                    console.log('SF Loader (Main): Found session via $Api');
                    return sessionId;
                }
            }
        } catch (e) { }

        // Method 2: Classic UI
        try {
            if (window.sforce && window.sforce.connection && window.sforce.connection.sessionId) {
                console.log('SF Loader (Main): Found session via sforce');
                return window.sforce.connection.sessionId;
            }
        } catch (e) { }

        // Method 3: Visualforce
        try {
            if (window.UserContext && window.UserContext.sessionId) {
                console.log('SF Loader (Main): Found session via UserContext');
                return window.UserContext.sessionId;
            }
        } catch (e) { }

        // Method 4: Aura
        try {
            if (window.Aura && window.Aura.getToken) {
                const token = window.Aura.getToken();
                if (token) {
                    console.log('SF Loader (Main): Found session via Aura');
                    return token;
                }
            }
        } catch (e) { }

        return null;
    }

    function getCookieSession() {
        // Method 5: Cookie (fallback)
        try {
            const match = document.cookie.match(/(^|;\s*)sid=([^;]*)/);
            if (match && match[2]) {
                return match[2];
            }
        } catch (e) { }
        return null;
    }

    let attempts = 0;
    const maxAttempts = 15; // 30 seconds total

    function tryDetect() {
        attempts++;

        // Always try to get a high-quality session first
        const highQualitySession = getHighQualitySession();
        if (highQualitySession) {
            window.postMessage({ type: 'SF_LOADER_SESSION', sessionId: highQualitySession }, '*');
            return;
        }

        // If we haven't found a high-quality session yet, wait and retry
        // Only fall back to cookie after 5 attempts (10 seconds)
        if (attempts < maxAttempts) {
            if (attempts === 5) {
                console.log('SF Loader (Main): High-quality session not found yet, checking cookie fallback...');
                const cookieSession = getCookieSession();
                if (cookieSession) {
                    console.log('SF Loader (Main): Falling back to cookie session');
                    window.postMessage({ type: 'SF_LOADER_SESSION', sessionId: cookieSession }, '*');
                    // Continue searching for better session even after sending cookie
                }
            }

            setTimeout(tryDetect, 2000);
        } else {
            console.log('SF Loader (Main): Could not detect high-quality session after multiple attempts.');
            // Final fallback to cookie if we haven't sent it yet
            const cookieSession = getCookieSession();
            if (cookieSession && attempts < 6) { // Only if we didn't send it at attempt 5
                console.log('SF Loader (Main): Final fallback to cookie session');
                window.postMessage({ type: 'SF_LOADER_SESSION', sessionId: cookieSession }, '*');
            }
        }
    }

    // Start detection
    tryDetect();
})();
