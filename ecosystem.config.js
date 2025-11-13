module.exports = {
  apps: [{
    name: 'energyrite',
    script: 'npm',
    args: 'start',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};