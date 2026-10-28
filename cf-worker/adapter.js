import http from 'node:http';
import { Buffer } from 'node:buffer';

export async function expressHandler(app, request) {
  const url = new URL(request.url);
  const hasBody = !['GET', 'HEAD'].includes(request.method);
  const bodyText = hasBody ? await request.text() : null;

  const mockSocket = {
    remoteAddress: '127.0.0.1',
    remotePort: 0,
    localAddress: '127.0.0.1',
    localPort: 0,
    writable: true,
    readable: true,
    destroyed: false,
    bytesWritten: 0,
    bytesRead: 0,
    destroy() { this.destroyed = true; },
    on() {}, once() {}, emit() {}, removeListener() {},
    end() {}, write() { return true; },
    setTimeout() {}, setKeepAlive() {}, setNoDelay() {},
    ref() {}, unref() {},
  };

  const req = new http.IncomingMessage(mockSocket);
  req.method = request.method;
  req.url = url.pathname + url.search;
  req.httpVersion = '1.1';
  req.httpVersionMajor = 1;
  req.httpVersionMinor = 1;

  req.headers = {};
  req.rawHeaders = [];
  for (const [key, value] of request.headers.entries()) {
    req.headers[key.toLowerCase()] = value;
    req.rawHeaders.push(key, value);
  }
  req.connection = mockSocket;
  req.socket = mockSocket;
  req.ip = '127.0.0.1';
  req.complete = true;
  req.aborted = false;

  if (bodyText) {
    req.push(Buffer.from(bodyText));
  }
  req.push(null);

  const res = new http.ServerResponse(req);

  const chunks = [];

  res.write = function (chunk, encoding) {
    if (!chunk) return true;
    if (typeof chunk === 'string') {
      chunks.push(Buffer.from(chunk, encoding || 'utf-8'));
    } else if (Buffer.isBuffer(chunk)) {
      chunks.push(chunk);
    } else if (chunk instanceof Uint8Array) {
      chunks.push(Buffer.from(chunk));
    } else {
      chunks.push(Buffer.from(String(chunk)));
    }
    return true;
  };

  res.end = function (chunk, encoding) {
    if (chunk) this.write(chunk, encoding);
    this.finished = true;
    this.headersSent = true;
    this.emit('finish');
  };

  await new Promise((resolve) => {
    let resolved = false;
    const done = () => { if (!resolved) { resolved = true; resolve(); } };
    res.on('finish', done);
    try {
      app(req, res);
    } catch (e) {
      done();
    }
    setTimeout(done, 30000);
  });

  const responseBody = chunks.length > 0 ? Buffer.concat(chunks) : Buffer.al
