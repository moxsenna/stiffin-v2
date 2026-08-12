# PromotorFlow V0.1 — Product Requirements Document (PRD)

**Version:** 0.1  
**Status:** Prototype / MVP Definition  
**Primary platform:** Mobile-first PWA  
**Primary user:** Individual Promotor  
**Design language:** Quiet Operations  
**Product type:** Business workflow / relationship operations assistant  
**Document purpose:** Source of truth for product, design, engineering, and coding agents
**Cross-product integration source of truth:** `INTEGRATION_CONTRACT.md`  
**Integration ownership:** Shared Core owns Organization/User/Contact; PromotorFlow owns canonical NextAction.

---

# 1. Product Summary

PromotorFlow adalah aplikasi mobile-first untuk membantu promotor mengelola prospek, booking, customer, follow-up, dan aftercare tanpa harus merasa sedang menggunakan CRM yang kompleks.

Core promise:

> **PromotorFlow mengingat siapa yang perlu dihubungi berikutnya, dari prospek pertama sampai aftercare setelah layanan selesai.**

PromotorFlow V0.1 berfokus pada satu masalah utama:

> Prospek dan customer sering tenggelam di WhatsApp karena tidak ada sistem sederhana untuk mengetahui siapa yang harus ditindaklanjuti berikutnya.

Produk tidak menggantikan WhatsApp.

Produk tidak mengirim pesan otomatis.

Produk bertindak sebagai:

> **system of record + next-action assistant**

sementara komunikasi tetap dilakukan manusia melalui WhatsApp.

---

# 2. Problem Statement

Promotor menjalankan aktivitas bisnis yang tersebar di banyak tempat:

- WhatsApp
- Instagram
- TikTok
- Facebook
- Google
- catatan pribadi
- spreadsheet
- kalender
- aplikasi tes resmi
- percakapan offline
- referral
- event

Akibatnya, beberapa masalah muncul:

1. Prospek baru tidak tercatat.
2. Promotor lupa siapa yang belum di-follow-up.
3. History customer sulit dilihat secara utuh.
4. Status calon customer tidak jelas.
5. Booking dan pembayaran DP mudah terlewat.
6. Promotor harus scroll chat untuk mengingat konteks.
7. Customer yang sudah selesai layanan sering tidak ditindaklanjuti lagi.
8. Database customer lama tidak diperlakukan sebagai aset.
9. Promotor tidak mempunyai sistem harian yang memberi tahu apa yang harus dilakukan.
10. CRM umum terlalu kompleks untuk kebutuhan promotor individual.

---

# 3. Product Thesis

Promotor tidak membutuhkan CRM yang penuh fitur.

Promotor membutuhkan:

> **daftar tindakan berikutnya yang selalu up to date.**

Jika PromotorFlow dapat menjawab:

- siapa yang perlu saya hubungi?
- kenapa saya perlu menghubungi mereka?
- konteks terakhirnya apa?
- pesan apa yang perlu saya kirim?
- setelah ini saya harus melakukan apa?

maka PromotorFlow telah memberikan core value.

---

# 4. Product Principles

## 4.1 Next Action First

Setiap contact aktif harus sebisa mungkin mempunyai satu primary next action.

Contoh:

```text
Ayu Rahma
Follow-up jadwal weekend
Hari ini, 10:00
```

---

## 4.2 Human-in-the-Loop

PromotorFlow tidak mengirim WhatsApp secara otomatis pada V0.1.

Flow:

```text
PromotorFlow
↓
Draft message
↓
Open WhatsApp
↓
User sends
↓
User confirms sent
↓
PromotorFlow records activity
```

---

## 4.3 One Contact, One Identity

Seseorang tidak menjadi record baru saat berubah lifecycle.

```text
Prospek
↓
Booking
↓
Client
↓
Aftercare
```

tetap satu `contact_id`.

Ini penting untuk future LMS integration.

---

## 4.4 Simple Before Powerful

Jika sebuah feature meningkatkan kompleksitas secara signifikan tetapi hanya sedikit meningkatkan core value, feature tidak masuk V0.1.

---

## 4.5 Workflow Over Dashboard

PromotorFlow bukan aplikasi analytics-first.

Priority:

```text
Action
Context
History
Schedule
```

bukan:

```text
Charts
Reports
Dashboards
Metrics
```

---

## 4.6 Mobile First

Primary use case terjadi melalui smartphone.

Design dan interaction harus dioptimalkan untuk:

```text
360–430px width
```

---

# 5. Goals

V0.1 harus memungkinkan promotor:

1. Mencatat prospek dalam kurang dari 10 detik.
2. Melihat siapa yang perlu ditangani hari ini.
3. Mengetahui konteks customer tanpa mencari chat lama.
4. Membuka WhatsApp dengan draft message.
5. Menjadwalkan follow-up.
6. Membuat booking.
7. Melacak status DP secara manual.
8. Menandai layanan selesai.
9. Mengubah prospek menjadi client tanpa duplicate data.
10. Mendapat reminder aftercare.
11. Melihat history contact secara kronologis.
12. Membagikan halaman booking publik sederhana.

