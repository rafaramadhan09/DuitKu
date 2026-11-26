# DuitKu

Aplikasi pencatat keuangan pribadi untuk membantu mengelola pemasukan, pengeluaran, dan saldo.

## Fitur

- Mencatat pemasukan dan pengeluaran.
- Mengelompokkan transaksi berdasarkan kategori.
- Menghitung saldo keseluruhan secara otomatis.
- Menampilkan ringkasan pemasukan dan pengeluaran bulan berjalan.
- Menampilkan grafik arus kas enam bulan terakhir.
- Melihat, mencari, dan memfilter transaksi.
- Mengubah dan menghapus transaksi langsung dari riwayat; saldo, grafik, dan statistik dihitung ulang otomatis.
- Memisahkan saldo cash dan m-banking/e-wallet.
- Mencatat penarikan M-Banking ke Cash sebagai transfer antardompet; saldo M-Banking berkurang dan Cash bertambah tanpa dihitung sebagai pengeluaran.
- Ekspor Excel Android melalui menu berbagi native sehingga laporan dapat disimpan atau dibuka di aplikasi spreadsheet.
- Pembaruan fitur web dapat diterapkan langsung dari dalam aplikasi saat online; perubahan komponen Android inti tetap memerlukan paket aplikasi baru.
- Dashboard statistik berisi tren arus kas, komposisi kategori, arus kas bersih, rata-rata harian dan rasio sisa uang; desain mobile responsif dengan animasi halus yang tidak berlebihan.
- Identitas visual monogram DK yang menyambung pada ikon aplikasi dan launcher Android.
- Mengekspor transaksi dan ringkasan dompet ke workbook Excel (.xls).

## Menjalankan aplikasi

Aplikasi menggunakan HTML, CSS, dan JavaScript tanpa dependensi tambahan.

1. Clone atau unduh repository.
2. Buka file `index.html` di browser.
3. Tambahkan transaksi melalui formulir di dashboard.

## Penyimpanan data

Data transaksi disimpan di `localStorage` browser pada perangkat yang digunakan. Versi ini belum menggunakan akun, server, atau sinkronisasi antarperangkat. Ekspor laporan Excel (.xls) secara berkala untuk membuat cadangan.

## Struktur file

- `index.html` — struktur halaman aplikasi.
- `styles.css` — tampilan responsif.
- `app.js` — logika transaksi, ringkasan, grafik, penyimpanan, dan ekspor.

## Instalasi seperti aplikasi

DuitKu dilengkapi manifest dan service worker sehingga dapat dipasang dari browser yang mendukung PWA setelah situs dipublikasikan melalui HTTPS. Buka situs di browser Android, lalu gunakan menu browser **Tambahkan ke layar utama** atau **Install app** bila tersedia. Versi ini tetap menyimpan data di browser perangkat dan belum menyinkronkan data ke akun atau server.

## Publikasi

Workflow `.github/workflows/deploy-pages.yml` tersedia untuk publikasi melalui GitHub Actions. Untuk mengaktifkannya, buka **Settings → Pages** pada repository dan pilih **GitHub Actions** sebagai Build and deployment source. Setelah itu jalankan workflow **Deploy DuitKu to GitHub Pages** dari tab Actions.

DuitKu adalah alat pencatatan sederhana, bukan layanan perbankan dan tidak terhubung ke rekening bank.


## Build APK Android

Repository ini juga menyiapkan build Android menggunakan Capacitor 8.

1. Buka tab **Actions** pada repository untuk proses build dan pengelolaan rilis.
2. Pilih workflow **Build & Release DuitKu Android**.
3. Klik **Run workflow**.
4. Untuk membuat GitHub Release versi stabil, isi input `release_version`, misalnya `v1.5.0`. Kosongkan input tersebut untuk hanya membuat artifact APK.
5. Setelah workflow berhasil, unduh APK dari GitHub Release atau artifact `DuitKu-debug-apk`.

Versi aplikasi mengikuti Semantic Versioning, saat ini **DuitKu 1.5.0**. Pembaruan fitur dilakukan langsung dari dalam DuitKu: saat aplikasi dibuka, pemeriksa internal membaca manifest versi dan mengambil HTML, CSS, serta JavaScript terbaru tanpa membuka browser, halaman GitHub, atau meminta unduh APK. Pengguna juga dapat memeriksa dan memasang update melalui menu Laporan & Data. Pembaruan komponen Android native tetap membutuhkan paket aplikasi. Mode perangkat tersedia sebagai Otomatis, Ringan, atau Visual Lengkap; font menggunakan font sistem agar tidak perlu mengunduh font online.

**Catatan distribusi:** workflow saat ini menghasilkan APK debug agar mudah diuji. Ini belum merupakan paket produksi bertanda tangan permanen untuk Play Store. Kunci debug Android disimpan pada cache GitHub Actions agar build selanjutnya memakai sertifikat yang sama. Versi debug lama yang dibuat sebelum cache kunci tersedia mungkin perlu migrasi instalasi sekali; ekspor Excel terlebih dahulu sebagai cadangan.

### Teknologi Android

- Capacitor 8
- Node.js 22
- Java 21
- Android SDK API 36


### Rilis produksi / Google Play

Untuk distribusi produksi, buat upload keystore pribadi, simpan ke GitHub Actions Secrets (jangan commit file keystore atau password ke repository), lalu tambahkan konfigurasi signing untuk build release. APK/AAB harus ditandatangani dengan kunci yang tepat; jaga backup keystore dan password secara aman.
