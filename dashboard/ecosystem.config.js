module.exports = {
  apps: [
    {
      name: "ai-os-dashboard",
      script: "server.js",
      cwd: __dirname,
      env_file: ".env",
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
    },
  ],
};