---

# 6. Non-Goals V0.1

V0.1 secara eksplisit tidak mencakup:

- WhatsApp Business API
- unofficial WhatsApp automation
- auto-send WhatsApp
- broadcast campaigns
- AI chatbot autonomous
- AI content generator
- fingerprint processing
- biometric storage
- proses penentuan hasil tes
- integrasi ke aplikasi tes resmi
- payment gateway
- invoice system
- bookkeeping
- accounting
- commission
- multi-promoter team
- branch dashboard
- proposal builder
- institutional CRM
- referral engine penuh
- LMS
- course builder
- email marketing
- Google Calendar sync
- advanced automation builder
- advanced analytics
- landing-page builder
- marketing attribution kompleks

---

# 7. Target User

## Primary Persona

### Individual Promotor Aktif

Karakteristik:

- menggunakan WhatsApp sebagai alat komunikasi utama
- menerima inquiry dari beberapa channel
- memiliki prospek dan customer yang perlu di-follow-up
- menjalankan booking secara manual
- tidak ingin belajar CRM kompleks
- mayoritas aktivitas dilakukan melalui smartphone
- membutuhkan sistem sederhana untuk mengingat customer
- menghargai kemudahan lebih dari configurability

---

# 8. Jobs to Be Done

## JTBD 1 — Capture

> Ketika seseorang bertanya tentang layanan saya, saya ingin mencatatnya dengan cepat agar tidak hilang di WhatsApp.

---

## JTBD 2 — Follow-up

> Ketika saya membuka aplikasi, saya ingin langsung tahu siapa yang harus saya follow-up agar tidak kehilangan prospek.

---

## JTBD 3 — Context

> Sebelum menghubungi customer, saya ingin tahu konteks terakhir agar tidak perlu membaca seluruh chat lama.

---

## JTBD 4 — Booking

> Ketika customer siap, saya ingin membuat booking dengan cepat dan tahu apakah DP sudah masuk.

---

## JTBD 5 — Completion

> Setelah layanan selesai, saya ingin customer otomatis masuk ke lifecycle client.

---

## JTBD 6 — Aftercare

> Setelah beberapa hari, saya ingin diingatkan untuk menghubungi kembali customer agar hubungan tidak berhenti setelah transaksi.

---

# 9. Core Product Loop

```text
Contact created
↓
Next Action generated
↓
Promotor performs action
↓
Activity recorded
↓
Lifecycle progresses
↓
New Next Action generated
↓
Booking
↓
Service completed
↓
Aftercare
↓
Next Action
```

Produk harus selalu mencoba menjaga loop ini hidup.

---

# 10. Navigation

V0.1 memiliki empat main destination:

```text
Today
Contacts
Calendar
More
```

---

## 10.1 Today

Menjawab:

> Apa yang harus saya lakukan sekarang?

---

## 10.2 Contacts

Semua prospek dan clients dalam satu identity system.

Filter:

```text
Semua
Prospek
Klien
```

---

## 10.3 Calendar

Agenda booking dan jadwal.

---

## 10.4 More

Berisi:

- Services
- Public Booking Page
- Message Templates
- Tags
- Profile
- Notifications
- Settings

---

# 11. Lifecycle Model

Lifecycle utama:

```text
NEW
↓
CONTACTED
↓
INTERESTED
↓
FOLLOW_UP
↓
BOOKED
↓
COMPLETED
```

Alternative exit:

```text
NEW / CONTACTED / INTERESTED / FOLLOW_UP
↓
LOST
```

---

# 12. Lifecycle Status Definitions

## NEW

Prospek sudah tercatat tetapi belum dihubungi.

---

## CONTACTED

Promotor sudah menghubungi prospek.

Belum ada buying intent yang cukup jelas.

---

## INTERESTED

Prospek menunjukkan minat.

Signal dapat berupa:

- bertanya harga
- bertanya jadwal
- bertanya lokasi
- bertanya paket
- meminta informasi lebih detail

---

## FOLLOW_UP

Prospek perlu ditindaklanjuti lagi sebelum mengambil keputusan.

---

## BOOKED

Sudah mempunyai booking aktif.

---

## COMPLETED

Minimal satu layanan telah selesai.

Contact sekarang dianggap client.

---

## LOST

Prospek tidak melanjutkan.

Lost reason:

```text
NO_RESPONSE
PRICE
SCHEDULE
LOCATION
NOT_READY
CHOSE_OTHER
OTHER
```

---

# 13. Contact Classification

User-facing classification:

```text
Prospek
Client
```

Rules:

```text
Prospek:
stage != COMPLETED

Client:
completed_service_count >= 1
```

Contact tidak berpindah database.

Hanya classification/lifecycle yang berubah.

---

# 14. Core Feature 1 — Today

## Purpose

Menjadi home screen utama.

Today harus menunjukkan pekerjaan, bukan dashboard dekoratif.

---

## Functional Requirements

Today harus:

