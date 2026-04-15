# Push this folder to GitHub and open a PR

Your project is already a **git repo** with commits on branch `main`. I cannot log into your GitHub account from here, so you complete the last steps once you have a repo URL.

## Step 1 — Create a place on GitHub for this code

Pick **one** of these (whatever your employer said):

**A) They gave you a repo to fork**

1. Open their link in the browser.
2. Click **Fork** (top right).
3. After fork exists, copy your fork’s URL. It looks like:
   - `https://github.com/YOUR_USERNAME/REPO_NAME.git`  
   or  
   - `git@github.com:YOUR_USERNAME/REPO_NAME.git`

**B) They did not give a repo — use your own new repo**

1. On GitHub: **New repository** (any name, e.g. `take-home-task-api`).
2. Leave “Initialize with README” **unchecked** (you already have files locally).
3. Copy the URL GitHub shows for “push an existing repository”.

## Step 2 — Send me that link

Reply with **exactly**:

- The **HTTPS** or **SSH** clone URL of **your** fork or **your** new repo (example: `https://github.com/tanya/take-home-task-api.git`).

Optional but helpful:

- If they asked for the PR **into a specific branch** (e.g. `main` vs `develop`), say which.

## Step 3 — You run these commands (or I run them after you confirm the URL)

In Terminal:

```bash
cd /Users/tanya/Downloads/Take-Home-Assignment-The-Untested-API-main
git remote add origin PASTE_YOUR_REPO_URL_HERE
git branch -M main
git push -u origin main
```

If `origin` already exists and is wrong:

```bash
git remote remove origin
git remote add origin PASTE_YOUR_REPO_URL_HERE
git push -u origin main
```

## Step 4 — Open the PR

- If you **forked** their repo: on GitHub, open **your fork** → you should see **Compare & pull request** → target = **their** `main` (or branch they specified).
- If you used **only your own repo**: there is no PR unless they gave you a second repo to open a PR **into** — then you’d need their instructions (sometimes they only want the link to your repo).

## If GitHub asks for a password

Use a **Personal Access Token** (HTTPS) or **SSH key** (SSH). GitHub’s docs: [HTTPS](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token) and [SSH](https://docs.github.com/en/authentication/connecting-to-github-with-ssh).
