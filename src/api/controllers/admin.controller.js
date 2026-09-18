const adminService = require('../../services/admin.service');

function evaluateFormula(formula) {
    if (typeof formula === 'number' && Number.isFinite(formula)) {
        return formula;
    }
    if (typeof formula !== 'string') {
        throw new Error('Formula must be a string');
    }
    const trimmed = formula.trim();
    if (!trimmed) {
        throw new Error('Empty formula');
    }
    if (!/^[0-9+\-*/%().\s]+$/.test(trimmed)) {
        throw new Error('Invalid characters in formula');
    }

    let pos = 0;

    function peek() {
        while (pos < trimmed.length && /\s/.test(trimmed[pos])) {
            pos++;
        }
        return trimmed[pos];
    }

    function get() {
        while (pos < trimmed.length && /\s/.test(trimmed[pos])) {
            pos++;
        }
        return trimmed[pos++];
    }

    function parseExpression() {
        let val = parseTerm();
        while (true) {
            let next = peek();
            if (next === '+') {
                get();
                val += parseTerm();
            } else if (next === '-') {
                get();
                val -= parseTerm();
            } else {
                break;
            }
        }
        return val;
    }

    function parseTerm() {
        let val = parseFactor();
        while (true) {
            let next = peek();
            if (next === '*') {
                get();
                val *= parseFactor();
            } else if (next === '/') {
                get();
                let divisor = parseFactor();
                if (divisor === 0) {
                    throw new Error('Division by zero');
                }
                val /= divisor;
            } else if (next === '%') {
                get();
                let divisor = parseFactor();
                if (divisor === 0) {
                    throw new Error('Modulo by zero');
                }
                val %= divisor;
            } else {
                break;
            }
        }
        return val;
    }

    function parseFactor() {
        let next = peek();
        if (next === '+') {
            get();
            return parseFactor();
        }
        if (next === '-') {
            get();
            return -parseFactor();
        }
        if (next === '(') {
            get();
            let val = parseExpression();
            if (peek() !== ')') {
                throw new Error('Expected closing parenthesis');
            }
            get();
            return val;
        }

        let numStr = '';
        while (pos < trimmed.length && (trimmed[pos] === '.' || (trimmed[pos] >= '0' && trimmed[pos] <= '9'))) {
            numStr += trimmed[pos++];
        }
        if (numStr === '' || isNaN(Number(numStr))) {
            throw new Error('Invalid number: ' + numStr);
        }
        return Number(numStr);
    }

    const result = parseExpression();
    if (peek() !== undefined) {
        throw new Error('Unexpected character at end of expression');
    }
    if (typeof result !== 'number' || isNaN(result) || !Number.isFinite(result)) {
        throw new Error('Invalid result');
    }
    return result;
}

exports.checkShippingStatus = (req, res) => {
    adminService.pingProvider(req.body.providerIP, req.body.options, out => res.send(out));
};

exports.previewDynamicPricing = (req, res) => {
    try {
        res.json({ price: evaluateFormula(req.body ? req.body.formula : undefined) });
    } catch (e) {
        res.status(400).send("Evaluation Failed");
    }
};