- menampilkan tanggal
- menampilkan total tindakan hari ini
- menampilkan jumlah overdue
- mengelompokkan tindakan berdasarkan urgency
- mengurutkan berdasarkan priority
- memungkinkan direct action
- dapat membuka contact context
- dapat membuka WhatsApp
- dapat membuka booking

---

## Suggested Grouping

```text
TERLAMBAT
HARI INI
BERIKUTNYA
```

---

## Example

```text
Hari ini
Selasa, 12 Agustus

5 tindakan · 1 terlambat


TERLAMBAT

Ayu Rahma                    1 hari
Parenting · Instagram
Tanya jadwal weekend             WA


HARI INI

Arief Santoso                 14:00
Tes Family · Home visit
DP sudah dibayar                  >

Dimas Prakoso
Tes Personal · Jumat 10:00
DP belum dibayar                 WA
```

---

# 15. Core Feature 2 — Contact Capture

## Requirement

User harus dapat menambahkan contact secepat mungkin.

Required initial fields:

```text
name
phone
interest
```

Optional progressive fields:

```text
source
notes
tags
email
```

---

## Acceptance Criteria

- name required
- phone optional tetapi direkomendasikan
- phone dinormalisasi ke format internasional
- duplicate detection berdasarkan normalized phone
- user tidak dipaksa mengisi source
- save target <10 detik pada penggunaan normal
- setelah save, contact langsung mempunyai Next Action

---

# 16. Phone Normalization

PromotorFlow mengikuti canonical Shared Core identity contract.

Canonical phone storage/matching:

```text
E.164
```

Example:

```text
0812 3456 7890
+62 812 3456 7890
6281234567890

↓ normalize

+6281234567890
```

Rules:

- remove visual whitespace/punctuation,
- normalize Indonesian leading `0` to country code `62`,
- store leading `+`,
- compare canonical E.164,
- use one shared `normalizePhone()` from Shared Core.

Recommended field:

```text
phone_e164
```

If legacy `phone_normalized` remains temporarily, its required value is E.164.

Duplicate key:

```text
organization_id + phone_e164
```

Display formatting remains separate.

# 17. Duplicate Contact Logic

Jika nomor sudah ada:

```text
Ayu sudah ada di PromotorFlow.

Lihat kontak
Update data
```

System tidak membuat duplicate baru secara default.

---

# 18. Contact Detail

Contact detail harus menampilkan:

1. identity
2. lifecycle status
3. interest/source
4. primary next action
5. notes
6. booking
7. activity history
8. optional result category

---

## Primary Action

Primary action mengikuti current state.

Examples:

```text
Buka WhatsApp
Buat booking
Tandai tes selesai
```

---

# 19. Core Feature 3 — Next Action Engine

Next Action Engine adalah core business logic V0.1.

Setiap action memiliki:

```text
type
contact_id
booking_id nullable
title
description
due_at
priority
status
```

---

# 20. Next Action Types

```text
CONTACT_LEAD
FOLLOW_UP
REMIND_PAYMENT
CONFIRM_BOOKING
REMIND_BOOKING
AFTERCARE
MANUAL
```

---

# 21. Next Action Status

```text
PENDING
COMPLETED
CANCELLED
```

---

# 22. Single Primary Next Action Rule

Database dapat memiliki lebih dari satu pending action.

UI hanya menampilkan satu:

> **Primary Next Action**

Primary dipilih berdasarkan:

```text
priority score
+
urgency
+
overdue
+
booking criticality
```

---

# 23. Priority Baseline

Recommended baseline:

| Action | Base score |
|---|---:|
| Booking/test today | 100 |
| Booking confirmation | 90 |
| Payment reminder | 85 |
| Overdue follow-up | 80 |
| New lead contact | 75 |
| Follow-up today | 70 |
| Aftercare | 50 |
| Manual task | 40 |

Overdue modifiers:

```text
+10 overdue >1 day
+20 overdue >3 days
```

Exact formula dapat disesuaikan setelah pilot.

---

# 24. Next Action Rules

## Rule A — Contact Created

Trigger:

```text
contact.created
```

Action:

```text
CONTACT_LEAD
due = now + 2 hours
priority = 75
```

---

## Rule B — Contacted

Trigger:

```text
NEW → CONTACTED
```

Prompt:

```text
Follow-up kapan?

Besok
2 hari
3 hari
1 minggu
Pilih tanggal
Tidak perlu
```

Default suggestion:

```text
2 days
```

---

## Rule C — Interested

Trigger:

```text
stage = INTERESTED
```

Jika tidak ada pending next action:

```text
FOLLOW_UP
due = next day 10:00 local time
priority = 70
```

---

## Rule D — Follow-up Completed

Setelah user menandai message sudah dikirim:

Prompt:

```text
Follow-up lagi kapan?

2 hari
3 hari
1 minggu
Tidak perlu
```

---

## Rule E — Booking Created

Trigger:

```text
booking.created
```

Contact stage:

```text
BOOKED
```

Jika:

```text
payment_status = UNPAID
```

create:

```text
REMIND_PAYMENT
```

---

## Rule F — Payment Completed

Trigger:

```text
payment_status:
UNPAID → PAID
```

