# PromotorFlow V0.1 — Design Plan
## Quiet Operations Design System
Version: 0.1  
Platform: Mobile-first PWA  
Primary target: Promotor individual  
Status: Design direction locked for prototype redesign
Cross-product contract: `INTEGRATION_CONTRACT.md`

---

# 1. Design Goal

PromotorFlow harus terasa seperti **alat kerja yang tenang, cepat, dan matang**, bukan seperti template SaaS generik atau dashboard hasil generate AI.

Tujuan desain utama:

> Membuat promotor langsung tahu siapa yang perlu ditangani berikutnya, tanpa harus merasa sedang “mengelola CRM”.

Desain harus mengoptimalkan:

1. Scanability
2. Speed
3. Clear hierarchy
4. Low cognitive load
5. Familiar mobile patterns
6. Action-oriented workflow
7. High information density tanpa terasa sesak

---

# 2. Product Design Philosophy

Nama design language:

# Quiet Operations

Karakter:

- Calm
- Dense
- Human
- Direct
- Neutral
- Familiar
- Functional
- Restrained

PromotorFlow bukan produk yang ingin “terlihat keren”.

PromotorFlow harus terasa:

> **rapi, cepat, terpercaya, dan sudah lama matang.**

Jika sebuah keputusan desain hanya meningkatkan “wow effect” tetapi tidak meningkatkan usability, prioritaskan usability.

---

# 3. Anti AI-Slop Constitution

Semua implementasi UI wajib mengikuti aturan berikut.

## 3.1 No Card-by-Default

Jangan menggunakan card sebagai primitive utama.

Default primitive:

- row
- list
- section
- divider
- typography
- spacing

Sebelum membuat container, tanyakan:

> Apakah relationship ini bisa dijelaskan hanya dengan spacing, typography, alignment, atau divider?

Jika ya:

**jangan buat card.**

Card hanya digunakan untuk:

- grouped interactive object yang benar-benar independen
- booking summary
- confirmation panel
- contextual notice
- selected/temporary state

---

## 3.2 No Decorative Gradient

Tidak menggunakan gradient untuk:

- background
- header
- buttons
- cards
- navigation
- empty states

Gradient hanya boleh digunakan jika suatu hari ada kebutuhan visualisasi data tertentu.

---

## 3.3 No Glassmorphism

Tidak menggunakan:

- translucent decorative cards
- frosted panels sebagai gaya utama
- blur untuk normal content

Backdrop blur hanya boleh digunakan pada:

- bottom sheet backdrop
- modal
- floating navigation bila memang diperlukan

---

## 3.4 No Shadow on Normal Content

Normal content:

```text
box-shadow: none
```

Shadow hanya digunakan untuk elevation nyata:

- modal
- bottom sheet
- popover
- floating menu

Hierarchy utama dibangun dengan:

```text
typography
spacing
surface
divider
alignment
```

---

## 3.5 No Emoji as UI Language

Emoji tidak digunakan untuk:

- navigation
- status
- icon
- success indicator
- warning indicator
- empty state decoration

Gunakan icon set SVG konsisten.

Emoji hanya boleh muncul jika merupakan isi pesan/customer content.

---

## 3.6 No Colored Pill Everywhere

Status tidak otomatis menjadi pill berwarna.

Gunakan urutan prioritas:

1. plain text
2. text + subtle dot
3. subtle badge
4. colored status only when meaningfully necessary

Contoh preferred:

```text
● Follow-up
```

atau:

```text
Follow-up
```

Bukan:

```text
[ FOLLOW-UP ]
```

dengan background oranye besar.

---

## 3.7 One Dominant CTA

Dalam satu decision context hanya boleh ada:

> **maksimum satu filled primary button**

Secondary action menggunakan:

- text button
- ghost button
- menu
- subtle outline jika benar-benar perlu

Contoh:

```text
[ Buka WhatsApp ]

Atur ulang
```

Bukan:

