"""Lint .dc.html artboards for the LexReg canvas. Usage: python3 -I lint_dc.py <project_dir> [names...]"""
import html
import json
import pathlib
import re
import sys
from html.parser import HTMLParser

ROOT = pathlib.Path(sys.argv[1])
CSS = pathlib.Path(__file__).parent / 'assets' / 'lexreg-ui.css'
BOARDS = """Main Foundations Components Motion Home Insight Legal Phone-Home SignIn SignUp ResetPassword LawyerInvite
PathSelector Readiness ReadinessResult NewType NewApplicant NewName NewShares NewPeople NewOwnership NewVault NewDeclaration
NewReview NewFiling Phone-NewPeople ExType ExUpload ExDetails ExPeople ExInstrument ExBaseline ExReview Phone-ExUpload
Dashboard Workspace WsStructure WsPeople WsCompliance WsDocuments Overlays Services Phone-Dashboard Phone-Workspace
Admin AdminEntities AdminEntity Lawyer""".split()
VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr'}
HEAD = '<script src="./support.js"></script>\n<link rel="stylesheet" href="/_blob/f3cded53e7fed4f078920ca82a469759">'
BOOL_ATTRS = {'disabled', 'checked', 'selected', 'readonly', 'required', 'hidden', 'open', 'data-dc-script', 'multiple', 'autofocus'}

css = CSS.read_text()
css_classes = set(re.findall(r'\.(-?[_a-zA-Z][\w-]*)', re.sub(r'url\([^)]*\)', '', css)))
HOLE_OK = re.compile(r'^(?:[A-Za-z_$][\w$]*(?:\.[\w$]+)*|true|false|null|-?\d+(?:\.\d+)?|\'[^\']*\')$')