Pending payment reminder:

```text
COMPLETED / CANCELLED
```

---

## Rule G — Booking Reminder

Booking confirmed membuat:

```text
REMIND_BOOKING
```

Default:

```text
H-1
```

---

## Rule H — Service Completed

Trigger:

```text
booking.status = COMPLETED
```

Contact:

```text
stage = COMPLETED
```

Create:

```text
AFTERCARE
due = completed_at + 7 days
```

---

# 25. Core Feature 4 — WhatsApp Flow

PromotorFlow menggunakan WhatsApp deep link.

Format:

```text
https://wa.me/{normalized_phone}?text={encoded_message}
```

---

## Flow

```text
Action
↓
Message Preview
↓
Edit optional
↓
Open WhatsApp
↓
Promotor sends message
↓
Returns to PromotorFlow
↓
"Pesan sudah dikirim?"
↓
Yes / No
```

---

## If Yes

System:

```text
action.status = COMPLETED
activity = WHATSAPP_SENT
```

Kemudian prompt follow-up bila relevan.

---

## If No

System tidak menandai action completed.

---

# 26. Message Templates

Required V0.1 templates:

```text
FIRST_CONTACT
FOLLOW_UP
PAYMENT_REMINDER
BOOKING_REMINDER
AFTERCARE
```

Supported variables:

```text
{{first_name}}
{{service_name}}
{{booking_date}}
{{booking_time}}
{{promoter_name}}
{{city}}
```

Promotor dapat edit default template.

---

# 27. AI Usage V0.1

AI bukan dependency core.

V0.1 dapat berfungsi tanpa AI.

Optional future enhancement:

```text
Generate alternative message
Rewrite tone
Summarize context
```

Tetapi tidak required untuk MVP acceptance.

---

# 28. Core Feature 5 — Booking

Booking dapat dibuat dari:

1. Promotor manually
2. Public booking page

---

## Required Fields

```text
contact_id
service_id
start_at
location_type
location_text optional
status
payment_status
notes optional
```

---

# 29. Booking Status

```text
PENDING
CONFIRMED
COMPLETED
CANCELLED
NO_SHOW
```

---

# 30. Payment Status

V0.1 hanya manual tracking:

```text
UNPAID
PAID
WAIVED
```

Tidak ada payment gateway.

---

# 31. Booking Actions

Booking detail dapat:

- open WhatsApp
- mark DP paid
- reschedule
- mark service completed
- cancel booking

---

# 32. Booking Completion

When:

```text
Mark service completed
```

System harus:

```text
booking.status = COMPLETED
contact.stage = COMPLETED
complete/cancel irrelevant booking actions
record activity
schedule aftercare +7 days
```

---

# 33. Core Feature 6 — Calendar

Default view:

> Agenda

Agenda harus menunjukkan:

```text
time
contact
service
location
important status
```

Month grid bukan priority V0.1.

---

# 34. Calendar Requirements

User dapat:

- melihat booking hari ini
- melihat upcoming booking
- membuka booking detail
- membuat booking
- reschedule
- melihat status booking
- melihat payment status jika relevan

---

# 35. Core Feature 7 — Aftercare

Aftercare otomatis dibuat ketika layanan selesai.

Default:

```text
D+7
```

---

## Aftercare Action

Suggested intent:

> menanyakan pemahaman dan pengalaman setelah layanan.

Example:

```text
Halo Bu Reni,

Sudah sekitar satu minggu sejak sesi kemarin.
Saya ingin cek apakah ada bagian dari hasil yang
masih membingungkan atau ingin didiskusikan lagi?
```

---

## Aftercare Outcomes

V0.1:

```text
NO_NEED
HAS_QUESTION
INTERESTED_NEXT_SESSION
CONTACT_LATER
```

If:

```text
CONTACT_LATER
```

create manual next action.

---

# 36. Core Feature 8 — Activity Timeline

Activity timeline adalah history yang readable manusia.

Required examples:

```text
Contact created
WhatsApp opened
WhatsApp sent
Stage changed
Follow-up scheduled
Follow-up completed
Booking created
Booking updated
Payment marked
Booking completed
Aftercare scheduled
Aftercare completed
Note added
```

---

## Display Format

Preferred:

```text
12 Aug   Follow-up jatuh tempo
10 Aug   WhatsApp dikirim
8 Aug    Status menjadi Follow-up
8 Aug    Prospek ditambahkan
```

---

# 37. Activity Architecture

Activity schema minimal:

```text
id
organization_id
contact_id
type
metadata_json
occurred_at
created_by
```

Architecture ini juga menjadi seam future LMS.

---

# 38. Public Booking Page

Promotor mendapatkan public URL:

```text
promotorflow.id/{slug}
```

Example:

```text
promotorflow.id/rina
```

---

# 39. Public Booking Flow

```text
Service
↓
Date
↓
Time
↓
Customer data
↓
Confirmation
```

No login required.

---

# 40. Public Booking Requirements

Customer dapat:

- memilih service
- memilih available date/time
- mengisi name
- mengisi WhatsApp
- menambahkan participant count
- menambahkan notes
- submit booking

