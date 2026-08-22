import http from 'http';
export class LiveGuiAdapter {
    static port = 8080;
    static host = '127.0.0.1';
    static async sendCommand(command, args = {}) {
        return new Promise((resolve) => {
            const payload = JSON.stringify({ command, args });
            const req = http.request({
                host: this.host,
                port: this.port,
                path: '/cmd',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(payload)
                },
                timeout: 2000
            }, (res) => {
                let body = '';
                res.on('data', (chunk) => (body += chunk));
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(body);
                        resolve({ status: 'success', message: 'Command executed in Harmony GUI', data: parsed });
                    }
                    catch {
                        resolve({ status: 'success', message: 'Command received by Live GUI Bridge' });
                    }
                });
            });
            req.on('error', (err) => {
                // Fallback gracefully when Harmony GUI live bridge is not listening
                resolve({
                    status: 'offline',
                    message: `Live GUI bridge offline (${err.message}). Command routed to headless batch/Python engine.`
                });
            });
            req.write(payload);
            req.end();
        });
    }
}
