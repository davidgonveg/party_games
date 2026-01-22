const { execSync, spawn } = require('child_process');

try {
    console.log('Cleaning up port 3001...');
    // Kill any process using port 3001
    // Using netstat to find PID and taskkill to kill it (Windows specific)
    try {
        const output = execSync('netstat -ano | findstr :3001').toString();
        const lines = output.split('\n').filter(line => line.trim().length > 0);

        lines.forEach(line => {
            const parts = line.trim().split(/\s+/);
            const pid = parts[parts.length - 1];
            if (pid && pid !== '0') {
                console.log(`Killing PID ${pid}`);
                try {
                    execSync(`taskkill /F /PID ${pid}`);
                } catch (e) { /* ignore if already dead */ }
            }
        });
    } catch (err) {
        console.log('No visible process on 3001 or permission issues. (Usually safe to verify)');
    }
} catch (e) {
    console.log('Port cleanup had minor errors, proceeding...');
}

console.log('Starting Server...');
const server = spawn('node', ['server/server.js'], { stdio: 'inherit', shell: true });

server.on('close', (code) => {
    console.log(`Server exited with code ${code}`);
});