---

# 41. Public Booking Side Effect

Jika phone belum ada:

```text
contact.created
source = BOOKING_PAGE
stage = BOOKED
```

Jika contact sudah ada:

```text
reuse contact
```

Kemudian:

```text
booking.created
```

Promotor harus melihat booking tersebut di Today.

---

# 42. Services

Promotor dapat mengelola:

```text
name
description
price optional
duration_minutes
deposit_amount optional
is_active
```

Suggested defaults:

```text
Tes Personal
Tes Couple
Tes Family
Private Session
```

Default dapat diubah.

---

# 43. Availability

V0.1 cukup menggunakan weekly availability sederhana.

Example:

```text
Mon–Fri
09:00–17:00

Sat
09:00–14:00

Sun
Closed
```

Tidak perlu calendar sync.

---

# 44. Onboarding

Maximum onboarding:

```text
3 steps
```

Flow:

```text
Welcome
↓
Profile
↓
Services
↓
Ready
```

---

## Profile Required

```text
name
phone
city
```

Optional:

```text
business_name
email
```

---

# 45. More Screen

Contains:

```text
Services
Booking Page
Message Templates
Tags
Profile
Notifications
Settings
Help
```

No advanced admin navigation.

---

# 46. Notifications

V0.1 notifications minimal.

Optional browser/PWA notifications:

## Daily Summary

Default:

```text
09:00 local time
```

Example:

```text
5 aktivitas membutuhkan perhatian hari ini.
```

---

## Booking Reminder

Example:

```text
Besok ada Tes Ayu pukul 10:00.
```

---

## Notification Principles

No notification:

```text
Kami merindukan Anda
Sudah lama tidak membuka aplikasi
```

Every notification must map to useful action.

---

# 47. Minimal Data Model

## organizations

```text
id
name
slug
timezone
created_at
updated_at
```

Although V0.1 is single-promoter, organization exists for future team/branch architecture.

---

## users

```text
id
organization_id
name
phone
email nullable
city
role
created_at
updated_at
```

Role V0.1:

```text
OWNER
```

---

## contacts

```text
id
organization_id

name
phone
phone_normalized
email nullable

interest
source
lead_stage

notes nullable
result_type nullable

created_at
updated_at
```

---

## services

```text
id
organization_id

name
description nullable
category

price nullable
duration_minutes
deposit_amount nullable

is_active

created_at
updated_at
```

---

Service `category` values:

```text
ASSESSMENT
SESSION
PROGRAM
OTHER
```

This supports generalized `AssessmentStatus` integration without storing biometric data.

---

## bookings

```text
id
organization_id
contact_id
service_id

start_at
end_at nullable

location_type
location_text nullable

status
payment_status

notes nullable

completed_at nullable
created_at
updated_at
```

---

## next_actions

```text
id
organization_id
contact_id
booking_id nullable

type

title
description nullable

due_at
priority

status

completed_at nullable

created_at
updated_at
```

---

## activities

```text
id
organization_id
contact_id

type
metadata_json

occurred_at
created_by

created_at
```

---

## message_templates

```text
id
organization_id

type
name
body

is_default

created_at
updated_at
```

---

## tags

```text
id
organization_id
name
created_at
```

---

## contact_tags

```text
contact_id
tag_id
```

---

# 48. Explicitly Forbidden Data

PromotorFlow V0.1 tidak boleh mempunyai storage field/table untuk:

```text
fingerprint
fingerprint_image
fingerprint_template
biometric_scan
raw_biometric_data
```

Biometric processing bukan bagian PromotorFlow.

---

# 49. Optional Result Data

Jika promotor ingin mencatat kategori hasil:

```text
result_type nullable
```

Harus optional.

Tidak menjadi dependency core workflow.

---

# 50. Event Model

System sebaiknya menggunakan domain/event naming walaupun implementasi awal sederhana.

Core events:

```text
CONTACT_CREATED
CONTACT_UPDATED

STAGE_CHANGED

WHATSAPP_OPENED
WHATSAPP_SENT

FOLLOWUP_CREATED
FOLLOWUP_COMPLETED

BOOKING_CREATED
BOOKING_UPDATED
BOOKING_COMPLETED
BOOKING_CANCELLED

PAYMENT_MARKED

AFTERCARE_CREATED
AFTERCARE_COMPLETED
```

---

# 51. PromotorClass Integration Event Seam

PromotorClass is the named companion learning product.

PromotorFlow must accept meaningful learning-originated action requests:

```text
program.progress_80
program.completed
cta.clicked
learner.inactive
```

Ownership:

```text
PromotorClass → learning_events + learning_signals
PromotorFlow  → canonical next_actions
```

Flow:

```text
LearningNextActionRequest
↓
PromotorFlowAdapter
↓
NextActionService
↓
Today / Contact Detail
```

Class-originated actions carry:

```text
source = PROMOTORCLASS
source_event_id
source_signal_id nullable
idempotency_key
context_json
```

---

# 52. PromotorClass Integration Principle

Canonical Shared Core:

```text
organization_id
user_id
contact_id
phone_e164
```

