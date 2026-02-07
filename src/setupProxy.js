const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    createProxyMiddleware('/api', { 
      target: 'https://127.0.0.1:443',
      changeOrigin: true,
      secure: false,      // HTTPS 인증서 무시
      logLevel: 'debug'   // 터미널에 로그 출력
    })
  );
};