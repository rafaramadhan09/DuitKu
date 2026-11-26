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

const packageDir = path.join(androidRoot, "java", "com", "rafaramadhan09", "duitku");
await mkdir(packageDir, { recursive: true });
const activitySource = "package com.rafaramadhan09.duitku;\n\nimport android.os.Bundle;\nimport com.getcapacitor.BridgeActivity;\n\npublic class MainActivity extends BridgeActivity {\n    @Override\n    public void onCreate(Bundle savedInstanceState) {\n        registerPlugin(DuitKuExportPlugin.class);\n        super.onCreate(savedInstanceState);\n    }\n}\n";
await writeFile(path.join(packageDir, "MainActivity.java"), activitySource, "utf8");
const exportPluginSource = "package com.rafaramadhan09.duitku;\n\nimport android.app.Activity;\nimport android.content.Intent;\nimport android.net.Uri;\nimport androidx.activity.result.ActivityResult;\nimport com.getcapacitor.JSObject;\nimport com.getcapacitor.Plugin;\nimport com.getcapacitor.PluginCall;\nimport com.getcapacitor.PluginMethod;\nimport com.getcapacitor.annotation.ActivityCallback;\nimport com.getcapacitor.annotation.CapacitorPlugin;\nimport java.io.OutputStream;\nimport java.nio.charset.StandardCharsets;\n\n@CapacitorPlugin(name = \"DuitKuExport\")\npublic class DuitKuExportPlugin extends Plugin {\n    @PluginMethod\n    public void shareSpreadsheet(PluginCall call) {\n        String requestedName = call.getString(\"fileName\");\n        String content = call.getString(\"content\");\n        if (content == null || content.isEmpty()) {\n            call.reject(\"Isi laporan Excel kosong.\");\n            return;\n        }\n\n        String safeName = requestedName == null ? \"DuitKu-Laporan.xls\" :\n            requestedName.replaceAll(\"[^A-Za-z0-9._-]\", \"_\");\n        if (!safeName.toLowerCase().endsWith(\".xls\")) safeName += \".xls\";\n\n        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);\n        intent.addCategory(Intent.CATEGORY_OPENABLE);\n        intent.setType(\"application/vnd.ms-excel\");\n        intent.putExtra(Intent.EXTRA_TITLE, safeName);\n        startActivityForResult(call, intent, \"saveSpreadsheetResult\");\n    }\n\n    @ActivityCallback\n    private void saveSpreadsheetResult(PluginCall call, ActivityResult result) {\n        if (call == null) return;\n\n        if (result.getResultCode() != Activity.RESULT_OK ||\n            result.getData() == null || result.getData().getData() == null) {\n            JSObject cancelled = new JSObject();\n            cancelled.put(\"cancelled\", true);\n            call.resolve(cancelled);\n            return;\n        }\n\n        Uri targetUri = result.getData().getData();\n        String content = call.getString(\"content\");\n        if (content == null || content.isEmpty()) {\n            call.reject(\"Isi laporan Excel kosong.\");\n            return;\n        }\n\n        try (OutputStream output = getContext().getContentResolver().openOutputStream(targetUri, \"w\")) {\n            if (output == null) throw new IllegalStateException(\"Folder tujuan tidak dapat dibuka.\");\n            output.write(content.getBytes(StandardCharsets.UTF_8));\n            output.flush();\n\n            JSObject saved = new JSObject();\n            saved.put(\"saved\", true);\n            saved.put(\"uri\", targetUri.toString());\n            call.resolve(saved);\n        } catch (Exception error) {\n            call.reject(\"Gagal menyimpan file Excel: \" + error.getMessage(), error);\n        }\n    }\n}";
await writeFile(path.join(packageDir, "DuitKuExportPlugin.java"), exportPluginSource, "utf8");
const xmlDir = path.join(resources, "xml");
await mkdir(xmlDir, { recursive: true });
await writeFile(path.join(xmlDir, "duitku_file_paths.xml"), "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n<paths xmlns:android=\"http://schemas.android.com/apk/res/android\">\n    <cache-path name=\"duitku_exports\" path=\".\" />\n</paths>\n", "utf8");
let updatedManifest = await readFile(manifestPath, "utf8");
if (!updatedManifest.includes('android:authorities="${applicationId}.fileprovider"')) {
  const provider = "    <provider android:name=\"androidx.core.content.FileProvider\" android:authorities=\"${applicationId}.fileprovider\" android:exported=\"false\" android:grantUriPermissions=\"true\">\n        <meta-data android:name=\"android.support.FILE_PROVIDER_PATHS\" android:resource=\"@xml/duitku_file_paths\" />\n    </provider>\n";
  updatedManifest = updatedManifest.replace("</application>", provider + "</application>");
  await writeFile(manifestPath, updatedManifest, "utf8");
}
console.log("Registered DuitKu native Excel sharing bridge.");
