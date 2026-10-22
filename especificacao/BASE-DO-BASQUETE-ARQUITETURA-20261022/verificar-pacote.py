"""Verifica o conteúdo extraído sem instalar dependências ou acessar serviços."""
from pathlib import Path
import hashlib
import json
import sys

root = Path(__file__).resolve().parent
manifest = json.loads((root / 'MANIFEST.json').read_text(encoding='utf-8'))
errors = []
expected = set()
for item in manifest['files']:
    name = item['path']
    path = (root / name).resolve()
    if not path.is_relative_to(root) or name in expected:
        errors.append('Caminho inválido/repetido: ' + name)
        continue
    expected.add(name)
    if not path.is_file():
        errors.append('Ausente: ' + name)
        continue
    payload = path.read_bytes()
    if len(payload) != item['bytes'] or hashlib.sha256(payload).hexdigest() != item['sha256']:
        errors.append('Conteúdo divergente: ' + name)

actual = {
    path.relative_to(root).as_posix()
    for path in root.rglob('*')
    if path.is_file() and 'node_modules' not in path.parts
    and '__pycache__' not in path.parts
}
unexpected = sorted(actual - expected - {'MANIFEST.json'})
errors.extend('Arquivo extra: ' + name for name in unexpected)
print(json.dumps({'result': 'FAIL' if errors else 'PASS', 'checked': len(expected), 'errors': errors}, ensure_ascii=False, indent=2))
sys.exit(1 if errors else 0)
