#!/usr/bin/env python3
"""Freeze a held-out set: seed it from a drand beacon round named in advance, generate it, record every hash.

    python freeze.py --set H1 --round <drand round> --count 12 [--dates pre2020] [--features wide]

Fetches round <round> of the drand default (mainnet) chain
(8990e7a9aaed2ffed73dbd7092123d6f289930540d7651336225dc172e51b2ce, a 30-second
period from 2020-07-22 21:57:30 UTC), checks that its randomness is the SHA-256
of its signature (how that chain derives it), and uses the randomness as the
seed. The round was named in PROTOCOL.md before it was published, so nobody,
the author included, could know the seed when the generator, the scorer and
the protocol were committed. Writes <set>/cases/ (the XER files and
cases.json) and <set>/cases/manifest.json: the round, its randomness and
signature, and the SHA-256 of the engine, of each script in this folder (and of
<set>/PROTOCOL.md when the set has its own) and of each case file. --dates is
handed to the generator (H6 on: pre2020; every earlier set used the default),
and so is --features (H8 on: wide; every earlier set used the default), which
the manifest records; from H6 on the manifest also records score_whole_day.js,
and from H8 on import_p6_sqlite.py and p6_imported_overlay.js (P6's import laid
over each case before the engine reads it).
"""
import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
import urllib.request

CHAIN = '8990e7a9aaed2ffed73dbd7092123d6f289930540d7651336225dc172e51b2ce'
GENESIS, PERIOD = 1595431050, 30
HERE = os.path.dirname(os.path.abspath(__file__))


def sha(path):
    with open(path, 'rb') as f:
        return hashlib.sha256(f.read()).hexdigest()


def engine_version():
    # The version the frozen engine file declares (H1's freeze wrote '2.10.1' as a literal; from H2 on it is read).
    with open(os.path.join(HERE, '..', '..', 'cpm-engine.js'), encoding='utf-8') as f:
        m = re.search(r"const ENGINE_VERSION = '([^']+)'", f.read())
    return m.group(1) if m else 'unknown'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--set', required=True)
    ap.add_argument('--round', type=int, required=True)
    ap.add_argument('--count', type=int, default=12)
    ap.add_argument('--dates', default='default')
    ap.add_argument('--features', default='default')
    a = ap.parse_args()
    url = 'https://api.drand.sh/%s/public/%d' % (CHAIN, a.round)
    beacon = json.load(urllib.request.urlopen(url, timeout=30))
    assert beacon['round'] == a.round, beacon
    assert hashlib.sha256(bytes.fromhex(beacon['signature'])).hexdigest() == beacon['randomness'], \
        'randomness is not the SHA-256 of the signature'
    seed = beacon['randomness']
    out = os.path.join(HERE, a.set, 'cases')
    subprocess.check_call([sys.executable, os.path.join(HERE, 'generate_held_out.py'), '--seed', seed,
                           '--set', a.set, '--count', str(a.count), '--out', out, '--dates', a.dates,
                           '--features', a.features])
    cases = json.load(open(os.path.join(out, 'cases.json'), encoding='utf-8'))
    manifest = {
        'set': a.set,
        'drand': {'chain_hash': CHAIN, 'round': a.round, 'round_time_utc_epoch': GENESIS + (a.round - 1) * PERIOD,
                  'randomness': beacon['randomness'], 'signature': beacon['signature'],
                  'previous_signature': beacon.get('previous_signature', ''), 'url': url},
        'seed': seed,
        'dates': a.dates,
        'features': a.features,
        'engine': {'file': 'cpm-engine.js', 'version': engine_version(),
                   'sha256': sha(os.path.join(HERE, '..', '..', 'cpm-engine.js'))},
        'scripts': dict({n: sha(os.path.join(HERE, n)) for n in ('generate_held_out.py', 'score_held_out.js',
                                                                'readback_p6_sqlite.py', 'freeze.py', 'PROTOCOL.md',
                                                                'score_whole_day.js', 'import_p6_sqlite.py',
                                                                'p6_imported_overlay.js')
                         if os.path.exists(os.path.join(HERE, n))},
                        **({a.set + '/PROTOCOL.md': sha(os.path.join(HERE, a.set, 'PROTOCOL.md'))}
                           if os.path.exists(os.path.join(HERE, a.set, 'PROTOCOL.md')) else {})),
        'cases': {c['file']: c['sha256'] for c in cases['cases']},
    }
    with open(os.path.join(out, 'manifest.json'), 'w', encoding='utf-8', newline='\n') as f:
        json.dump(manifest, f, indent=1)
        f.write('\n')
    print('frozen %s: %d cases from drand round %d, seed %s...' % (a.set, len(cases['cases']), a.round, seed[:16]))


if __name__ == '__main__':
    main()
