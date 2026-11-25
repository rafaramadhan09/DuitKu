import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const androidRoot = path.resolve("android/app/src/main");
const manifestPath = path.join(androidRoot, "AndroidManifest.xml");
let manifest = await readFile(manifestPath, "utf8");

const iconAttribute = /android:icon="[^"]+"/;
if (!iconAttribute.test(manifest)) {
  throw new Error("AndroidManifest.xml does not contain android:icon.");
}
manifest = manifest.replace(iconAttribute, 'android:icon="@mipmap/duitku_launcher"');

const roundIconAttribute = /android:roundIcon="[^"]+"/;
if (roundIconAttribute.test(manifest)) {
  manifest = manifest.replace(roundIconAttribute, 'android:roundIcon="@mipmap/duitku_launcher_round"');
} else {
  manifest = manifest.replace(
    'android:icon="@mipmap/duitku_launcher"',
    'android:icon="@mipmap/duitku_launcher" android:roundIcon="@mipmap/duitku_launcher_round"'
  );
}
await writeFile(manifestPath, manifest, "utf8");

const resources = path.join(androidRoot, "res");
const fallbackDir = path.join(resources, "mipmap-anydpi");
const adaptiveDir = path.join(resources, "mipmap-anydpi-v26");
const drawableDir = path.join(resources, "drawable");
const valuesDir = path.join(resources, "values");
await Promise.all([fallbackDir, adaptiveDir, drawableDir, valuesDir].map((dir) => mkdir(dir, { recursive: true })));

const vectorBody = `<path
        android:pathData="M25,25 H43 C61,25 67,37 67,54 C67,71 61,83 43,83 H25 V25 Z M67,54 L84,32 M67,54 L84,76"
        android:fillColor="@android:color/transparent"
        android:strokeColor="#F6F2E8"
        android:strokeWidth="7.5"
        android:strokeLineCap="round"
        android:strokeLineJoin="round" />`;

const fallbackVector = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp" android:height="108dp"
    android:viewportWidth="108" android:viewportHeight="108">
    <path android:pathData="M0,0 H108 V108 H0 Z" android:fillColor="#153F30" />
    ${vectorBody}
</vector>
`;

const foregroundVector = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp" android:height="108dp"
    android:viewportWidth="108" android:viewportHeight="108">
    ${vectorBody}
</vector>
`;

const monochromeVector = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp" android:height="108dp"
    android:viewportWidth="108" android:viewportHeight="108">
    <path
        android:pathData="M25,25 H43 C61,25 67,37 67,54 C67,71 61,83 43,83 H25 V25 Z M67,54 L84,32 M67,54 L84,76"
        android:fillColor="@android:color/transparent"
        android:strokeColor="#FFFFFFFF"
        android:strokeWidth="7.5"
        android:strokeLineCap="round"
        android:strokeLineJoin="round" />
</vector>
`;

const adaptiveIcon = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/duitku_launcher_background" />
    <foreground android:drawable="@drawable/duitku_launcher_foreground" />
    <monochrome android:drawable="@drawable/duitku_launcher_monochrome" />
</adaptive-icon>
`;

await Promise.all([
  writeFile(path.join(fallbackDir, "duitku_launcher.xml"), fallbackVector, "utf8"),
  writeFile(path.join(fallbackDir, "duitku_launcher_round.xml"), fallbackVector, "utf8"),
  writeFile(path.join(adaptiveDir, "duitku_launcher.xml"), adaptiveIcon, "utf8"),
  writeFile(path.join(adaptiveDir, "duitku_launcher_round.xml"), adaptiveIcon, "utf8"),
  writeFile(path.join(drawableDir, "duitku_launcher_foreground.xml"), foregroundVector, "utf8"),
  writeFile(path.join(drawableDir, "duitku_launcher_monochrome.xml"), monochromeVector, "utf8"),
  writeFile(path.join(valuesDir, "duitku_launcher_colors.xml"),
    '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="duitku_launcher_background">#153F30</color>\n</resources>\n',
    "utf8")
]);

console.log("Applied connected DK launcher icon (legacy vector, adaptive, and monochrome).");
