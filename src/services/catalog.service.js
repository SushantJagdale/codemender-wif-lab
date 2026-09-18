const http = require('http');
const https = require('https');
const net = require('net');
const dns = require('dns');
const productRepo = require('../data/repositories/productRepository');

function isPrivateIp(ip) {
    if (!ip) return false;
    const cleanIp = ip.replace(/^\[|\]$/g, '').toLowerCase();

    if (net.isIPv4(cleanIp)) {
        const parts = cleanIp.split('.').map(Number);
        if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) {
            return true;
        }
        const [a, b, c, d] = parts;
        if (a === 0) return true;
        if (a === 10) return true;
        if (a === 127) return true;
        if (a === 169 && b === 254) return true;
        if (a === 172 && b >= 16 && b <= 31) return true;
        if (a === 192 && b === 168) return true;
        if (a === 100 && b >= 64 && b <= 127) return true;
        if (a === 192 && b === 0 && c === 0) return true;
        if (a === 192 && b === 0 && c === 2) return true;
        if (a === 198 && (b === 18 || b === 19)) return true;
        if (a === 198 && b === 51 && c === 100) return true;
        if (a === 203 && b === 0 && c === 113) return true;
        if (a >= 224) return true;
        return false;
    }

    if (net.isIPv6(cleanIp)) {
        if (cleanIp === '::1' || cleanIp === '::') return true;
        if (cleanIp.startsWith('::ffff:')) {
            const mapped = cleanIp.slice(7);
            if (net.isIPv4(mapped)) {
                return isPrivateIp(mapped);
            }
            const hexParts = mapped.split(':');
            if (hexParts.length === 2) {
                const num1 = parseInt(hexParts[0], 16);
                const num2 = parseInt(hexParts[1], 16);
                const ip4 = `${(num1 >> 8) & 255}.${num1 & 255}.${(num2 >> 8) & 255}.${num2 & 255}`;
                return isPrivateIp(ip4);
            }
            return true;
        }
        if (cleanIp.startsWith('fc') || cleanIp.startsWith('fd')) return true;
        if (/^fe[89ab]/i.test(cleanIp)) return true;
        if (cleanIp.startsWith('ff')) return true;
        return false;
    }

    return false;
}

function checkTarget(target, callback) {
    let parsedUrl;
    try {
        const rawTarget = typeof target === 'string' ? target : (target && target.url ? target.url : target);
        parsedUrl = new URL(rawTarget);
    } catch (e) {
        return callback(new Error("Forbidden access rule triggered."));
    }

    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        return callback(new Error("Forbidden access rule triggered."));
    }

    const rawHostname = parsedUrl.hostname.toLowerCase();
    const hostname = rawHostname.replace(/^\[|\]$/g, '');

    if (
        hostname.includes('internal-network') ||
        hostname === 'localhost' ||
        hostname.endsWith('.localhost') ||
        hostname.endsWith('.local') ||
        hostname.endsWith('.internal') ||
        hostname.endsWith('.lan')
    ) {
        return callback(new Error("Forbidden access rule triggered."));
    }

    if (net.isIP(hostname)) {
        if (isPrivateIp(hostname)) {
            return callback(new Error("Forbidden access rule triggered."));
        }
        return callback(null, parsedUrl);
    }

    dns.lookup(hostname, { all: true }, (err, addresses) => {
        if (err) {
            return callback(err);
        }
        for (const addr of addresses) {
            if (isPrivateIp(addr.address)) {
                return callback(new Error("Forbidden access rule triggered."));
            }
        }
        return callback(null, parsedUrl);
    });
}

exports.search = (q) => productRepo.filterProducts(q);

exports.fetchRemoteAsset = (target, cb) => {
    checkTarget(target, (err, parsedUrl) => {
        if (err) {
            return cb(err);
        }
        const client = parsedUrl.protocol === 'https:' ? https : http;
        client.get(parsedUrl.href, (proxyRes) => {
            let body = '';
            proxyRes.on('data', chunk => body += chunk);
            proxyRes.on('end', () => cb(null, body.substring(0, 50)));
        }).on('error', err => cb(err));
    });
};