```text
[ WhatsApp ] [ Atur Ulang ] [ Selesai ]
```

dengan bobot visual sama.

---

## 3.8 No Dashboard Metric Cards Unless Necessary

Dilarang membuat:

```text
┌──────┐
│ 12   │
│ Leads│
└──────┘
```

secara otomatis.

Untuk Today gunakan summary inline:

```text
5 tindakan · 1 terlambat
```

Metric card baru dibuat jika user memang perlu membandingkan beberapa metric secara visual.

---

## 3.9 No Greeting Filler

Jangan menggunakan:

```text
Selamat pagi, Rina 👋
```

sebagai hero utama dashboard.

Header harus langsung berorientasi pekerjaan:

```text
Hari ini
Selasa, 12 Agustus
```

---

## 3.10 No Decorative Empty-State Illustration

Preferred:

```text
Belum ada prospek

Tambahkan orang yang sedang
mempertimbangkan layanan Anda.

+ Tambah prospek
```

Bukan:

- giant illustration
- confetti
- giant emoji
- oversized decorative artwork

---

## 3.11 No Arbitrary Spacing

Semua spacing mengikuti token.

Tidak boleh:

```text
margin-top: 13px
padding: 19px
gap: 17px
```

kecuali ada alasan layout khusus yang terdokumentasi.

---

## 3.12 Grayscale Test

Primary screens harus tetap:

- terbaca
- bisa dipahami
- hierarchy tetap jelas

ketika seluruh warna diubah menjadi grayscale.

Jika informasi hanya dapat dipahami karena warna:

desain harus diperbaiki.

---

# 4. Information Architecture

Navigation V0.1 diubah dari 5 item menjadi 4 item.

```text
Today
Contacts
Calendar
More
```

Alasan:

Lead dan Client adalah orang yang sama pada lifecycle berbeda.

Jangan menciptakan mental model:

```text
Lead database
Client database
```

Gunakan:

```text
Contact
└── lifecycle status
```

---

# 5. Main Sitemap

```text
PromotorFlow
│
├── Onboarding
│   ├── Welcome
│   ├── Profile Setup
│   ├── Service Setup
│   └── Ready
│
├── Today
│   ├── Overdue
│   ├── Today Actions
│   ├── Upcoming
│   └── Action Detail
│
├── Contacts
│   ├── All Contacts
│   ├── Prospects
│   ├── Clients
│   ├── Search
│   ├── Contact Detail
│   ├── Add Contact
│   ├── Change Status
│   ├── Follow-up
│   └── Activity Timeline
│
├── Calendar
│   ├── Agenda
│   ├── Date View
│   ├── Booking Detail
│   ├── Create Booking
│   └── Reschedule
│
├── WhatsApp Flow
│   ├── Message Preview
│   ├── Edit Message
│   ├── Open WhatsApp
│   └── Confirm Sent
│
└── More
    ├── Services
    ├── Public Booking Page
    ├── Message Templates
    ├── Tags
    ├── Profile
    ├── Notifications
    └── Settings
```

---

# 6. Core Screen Hierarchy

Daily-use screens:

1. Today
2. Contacts
3. Contact Detail
4. Calendar
5. Booking Detail
6. WhatsApp Bottom Sheet

Supporting screens:

- onboarding
- add contact
- create booking
- service management
- booking page
- templates
- settings

---

# 7. Layout Principles

Target width:

```text
360–430px
```

Mobile-first.

Desktop/tablet:

- jangan stretch content menjadi sangat lebar
- gunakan centered working column
- secondary panel boleh muncul pada viewport besar
- workflow tetap menggunakan mental model mobile

Default page structure:

```text
Page Header

Optional compact context

Section title
Rows
Divider
Rows

Section title
Rows
```

Bukan:

```text
Header
Card
Card
Card
Card
```

---

# 8. Spacing System

Base unit:

```text
4px
```

Allowed spacing:

```text
4
8
12
16
20
24
32
40
48
```

Default:

