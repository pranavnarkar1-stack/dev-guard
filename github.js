const { Octokit } = require('@octokit/rest');

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

async function getPRDiff(owner, repo, pull_number) {
  const { data } = await octokit.pulls.get({
    owner,
    repo,
    pull_number,
    mediaType: { format: 'diff' }
  });
  return data;
}

async function postComment(owner, repo, pull_number, body) {
  await octokit.issues.createComment({
    owner,
    repo,
    issue_number: pull_number,
    body
  });
}

async function setCommitStatus(owner, repo, sha, state, description) {
  await octokit.repos.createCommitStatus({
    owner,
    repo,
    sha,
    state,
    context: 'dev-guard/security-review',
    description
  });
}

module.exports = { getPRDiff, postComment, setCommitStatus };

