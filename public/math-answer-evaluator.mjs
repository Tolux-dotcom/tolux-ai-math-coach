const SPECIAL_ANSWERS = new Map([
  ["nosolution", "no-solution"],
  ["nosolutions", "no-solution"],
  ["none", "no-solution"],
  ["emptyset", "no-solution"],
  ["∅", "no-solution"],
  ["infinitelymanysolutions", "infinite-solutions"],
  ["infinitesolutions", "infinite-solutions"],
  ["allrealnumbers", "infinite-solutions"],
  ["allreals", "infinite-solutions"],
  ["allvaluesofx", "infinite-solutions"],
  ["allx", "infinite-solutions"],
  ["bothsidesareequal", "infinite-solutions"],
  ["bothsidesaretheequal", "infinite-solutions"],
  ["bothsidescancelout", "infinite-solutions"],
  ["thetwosidescancelout", "infinite-solutions"],
  ["sidescancelout", "infinite-solutions"]
]);

export function normalizeMathText(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .trim()
    .replace(/[−–—]/g, "-")
    .replace(/[×·]/g, "*")
    .replace(/^answer\s*(?:is|=|:)\s*/i, "")
    .replace(/\s+/g, "")
    .replace(/[.;,!]+$/g, "");
}

export function canonicalSpecialAnswer(value) {
  const normalized = normalizeMathText(value)
    .replace(/[{}]/g, "")
    .replace(/the|equation|has/g, "");

  if (SPECIAL_ANSWERS.has(normalized)) return SPECIAL_ANSWERS.get(normalized);
  if (normalized.includes("infinitelymany") || normalized.includes("allreal")) {
    return "infinite-solutions";
  }
  if (normalized.includes("nosolution")) return "no-solution";
  if (
    normalized.includes("bothsides") &&
    (normalized.includes("equal") || normalized.includes("cancel"))
  ) {
    return "infinite-solutions";
  }
  return null;
}

function tokenize(expression) {
  const source = normalizeMathText(expression)
    .replace(/^y=/, "")
    .replace(/^f\(x\)=/, "")
    .replace(/\^/g, "^");
  const raw = source.match(/\d+(?:\.\d+)?|[a-z]+|[()+\-*/^]/g) || [];
  if (raw.join("") !== source) return null;

  const tokens = [];
  for (let i = 0; i < raw.length; i += 1) {
    const token = raw[i];
    const prev = tokens[tokens.length - 1];
    const isValueStart = /^\d/.test(token) || /^[a-z]+$/.test(token) || token === "(";
    const isValueEnd = prev && (/^\d/.test(prev) || /^[a-z]+$/.test(prev) || prev === ")");
    if (isValueStart && isValueEnd) tokens.push("*");
    tokens.push(token);
  }
  return tokens;
}

function parseExpression(expression, variables = {}) {
  const tokens = tokenize(expression);
  if (!tokens) return null;
  let index = 0;

  function parsePrimary() {
    const token = tokens[index];
    if (token === "+") {
      index += 1;
      return parsePrimary();
    }
    if (token === "-") {
      index += 1;
      const value = parsePrimary();
      return value === null ? null : -value;
    }
    if (token === "(") {
      index += 1;
      const value = parseAddSub();
      if (tokens[index] !== ")") return null;
      index += 1;
      return value;
    }
    if (/^\d/.test(token || "")) {
      index += 1;
      return Number(token);
    }
    if (/^[a-z]+$/.test(token || "")) {
      index += 1;
      if (!(token in variables)) return null;
      return Number(variables[token]);
    }
    return null;
  }

  function parsePower() {
    let left = parsePrimary();
    if (left === null) return null;
    while (tokens[index] === "^") {
      index += 1;
      const right = parsePrimary();
      if (right === null) return null;
      left = left ** right;
    }
    return left;
  }

  function parseMulDiv() {
    let left = parsePower();
    if (left === null) return null;
    while (tokens[index] === "*" || tokens[index] === "/") {
      const op = tokens[index++];
      const right = parsePower();
      if (right === null) return null;
      if (op === "/" && Math.abs(right) < 1e-12) return null;
      left = op === "*" ? left * right : left / right;
    }
    return left;
  }

  function parseAddSub() {
    let left = parseMulDiv();
    if (left === null) return null;
    while (tokens[index] === "+" || tokens[index] === "-") {
      const op = tokens[index++];
      const right = parseMulDiv();
      if (right === null) return null;
      left = op === "+" ? left + right : left - right;
    }
    return left;
  }

  const result = parseAddSub();
  return index === tokens.length ? result : null;
}