Shared Core owns:

```text
organizations
users
contacts
phone normalization
organization/auth context
```

PromotorFlow owns:

```text
contact lifecycle
services
bookings
next_actions
activities
aftercare
```

PromotorClass owns:

```text
programs
lessons
enrollments
progress
reflections
learning_events
learning_signals
```

Reverse integration:

```text
Flow service completed
↓
PromotorClassAdapter.listEligiblePrograms()
↓
human chooses
↓
PromotorClassAdapter.enrollContact()
↓
same contact_id
```

Minimal optional Flow integration surfaces:

- learning summary in Contact Detail,
- `View learning`,
- `Enroll in program`,
- Class-originated actions in Today.

Flow core remains operational if Class is unavailable.

PromotorFlow must not embed full curriculum/LMS administration.

See `INTEGRATION_CONTRACT.md`.

# 53. Search

V0.1 search scope:

```text
name
phone
```

Search exists on Contacts.

No global search required.

---

# 54. Filters

Contacts:

```text
ALL
PROSPECT
CLIENT
```

Optional secondary filter:

```text
NEW
FOLLOW_UP
BOOKED
LOST
```

Do not overload initial UI.

---

# 55. Empty States

## No Contacts

```text
Belum ada prospek.

Tambahkan orang yang sedang mempertimbangkan
layanan Anda.

+ Tambah prospek
```

---

## Today Empty

```text
Tidak ada yang perlu ditindaklanjuti.

Prospek berikutnya dijadwalkan besok pukul 09:00.
```

---

## Calendar Empty

```text
Belum ada jadwal.

Buat booking manual atau bagikan halaman booking.
```

---

# 56. Error Requirements

Error harus:

- human readable
- actionable
- preserve user input when possible
- not expose internal server errors

Example:

```text
Belum berhasil menyimpan.

Perubahan Anda masih ada.
Coba lagi.
```

---

# 57. Offline / Network

Ideal PWA behavior:

- cached Today
- cached Contacts
- cached Calendar
- forms retain draft
- queued changes can sync when connection returns

If offline support is too costly for first backend MVP:

at minimum:

- preserve unsaved input locally
- clear network state message
- no silent data loss

---

# 58. Design Requirements

Implementation must follow `promotorflow_design_plan.md`.

Core design constraints:

- no card-by-default
- no decorative gradient
- no decorative glassmorphism
- no shadow on normal content
- no emoji as UI language
- no colorful badge soup
- typography-first hierarchy
- row/list-first structure
- one dominant CTA per context
- compact mobile density
- neutral palette
- restrained border radius

---

# 59. Accessibility Requirements

Minimum:

- touch target 44×44 px
- WCAG AA text contrast
- visible keyboard focus
- semantic HTML
- no color-only communication
- labels for icon-only buttons
- form errors associated with inputs
- text scaling should not break layout

---

# 60. Performance Requirements

Target experience:

```text
Initial usable screen <2s on normal mobile network
Navigation feels immediate
Simple actions optimistic where safe
```

Avoid:

- large JS bundle
- large image assets
- heavy animation libraries
- unnecessary chart libraries
- large icon packs loaded globally

---

# 61. Security Requirements

Minimum production requirements:

- organization data isolation
- authenticated private routes
- secure session handling
- encrypted transport
- server-side authorization
- input validation
- output encoding
- rate limiting for public booking
- audit-safe activity history
- secrets never exposed in client bundle
- no biometric storage

---

# 62. Privacy Requirements

Collect minimum required information.

Default customer data:

```text
name
phone
optional email
notes
booking
service interaction
optional result category
```

Need support later:

- export customer data
- delete customer
- retention policy
- consent record where required
- role-based access when team accounts arrive

---

# 63. Analytics / Product Metrics

North-star metric:

# Completed Next Actions per Promoter per Week

---

## Supporting Metrics

```text
new_contacts_per_week
followups_completed
bookings_created
services_completed
aftercare_completed
```

---

## Funnel Metrics

Future but schema-ready:

```text
Lead → Booking
Booking → Completed
Completed → Aftercare
```

---

# 64. Product Analytics Events

Suggested events:

```text
app_opened

contact_created
contact_viewed
contact_stage_changed

next_action_viewed
next_action_completed

whatsapp_preview_opened
whatsapp_deeplink_opened
whatsapp_marked_sent

booking_created
booking_payment_marked
booking_completed
booking_cancelled

aftercare_completed

public_booking_started
public_booking_completed
```

Avoid collecting message body unnecessarily in analytics.

---

# 65. Success Criteria for Pilot

Pilot:

```text
5–10 active promoters
```

Success should not be judged by:

```text
"UI bagus"
"fiturnya keren"
"mau pakai"
```

Main behavior indicators:

1. User returns after day 7.
2. User continues adding contacts.
3. User completes Next Actions.
4. User opens WhatsApp through PromotorFlow.
5. User progresses contacts to booking.
6. User uses aftercare reminders.
7. User no longer relies solely on scrolling WhatsApp to remember follow-ups.

---