class P(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack, self.errors, self.classes, self.links, self.as_names = [], [], [], [], set()
        self.a_depth = 0

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        ln = self.getpos()[0]
        if tag == 'sc-if' and 'hint-placeholder-val' not in a:
            self.errors.append(f'line {ln}: sc-if missing hint-placeholder-val')
        if tag == 'sc-for':
            if 'hint-placeholder-count' not in a:
                self.errors.append(f'line {ln}: sc-for missing hint-placeholder-count')
            if a.get('as'):
                self.as_names.add(a['as'])
        if tag == 'button' and self.a_depth:
            self.errors.append(f'line {ln}: <button> inside <a>')
        if tag == 'a':
            if self.a_depth:
                self.errors.append(f'line {ln}: <a> inside <a>')
            self.a_depth += 1
            h = a.get('href') or ''
            if h.endswith('.dc.html'):
                self.links.append((ln, h))
        if tag in ('iframe', 'object', 'embed'):
            self.errors.append(f'line {ln}: forbidden <{tag}>')
        for k, v in attrs:
            if v is None and k not in BOOL_ATTRS:
                self.errors.append(f'line {ln}: attribute {k} without value')
            if k == 'class' and v:
                self.classes.append((ln, v))
            if k.lower().startswith('on') and v and not re.fullmatch(r'\{\{\s*[\w$.]+\s*\}\}', v):
                self.errors.append(f'line {ln}: event attr {k}="{v}" is not a whole-value hole')
        if tag not in VOID:
            self.stack.append((tag, ln))

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID:
            self.errors.append(f'line {self.getpos()[0]}: self-closed non-void <{tag}/>')
            self.stack.pop()

    def handle_endtag(self, tag):
        if tag == 'a':
            self.a_depth = max(0, self.a_depth - 1)
        if tag in VOID:
            return
        if not self.stack:
            self.errors.append(f'line {self.getpos()[0]}: stray </{tag}>')
            return
        if self.stack[-1][0] == tag:
            self.stack.pop()
            return
        if tag in [t for t, _ in self.stack]:
            while self.stack and self.stack[-1][0] != tag:
                t, ln = self.stack.pop()
                self.errors.append(f'line {ln}: <{t}> not closed before </{tag}> at line {self.getpos()[0]}')
            self.stack.pop()
        else:
            self.errors.append(f'line {self.getpos()[0]}: stray </{tag}>')


def lint(path):
    src = path.read_text()
    errs, warns = [], []
    if HEAD not in src:
        errs.append('head lines not exactly support.js + stylesheet link')
    m = re.search(r'<x-dc>(.*)</x-dc>', src, re.S)
    if not m:
        return ['no <x-dc> block'], []
    body = m.group(1)
    sm = re.search(r"<script type=\"text/x-dc\" data-dc-script data-props='([^']*)'>(.*?)</script>", src, re.S)
    script = ''
    if not sm:
        errs.append('missing or malformed data-dc-script block (data-props must be single-quoted)')
    else:
        script = sm.group(2)
        try:
            props = json.loads(html.unescape(sm.group(1)))
            if 'dark' not in props:
                warns.append('data-props has no "dark"')
            if '$preview' not in props:
                errs.append('data-props has no $preview')
        except Exception as e:
            errs.append(f'data-props JSON invalid: {e}')
        if 'class Component extends DCLogic' not in script:
            errs.append('logic class is not "class Component extends DCLogic"')
        if re.search(r'^\s*(import|export)\s', script, re.M):
            errs.append('import/export in logic script')
    for bad, why in [('innerHTML', 'script-built UI'), ('document.', 'DOM access'), ('window.', 'window access'),
                     ('100vh', 'vh height'), ('position: fixed', 'fixed position'), ('position:fixed', 'fixed position')]:
        if bad in src:
            errs.append(f'contains {bad!r} ({why})')
    if re.search(r'@media[^{]*(max|min)-width', src):
        errs.append('@media width query (use @container lx)')
    p = P()
    p.feed(body)
    p.close()
    errs += p.errors
    for t, ln in p.stack:
        errs.append(f'line {ln}: <{t}> never closed')
    roots = set()
    for hm in re.finditer(r'\{\{(.*?)\}\}', body, re.S):
        h = hm.group(1).strip()
        if not HOLE_OK.match(h):
            errs.append(f'expression hole {{{{{h}}}}}')
        else:
            r = h.split('.')[0]
            if r not in ('true', 'false', 'null', '$index') and not r[0].isdigit() and not r.startswith(("'", '-')):
                roots.add(r)
    for r in sorted(roots - p.as_names):
        if not re.search(r'\b' + re.escape(r) + r'\b', script):
            errs.append(f'hole root "{r}" not found in renderVals')
    for ln, h in p.links:
        if '{{' not in h and h[:-len('.dc.html')] not in BOARDS:
            errs.append(f'line {ln}: link to unknown board {h}')
    local = set(re.findall(r'\.(-?[_a-zA-Z][\w-]*)', ' '.join(re.findall(r'<style>(.*?)</style>', src, re.S))))
    seen = set()
    for ln, v in p.classes:
        for tok in re.sub(r'\{\{.*?\}\}', ' ', v).split():
            if tok not in css_classes and tok not in local and tok not in seen:
                seen.add(tok)
                warns.append(f'line {ln}: class "{tok}" not in stylesheet')
    for ic in set(re.findall(r'\bic-[\w-]+', body)) | {x.strip("'") for x in re.findall(r"'ic-[\w-]+'", script)}:
        if ic not in css_classes:
            errs.append(f'unknown icon {ic}')
    return errs, warns


names = sys.argv[2:] or [p.name[:-len('.dc.html')] for p in sorted(ROOT.glob('*.dc.html'))]
total = 0
for n in names:
    f = ROOT / f'{n}.dc.html'
    if not f.exists():
        print(f'== {n}: MISSING')
        continue
    e, w = lint(f)
    total += len(e)
    print(f'== {n}: ' + ('OK' if not e else f'{len(e)} errors') + (f', {len(w)} warnings' if w else ''))
    for x in e:
        print('   E', x)
    for x in w:
        print('   W', x)
print('TOTAL ERRORS', total)
