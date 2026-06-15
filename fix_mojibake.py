import re, glob, sys

def sloppy_encode(s):
    """cp1252 encode, nhưng các slot C1 (0x80-0x9F) không định nghĩa thì rơi về latin-1.
    Đây là cách ftfy đảo ngược mojibake UTF-8→cp1252 không mất byte."""
    out = bytearray()
    for ch in s:
        o = ord(ch)
        if o < 0x80:
            out.append(o)
            continue
        try:
            out += ch.encode('cp1252')
        except UnicodeEncodeError:
            if 0x80 <= o <= 0x9f:
                out.append(o)
            else:
                raise
    return bytes(out)

def fix_run(run):
    try:
        b = sloppy_encode(run)
    except UnicodeEncodeError:
        return run
    try:
        dec = b.decode('utf-8')
    except UnicodeDecodeError:
        return run
    return dec if dec != run else run

NONASCII = re.compile(r'[^\x00-\x7f]+')

def fix_text(t):
    def repl(m):
        s = m.group(0)
        for _ in range(3):
            ns = fix_run(s)
            if ns == s:
                break
            s = ns
        return s
    return NONASCII.sub(repl, t)

BAD = re.compile('|'.join(['Ã', 'Ä', 'Å', 'á»', 'â€', 'Æ', 'áº']))

apply_changes = '--apply' in sys.argv

files = []
for ext in ('java', 'md', 'js', 'html', 'css'):
    files += glob.glob('**/*.' + ext, recursive=True)

def skip(f):
    p = f.replace(chr(92), '/')
    return ('node_modules' in p) or ('/target/' in p) or p.endswith('fix_mojibake.py')

files = [f for f in files if not skip(f)]

changed = []
for f in files:
    try:
        orig = open(f, encoding='utf-8').read()
    except Exception:
        continue
    fixed = fix_text(orig)
    if fixed != orig:
        before = len(BAD.findall(orig))
        after = len(BAD.findall(fixed))
        changed.append((f, before, after))
        if apply_changes:
            open(f, 'w', encoding='utf-8', newline='').write(fixed)

print(("APPLIED" if apply_changes else "DRY-RUN") + " — files changed: %d" % len(changed))
for f, b, a in sorted(changed):
    print("  mojibake %5d -> %5d   %s" % (b, a, f))
