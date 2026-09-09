// Minimal CSInterface implementation for Animate CEP Bridge
function CSInterface() {}

CSInterface.prototype.evalScript = function(script, callback) {
    if (typeof window.__adobe_cep__ !== 'undefined') {
        window.__adobe_cep__.evalScript(script, callback);
    } else if (callback) {
        callback(JSON.stringify({ error: 'CEP environment unavailable' }));
    }
};

CSInterface.prototype.addEventListener = function(type, listener, obj) {
    if (typeof window.__adobe_cep__ !== 'undefined') {
        window.__adobe_cep__.addEventListener(type, listener, obj);
    }
};

CSInterface.prototype.removeEventListener = function(type, listener, obj) {
    if (typeof window.__adobe_cep__ !== 'undefined') {
        window.__adobe_cep__.removeEventListener(type, listener, obj);
    }
};

CSInterface.prototype.getHostEnvironment = function() {
    if (typeof window.__adobe_cep__ !== 'undefined') {
        return JSON.parse(window.__adobe_cep__.getHostEnvironment());
    }
    return { appId: "FLPR", appVersion: "24.0.0" };
};
