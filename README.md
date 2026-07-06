# Flavor Peak Profile ☕

A tiny static tool for specialty coffee roasters. Each coffee changes after roast — aroma, sweetness, acidity, body, aftertaste all rise, peak, then fade at different times. This plots them on one graph so customers can see **when** a coffee is at its best.

Built as plain **HTML / CSS / JS** — no build step, no dependencies. Host free on GitHub Pages.

## What it does

- Sidebar with five attributes: **aroma, sweetness, aftertaste, acidity, body**
- For each you enter three days (from roast): **ready → peak → decline**
- Each attribute is drawn as a glowing pastel bell curve (asymmetric gaussian — steeper rise, gentler fade)
- A shaded **peak window** band shows where the sum of all attributes is ≥ 85% of its max
- Toggle any attribute on/off, edit coffee name + subtitle
- **Export as PNG** (high-res 3× canvas) for posting on your website / Instagram / bag labels

## Run locally

Just open `index.html` in a browser. Or:

```bash
python3 -m http.server 8000
# visit http://localhost:8000
```

## Host on GitHub Pages

1. Create a new GitHub repo and push these files (`index.html`, `styles.css`, `app.js`).
2. Repo **Settings → Pages**.
3. Under **Build and deployment**, set Source to **Deploy from a branch**.
4. Branch: **main** / **root**, then **Save**.
5. Wait ~1 min — your site goes live at `https://<username>.github.io/<repo>/`.

To update, just `git push` — Pages auto-redeploys.

## Files

| file         | purpose                                   |
|--------------|-------------------------------------------|
| `index.html` | markup, sidebar + canvas layout           |
| `styles.css` | black theme, JetBrains Mono, pastel vars  |
| `app.js`     | curve model, canvas drawing, PNG export   |

## Customize

- **Colors** — edit the `--aroma / --sweetness / ...` CSS variables in `styles.css` and the matching `color` values in `ATTRS` at the top of `app.js`.
- **Peak-window threshold** — change the `0.85` in `app.js` (`thresh = maxTotal * 0.85`).
- **More attributes** — add an entry to both `ATTRS` and `DEFAULTS` in `app.js`.