# 66. Suggested MVP Retention Questions

During pilot, ask:

- Bagian apa yang paling sering dibuka?
- Kapan PromotorFlow terasa membantu?
- Kapan Anda masih kembali ke catatan/Excel?
- Ada prospek yang tetap terlewat?
- Follow-up reminder terlalu banyak atau terlalu sedikit?
- Booking flow terlalu panjang?
- Informasi apa yang kurang di contact detail?
- Apa yang membuat Anda malas mencatat prospek?
- Apakah Today benar-benar membantu memulai hari?
- Jika aplikasi hilang besok, bagian mana yang paling dirindukan?

---

# 67. User Stories

## US-001 Add Contact

As a promoter,  
I want to add a prospect quickly,  
so that the person does not disappear inside WhatsApp.

Acceptance:

- can enter name
- can enter phone
- can choose need/interest
- optional details hidden
- save succeeds
- next action automatically created

---

## US-002 View Today

As a promoter,  
I want to see who needs attention today,  
so that I do not have to remember follow-ups manually.

Acceptance:

- overdue appears first
- today's actions grouped
- booking today prioritized
- direct WhatsApp action available

---

## US-003 Follow-up

As a promoter,  
I want to schedule a follow-up,  
so that I remember to contact the prospect again.

Acceptance:

- quick presets
- custom date possible
- note possible
- new action appears at correct time

---

## US-004 Send WhatsApp

As a promoter,  
I want a prepared message and one-tap WhatsApp launch,  
so that follow-up is fast but still personal.

Acceptance:

- correct customer number
- editable message
- deep link works
- no auto-send
- sent confirmation recorded

---

## US-005 Create Booking

As a promoter,  
I want to create a booking from a contact,  
so that the customer lifecycle progresses clearly.

Acceptance:

- service
- date
- time
- location
- DP status
- contact stage becomes BOOKED

---

## US-006 Mark DP Paid

As a promoter,  
I want to mark a deposit as paid,  
so that payment reminders stop.

Acceptance:

- payment status updates
- pending payment action cleared
- activity recorded

---

## US-007 Complete Service

As a promoter,  
I want to mark a service as complete,  
so that the prospect becomes a client and aftercare is scheduled.

Acceptance:

- booking completed
- contact classified as client
- pending booking actions cleaned
- aftercare D+7 created
- activity recorded

---

## US-008 Aftercare

As a promoter,  
I want to be reminded after a completed service,  
so that I maintain the customer relationship.

Acceptance:

- aftercare appears on Today when due
- message template available
- outcome selectable
- contact-later can create new next action

---

## US-009 Public Booking

As a potential customer,  
I want to choose a service and schedule without creating an account,  
so that booking is easy.

Acceptance:

- service selectable
- schedule selectable
- name and phone required
- booking created
- existing contact reused when phone matches

---

# 68. Acceptance Criteria — Product Level

V0.1 is considered functionally complete when user can:

- [ ] onboard
- [ ] create contact
- [ ] detect duplicate phone
- [ ] view Today
- [ ] view overdue action
- [ ] create follow-up
- [ ] change lifecycle stage
- [ ] preview WhatsApp message
- [ ] open WhatsApp
- [ ] confirm message sent
- [ ] create booking
- [ ] mark DP paid
- [ ] view calendar agenda
- [ ] complete booking/service
- [ ] see contact become client
- [ ] receive aftercare action
- [ ] complete aftercare
- [ ] view activity history
- [ ] share/use public booking page

---

# 69. UX Acceptance Criteria

Target interaction budgets:

```text
Add contact:
≤4 taps + typing

Today → WhatsApp:
≤2 taps

Schedule follow-up:
≤3 taps after context opened

Mark DP paid:
≤2 taps

Complete service:
≤2 taps + confirmation

Open contact context:
1 tap from list
```

---

# 70. Data Integrity Rules

System must ensure:

- normalized phone uniqueness within organization when phone exists
- booking cannot reference missing contact
- next action cannot reference missing contact
- completed booking has completed_at
- completed next action has completed_at
- organization isolation on all records
- lifecycle update recorded in activity history
- booking completion idempotent
- aftercare should not duplicate for same completion event

---

# 71. Idempotency Requirements

Critical operations must be safe against double tap/retry.

Examples:

```text
complete booking
mark payment
create aftercare
submit public booking
```

Double submission must not produce duplicate core records.

---

# 72. Timezone

Organization has:

```text
timezone
```

Default initial target:

```text
Asia/Jakarta
```

All reminders and displayed dates follow organization timezone.

Store timestamps in UTC internally when backend is implemented.

---

# 73. Demo / Prototype Mode

Prototype must include development-only controls:

```text
Simulate +1 Day
Simulate +7 Days
Reset Demo
```

Use cases:

- test overdue
- test booking lifecycle
- test aftercare
- demonstrate Next Action Engine

These controls must not ship in production UI.

---

# 74. Dummy Data Requirements

Prototype should include realistic dataset such as:

### Ayu Rahma

```text
Interest: Parenting
Source: Instagram
Stage: FOLLOW_UP
Issue: jadwal weekend
Status: overdue
```

