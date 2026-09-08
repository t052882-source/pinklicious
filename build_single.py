"""Inline everything into one self-contained page for hosting as an Artifact."""
import base64, os, re, pathlib

ROOT = pathlib.Path(__file__).parent
html = (ROOT / 'index.html').read_text()
css  = (ROOT / 'css' / 'style.css').read_text()
js   = (ROOT / 'js' / 'app.js').read_text()

def b64(path, mime):
    return 'data:%s;base64,%s' % (mime, base64.b64encode(pathlib.Path(path).read_bytes()).decode())

# ---- fonts into the stylesheet
for name in ['inter-var', 'anton', 'archivo-black', 'italianno', 'pinyon-script']:
    css = css.replace("url('../fonts/%s.woff2')" % name,
                      "url(%s)" % b64(ROOT / 'fonts' / ('%s.woff2' % name), 'font/woff2'))

# ---- images into both the markup and the script
imgs = {}
for f in sorted((ROOT / 'img').glob('*.webp')):
    imgs['img/' + f.name] = b64(f, 'image/webp')
for ref, uri in imgs.items():
    html = html.replace('"%s"' % ref, '"%s"' % uri)
    js = js.replace("'%s'" % ref, "'%s'" % uri)

left = [r for r in re.findall(r'img/[\w.-]+', html + js) if r in imgs or True]
assert not [r for r in set(left) if r in imgs], 'unreplaced: %s' % set(left)

# ---- take the body markup only; the Artifact host supplies the page skeleton
body = html.split('<body>', 1)[1].rsplit('</body>', 1)[0]
body = body.replace('<script src="js/app.js"></script>', '')
title = re.search(r'<title>(.*?)</title>', html, re.S).group(1)

out = (
    '<title>%s</title>\n' % title +
    '<style>\n%s\n</style>\n' % css +
    body +
    '\n<script>\n%s\n</script>\n' % js
)
(ROOT / 'pinklicious-artifact.html').write_text(out)
print('wrote pinklicious-artifact.html  %.2f MB' % (len(out.encode()) / 1e6))
