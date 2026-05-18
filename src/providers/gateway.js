import https from 'https';

const GATEWAY_HOST = 'opengateway.gitlawb.com';
const GATEWAY_PATH = '/v1/chat/completions';

function request(params) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(params);

    const options = {
      hostname: GATEWAY_HOST,
      port: 443,
      path: GATEWAY_PATH,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'api-key': 'not-needed',
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (parsed.error) {
            reject(new Error(parsed.error.message));
          } else {
            resolve(parsed);
          }
        } catch (e) {
          reject(new Error('Жауапты талдау мүмкін болмады'));
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.write(data);
    req.end();
  });
}

export function createGatewayClient() {
  return {
    chat: {
      completions: {
        create: (params) => request(params),
      }
    }
  };
}

export const gatewayInfo = {
  name: 'Gitlawb Gateway',
  requiresKey: false,
  defaultModel: 'mimo-v2.5-pro',
};