function splitEquation(value) {
  const normalized = normalizeMathText(value);
  const parts = normalized.split("=");
  return parts.length === 2 && parts[0] && parts[1] ? parts : null;
}

function linearEquationSignature(value, variable = "x") {
  const parts = splitEquation(value);
  if (!parts) return null;
  const diffAt = x => {
    const vars = { [variable]: x };
    const left = parseExpression(parts[0], vars);
    const right = parseExpression(parts[1], vars);
    if (left === null || right === null) return null;
    return left - right;
  };
  const b = diffAt(0);
  const atOne = diffAt(1);
  const atTwo = diffAt(2);
  if ([b, atOne, atTwo].some(v => v === null || !Number.isFinite(v))) return null;
  const a = atOne - b;
  if (Math.abs((a * 2 + b) - atTwo) > 1e-8) return null;
  if (Math.abs(a) < 1e-10) {
    return Math.abs(b) < 1e-10
      ? { type: "infinite-solutions" }
      : { type: "no-solution" };
  }
  return { type: "single-solution", value: -b / a };
}

export function expressionsEquivalent(student, expected, variable = "x") {
  const samples = [-3, -1, 0, 2, 5];
  for (const x of samples) {
    const vars = { [variable]: x };
    const a = parseExpression(student, vars);
    const b = parseExpression(expected, vars);
    if (a === null || b === null || !Number.isFinite(a) || !Number.isFinite(b)) return false;
    if (Math.abs(a - b) > 1e-8) return false;
  }
  return true;
}

export function equationsEquivalent(student, expected, variable = "x") {
  const a = linearEquationSignature(student, variable);
  const b = linearEquationSignature(expected, variable);
  if (!a || !b || a.type !== b.type) return false;
  if (a.type !== "single-solution") return true;
  return Math.abs(a.value - b.value) < 1e-8;
}

function simpleNumber(value) {
  let normalized = normalizeMathText(value).replace(/^x=/, "");
  if (/^[-+]?\d+(?:\.\d+)?$/.test(normalized)) return Number(normalized);
  const fraction = normalized.match(/^([-+]?\d+(?:\.\d+)?)\/([-+]?\d+(?:\.\d+)?)$/);
  if (!fraction) return null;
  const denominator = Number(fraction[2]);
  return denominator === 0 ? null : Number(fraction[1]) / denominator;
}

export function mathAnswersEquivalent(student, expected, options = {}) {
  const normalizedStudent = normalizeMathText(student);
  const normalizedExpected = normalizeMathText(expected);
  if (!normalizedStudent) return false;
  if (normalizedStudent === normalizedExpected) return true;

  const studentSpecial = canonicalSpecialAnswer(student);
  const expectedSpecial = canonicalSpecialAnswer(expected);
  if (studentSpecial && expectedSpecial) return studentSpecial === expectedSpecial;

  const studentNumber = simpleNumber(student);
  const expectedNumber = simpleNumber(expected);
  if (studentNumber !== null && expectedNumber !== null) {
    return Math.abs(studentNumber - expectedNumber) < 1e-8;
  }

  const variable = options.variable || "x";
  if (splitEquation(student) && splitEquation(expected)) {
    return equationsEquivalent(student, expected, variable);
  }

  return expressionsEquivalent(student, expected, variable);
}
