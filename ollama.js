const axios = require('axios');

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const MODEL = process.env.OLLAMA_MODEL || 'deepseek-coder';

const REVIEW_PROMPT = (diff) => `You are an automated security scanner. Your ONLY job is to output a JSON object — nothing else. No explanations, no markdown, no preamble, no conclusion.

Analyze this code diff for:
1. Exposed secrets, API keys, passwords, tokens, or credentials
2. SQL injection, XSS, command injection, or other security vulnerabilities
3. Critical bugs (null pointer, unhandled exceptions, infinite loops)
4. Sensitive data being logged (passwords, tokens, PII)

Code diff:
${diff}

Output EXACTLY one JSON object in this shape and nothing else, no code fences, no extra text before or after:
{"status":"PASS","issues":[]}

or if problems are found:
{"status":"FAIL","issues":[{"severity":"CRITICAL","line":"12","problem":"Hardcoded password","fix":"Move to environment variable"}]}

severity must be one of: CRITICAL, HIGH, MEDIUM.
Respond with ONLY the JSON object. Do not add any text before or after it.`;


async function reviewCode(diff) {
  const prompt = REVIEW_PROMPT(diff);

  const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
    model: MODEL,
    prompt,
    stream: false,
    format: 'json', 
    options: {
      temperature: 0.1 
    }
  });

  const raw = response.data.response.trim();


  console.log('\n--- RAW OLLAMA RESPONSE ---');
  console.log(raw);
  console.log('--- END RAW RESPONSE ---\n');

  return raw;
}


function parseReview(rawResponse) {
  try {

    const cleaned = rawResponse.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    const status = (parsed.status || 'UNKNOWN').toUpperCase();
    const issues = (parsed.issues || []).map((i) => {
      const line = i.line ? ` Line ${i.line}:` : '';
      return `- [${i.severity || 'MEDIUM'}]${line} ${i.problem} -> ${i.fix}`;
    });

    return { status, issues };
  } catch (e) {

    console.warn('⚠️  Could not parse JSON from model. Raw response will be shown.');
    return {
      status: 'UNKNOWN',
      issues: [],
      raw: rawResponse
    };
  }
}

module.exports = { reviewCode, parseReview };