### Dimas Prakoso

```text
Interest: Tes Personal
Stage: BOOKED
DP: unpaid
```

### Reni Wulandari

```text
Stage: COMPLETED
Result: Thinking introvert
Aftercare: due
```

### Fajar Nugraha

```text
Source: TikTok
Stage: NEW
```

### Sari & Hendra

```text
Interest: Couple
Stage: INTERESTED
```

### Nadia Putri

```text
Stage: LOST
Lost reason: PRICE
```

### Arief Santoso

```text
Interest: Family
Booking: today
DP: paid
```

---

# 75. Future Expansion — Not V0.1

Once V0.1 proves retention, possible modules:

## Growth

- lead source analytics
- campaigns
- QR lead capture
- referral engine
- review request
- institutional pipeline

## Client Lifecycle

- private session opportunity
- family opportunity
- referral opportunity
- long-term lifecycle
- offer recommendation

## AI

- contextual message generation
- summary
- objection support
- next-best action recommendation

## Team / Branch

- multiple promoters
- lead assignment
- activity visibility
- promoter activation
- performance dashboard

## LMS

- courses
- programs
- enrollments
- lesson progress
- aftersales program
- lead magnet course
- learning-based next actions

---

# 76. Product Boundary with Official Assessment Software

PromotorFlow manages:

```text
lead
contact
booking
service status
business notes
follow-up
aftercare
```

Official assessment system manages:

```text
assessment execution
fingerprint
biometric processing
result generation
official assessment mechanics
```

PromotorFlow must not attempt to replace or duplicate that core process.

---

# 77. Technical Product Principle

Business logic should not live only inside UI components.

Core lifecycle and Next Action behavior must be implementable as domain/service logic.

Example separation:

```text
UI
↓
Application service
↓
Domain rules
↓
Persistence
```

This is important because future LMS and other surfaces may trigger the same domain rules.

---

# 78. Recommended Module Boundaries

```text
auth
organizations
contacts
services
bookings
next-actions
activities
messaging
public-booking
notifications
```

Future:

```text
learning
campaigns
referrals
institutions
billing
teams
```

---

# 79. API Design Principle

When backend is introduced:

- resource-oriented endpoints
- server-side authorization
- idempotent critical mutations
- event/activity recording server-side
- no client-trusted organization IDs
- pagination for contacts/activity
- filterable Today endpoint
- timezone-aware due calculations

---

# 80. Suggested API Surface — Future Backend

Illustrative only:

```text
POST   /contacts
GET    /contacts
GET    /contacts/:id
PATCH  /contacts/:id

POST   /contacts/:id/follow-ups
POST   /contacts/:id/stage

GET    /today

POST   /bookings
GET    /bookings
GET    /bookings/:id
PATCH  /bookings/:id
POST   /bookings/:id/complete
POST   /bookings/:id/mark-paid

POST   /next-actions/:id/complete

GET    /contacts/:id/activities

GET    /public/:slug
POST   /public/:slug/bookings
```

Do not treat this section as locked implementation architecture.

---

# 81. Rollout Plan

## Stage 0

Clickable prototype.

Validate:

- information architecture
- Today
- contact detail
- WhatsApp flow
- booking
- aftercare

---

## Stage 1

Functional MVP with persistence/auth.

Pilot:

```text
5–10 promoters
```

---

## Stage 2

Fix friction and retention issues.

Do not add large modules until basic workflow is habitual.

---

## Stage 3

Paid pilot.

Possible hypothesis:

```text
Rp49k–99k / month
```

Pricing is experimental, not locked.

---

# 82. Go / No-Go Signals

## Strong Go

- users open Today repeatedly
- contacts continue being added after first week
- users complete next actions
- users trust activity history
- WhatsApp launcher becomes normal workflow
- aftercare is used
- users ask for more lifecycle features

---

## Warning

- users only use booking page
- contacts stop being added
- users still use spreadsheet for status
- users ignore Today
- reminders feel noisy
- adding contacts feels like admin work

---

## No-Go / Pivot Signal

- users do not perceive forgotten follow-up as meaningful problem
- users refuse to maintain contact state
- users prefer manual WhatsApp labels entirely
- weekly retention remains poor despite UX fixes

---

# 83. Final Product Definition

PromotorFlow V0.1 is:

> **A mobile-first business assistant that turns customer relationships into a clear sequence of next actions—from first inquiry, to follow-up, to booking, completion, and aftercare.**

PromotorFlow is not:

> a generic CRM with STIFIn branding.

The product succeeds when a promoter opens it and immediately knows:

> **“Siapa yang harus saya hubungi sekarang?”**

---

# 84. Source of Truth Hierarchy

When implementation decisions conflict, follow this order:

1. `PRD.md` — product behavior and scope
2. `promotorflow_design_plan.md` — UI/UX and visual rules
3. domain/data model
4. implementation-specific task documents
5. coding-agent assumptions

Coding agents must not invent new product behavior that conflicts with this PRD.

If something is not specified:

> choose the smallest implementation that preserves the core product loop.
