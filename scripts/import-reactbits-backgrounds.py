#!/usr/bin/env python3
"""
Imports React Bits backgrounds (the free shadcn registry JSON) into src/components/reactbits/bg/ and writes
src/lib/backgrounds.generated.ts: for each one its id, name and the knobs its props give (type, default, range),
read from the component's own `interface ...Props` and the defaults in its parameter list.

  python3 scripts/import-reactbits-backgrounds.py /path/to/dir-with-<Name>.json ...

Each <Name>.json is https://reactbits.dev/r/<Name>-TS-TW.json (fetch with curl; the list is the registry's https://reactbits.dev/r/registry.json). Components that need packages the site does not have
(vgpu) are skipped by the caller.
"""
import json, re, sys, os

SKIP_KEYS = {"className", "style", "time", "dpr", "maxDevicePixelRatio", "paused", "lightMode", "transparent", "children", "ref", "resolution", "disableAnimation"}
INT_HINT = re.compile(r"(count|layers|strands|lines|steps|segments|iterations|octaves|bands|rings|stops|pointCount|numBalls|cells|rows|cols|columns)", re.I)

def kebab(name):
    return re.sub(r"(?<!^)(?=[A-Z])", "-", name).lower()

def label(key):
    return re.sub(r"(?<!^)(?=[A-Z])", " ", key).replace("_", " ").title()

def unions(src):
    out = {}
    for m in re.finditer(r"type\s+(\w+)\s*=\s*([^;]+);", src):
        opts = re.findall(r"'([^']+)'", m.group(2))
        if opts and all(re.fullmatch(r"\s*'[^']+'\s*\|?\s*", p) for p in m.group(2).split("|")):
            out[m.group(1)] = opts
    return out

def props_of(src):
    m = re.search(r"interface\s+(\w+Props)\s*(?:extends[^{]*)?\{(.*?)\n\}", src, re.S)
    if not m:
        return []
    body = m.group(2)
    props = []
    for line in body.split("\n"):
        line = re.sub(r"/\*.*?\*/", "", line).split("//")[0].strip()
        pm = re.match(r"(\w+)\??:\s*(.+?);?$", line)
        if pm:
            props.append((pm.group(1), pm.group(2).strip().rstrip(";")))
    return props

def defaults_of(src, props_name):
    m = re.search(r"\(\{\s*\n(.*?)\n\}\s*:\s*" + re.escape(props_name) + r"\s*\)", src, re.S)
    if not m:
        return {}
    d = {}
    depth = 0
    cur = ""
    items = []
    for ch in m.group(1):
        if ch in "[({":
            depth += 1
        if ch in "])}":
            depth -= 1
        if ch == "," and depth == 0:
            items.append(cur)
            cur = ""
        else:
            cur += ch
    items.append(cur)
    for it in items:
        it = it.strip()
        km = re.match(r"(\w+)\s*(?:=\s*(.+))?$", it, re.S)
        if km and km.group(2) is not None:
            d[km.group(1)] = km.group(2).strip()
    return d

def parse_value(raw):
    raw = raw.strip()
    if raw in ("true", "false"):
        return raw == "true"
    if re.fullmatch(r"-?\d+(\.\d+)?", raw):
        return float(raw) if "." in raw else int(raw)
    m = re.fullmatch(r"'([^']*)'", raw)
    if m:
        return m.group(1)
    if raw.startswith("["):
        items = re.findall(r"'([^']*)'", raw)
        if items:
            return items
        nums = re.findall(r"-?\d+(?:\.\d+)?", raw)
        return [float(n) if "." in n else int(n) for n in nums]
    return None

