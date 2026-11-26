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
const exportPluginSource = `package com.rafaramadhan09.duitku;

import android.app.Activity;
import android.content.ContentValues;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

@CapacitorPlugin(name = "DuitKuExport")
public class DuitKuExportPlugin extends Plugin {
    private static final int MAX_BACKUP_BYTES = 15 * 1024 * 1024;

    @PluginMethod
    public void shareSpreadsheet(PluginCall call) {
        saveTextFile(call);
    }

    @PluginMethod
    public void saveTextFile(PluginCall call) {
        String content = call.getString("content");
        if (content == null || content.isEmpty()) {
            call.reject("Isi file kosong.");
            return;
        }
        String mimeType = call.getString("mimeType");
        if (mimeType == null || mimeType.trim().isEmpty()) mimeType = "application/octet-stream";
        String fileName = safeFileName(call.getString("fileName"));

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            saveIntoDownloads(call, fileName, mimeType, content);
        } else {
            startSavePicker(call, fileName, mimeType);
        }
    }

    private String safeFileName(String requestedName) {
        String fileName = requestedName == null ? "DuitKu-File" : requestedName;
        fileName = fileName.replaceAll("[^A-Za-z0-9._-]", "_");
        if (fileName.trim().isEmpty()) fileName = "DuitKu-File";
        return fileName;
    }

    private void saveIntoDownloads(PluginCall call, String fileName, String mimeType, String content) {
        Uri targetUri = null;
        try {
            ContentValues values = new ContentValues();
            values.put(MediaStore.MediaColumns.DISPLAY_NAME, fileName);
            values.put(MediaStore.MediaColumns.MIME_TYPE, mimeType);
            values.put(
                MediaStore.MediaColumns.RELATIVE_PATH,
                Environment.DIRECTORY_DOWNLOADS + "/DuitKu"
            );
            values.put(MediaStore.MediaColumns.IS_PENDING, 1);

            targetUri = getContext().getContentResolver().insert(
                MediaStore.Downloads.EXTERNAL_CONTENT_URI,
                values
            );
            if (targetUri == null) {
                throw new IllegalStateException("Android tidak dapat membuat file di folder Download.");
            }

            byte[] bytes = content.getBytes(StandardCharsets.UTF_8);
            try (OutputStream output = getContext().getContentResolver().openOutputStream(targetUri, "w")) {
                if (output == null) {
                    throw new IllegalStateException("Folder Download/DuitKu tidak dapat dibuka.");
                }
                output.write(bytes);
                output.flush();
            }

            ContentValues completed = new ContentValues();
            completed.put(MediaStore.MediaColumns.IS_PENDING, 0);
            getContext().getContentResolver().update(targetUri, completed, null, null);

            JSObject response = new JSObject();
            response.put("saved", true);
            response.put("fileName", fileName);
            response.put("location", "Download/DuitKu/" + fileName);
            response.put("uri", targetUri.toString());
            response.put("bytes", bytes.length);
            call.resolve(response);
        } catch (Exception error) {
            if (targetUri != null) {
                try {
                    getContext().getContentResolver().delete(targetUri, null, null);
                } catch (Exception ignored) {
                    // Keep the original write error for the caller.
                }
            }
            call.reject("Gagal menyimpan file ke Download/DuitKu: " + error.getMessage(), error);
        }
    }

    private void startSavePicker(PluginCall call, String fileName, String mimeType) {
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType(mimeType);
        intent.putExtra(Intent.EXTRA_TITLE, fileName);
        intent.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);
        startActivityForResult(call, intent, "saveTextFileResult");
    }

    @PluginMethod
    public void chooseBackupFile(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("*/*");
        intent.putExtra(Intent.EXTRA_MIME_TYPES, new String[] {
            "application/json", "text/json", "text/plain", "application/octet-stream"
        });
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        startActivityForResult(call, intent, "openBackupResult");
    }

    @ActivityCallback
    private void saveTextFileResult(PluginCall call, ActivityResult result) {
        finishSave(call, result);
    }

    private void finishSave(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK ||
            result.getData() == null || result.getData().getData() == null) {
            JSObject cancelled = new JSObject();
            cancelled.put("cancelled", true);
            call.resolve(cancelled);
            return;
        }
        Uri targetUri = result.getData().getData();
        String content = call.getString("content");
        if (content == null || content.isEmpty()) {
            call.reject("Isi file kosong.");
            return;
        }
        try (OutputStream output = getContext().getContentResolver().openOutputStream(targetUri, "w")) {
            if (output == null) throw new IllegalStateException("Folder tujuan tidak dapat dibuka.");
            output.write(content.getBytes(StandardCharsets.UTF_8));
            output.flush();
            JSObject saved = new JSObject();
            saved.put("saved", true);
            saved.put("location", "Folder yang dipilih");
            saved.put("uri", targetUri.toString());
            call.resolve(saved);
        } catch (Exception error) {
            call.reject("Gagal menulis file pada folder pilihan: " + error.getMessage(), error);
        }
    }

    @ActivityCallback
    private void openBackupResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK ||
            result.getData() == null || result.getData().getData() == null) {
            JSObject cancelled = new JSObject();
            cancelled.put("cancelled", true);
            call.resolve(cancelled);
            return;
        }
        Uri sourceUri = result.getData().getData();
        try (InputStream input = getContext().getContentResolver().openInputStream(sourceUri);
             ByteArrayOutputStream buffer = new ByteArrayOutputStream()) {
            if (input == null) throw new IllegalStateException("File tidak dapat dibuka.");
            byte[] chunk = new byte[8192];
            int count;
            int total = 0;
            while ((count = input.read(chunk)) != -1) {
                total += count;
                if (total > MAX_BACKUP_BYTES) throw new IllegalArgumentException("File cadangan melebihi batas 15 MB.");
                buffer.write(chunk, 0, count);
            }
            JSObject response = new JSObject();
            response.put("content", new String(buffer.toByteArray(), StandardCharsets.UTF_8));
            response.put("name", sourceUri.getLastPathSegment() == null ? "cadangan.json" : sourceUri.getLastPathSegment());
            call.resolve(response);
        } catch (Exception error) {
            call.reject("Gagal membaca file cadangan: " + error.getMessage(), error);
        }
    }
}`;

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