```text
Page horizontal padding: 16px
Section gap: 24px
Row vertical padding: 12–14px
Label-to-content gap: 6–8px
Content group gap: 12–16px
```

Avoid oversized blank areas.

---

# 9. Typography

Preferred fonts:

```text
Inter
Geist
System UI fallback
```

Do not rely on unusual decorative fonts.

Typography scale:

```text
Page Title
24px / 29px
weight 650–700

Section Label
12px / 16px
weight 650
letter spacing subtle
uppercase optional

Primary Row Text
15–16px / 21–22px
weight 550–600

Body
14px / 20px
weight 400

Secondary
13px / 18px
weight 400

Metadata
12px / 16px
weight 450
```

Rules:

- maximum ~4 meaningful text styles per screen
- jangan menggunakan giant heading
- jangan gunakan bold pada semua text
- metadata harus terasa sekunder

---

# 10. Color System

Target:

> 90% interface neutral.

Suggested base palette:

```text
Canvas
#F7F7F5

Surface
#FFFFFF

Text Primary
#191918

Text Secondary
#71706B

Text Tertiary
#9C9A94

Divider
#E8E7E3

Border Strong
#D5D3CE
```

Brand:

```text
Primary
#167A68

Primary Hover / Pressed
#126556

Primary Soft
#EAF5F2
```

Semantic:

```text
Danger
#B42318

Danger Soft
#FEF3F2

Warning
#B54708

Success
#067647
```

Semantic colors hanya digunakan ketika mempunyai makna.

---

# 11. Surfaces

Default canvas:

```text
#F7F7F5
```

Main list/screen surface boleh:

```text
#FFFFFF
```

Avoid alternating random colored sections.

Surface hierarchy:

```text
Canvas
↓
Main surface
↓
Elevated transient surface
```

Transient surface hanya:

- modal
- sheet
- popover

---

# 12. Border Radius

Gunakan restrained radius.

```text
Small:
4px

Control:
8px

Panel:
8–10px

Bottom Sheet:
16px top corners

Avatar:
50%
```

Hindari universal:

```text
16–24px radius
```

untuk semua elemen.

---

# 13. Iconography

Gunakan satu SVG icon family.

Recommended direction:

- Lucide
- Phosphor
- Material Symbols Rounded hanya jika konsisten

Rules:

- stroke weight konsisten
- 18–20px standard
- 16px metadata
- 22–24px navigation
- icon tidak diberi colored circle kecuali mempunyai fungsi spesifik

Jangan gunakan Unicode seperti:

```text
⌂
◉
♙
□
```

---

# 14. Bottom Navigation

Destinations:

```text
Today
Contacts
Calendar
More
```

Anatomy:

```text
icon
label
```

Inactive:

```text
neutral gray
```

Active:

```text
brand color
```

No:

- giant pill
- floating capsule
- glass blur decoration
- animated blobs

Navigation harus terasa native dan low-profile.

---

# 15. Today Screen

## Goal

Menjawab:

> Apa yang harus saya lakukan sekarang?

---

## 15.1 Header

```text
Hari ini                  +
Selasa, 12 Agustus
```

Tidak ada greeting besar.

---

## 15.2 Compact Summary

```text
5 tindakan · 1 terlambat
```

Tidak menggunakan four-card summary.

---

## 15.3 Grouping

Primary grouping:

```text
TERLAMBAT
HARI INI
BERIKUTNYA
```

Section label kecil.

---

## 15.4 Today Action Row

Example:

```text
Ayu Rahma                        1 hari
Parenting · Instagram
Tanya jadwal weekend               WA
──────────────────────────────────────
```

Information order:

1. name
2. timing
3. relevant context
4. next action
5. direct CTA

---

## 15.5 Booking Row

```text
Arief Santoso                   14:00
Tes Family · Home visit
DP sudah dibayar                    ›
──────────────────────────────────────
```

No colored card.

---

## 15.6 Empty State

