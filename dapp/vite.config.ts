import { defineConfig, type Plugin, type ViteDevServer } from 'vite';
import react from '@vitejs/plugin-react';
import https from 'node:https';
import net from 'node:net';
import tls from 'node:tls';

function suiRpcProxyPlugin(): Plugin {
  return {
    name: 'sui-rpc-proxy',
    configureServer(server: ViteDevServer) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/sui-rpc')) return next();

        if (req.method === 'OPTIONS') {
          res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          });
          res.end();
          return;
        }

        const body: Buffer[] = [];

        req.on('data', (chunk: Buffer) => body.push(chunk));
        req.on('end', () => {
          const bodyData = Buffer.concat(body);
          const tunnel = net.createConnection(7890, '127.0.0.1', () => {
            tunnel.write('CONNECT fullnode.testnet.sui.io:443 HTTP/1.1\r\nHost: fullnode.testnet.sui.io:443\r\n\r\n');
          });

          tunnel.once('data', (data) => {
            if (!data.toString().includes('200')) {
              res.writeHead(502);
              res.end(`Tunnel failed: ${data.toString().slice(0, 100)}`);
              tunnel.destroy();
              return;
            }

            const tlsSocket = tls.connect(
              { socket: tunnel, servername: 'fullnode.testnet.sui.io' },
              () => {
                const proxyReq = https.request(
                  {
                    hostname: 'fullnode.testnet.sui.io',
                    path: '/',
                    method: req.method || 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Content-Length': bodyData.length,
                    },
                    createConnection: () => tlsSocket,
                  },
                  (proxyRes) => {
                    res.writeHead(proxyRes.statusCode || 200, {
                      'Content-Type': 'application/json',
                      'Access-Control-Allow-Origin': '*',
                      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
                      'Access-Control-Allow-Headers': 'Content-Type',
                    });
                    proxyRes.pipe(res);
                  },
                );

                proxyReq.on('error', (err) => {
                  console.error('[sui-proxy] request error:', err.message);
                  if (!res.headersSent) {
                    res.writeHead(500);
                    res.end(err.message);
                  }
                });

                proxyReq.write(bodyData);
                proxyReq.end();
              },
            );

            tlsSocket.on('error', (err: Error) => {
              console.error('[sui-proxy] tls error:', err.message);
              if (!res.headersSent) {
                res.writeHead(500);
                res.end(err.message);
              }
            });
          });

          tunnel.on('error', (err) => {
            console.error('[sui-proxy] tunnel error:', err.message);
            if (!res.headersSent) {
              res.writeHead(500);
              res.end(err.message);
            }
          });
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), suiRpcProxyPlugin()],
  server: {
    port: 3000,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  optimizeDeps: {
    include: [
      '@mysten/dapp-kit',
      '@mysten/sui/client',
      '@mysten/sui/transactions',
      '@mysten/sui/keypairs/ed25519',
      '@mysten/wallet-standard',
    ],
  },
  resolve: {
    dedupe: [
      '@mysten/sui',
      '@mysten/wallet-standard',
      '@mysten/dapp-kit',
      'react',
      'react-dom',
    ],
  },
});
