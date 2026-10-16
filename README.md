# Ian Dahlin – Portfolio

Personal portfolio for Ian Dahlin, Lead Software Engineer at Brooks Building Solutions.

**Live site:** https://yeahian.github.io/Personal-Website/

Plain HTML, CSS and JavaScript with no build step, hosted on GitHub Pages. Pushing to `main` publishes the site.

## Structure

```
index.html                  page content and structured data (JSON-LD)
style.css                   layout and theme (colors are the variables at the top)
script.js                   mobile menu, active-section nav, hero point-cloud torus
llms.txt                    plain-text profile summary for AI agents
assets/fonts/               IBM Plex Sans (self-hosted, SIL Open Font License)
assets/docs/                resume PDF linked from the site
images/                     headshot and research figure
```

## Run it locally

Any static server works. From this folder:

```
python -m http.server 8000
```

Then open http://localhost:8000. Opening `index.html` directly also works, though fonts may fall back in some browsers.

## Updating

1. Edit the files.
2. Commit and push to `main`. GitHub Pages redeploys in about a minute.

To replace the resume, overwrite `assets/docs/Ian-Dahlin-Resume.pdf` with the same file name.

The original 2024 version of this site is kept on the `archive-2024-original` branch.
