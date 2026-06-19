module.exports = {
  apps: [
    {
      name: 'GP_Monitoring',       // Your application name
      script: './node_modules/next/dist/bin/next', // Direct path to Next.js binary
      args: 'start',               // The 'start' command for Next.js
      instances: 1,                // Only ONE instance (changed from 'max')
      exec_mode: 'fork',           // Changed to 'fork' for single instance (or keep 'cluster')
      env: {
        NODE_ENV: 'production',    // Sets the environment to production
        PORT: 3001,                // The port your app will run on
        GP_API_BASE_URL: 'http://localhost:3000',
        GP_API_KEY: 'change-me',
        GP_COOKIE_SECURE: 'false'
      }
    }
  ]
};
