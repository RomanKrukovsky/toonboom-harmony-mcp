// Adobe Animate MCP Companion Extension Script
(function() {
    var csInterface = typeof CSInterface !== 'undefined' ? new CSInterface() : null;
    var http = typeof require !== 'undefined' ? require('http') : null;
    var fs = typeof require !== 'undefined' ? require('fs') : null;
    var path = typeof require !== 'undefined' ? require('path') : null;

    var reqCount = 0;
    var port = 8768;

    function log(msg) {
        var logBox = document.getElementById('log');
        if (logBox) {
            var line = document.createElement('div');
            line.textContent = '[' + new Date().toLocaleTimeString() + '] ' + msg;
            logBox.appendChild(line);
            logBox.scrollTop = logBox.scrollHeight;
        }
    }

    function updateStats(cmd) {
        reqCount++;
        var countEl = document.getElementById('reqCount');
        var cmdEl = document.getElementById('lastCmd');
        if (countEl) countEl.textContent = reqCount;
        if (cmdEl) cmdEl.textContent = cmd;
    }

    function evalJsfl(script, callback) {
        if (csInterface) {
            csInterface.evalScript(script, callback);
        } else if (typeof window.__adobe_cep__ !== 'undefined') {
            window.__adobe_cep__.evalScript(script, callback);
        } else {
            callback(JSON.stringify({ error: 'CEP environment unavailable' }));
        }
    }

    // Start Localhost HTTP Bridge Server on 127.0.0.1
    if (http) {
        try {
            var server = http.createServer(function(req, res) {
                // Ensure connections are strictly local
                var remoteIp = req.socket.remoteAddress;
                if (remoteIp !== '127.0.0.1' && remoteIp !== '::1' && remoteIp !== '::ffff:127.0.0.1') {
                    res.writeHead(403, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Forbidden: local access only' }));
                    return;
                }

                if (req.method === 'GET' && req.url === '/ping') {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ status: 'ok', server: 'Animate MCP Companion', port: port }));
                    return;
                }

                if (req.method === 'POST' && req.url === '/execute') {
                    var body = '';
                    req.on('data', function(chunk) { body += chunk; });
                    req.on('end', function() {
                        try {
                            var data = JSON.parse(body);
                            var script = data.script;
                            var cmd = data.command || 'unknown';
                            updateStats(cmd);
                            log('Executing: ' + cmd);

                            evalJsfl(script, function(result) {
                                res.writeHead(200, { 'Content-Type': 'application/json' });
                                res.end(result);
                            });
                        } catch (err) {
                            res.writeHead(400, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: String(err) }));
                        }
                    });
                    return;
                }

                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Endpoint not found' }));
            });

            server.listen(port, '127.0.0.1', function() {
                log('Local HTTP bridge listening on 127.0.0.1:' + port);
            });

            server.on('error', function(err) {
                log('Server error: ' + err.message);
                var badge = document.getElementById('statusBadge');
                if (badge) {
                    badge.textContent = 'PORT BUSY';
                    badge.style.background = '#C62828';
                }
            });
        } catch (err) {
            log('Failed to start HTTP server: ' + err.message);
        }
    } else {
        log('Node.js not enabled in CEP manifest.');
    }

    // Register Animate application lifecycle events if CSInterface is present
    if (csInterface) {
        try {
            csInterface.addEventListener('documentAfterSave', function(evt) {
                log('Event: documentAfterSave');
            });
            csInterface.addEventListener('documentAfterActivate', function(evt) {
                log('Event: documentAfterActivate');
            });
        } catch (err) {
            log('Event registration error: ' + err.message);
        }
    }
})();
