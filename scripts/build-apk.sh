#!/usr/bin/env bash
# Build signed release APK. Uses expo-build-properties for size optimization.
set -euo pipefail
cd "$(dirname "$0")/.."

KEYSTORE="$HOME/apk-signing-key.jks"
ALIAS="gikuyuhymns"
PASS="asterisk*"

# ── Keystore ─────────────────────────────────────────────────
if [ ! -f "$KEYSTORE" ]; then
  keytool -genkeypair -v \
    -keystore "$KEYSTORE" -alias "$ALIAS" \
    -keyalg RSA -keysize 2048 -validity 10000 \
    -storepass "$PASS" -keypass "$PASS" \
    -dname "CN=Gikuyu Hymns, OU=Dev, O=Frame, L=Nairobi, ST=Nairobi, C=KE"
fi

# ── Generate native project ──────────────────────────────────
npx expo prebuild --platform android

# ── Write keystore properties (after prebuild creates android/) ──
cat > android/keystore.properties <<EOF
storeFile=$(realpath "$KEYSTORE")
storePassword=$PASS
keyAlias=$ALIAS
keyPassword=$PASS
EOF

# ── Patch build.gradle: signing + ABI splits + compress .db ──
python3 - "$(realpath android/app/build.gradle)" <<'PYEOF'
import re, sys
with open(sys.argv[1]) as f: c = f.read()
if "patch-applied" in c: sys.exit(0)

c = c.replace("    signingConfigs {",
    "    def kp = new Properties()\n    try { kp.load(new FileInputStream(rootProject.file('keystore.properties'))) } catch (Exception _) {}\n    signingConfigs {")
c = re.sub(r'(signingConfigs \{\s*debug \{.*?\}\s*)\}',
    r'\1\n        release {\n            if (kp.containsKey("storeFile")) {\n                storeFile file(kp["storeFile"])\n                storePassword kp["storePassword"]\n                keyAlias kp["keyAlias"]\n                keyPassword kp["keyPassword"]\n            }\n        }\n    }', c, flags=re.DOTALL)
c = c.replace('signingConfig signingConfigs.debug',
    'signingConfig kp.containsKey("storeFile") ? signingConfigs.release : signingConfigs.debug')
# ABI splits + compress .db + custom APK naming
c = c.replace('    packagingOptions {',
    '    aaptOptions { noCompress = [] }\n    splits { abi { enable true; reset(); include "armeabi-v7a", "arm64-v8a", "x86_64"; universalApk false } }\n    packagingOptions {')
# Rename APK output files
c = c.replace(
    '    androidResources {',
    """    applicationVariants.all { variant ->
        variant.outputs.all { output ->
            def abi = output.getFilter(com.android.build.OutputFile.ABI)
            def name = "Nyimbo Cia Gikuyu"
            if (abi) name += "-${abi}"
            name += ".apk"
            output.outputFileName = name
        }
    }

    androidResources {""")
c += "\n// patch-applied\n"
with open(sys.argv[1], "w") as f: f.write(c)
PYEOF

# ── Build ────────────────────────────────────────────────────
cd android && ./gradlew assembleRelease --warning-mode=none

# ── Output ───────────────────────────────────────────────────
echo ""
echo "✓ Signed APKs:"
find app/build/outputs/apk/release -name '*.apk' | sort | while read apk; do
  echo "  $(realpath "$apk") ($(du -h "$apk" | cut -f1))"
done
