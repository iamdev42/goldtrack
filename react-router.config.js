/** @type {import('@react-router/dev/config').Config} */
export default {
  // SPA mode — no server-side rendering.
  // All routes render in the browser. Perfect for Cloudflare Workers static hosting.
  ssr: false,

  appDirectory: 'app',
  buildDirectory: 'build',
}
