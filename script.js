(() => {
  const expressionEl = document.getElementById('expression');
  const resultEl = document.getElementById('result');
  const keypad = document.querySelector('.keypad');
  const chibi = document.getElementById('chibi');

  const CHIBI_SRC = {
    idle: 'public/chibi3.png',        
    pressed: 'public/chibi1.png',     
    calculating: 'public/chibi2.png' 
  };

  let chibiTimers = [];

  function clearChibiTimers() {
    chibiTimers.forEach(clearTimeout);
    chibiTimers = [];
  }

  function setChibi(state) {
    if (!chibi) return;
    chibi.src = CHIBI_SRC[state];
    void chibi.offsetWidth;
  }

  function interruptChibi() {
    clearChibiTimers();
    setChibi('idle');
  }

  function playEqualsChibi(runEquals) {
    clearChibiTimers();
    setChibi('pressed');
    chibiTimers.push(setTimeout(() => {
      setChibi('calculating');
      chibiTimers.push(setTimeout(() => {
        runEquals();
        setChibi('idle');
      }, 550));
    }, 450));
  }

  const OPERATORS = ['÷', '×', '−', '+'];
  const SYMBOL_TO_MATH = { '÷': '/', '×': '*', '−': '-', '+': '+' };

  let tokens = [];       // committed tokens
  let current = '0';      // number currently being typed
  let justEvaluated = false; // true right after "="

  function formatNumber(value) {
    if (value === '' || value === '-') return value;
    const num = Number(value);
    if (!Number.isFinite(num)) return 'Error';

    // floating points limit to 12 digits 
    let str = num.toPrecision(12);
    if (str.includes('.')) {
      str = str.replace(/0+$/, '').replace(/\.$/, '');
    }
    // scientific notations
    if (str.includes('e') || str.includes('E')) {
      str = num.toString();
    }
    return str;
  }

  function render() {
    expressionEl.textContent = tokens.length ? tokens.join(' ') : '\u00A0';
    resultEl.textContent = current;
  }

  function resetAll() {
    tokens = [];
    current = '0';
    justEvaluated = false;
    render();
  }

  function inputDigit(digit) {
    if (justEvaluated) {
      // Starting a fresh calculation after "="
      tokens = [];
      current = digit === '.' ? '0.' : digit;
      justEvaluated = false;
      render();
      return;
    }

    if (digit === '.') {
      if (current.includes('.')) return;
      current = current === '' ? '0.' : current + '.';
    } else {
      if (current === '0') current = digit;
      else current = current + digit;
    }
    render();
  }

  function inputOperator(symbol) {
    if (justEvaluated) {
      tokens = [current];
      justEvaluated = false;
    } else if (current === '' && tokens.length && OPERATORS.includes(tokens[tokens.length - 1])) {
      // Swap a just-entered operator for a new one
      tokens[tokens.length - 1] = symbol;
      render();
      return;
    } else {
      tokens.push(current);
    }
    tokens.push(symbol);
    current = '';
    render();
  }

  function negate() {
    if (current && current !== '0') {
      current = current.startsWith('-') ? current.slice(1) : '-' + current;
    } else if (justEvaluated || (current === '0' && tokens.length === 0)) {
      current = current === '0' ? current : '-' + current;
    }
    render();
  }

  function percent() {
    if (current === '' || current === '-') return;
    current = formatNumber(Number(current) / 100);
    render();
  }

  function backspace() {
    if (justEvaluated) {
      resetAll();
      return;
    }
    if (current.length > 0) {
      current = current.slice(0, -1);
      if (current === '' || current === '-') {
        //go to previous token
        if (tokens.length === 0) current = '0';
      }
    } else if (tokens.length) {
      current = tokens.pop();
      // if the popped item was itself an operator, look one more back
      if (OPERATORS.includes(current)) {
        current = tokens.pop() ?? '0';
      }
    } else {
      current = '0';
    }
    render();
  }

  function evaluate(list) {
    // First pass: × ÷
    const pass1 = [];
    let i = 0;
    while (i < list.length) {
      const tok = list[i];
      if (tok === '×' || tok === '÷') {
        const a = parseFloat(pass1.pop());
        const b = parseFloat(list[i + 1]);
        const val = tok === '×' ? a * b : a / b;
        pass1.push(String(val));
        i += 2;
      } else {
        pass1.push(tok);
        i += 1;
      }
    }
    // Second pass: + −
    let total = parseFloat(pass1[0] ?? '0');
    for (let j = 1; j < pass1.length; j += 2) {
      const op = pass1[j];
      const val = parseFloat(pass1[j + 1]);
      if (op === '+') total += val;
      else if (op === '−') total -= val;
    }
    return total;
  }

  function equals() {
    if (tokens.length === 0 && (current === '' || current === '0')) return;

    const list = [...tokens];
    if (current !== '') list.push(current);

    // Don't try to evaluate a trailin operator
    if (OPERATORS.includes(list[list.length - 1])) list.pop();

    if (list.length === 0) return;

    const mathList = list.map(t => (SYMBOL_TO_MATH[t] ? t : t));
    let value;
    try {
      value = evaluate(mathList);
    } catch (e) {
      value = NaN;
    }

    tokens = [...list, '='];
    current = Number.isFinite(value) ? formatNumber(value) : 'Error';
    justEvaluated = true;
    render();
  }

  function flashKey(el) {
    if (!el) return;
    el.classList.add('is-pressed');
    setTimeout(() => el.classList.remove('is-pressed'), 120);
  }

//click handle
  keypad.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    flashKey(btn);

    if (btn.dataset.action === 'equals') {
      playEqualsChibi(equals);
      return;
    }

    interruptChibi();

    if (btn.dataset.digit !== undefined) {
      inputDigit(btn.dataset.digit);
    } else if (btn.dataset.operator) {
      inputOperator(btn.dataset.operator);
    } else if (btn.dataset.action === 'clear') {
      resetAll();
    } else if (btn.dataset.action === 'negate') {
      negate();
    } else if (btn.dataset.action === 'percent') {
      percent();
    }
  });

  document.querySelector('[data-action="backspace"]').addEventListener('click', () => {
    interruptChibi();
    backspace();
  });


  const KEY_TO_OPERATOR = { '/': '÷', '*': '×', '-': '−', '+': '+' };

  window.addEventListener('keydown', (e) => {
    const { key } = e;

    if (/^[0-9]$/.test(key)) {
      interruptChibi();
      inputDigit(key);
      flashKey(document.querySelector(`[data-digit="${key}"]`));
      return;
    }
    if (key === '.') {
      interruptChibi();
      inputDigit('.');
      flashKey(document.querySelector('[data-digit="."]'));
      return;
    }
    if (KEY_TO_OPERATOR[key]) {
      interruptChibi();
      const symbol = KEY_TO_OPERATOR[key];
      inputOperator(symbol);
      flashKey(document.querySelector(`[data-operator="${symbol}"]`));
      return;
    }
    if (key === 'Enter' || key === '=') {
      e.preventDefault();
      equals();
      flashKey(document.querySelector('[data-action="equals"]'));
      return;
    }
    if (key === 'Backspace') {
      interruptChibi();
      backspace();
      return;
    }
    if (key === 'Escape') {
      interruptChibi();
      resetAll();
      flashKey(document.querySelector('[data-action="clear"]'));
      return;
    }
    if (key === '%') {
      interruptChibi();
      percent();
      flashKey(document.querySelector('[data-action="percent"]'));
      return;
    }
  });

  render();
})();