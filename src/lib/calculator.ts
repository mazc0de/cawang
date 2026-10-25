/**
 * Evaluates what people type into an amount field: "25.000+12.500" → 37500.
 * Dots group thousands and a comma marks decimals, as written in Indonesia; the result is
 * rounded to whole rupiah. Anything incomplete or ambiguous ("1.5", "25000+") is null.
 */

type Token = number | '+' | '-' | '*' | '/' | '(' | ')'

const NUMBER = /^(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d+)?/

function normalize(input: string): string {
  return input.replace(/\s+/g, '').replace(/[×xX]/g, '*').replace(/÷/g, '/').replace(/[−–]/g, '-')
}

function tokenize(input: string): Token[] | null {
  const tokens: Token[] = []
  let rest = normalize(input)
  while (rest) {
    const number = NUMBER.exec(rest)
    if (number) {
      tokens.push(Number(number[0].replaceAll('.', '').replace(',', '.')))
      rest = rest.slice(number[0].length)
      continue
    }
    const char = rest[0]
    if (!'+-*/()'.includes(char)) return null
    tokens.push(char as Token)
    rest = rest.slice(1)
  }
  return tokens
}

function parse(tokens: Token[]): number | null {
  let position = 0
  const peek = () => tokens[position]

  // expression = term (("+" | "-") term)*
  function expression(): number | null {
    let value = term()
    while (value !== null && (peek() === '+' || peek() === '-')) {
      const operator = tokens[position++]
      const right = term()
      if (right === null) return null
      value = operator === '+' ? value + right : value - right
    }
    return value
  }

  // term = factor (("*" | "/") factor)*
  function term(): number | null {
    let value = factor()
    while (value !== null && (peek() === '*' || peek() === '/')) {
      const operator = tokens[position++]
      const right = factor()
      if (right === null || (operator === '/' && right === 0)) return null
      value = operator === '*' ? value * right : value / right
    }
    return value
  }

  // factor = "-" factor | "(" expression ")" | number
  function factor(): number | null {
    const token = tokens[position++]
    if (typeof token === 'number') return token
    if (token === '-') {
      const value = factor()
      return value === null ? null : -value
    }
    if (token === '(') {
      const value = expression()
      return tokens[position++] === ')' ? value : null
    }
    return null
  }

  const result = expression()
  return position === tokens.length ? result : null
}

export function evaluateAmount(input: string): number | null {
  const tokens = tokenize(input)
  if (!tokens?.length) return null
  const result = parse(tokens)
  return result === null || !Number.isFinite(result) ? null : Math.round(result)
}

/** True when the text holds an operation, so a "= result" preview is worth showing. */
export function isExpression(input: string): boolean {
  return /[+\-*/()×xX÷−–]/.test(normalize(input).replace(/^-/, ''))
}

/**
 * What an amount field holds. A plain number may carry thousands dots anywhere while it is being
 * typed into a field that reformats as you go ("1.800" + "0" = "1.8000"), so every dot in it is
 * a separator; a sum is read by evaluateAmount. A pasted "Rp" prefix is ignored.
 */
export function parseAmountInput(text: string): number | null {
  const cleaned = text.replace(/rp/gi, '').trim()
  return evaluateAmount(isExpression(cleaned) ? cleaned : cleaned.replaceAll('.', ''))
}