def spec_for(key, ty, default, un):
    if key in SKIP_KEYS:
        return None
    ty = ty.strip()
    if ty == "boolean":
        return dict(key=key, label=label(key), type="boolean", default=bool(default) if default is not None else False)
    if ty == "number":
        d = default if isinstance(default, (int, float)) else 1
        is_int = bool(INT_HINT.search(key)) or (isinstance(d, int) and d >= 3 and not isinstance(d, bool))
        if "hue" in key.lower():
            lo, hi, st = 0, 360, 1
        elif d == 1 and not is_int:
            lo, hi, st = 0, 3, 0.05
        elif 0 <= d < 1 and not is_int:
            lo, hi, st = 0, 1, 0.01
        elif d < 0:
            lo, hi, st = d * 3, -d * 3, 0.05
        else:
            hi = max(2, d * 3)
            if "count" in key.lower() or "particle" in key.lower():
                hi = max(d * 2, d + 1)
            lo, st = 0, (1 if is_int else (0.1 if d < 10 else 1))
            if "rotation" in key.lower() and not is_int:
                lo, hi, st = -360, 360, 1
        return dict(key=key, label=label(key), type="number", default=d, min=lo, max=round(hi, 4), step=st)
    if ty == "string":
        if isinstance(default, str) and re.fullmatch(r"#[0-9a-fA-F]{3,8}", default):
            return dict(key=key, label=label(key), type="color", default=default)
        if "color" in key.lower() or default is None:
            return dict(key=key, label=label(key), type="color", default=default if isinstance(default, str) else None)
        return None
    if ty == "string[]":
        return dict(key=key, label=label(key), type="colors", default=default if isinstance(default, list) else None)
    if ty in un:
        return dict(key=key, label=label(key), type="select", default=default if isinstance(default, str) else un[ty][0], options=un[ty])
    m = re.fullmatch(r"('[^']+'\s*\|\s*)+'[^']+'", ty)
    if m:
        opts = re.findall(r"'([^']+)'", ty)
        return dict(key=key, label=label(key), type="select", default=default if isinstance(default, str) else opts[0], options=opts)
    return None

def main(paths):
    out = []
    os.makedirs("src/components/reactbits/bg", exist_ok=True)
    for path in sorted(paths):
        name = os.path.basename(path)[:-5]
        data = json.load(open(path))
        tsx = [f for f in data["files"] if f["path"].endswith(".tsx")]
        if not tsx or name in ("ColorBends", "GridMotion", "Hyperspeed"):
            continue  # these three take their settings in another shape: skipped for now
        src = tsx[0]["content"]
        open(f"src/components/reactbits/bg/{name}.tsx", "w").write("// @ts-nocheck -- React Bits " + name + " as published (reactbits.dev/r/" + name + "-TS-TW.json); not edited here, so its own strictness slips are left alone.\n" + src)
        un = unions(src)
        props = props_of(src)
        pm = re.search(r"interface\s+(\w+Props)", src)
        dflt = defaults_of(src, pm.group(1)) if pm else {}
        controls = []
        for key, ty in props:
            raw = dflt.get(key)
            spec = spec_for(key, ty, parse_value(raw) if raw is not None else None, un)
            if spec:
                controls.append(spec)
        out.append(dict(id="bg-" + kebab(name), name=re.sub(r"(?<!^)(?=[A-Z])", " ", name), file=name, controls=controls))
    ts = "// Generated by scripts/import-reactbits-backgrounds.py from the React Bits registry. Do not edit by hand.\n"
    ts += "export type BgControl =\n  | { key: string; label: string; type: \"boolean\"; default: boolean }\n  | { key: string; label: string; type: \"number\"; default: number; min: number; max: number; step: number }\n  | { key: string; label: string; type: \"color\"; default: string | null }\n  | { key: string; label: string; type: \"colors\"; default: string[] | null }\n  | { key: string; label: string; type: \"select\"; default: string; options: string[] }\n\n"
    ts += "export interface BgDef { id: string; name: string; file: string; controls: BgControl[] }\n\n"
    ts += "export const BACKGROUNDS: BgDef[] = [\n" + ",\n".join("  " + json.dumps(o) for o in out) + "\n]\n"
    open("src/lib/backgrounds.generated.ts", "w").write(ts)
    print(len(out), "backgrounds,", sum(len(o["controls"]) for o in out), "controls")

main(sys.argv[1:])
