# Dashboard Penghasilan + Payout Manual Class — Design

Tanggal: 2026-09-11. Status: disetujui user per bagian.

## 1. Model settlement

Uang pembeli masuk akun Paycore milik platform. Tim transfer manual ke
rekening promotor setelah potong fee. Tanpa split otomatis, tanpa dompet.

Rumus net per order:

```
net = grossAmount - processorFee - 3000
```

`processorFee` dari `payment_records` nullable → perlakukan null sebagai 0.
Fee platform flat Rp3.000 dari `platform_fee_entries`.

Status fee: `BILLABLE` saat order PAID. `BILLED` saat batch PAID.
`REVERSED` saat order refund/reject setelah fee tercatat.

## 2. Arsitektur payout

Tabel baru `payout_batches`: id, organizationId, totalNet, status
(DRAFT → PROCESSING → PAID, plus FAILED opsional), proofUrl, paidAt.

Tabel baru `payout_items`: batchId, orderId unik, netAmount snapshot.
Satu order hanya di satu batch aktif. Unik di orderId cegah ganda.

Item ikut status batch. Order AVAILABLE = PAID/APPROVED tanpa item aktif.

Admin ubah status + upload bukti. Bukti wajib sebelum PAID.

## 3. Dashboard penghasilan

Halaman orders tambah kartu: omzet kotor, fee processor, fee platform,
net bersih. Tabel tambah kolom net + status cair. Filter status cair.
Export CSV untuk rekonsiliasi.

Angka dari ledger kanonis, bukan hitung di client saja.

## 4. Halaman payout + rekening

Halaman payout baru: daftar batch (tanggal, jumlah order, total net,
status, bukti). Tombol ajukan pencairan pilih order AVAILABLE.

Rekening bank CRUD di settings pakai tabel `organization_bank_accounts`
yang sudah ada tapi mati. Wajib ada sebelum ajukan. Tampil tujuan di batch.

## 5. Alur, gagal, uji

Webhook PAID → fee BILLABLE → net tersedia → batch DRAFT → PROCESSING →
transfer manual → PAID + bukti → fee BILLED.

Gagal: webhook ganda idempoten. Batch ganda kunci unik orderId.
Transfer gagal tetap PROCESSING. Bukti wajib.

Uji: unit rumus net + transisi status. Integration lifecycle batch.
E2E ajukan sampai cair.

## 6. Beranda selaras screenshot

Beranda promotor tampil kartu ringkasan dari endpoint baru
`GET /api/v1/class/dashboard-summary`:

- estimasi omzet bulan ini (sum order PAID/APPROVED bulan berjalan)
- jumlah peserta (distinct buyer / enrollments aktif)
- persen penyelesaian (lesson completed / total)
- pertumbuhan vs bulan lalu (persen, boleh negatif)
- program edukasi aktif (judul, harga, peserta terdaftar)
- aktivitas terbaru (enrollment, pembayaran, refleksi)

Kartu baca endpoint, bukan hitung di client. Alasan: cegah N+1,
angka konsisten dengan ledger payout. Sinyal belajar tetap di bawah
kartu, bukan pengganti.