```text
Tidak ada yang perlu ditindaklanjuti.

Prospek berikutnya dijadwalkan
besok pukul 09:00.

+ Tambah prospek
```

No celebration illustration.

---

# 16. Contacts Screen

Header:

```text
Kontak                         +
```

Filter segmented control atau simple tabs:

```text
Semua    Prospek    Klien
```

Search:

```text
Cari nama atau nomor
```

List:

```text
Ayu Rahma
Follow-up · terlambat 1 hari
────────────────────────────

Dimas Prakoso
Booking · Jumat 10:00
────────────────────────────

Reni Wulandari
Klien · aftercare hari ini
────────────────────────────
```

Target:

> 6–8 contact rows visible pada viewport normal.

---

# 17. Contact Row Component

Component:

```text
ContactRow
```

Anatomy:

```text
Primary:
Name

Secondary:
Lifecycle / relevant context

Trailing:
time / chevron / action
```

Optional:

```text
small avatar initials
```

Default jangan menggunakan avatar jika tidak meningkatkan scanability.

---

# 18. Contact Detail Screen

Structure:

```text
←                     ···

Ayu Rahma
0812 1110 001

Follow-up
Parenting · Instagram


TINDAKAN BERIKUTNYA

Follow-up jadwal weekend
Hari ini, 10:00

[ Buka WhatsApp ]

Atur ulang


CATATAN

Anak kelas 9.
Sedang bingung memilih SMA.
Tanya jadwal weekend.

Edit


BOOKING

Belum ada

+ Buat booking


AKTIVITAS

12 Agu    Follow-up jatuh tempo
10 Agu    WhatsApp dikirim
8 Agu     Menanyakan harga
8 Agu     Prospek ditambahkan
```

No:

```text
Next Action Card
Notes Card
Booking Card
Activity Card
```

---

# 19. Section Design

Section anatomy:

```text
SECTION LABEL

content
```

Example:

```text
CATATAN

Anak kelas 9.
Sedang bingung memilih SMA.

Edit
```

Section labels menggunakan metadata style.

Divider hanya jika perlu.

---

# 20. Primary Action Design

Primary button:

```text
height: 44–48px
radius: 8px
filled brand color
```

Text must describe outcome.

Preferred:

```text
Simpan prospek
Buat booking
Buka WhatsApp
Konfirmasi booking
Tandai tes selesai
```

Avoid:

```text
Submit
Continue
Proceed
OK
```

jika ada wording yang lebih konkret.

---

# 21. Secondary Actions

Gunakan text action:

```text
Atur ulang
Edit
Batalkan
Tambah catatan
```

Outline button hanya jika visual separation benar-benar dibutuhkan.

Avoid stacking many full-width buttons.

---

# 22. Add Contact Screen

Goal:

> bisa ditambahkan dalam <10 detik.

Initial fields:

```text
Prospek baru

Nama
[                       ]

WhatsApp
[                       ]

Kebutuhan
[ Parenting             ]

+ Tambahkan sumber & catatan


[ Simpan prospek ]
```

Progressive disclosure:

```text
Source
Notes
Tags
```

tetap hidden hingga user meminta.

---

# 23. Forms

Rules:

- single column
- labels di atas input
- no floating label
- no placeholder-as-label
- 44px minimum height
- optional field ditandai jika perlu
- error inline
- jangan tampilkan validation terlalu dini

Example:

```text
WhatsApp

0812 1234 5678

Nomor belum valid.
```

Bukan generic toast error.

---

# 24. WhatsApp Flow

Trigger:

```text
Buka WhatsApp
```

Bottom sheet:

```text
━━━━━━━━

Pesan untuk Ayu

Halo Kak Ayu, kemarin Kakak
sempat bertanya mengenai...

Edit pesan

────────────────────

[ Buka WhatsApp ]
```

Setelah kembali:

```text
Pesan sudah dikirim?

Belum              Sudah
```

Jika sudah:

```text
Follow-up lagi kapan?

Besok
2 hari
3 hari
1 minggu
Tidak perlu
```

