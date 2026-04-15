# How to open a PR to the employer repo

**Employer (upstream) repository:**  
[https://github.com/rohit-ups/Take-Home-Assignment-The-Untested-API](https://github.com/rohit-ups/Take-Home-Assignment-The-Untested-API)

You open a **Pull Request** from **your fork** → into **`rohit-ups/Take-Home-Assignment-The-Untested-API`** branch **`main`** (unless they told you another base branch).

---

## Why use the “clone fork + copy files” method

Your work folder was turned into its **own** git repo with new commits. It was **not** created by `git clone` of the employer repo, so its **commit history does not match** GitHub’s copy. Pushing straight to a fork often causes “unrelated histories” errors.

The most reliable approach: **fork on GitHub → clone your fork → copy your finished files into that clone → commit → push → PR.**

---

## Step 1 — Fork (in the browser)

1. While signed into **your** GitHub account, open:  
   [https://github.com/rohit-ups/Take-Home-Assignment-The-Untested-API](https://github.com/rohit-ups/Take-Home-Assignment-The-Untested-API)
2. Click **Fork** (top right).
3. Create the fork under your account (same repo name is fine).

After that, **your** repo will be:

`https://github.com/YOUR_GITHUB_USERNAME/Take-Home-Assignment-The-Untested-API`

---

## Step 2 — Clone **your** fork (new folder)

Replace `YOUR_GITHUB_USERNAME`:

```bash
cd ~/Downloads
git clone https://github.com/YOUR_GITHUB_USERNAME/Take-Home-Assignment-The-Untested-API.git take-home-pr
cd take-home-pr
```

(You can use SSH instead of HTTPS if you already use SSH keys with GitHub.)

---

## Step 3 — Copy your completed work into the clone

Your finished project (with tests, fixes, docs) is here:

`/Users/tanya/Downloads/Take-Home-Assignment-The-Untested-API-main`

Copy **everything** from that folder **into** `~/Downloads/take-home-pr`, **overwriting** matching files, **except** do not copy these into the fork (they are huge or machine-local):

- `Take-Home-Assignment-The-Untested-API-main/task-api/node_modules/`
- `Take-Home-Assignment-The-Untested-API-main/task-api/coverage/`
- `Take-Home-Assignment-The-Untested-API-main/.git/` (do **not** overwrite the clone’s `.git` folder)

Easiest on macOS: use **Finder** — drag folders like `task-api`, root markdown files, `.gitignore`, etc., into `take-home-pr`, choose **Replace** when asked.

After copy, you should see in the clone, for example:

- `task-api/tests/*.test.js`
- `task-api/BUG_REPORT.md`
- `SUBMISSION_NOTES.md`, `PUSH_AND_PR.md`, `PR_TO_EMPLOYER.md` (if you copied them)
- Root `ASSIGNMENT.md`, `README.md`, etc.

---

## Step 4 — Commit and push from the clone

```bash
cd ~/Downloads/take-home-pr
git status
git add -A
git commit -m "Complete take-home: tests, bug fixes, assign endpoint, docs"
git push -u origin main
```

If `git commit` says “nothing to commit”, either the copy did not land in this folder or files match exactly — run `git status` and fix paths.

---

## Step 5 — Open the Pull Request on GitHub

1. Open **your fork** in the browser:  
   `https://github.com/YOUR_GITHUB_USERNAME/Take-Home-Assignment-The-Untested-API`
2. GitHub usually shows a yellow banner: **Compare & pull request** — click it.

If you do not see it:

1. Go to the **upstream** repo:  
   [https://github.com/rohit-ups/Take-Home-Assignment-The-Untested-API](https://github.com/rohit-ups/Take-Home-Assignment-The-Untested-API)
2. Click **Pull requests** → **New pull request**
3. Set **base** repository: `rohit-ups/Take-Home-Assignment-The-Untested-API`, branch **`main`**
4. Set **head** repository: **your fork**, branch **`main`**
5. Create pull request

---

## Step 6 — PR description (paste from your repo)

Copy the “How to run”, coverage summary, and reflection bullets from **`SUBMISSION_NOTES.md`** into the PR description. Add a line that bugs are listed in **`task-api/BUG_REPORT.md`**.

---

## If `git push` asks for a password

GitHub no longer accepts account passwords for Git over HTTPS. Use a **Personal Access Token** or switch to **SSH**. Official guides: [Creating a personal access token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token), [Connecting with SSH](https://docs.github.com/en/authentication/connecting-to-github-with-ssh).

---

## Optional: keep `upstream` in your clone for updates

```bash
cd ~/Downloads/take-home-pr
git remote add upstream https://github.com/rohit-ups/Take-Home-Assignment-The-Untested-API.git
git fetch upstream
```

You only need this if you want to pull future changes from the employer repo.
