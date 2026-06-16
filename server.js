require('dotenv').config();
const express = require('express');
const crypto = require('crypto');
const { getPRDiff, postComment, setCommitStatus } = require('./github');
const { reviewCode, parseReview } = require('./ollama');

const app = express();

app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

const PORT = process.env.PORT || 3000;
const MAX_DIFF_CHARS = parseInt(process.env.MAX_DIFF_CHARS || '6000', 10);


function verifySignature(req) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) return true;

  const signature = req.headers['x-hub-signature-256'];
  if (!signature) return false;

  const hmac = crypto.createHmac('sha256', secret);
  const digest = 'sha256=' + hmac.update(req.rawBody).digest('hex');

  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}

app.post('/webhook', async (req, res) => {
  if (!verifySignature(req)) {
    console.warn('⚠️  Invalid webhook signature');
    return res.sendStatus(401);
  }

  const event = req.headers['x-github-event'];
  const { action, pull_request, repository } = req.body;

  if (event !== 'pull_request' || !['opened', 'synchronize', 'reopened'].includes(action)) {
    return res.sendStatus(200);
  }

  res.sendStatus(200);

  const owner = repository.owner.login;
  const repo = repository.name;
  const pull_number = pull_request.number;
  const sha = pull_request.head.sha;

  console.log(`\n🔍 Reviewing PR #${pull_number} in ${owner}/${repo} (${sha.slice(0, 7)})...`);

  try {
    await setCommitStatus(owner, repo, sha, 'pending', 'Dev-Guard is reviewing this code...');

    const diff = await getPRDiff(owner, repo, pull_number);

    if (!diff || diff.trim().length === 0) {
      console.log('ℹ️  Empty diff, skipping.');
      await setCommitStatus(owner, repo, sha, 'success', 'No changes to review');
      return;
    }

    const trimmedDiff = diff.slice(0, MAX_DIFF_CHARS);
    const truncatedNote = diff.length > MAX_DIFF_CHARS
      ? `\n\n_Note: diff was truncated to ${MAX_DIFF_CHARS} characters for review._`
      : '';

    const rawReview = await reviewCode(trimmedDiff);
    const { status, issues, raw } = parseReview(rawReview);

    const hasCritical = issues.some((i) => /\[CRITICAL\]/i.test(i));
    const emoji = status === 'FAIL' ? '🚨' : status === 'PASS' ? '✅' : '⚠️';

    let body = `## ${emoji} Dev-Guard Security Review\n\n`;
    body += `**Status:** ${status}\n\n`;

    if (raw) {

      body += `**Raw model output:**\n\`\`\`\n${raw}\n\`\`\``;
    } else if (issues.length > 0) {
      body += `**Issues found:**\n` + issues.join('\n');
    } else {
      body += '_No issues found. Looks good!_';
    }
    body += truncatedNote;
    body += `\n\n---\n*Reviewed locally via Ollama (${process.env.OLLAMA_MODEL || 'deepseek-coder'}) — no code left your machine.*`;

    await postComment(owner, repo, pull_number, body);

    if (hasCritical) {
      await setCommitStatus(owner, repo, sha, 'failure', 'Critical issue found — review required');
    } else if (status === 'FAIL') {
      await setCommitStatus(owner, repo, sha, 'failure', 'Issues found — see PR comment');
    } else {
      await setCommitStatus(owner, repo, sha, 'success', 'No critical issues found');
    }

    console.log(`✅ Review posted for PR #${pull_number} — status: ${status}`);
  } catch (err) {
    console.error('❌ Error during review:', err.message);
    try {
      await setCommitStatus(
        req.body.repository.owner.login,
        req.body.repository.name,
        req.body.pull_request.head.sha,
        'error',
        'Dev-Guard failed to complete review'
      );
    } catch (_) { /* ignore */ }
  }
});


app.get('/', (req, res) => {
  res.send('🛡️ Dev-Guard is running.');
});

app.listen(PORT, () => {
  console.log(`🛡️  Dev-Guard running on http://localhost:${PORT}`);
  console.log(`   Webhook endpoint: http://localhost:${PORT}/webhook`);
  console.log(`   Using Ollama model: ${process.env.OLLAMA_MODEL || 'deepseek-coder'}`);
});