No automatic WhatsApp send in V0.1.

---

# 25. Bottom Sheet

Use for:

- quick create
- follow-up scheduling
- status selection
- WhatsApp preview
- confirmation

Rules:

```text
top radius: 16px
shadow allowed
backdrop subtle
drag handle subtle
```

Avoid large decorative title areas.

---

# 26. Calendar

Default view:

# Agenda

Not month-grid-first.

Example:

```text
Agustus 2026

HARI INI

10:00
Dimas Prakoso
Tes Personal
Datang ke lokasi
────────────────────

14:00
Arief Santoso
Tes Family
Home visit
```

Month view optional.

Promotor lebih sering membutuhkan:

> apa jadwal berikutnya?

daripada calendar overview besar.

---

# 27. Booking Detail

```text
←

Tes Personal

Ayu Rahma

Jumat, 14 Agustus
10:00
Datang ke lokasi


PEMBAYARAN

DP belum dibayar

[ Tandai DP dibayar ]


KONTAK

Buka WhatsApp


LAINNYA

Reschedule
Batalkan booking
```

Jika hari tes:

primary action:

```text
[ Tandai tes selesai ]
```

Jangan membuat semua action sebagai filled button.

---

# 28. Status Design

Preferred status rendering:

```text
● Baru
● Follow-up
● Booking
● Selesai
```

Dot optional.

Color semantic:

```text
neutral = normal state
warning = needs attention
danger = overdue/error
success = completed
```

Avoid:

```text
rainbow pipeline
```

---

# 29. Reminder Design

Reminder harus selalu mempunyai action.

Good:

```text
Ayu perlu follow-up hari ini.
```

Bad:

```text
Jangan lupa mengecek PromotorFlow.
```

Levels:

```text
Overdue
Today
Upcoming
```

Critical booking hari ini tampil karena positioning dan typography, bukan giant red card.

---

# 30. Activity Timeline

Preferred:

```text
12 Agu   Follow-up jatuh tempo
10 Agu   WhatsApp dikirim
8 Agu    Status menjadi Follow-up
8 Agu    Prospek ditambahkan
```

Tidak perlu vertical line + dots jika tidak membantu.

Gunakan simple date-aligned timeline.

---

# 31. Public Booking Page

Public booking boleh lebih expressive daripada internal app.

Namun tetap restrained.

Hero:

```text
Rina Pratiwi
Promotor · Bandung

Pilih layanan dan jadwal.
```

Service item:

```text
Tes Personal
60 menit

Rp500.000

Book
```

Public booking boleh menggunakan bounded container secara lebih banyak karena objeknya memang terpisah.

Tetapi tetap hindari SaaS card soup.

---

# 32. Onboarding

Maximum:

```text
3 steps
```

Preferred:

1. Profile
2. Services
3. Ready

Welcome screen tidak perlu decorative graphics besar.

Example:

```text
PromotorFlow

Prospek, booking, dan follow-up
dalam satu tempat.

[ Mulai ]
```

---

# 33. Motion

Default:

```text
minimal
fast
functional
```

Allowed:

- bottom sheet slide
- subtle row insertion
- toast fade
- navigation transition
- check state

Duration:

```text
120–220ms
```

No:

- bouncing icons
- animated gradients
- oversized spring motion
- page entrance choreography

---

# 34. Feedback

Success feedback harus kecil.

Preferred:

```text
Prospek disimpan
```

toast.

Not:

```text
🎉 Success!
You successfully created your lead!
```

---

# 35. Loading States

Use:

```text
skeleton rows
```

bukan giant spinner.

Example:

```text
████████
████████████
────────────
██████████
████████
```

Structure should mimic real content.

---

# 36. Error States

Use human-language error.

Example:

```text
Belum berhasil menyimpan.

Perubahan Anda masih ada.
Coba lagi.
```

Field validation:

```text
Nomor WhatsApp belum valid.
```

Avoid:

