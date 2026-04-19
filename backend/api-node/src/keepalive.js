// keepalive.js - ping Render services every 14 minutes to prevent sleep
const ENGINE_URL = process.env.ENGINE_URL;
const SELF_URL = process.env.SELF_URL;

export function startKeepAlive() {
  setInterval(async () => {
    try {
      await fetch(`${ENGINE_URL}/health`);
      console.log('Engine pinged');
    } catch (e) {}
    try {
      await fetch(`${SELF_URL}/health`);
      console.log('Node pinged');
    } catch (e) {}
  }, 10 * 60 * 1000);
}
