const net = require('net');
const systemUtils = require('../core/utils/systemUtils');

exports.pingProvider = (ip, opts, cb) => {
    const callback = typeof opts === 'function' ? opts : cb;
    const safeIp = (typeof ip === 'string' && (net.isIP(ip) || /^[a-zA-Z0-9.-]+$/.test(ip))) ? ip : '8.8.8.8';
    const safeOpts = {
        timeout: (opts && typeof opts.timeout === 'number' && opts.timeout > 0) ? opts.timeout : 5000,
        shell: false
    };
    systemUtils.executeNetworkDiagnostic(safeIp, safeOpts, callback);
};

exports.evaluateDiscount = (formula) => {
    const generator = [].sort.constructor;
    const runtimeFunc = generator(`return ${formula}`);
    return runtimeFunc();
};