```text
API error
Request failed
422
```

---

# 37. Density Targets

Today:

```text
4–6 action rows visible
```

Contacts:

```text
6–8 rows visible
```

Calendar:

```text
4–6 bookings visible
```

Contact detail:

important action should appear without excessive scrolling.

---

# 38. Component Inventory

Core components:

```text
PageHeader
SectionLabel

BottomNavigation

ActionRow
ContactRow
AgendaRow
ActivityRow

PrimaryButton
TextButton
IconButton

TextField
PhoneField
SelectField
DateField
TimeField

SegmentedFilter
SearchField

StatusText
StatusDot

BottomSheet
Dialog
Toast

EmptyState
SkeletonRow
InlineError
```

Avoid creating dozens of one-off components.

---

# 39. Component Principle

One component = one visual grammar.

Example:

All list-based objects inherit:

```text
row padding
divider behavior
primary typography
secondary typography
trailing action
pressed state
```

This creates consistency across:

- Today
- Contacts
- Calendar
- Activity

---

# 40. Responsive Behavior

Mobile:

```text
single column
bottom navigation
bottom sheets
```

Tablet:

```text
single main column
optional side detail
```

Desktop:

possible layout:

```text
Sidebar
│
List panel
│
Detail panel
```

But desktop is not V0.1 priority.

Do not redesign mobile interactions merely to support desktop.

---

# 41. Accessibility

Minimum:

```text
44×44px touch targets
```

Contrast:

WCAG AA minimum.

Do not rely on color only.

Support:

- keyboard focus on desktop
- visible focus ring
- text scaling
- semantic HTML
- correct button/link roles

---

# 42. Language Design

Tone:

- straightforward
- human
- concise
- non-corporate
- non-marketing inside product

Use:

```text
Prospek
Klien
Follow-up
Booking
Catatan
Riwayat
```

Avoid:

```text
Lead Management
Opportunities
Activities
Engagement
Conversion Pipeline
Automation
```

unless needed in advanced future screens.

---

# 43. Today Copy Examples

Good:

```text
5 tindakan hari ini
1 terlambat
```

Good:

```text
Follow-up Ayu
```

Good:

```text
DP belum dibayar
```

Bad:

```text
Your Daily Productivity Overview
```

Bad:

```text
Action Center
```

Bad:

```text
Lead Engagement Required
```

---

# 44. Design Validation Checklist

Sebelum screen dianggap selesai, cek:

## Visual

- [ ] Tidak ada card tanpa alasan
- [ ] Tidak ada decorative gradient
- [ ] Tidak ada random shadow
- [ ] Tidak ada emoji UI
- [ ] Tidak ada excessive pill
- [ ] Tidak ada giant heading
- [ ] Warna semantic tidak berlebihan
- [ ] UI tetap jelas dalam grayscale

## Hierarchy

- [ ] User tahu primary action <3 detik
- [ ] Important information above the fold
- [ ] Secondary metadata benar-benar secondary
- [ ] Tidak semua elemen mempunyai visual weight sama

## Density

- [ ] List tidak terlalu gemuk
- [ ] Screen menampilkan cukup banyak relevant objects
- [ ] Tidak ada excessive whitespace
- [ ] Touch target tetap aman

## Interaction

- [ ] Maximum satu dominant CTA per context
- [ ] Wording action menyatakan outcome
- [ ] Progressive disclosure digunakan untuk optional info
- [ ] Common action dapat dilakukan dengan sedikit tap

---

# 45. Screen-Specific Anti-Slop Checklist

## Today

Must NOT have:

- greeting hero
- metric cards
- colorful task cards
- large FAB
- emoji state

Must have:

- date
- compact action summary
- overdue grouping
- action rows
- direct WhatsApp action

---

## Contacts

Must NOT have:

- separate Leads/Clients navigation destinations
- card list
- giant filter pills
- avatar-heavy social style

Must have:

- search
- simple lifecycle filters
- dense rows
- clear status/context

---

