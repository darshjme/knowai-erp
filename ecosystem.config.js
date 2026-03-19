// PM2 Ecosystem Configuration — KnowAI ERP
// Usage: pm2 start ecosystem.config.js

module.exports = {
  apps: [
    {
      name: 'knowai-backend',
      script: 'node_modules/.bin/next',
      args: 'start -p 3001',
      cwd: '/opt/knowai-erp/backend',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
      max_memory_restart: '512M',
      error_file: '/var/log/knowai/backend-error.log',
      out_file: '/var/log/knowai/backend-out.log',
      merge_logs: true,
      autorestart: true,
      watch: false,
    },
    {
      name: 'knowai-frontend',
      script: 'node_modules/.bin/serve',
      args: 'dist -l 5173 -s',
      cwd: '/opt/knowai-erp/frontend',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
      autorestart: true,
      watch: false,
    },
  ],
};
