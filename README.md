# DuitKu

Aplikasi pencatat keuangan pribadi untuk membantu mengelola pemasukan, pengeluaran, dan saldo.

## Fitur

- Mencatat pemasukan dan pengeluaran.
- Mengelompokkan transaksi berdasarkan kategori.
- Menghitung saldo keseluruhan secara otomatis.
- Menampilkan ringkasan pemasukan dan pengeluaran bulan berjalan.
- Menampilkan grafik arus kas enam bulan terakhir.
- Melihat, mencari, dan memfilter transaksi.
- Menghapus transaksi.
- Mengekspor seluruh transaksi ke file CSV.

## Menjalankan aplikasi

Aplikasi menggunakan HTML, CSS, dan JavaScript tanpa dependensi tambahan.

1. Clone atau unduh repository.
2. Buka file `index.html` di browser.
3. Tambahkan transaksi melalui formulir di dashboard.

## Penyimpanan data

Data transaksi disimpan di `localStorage` browser pada perangkat yang digunakan. Versi awal belum menggunakan akun, server, atau sinkronisasi antarperangkat. Ekspor CSV secara berkala untuk membuat cadangan.

## Struktur file

- `index.html` — struktur halaman aplikasi.
- `styles.css` — tampilan responsif.
- `app.js` — logika transaksi, ringkasan, grafik, penyimpanan, dan ekspor.

## Instalasi seperti aplikasi

DuitKu dilengkapi manifest dan service worker sehingga dapat dipasang dari browser yang mendukung PWA setelah situs dipublikasikan melalui HTTPS. Buka situs di browser Android, lalu gunakan menu browser **Tambahkan ke layar utama** atau **Install app** bila tersedia. Versi ini tetap menyimpan data di browser perangkat dan belum menyinkronkan data ke akun atau server.

## Publikasi

Workflow `.github/workflows/deploy-pages.yml` menyiapkan publikasi otomatis ke GitHub Pages setiap ada perubahan di branch `main`. Pastikan GitHub Pages menggunakan sumber **GitHub Actions** pada pengaturan repository.

DuitKu adalah alat pencatatan sederhana, bukan layanan perbankan dan tidak terhubung ke rekening bank.