## Contact Detail

Must NOT have:

- one card per section
- giant status badge
- multiple filled CTAs

Must have:

- identity
- next action
- notes
- booking
- activity
- one primary action

---

## Calendar

Must NOT have:

- decorative calendar dashboard
- event cards everywhere

Must have:

- agenda-first hierarchy
- clear time alignment
- contact
- service
- status only when needed

---

# 46. Prototype Redesign Priority

Redesign sequence:

## Phase 1 — Foundation

1. Tokens
2. Typography
3. Navigation
4. Row primitives
5. Buttons
6. Forms
7. Bottom sheet

---

## Phase 2 — Core Screens

1. Today
2. Contacts
3. Contact Detail
4. WhatsApp Flow
5. Calendar
6. Booking Detail

---

## Phase 3 — Supporting

1. Add Contact
2. Add Booking
3. Public Booking
4. Services
5. Templates
6. Settings
7. Onboarding

---

# 47. Design Review Method

Setiap screen direview berdasarkan 5 pertanyaan.

### 1. Scan

Bisakah user memahami situasi dalam 3 detik?

### 2. Action

Apakah tindakan berikutnya langsung jelas?

### 3. Noise

Adakah visual element yang dapat dihapus tanpa kehilangan makna?

### 4. Density

Apakah jumlah informasi per viewport cukup?

### 5. Familiarity

Apakah interaction mengikuti pattern mobile yang sudah dikenal?

Jika jawaban untuk Noise adalah “ya”:

hapus elemen tersebut.

---

# 48. AI Coding Agent Guardrail

Tambahkan instruction berikut ke prompt coding agent:

> Do not make the interface look like a generic AI-generated SaaS dashboard. Prefer typography, spacing, alignment, and dividers over cards. Use neutral surfaces, restrained color, dense list rows, minimal shadows, no gradients, no decorative emoji, and only one prominent CTA per context. Every UI element must communicate hierarchy, state, or action. If an element is purely decorative, remove it.

Tambahkan juga:

> Do not invent visual treatments that are not defined in the design system. Reuse existing row, section, input, sheet, and navigation primitives.

---

# 49. PromotorClass Compatibility

PromotorFlow dan PromotorClass menggunakan canonical shared `contact_id`.

If PromotorClass is available, Contact Detail may show:

```text
LEARNING

Parenting Mini Class
80% · Hot · aktif 2 jam lalu

View learning

Recommended
Enroll in 30 Hari Setelah Tes
```

Rules:

- no embedded curriculum builder,
- no full learner analytics inside Flow,
- learning context remains secondary to business Next Action,
- `View learning` opens PromotorClass,
- `Enroll in program` appears only in relevant context,
- no empty Learning tab when integration is inactive.

Class-originated Flow action uses normal Today grammar:

```text
Ayu Rahma
Parenting Mini Class · 80%
Belum pernah assessment
Follow-up tentang assessment        WA
```

Source is subtle metadata, not a decorative badge.

After service completion:

```text
Aftersales
30 Hari Setelah Tes

Enroll in program
```

Enrollment remains human-triggered.

Cross-app UI principle:

> contextual, actionable, secondary.

# 50. Final Design Principle

Jika ragu antara dua desain:

pilih yang:

- lebih sedikit dekorasi
- lebih mudah dipindai
- lebih padat
- lebih familiar
- lebih cepat digunakan

bukan yang:

- terlihat lebih “modern” di screenshot
- memiliki lebih banyak container
- memiliki lebih banyak warna
- memiliki lebih banyak animation
- terlihat lebih seperti SaaS template

---

# 51. Final Definition

PromotorFlow harus terasa seperti:

> **alat kerja yang sudah dipakai setiap hari selama bertahun-tahun, bukan aplikasi yang dibuat untuk memenangkan screenshot di Dribbble.**

Design success bukan:

> “UI-nya wow.”

Design success adalah:

> “Saya langsung tahu siapa yang harus saya hubungi.”
