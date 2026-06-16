# 🛡️ Dev-Guard

AI-Powered GitHub Security Reviewer

Dev-Guard automatically reviews newly pushed code and pull requests for security vulnerabilities, exposed secrets, and dangerous coding patterns before they reach production.

Built using GitHub Webhooks, Node.js, Ollama, and AI-powered code analysis.

---

## 🚀 Features

* Real-time GitHub webhook integration
* Automated code review on every push or pull request
* Detection of:

  * Hardcoded passwords
  * API keys and secrets
  * Security vulnerabilities
  * Risky coding practices
  * Potential bugs
* AI-generated remediation suggestions
* Local LLM support via Ollama
* Privacy-first architecture (code never leaves your machine)
* Automated GitHub PR comments

---

## 🏗️ Architecture

GitHub Push / Pull Request
↓
GitHub Webhook
↓
Dev-Guard Server (Node.js)
↓
GitHub API (Fetch Diff)
↓
Ollama (Local LLM)
↓
AI Security Review
↓
GitHub PR Comment

---

## 🛠️ Tech Stack

* Node.js
* Express.js
* GitHub Webhooks
* GitHub REST API
* Ollama
* ngrok
* Local AI Models

---

## 📋 How It Works

1. Developer pushes code to GitHub.
2. GitHub triggers a webhook event.
3. Dev-Guard receives the event.
4. The changed code diff is fetched using GitHub APIs.
5. The diff is sent to Ollama for analysis.
6. The AI reviews the code for security and quality issues.
7. Findings are automatically posted back to the Pull Request.

---

## 📸 Example Detection

### Input

db_password = "supersecret123"
api_key = "sk-abc123realkeyvalue"
query = "SELECT * FROM users WHERE id = " + user_input
print("Logging in with password:", db_password)
password = "admin123"

### Dev-Guard Response

{"status":"FAIL","issues":[{"severity":"CRITICAL","line":"1","problem":"Hardcoded database password","fix":"Move to environment variable"},{"severity":"CRITICAL","line":"2","problem":"Hardcoded API key","fix":"Move to environment variable"},{"severity":"CRITICAL","line":"3","problem":"SQL injection vulnerability","fix":"Use parameterized queries"}]}

---

## 🔒 Why Local AI?

Most AI code review platforms send source code to external servers.

Dev-Guard uses Ollama to run AI models locally, helping organizations:

* Maintain code privacy
* Reduce third-party exposure
* Control infrastructure costs
* Customize review policies

---
## 🚧 Challenges Faced

### 1. Receiving GitHub Webhooks on a Local Machine

GitHub needs a public URL to send webhook events, but my application was running locally.

**Challenge:**
GitHub could not directly communicate with localhost.

**Solution:**
I used ngrok to create a secure public tunnel that forwarded webhook requests to my local Node.js server.

---

### 2. Avoiding Full Repository Analysis

Initially, analyzing the entire repository for every push was inefficient and slow.

**Challenge:**
Large repositories could generate unnecessary AI processing costs and latency.

**Solution:**
I fetched only the changed files and code diffs using the GitHub API. This reduced processing time and focused the AI review on newly introduced code.

---

### 3. Reducing False Positives

AI models sometimes flag harmless code as a security issue.

**Challenge:**
Developers may lose trust if the system generates too many incorrect warnings.

**Solution:**
I refined the review prompt and structured the output format to prioritize high-confidence findings and actionable recommendations.

---

### 4. Integrating AI Responses with GitHub Workflows

AI-generated text is useful only if it appears where developers work.

**Challenge:**
Security findings needed to be visible inside the pull request workflow.

**Solution:**
I integrated GitHub PR comments so feedback is automatically posted where developers review code.

---

### 5. Maintaining Code Privacy

Many AI code-review tools require source code to be sent to external servers.

**Challenge:**
Organizations may not want proprietary code leaving their infrastructure.

**Solution:**
I integrated Ollama to run AI models locally, ensuring code remains within the developer's environment.

---

## 👨‍💻 Author

Pranav Narkar

Computer Engineering Student

If you found this project useful, consider giving it a ⭐ on GitHub.
