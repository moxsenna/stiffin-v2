# PromotorClass — Design Plan
## Anti-AI-Slop UI/UX Specification

**Version:** 0.1  
**Status:** Design direction locked for prototype redesign  
**Product:** PromotorClass  
**Design direction:** Quiet Utility  
**Primary surfaces:** Promotor/admin app + learner experience  
**Companion product:** PromotorFlow

---

# 1. Purpose

Dokumen ini menjadi acuan desain utama untuk PromotorClass agar implementasi UI/UX:

- tidak terlihat seperti dashboard SaaS generik hasil AI,
- tidak bergantung pada gradient, glassmorphism, kartu berlebihan, atau dekorasi kosong,
- terasa seperti produk yang sengaja dirancang untuk workflow promotor,
- tetap nyaman digunakan dari mobile,
- memiliki hierarchy yang jelas,
- membedakan visual language antara **promotor workspace** dan **learner experience**,
- menjaga integrasi dengan PromotorFlow tetap kontekstual dan tidak tumpang tindih.

Dokumen ini bukan sekadar moodboard. Semua coding agent dan design agent harus memperlakukan aturan di bawah sebagai **implementation constraints**.

---

# 2. Core Design Direction

## Quiet Utility

PromotorClass harus terasa:

- tenang,
- profesional,
- jelas,
- padat tetapi tidak sesak,
- content-first,
- action-oriented,
- minim dekorasi,
- cepat dipindai,
- terasa seperti software kerja yang matang.

Prinsip utama:

> Structure should be felt, not constantly drawn.

Hierarchy harus muncul terutama melalui:

1. typography,
2. spacing,
3. alignment,
4. grouping,
5. separators,
6. density,
7. context.

Bukan melalui:

- card di setiap section,
- border berlebihan,
- shadow,
- gradient,
- pill,
- warna dekoratif.

---

# 3. Product Personality

PromotorClass bukan:

- LMS sekolah,
- corporate training suite,
- creator-course marketplace,
- social community app,
- AI dashboard,
- marketing automation dashboard.

PromotorClass adalah:

> Client Education OS yang membantu promotor mendidik lead/klien dan mengubah learning behavior menjadi business signal yang actionable.

Karakter visual:

- restrained,
- warm-neutral,
- trustworthy,
- modern tanpa fashionable gimmick,
- pragmatic,
- human,
- precise.

---

# 4. Design References — Principles Only

Referensi boleh dipakai sebagai **prinsip**, bukan untuk cloning visual.

## Linear

Ambil:

- visual restraint,
- low-noise sidebar,
- compact density,
- subtle separators,
- strong hierarchy,
- contextual controls,
- minim icon yang tidak penting.

Jangan copy:

- brand language,
- warna,
- command-heavy workflow yang tidak relevan.

---

## Maven

Ambil:

- syllabus hierarchy,
- learning sequence yang jelas,
- student context yang muncul saat dibutuhkan,
- information layering yang tepat.

Jangan copy:

- course marketplace behavior,
- cohort-specific mechanics jika tidak diperlukan.

---

## Circle

Ambil:

- content/member context yang konsisten,
- continuity antara learning dan member profile,
- navigation yang tidak terasa enterprise.

Jangan copy:

- community feed,
- social features,
- creator-brand visual style.

---

## Atlassian Design System

Ambil:

- spacing discipline,
- typography hierarchy,
- tokenized component behavior,
- accessibility thinking,
- predictable component states.

Jangan copy:

- enterprise visual density secara penuh.

---

# 5. Anti-AI-Slop Rules — Hard Constraints

Coding agent **dilarang** melakukan hal-hal berikut kecuali ada justifikasi eksplisit di task.

## Visual

1. No decorative gradient.
2. No glassmorphism.
3. No glow effect.
4. No giant border radius.
5. No rounded card for every content group.
6. No floating cards inside floating cards.
7. No decorative illustration untuk mengisi ruang kosong.
8. No hero dashboard dengan empat KPI cards generik.
9. No random accent colors.
10. No large shadow untuk static content.

## Components

11. No pill untuk setiap metadata.
12. No emoji sebagai system icon.
13. No icon pada semua navigation item secara default.
14. No primary button untuk semua action.
15. No modal untuk workflow yang seharusnya menjadi full-page editor.
16. No wizard multi-step hanya karena terlihat "modern".
17. No oversized cover image pada halaman admin jika gambar bukan informasi utama.
18. No chart jika data lebih mudah dibaca sebagai angka atau list.

## Copy

19. Hindari copy AI-generik seperti:
   - "Unlock your potential"
   - "Transform your learning journey"
   - "Empower your growth"
   - "Take your experience to the next level"
   - "Selamat datang di perjalanan belajar Anda"
   - "Mari mulai perjalanan Anda"

20. Copy harus konkret dan berhubungan langsung dengan action.

Contoh:

Buruk:

> Tingkatkan perjalanan belajar peserta Anda.

Baik:

> 12 peserta berhenti belajar lebih dari 7 hari.

---

# 6. Color System

Gunakan color palette sangat terbatas.

```text
Canvas       #F7F7F5
Surface      #FFFFFF
Surface Soft #F2F2EF

Text         #20211F
Text Muted   #73756F
Text Faint   #9A9C97

Border       #E5E5E1
Border Dark  #D7D8D3

Accent       #286344
Accent Soft  #E7EFEA

Danger       #A33A32
Warning      #94662F

Focus Ring   rgba(40, 99, 68, 0.20)
```

## Rules

Accent hanya digunakan untuk:

- primary action,
- selected state,
- active progress,
- active navigation,
- focus state,
- link penting.

Jangan gunakan accent untuk:

- semua heading,
- semua icon,
- semua badge,
- background besar.

---

# 7. Typography

Gunakan system font stack dulu.

```css
font-family:
  -apple-system,
  BlinkMacSystemFont,
  "Segoe UI",
  Roboto,
  Helvetica,
  Arial,
  sans-serif;
```

## Font weights

```text
400 — body
500 — UI emphasis
600 — headings / strong actions
```

Gunakan 700 hanya jika benar-benar diperlukan.

Hindari 800/900.

---

## Type scale — Promotor/Admin

```text
12px  metadata / timestamp
13px  secondary UI
14px  default interface
16px  emphasized body
20px  section heading
28px  page title
```

---

## Type scale — Learner

```text
13px  metadata
16px  body minimum
18px  reading body optional
20px  subsection heading
28px  lesson title mobile
36px  lesson title desktop maximum
```

---

## Reading width

Untuk lesson/article:

```text
max-width: 680–740px
```

Jangan membiarkan paragraph membentang seluruh desktop.

---

# 8. Spacing System

Gunakan spacing tokens berikut saja:

```text
4
8
12
16
24
32
48
64
```

Hindari spacing random seperti:

```text
13
17
19
22
27
```

## Density

### Admin workspace

Lebih compact.

Typical row:

```text
44–52px
```

### Learner content

Lebih lapang.

Section spacing:

```text
24–48px
```

---

# 9. Border Radius

```text
Button       6px
Input        6px
Popover      8px
Dropdown     8px
Side panel   8px
Modal        10px
Content card 8px max
```

List row:

```text
0px
```

Page section:

```text
0px
```

Tidak ada radius 18–32px kecuali ada kebutuhan khusus yang sangat jelas.

---

# 10. Shadows

Default:

```text
none
```

Shadow hanya diizinkan untuk:

- dropdown,
- popover,
- command menu,
- floating side panel,
- modal,
- tooltip.

Static content tidak memakai shadow.

---

# 11. Borders and Separators

Gunakan border untuk membantu scanning, bukan membungkus semuanya.

Prioritas:

```text
content
separator
content
separator
```

daripada:

```text
card
card
card
card
```

Default separator:

```css
border-color: #E5E5E1;
```

---

# 12. Icons

Gunakan icon style sederhana, line-based.

Ideal:

- Lucide-style,
- 14–16px.

Aturan:

- icon hanya jika membantu recognizability,
- jangan pasang icon pada setiap menu,
- jangan gunakan icon dekoratif,
- jangan gunakan emoji sebagai icon sistem.

Contoh status:

Buruk:

```text
🔥 HOT
⚠️ AT RISK
✅ COMPLETE
```

Baik:

```text
Hot
At risk
Completed
```

Jika perlu indikator:

```text
● Hot
● At risk
```

---

# 13. Badge and Pill Usage

Pill hanya untuk bounded state.

Boleh:

```text
Draft
Published
Archived
Private
```

Jangan otomatis membuat pill untuk:

```text
Instagram
Parenting
Hot
100%
Lead Magnet
Today
7 lessons
```

Metadata normal harus tampil sebagai text.

---

# 14. Button Hierarchy

## Primary button

Maksimal satu dominant primary action pada satu region.

Contoh:

```text
New program
Publish
Save changes
Complete lesson
```

## Secondary

Gunakan subtle button.

Contoh:

```text
Preview
Duplicate
Cancel
```

## Tertiary

Gunakan text link/action.

Contoh:

```text
Follow up →
Open in PromotorFlow ↗
View learner
```

Hindari:

```text
[Detail] [Follow Up] [Open] [Edit]
```

semuanya dalam bentuk button yang sama.

---

# 15. Navigation Architecture

## Promotor/Admin

Desktop sidebar:

```text
PromotorClass

Home

Programs
Learners
Activity

────────────

Templates

PromotorFlow ↗
```

Settings masuk ke account menu.

Jangan buat:

```text
Home
Programs
Learners
Activity
Analytics
Templates
Media
Branding
Integrations
Settings
Help
Notifications
...
```

Navigation harus tetap pendek.

---

## Mobile Promotor

Bottom navigation:

```text
Home
Programs
Learners
Activity
More
```

`More` membuka:

```text
Templates
PromotorFlow
Settings
Account
```

---

# 16. Promotor Home

Nama halaman:

```text
Home
```

Bukan:

```text
Dashboard
Analytics Dashboard
Overview Dashboard
```

Tujuan Home:

> menunjukkan learner dan aktivitas yang membutuhkan perhatian.

Home bukan tempat semua metrics.

---

## Recommended layout

```text
Home

Needs attention                                      4

Ayu Rahma
Completed 7 Hari Mengenal Cara Belajar Anak
2 hours ago · 100% complete

Reflection
"Kalau sudah main HP, anak saya sulit berhenti..."

Next step
Follow up about child assessment.               Follow up →


────────────────────────────────────────────────────


Nina Wulandari
Reached 86% of Parenting Mini Class
3 hours ago

Next step
Personal check-in.                              Check in →


────────────────────────────────────────────────────


Nadia Putri
No activity for 7 days

Recommended
Send a light reminder.                           Remind →



Recent activity

03:01  Ayu completed Action Plan
02:57  Ayu completed Day 6
00:23  Nina completed Day 5
```

---

## Summary metrics

Jika diperlukan, gunakan satu line:

```text
174 active learners · 32 new this month · 67% average completion
```

Bukan empat KPI cards.

---

# 17. Programs Page

Gunakan list/table sebagai primary admin view.

Desktop:

```text
Programs                                      New program

Name                                  Type           Learners   Status

7 Hari Mengenal Cara Belajar Anak     Lead magnet       84      Published
30 Hari Setelah Tes                   Aftersales        31      Published
Parenting Growth Program              Paid              —       Draft
Potensi Remaja                        Private           17      Published
```

Mobile:

stacked rows.

Course image tidak menjadi fokus utama di admin.

---

# 18. Program Detail

Tabs:

```text
Content
Learners
Analytics
Settings
```

Optional:

```text
Landing page
```

hanya jika feature sudah tersedia.

---

# 19. Curriculum Builder

Ini salah satu screen paling penting.

Gunakan hierarchy/timeline.

```text
7 Hari Mengenal Cara Belajar Anak

Content    Learners    Analytics    Settings


Introduction

01  Selamat datang                               Video
    04 min


Day 1 — Memahami masalah

02  Anak bukan tidak mau belajar                 Video
    08 min

03  Apa tantangan terbesar Anda?                 Reflection


Day 2 — Mengenali pola

04  Mengenali pola belajar anak                  Article
    6 min read


                                              + Add lesson
```

Rules:

- no nested cards,
- section heading jelas,
- lesson row horizontal,
- controls muncul on hover / selected state,
- drag handle tidak harus selalu visible,
- lesson type sebagai metadata text kecil.

---

# 20. Create Program

Jangan gunakan multi-step wizard jika tidak diperlukan.

Flow:

```text
Programs / New

Create a program

Program name
[........................................]

Type
○ Lead magnet
○ Aftersales
○ Paid
○ Private

Description
[........................................]

                                     Create program
```

Setelah create:

langsung masuk curriculum builder.

Gunakan progressive disclosure.

---

# 21. Lesson Editor

Lesson editor harus content-first.

Layout desktop:

```text
← Content

Mengenali pola belajar anak

────────────────────────────────────

Video
[ video preview ]

Body

Setiap anak menunjukkan pola belajar...

...

Resources

Worksheet.pdf                        Remove

────────────────────────────────────

Completion

○ After video ends
● Learner marks complete
```

Optional right property panel:

```text
Type
Visibility
Duration
CTA
```

Jangan gunakan modal editor.

---

# 22. Learners Page

Primary view:

```text
Learners

Name               Program                Progress       Intent       Last activity

Ayu Rahma          Parenting Mini Class   100%           Hot          2h
Nina Wulandari     Parenting Mini Class    86%           Hot          3h
Dimas Pratama      30 Hari Setelah Tes    100%           Warm         1d
Nadia Putri        Parenting Mini Class    21%           At risk      7d
```

No profile card grid.

---

# 23. Learner Detail

Klik learner membuka **side panel**, bukan giant modal.

Desktop:

```text
Learners                         │ Ayu Rahma
                                 │
Ayu Rahma                        │ Instagram · Parenting
Nina Wulandari                   │ Interested
Dimas Pratama                    │
Nadia Putri                      │ Learning
                                 │
                                 │ Parenting Mini Class
                                 │ 100%
                                 │ Completed Aug 11
                                 │
                                 │ Reflection
                                 │
                                 │ "Kalau sudah main HP..."
                                 │
                                 │ Next step
                                 │ Follow up about child assessment
                                 │
                                 │ Follow up →
                                 │ Open in PromotorFlow ↗
```

Mobile:

full-screen detail page.

---

# 24. Learning Signal — Signature Pattern

PromotorClass harus punya visual grammar yang khas:

## Learning timeline

```text
Aug 11    Completed course
          │
Aug 11    Reflection submitted
          │
Aug 10    Reached 80%
          │
Aug 10    Enrolled
```

Di bawahnya:

```text
Next step

Follow up about child assessment.

Based on:
Course completed
Reflection submitted
CTA clicked

Follow up →
```

Ini menjadi signature interaction PromotorClass.

---

# 25. Activity Page

Activity bukan social feed.

Gunakan compact event timeline.

```text
Today

03:01   Ayu completed Action Plan
02:57   Ayu completed Day 6
02:44   Ayu submitted a reflection
00:23   Nina completed Day 5


Yesterday

21:17   Dimas opened Private Session
20:08   Nadia became inactive
18:42   Fani enrolled
```

Tidak perlu avatar untuk setiap event.

---

# 26. Analytics

Analytics hanya muncul di konteks program.

Jangan memenuhi Home dengan graph.

Contoh:

```text
7 Hari Mengenal Cara Belajar Anak

84 enrolled
76 started
44 completed
15 CTA clicks


Enrollment funnel

84         76          62          44         15
Enroll → Started → 50% reached → Done → CTA
```

Jika chart tidak memberi insight tambahan, jangan pakai chart.

---

# 27. Templates

Templates boleh menggunakan sedikit visual preview.

Tetapi jangan seperti marketplace penuh card warna-warni.

Desktop:

```text
Templates

Lead magnets

7 Hari Kenali Cara Belajar Anak
7 lessons · 2 reflection · CTA consultation
Use template →

7 Hari Memahami Potensi Remaja
7 lessons · 1 worksheet
Use template →
```

---

# 28. Learner Experience — Separate Visual Language

Learner UI harus terasa berbeda dari admin.

## Learner properties

- lebih editorial,
- whitespace lebih besar,
- reading width sempit,
- body font lebih besar,
- minim interface chrome,
- fokus ke lesson.

Jangan recycle card-heavy admin components.

---

# 29. Learner Home

Contoh:

```text
Bu Rina

Programs


Continue learning

7 Hari Mengenal Cara Belajar Anak

Day 6 of 7
Membuat Rutinitas Belajar yang Lebih Ringan

────────────── 74%

Continue →



Your programs

30 Hari Parenting Growth
Not started
```

Tidak perlu greeting besar.

Tidak perlu hero gradient.

Tidak perlu course cards besar.

---

# 30. Lesson Reader

Max width:

```text
680–740px
```

Contoh:

```text
← Course

DAY 6 OF 7

Membuat Rutinitas Belajar
yang Lebih Ringan

6 min


[ VIDEO ]


Tidak semua anak membutuhkan rutinitas
yang sama

Tujuan rutinitas bukan membuat anak mengikuti
jadwal secara kaku...

...


Reflection

Apa yang biasanya paling memicu konflik ketika
waktu belajar tiba?

[                                             ]
[                                             ]


Previous                              Complete →
```

---

# 31. Learner Progress

Progress tidak perlu dominan.

Gunakan:

```text
Day 6 of 7
```

atau:

thin progress line.

Jangan ada giant progress ring.

---

# 32. Reflection

Reflection harus terasa bagian dari lesson.

Jangan selalu dimasukkan ke card berwarna.

Contoh:

```text
Reflection

Apa yang biasanya paling memicu konflik ketika
waktu belajar tiba?

[................................................]
[................................................]

Save response
```

---

# 33. Completion

Completion screen:

```text
Program completed

7 Hari Mengenal Cara Belajar Anak

7 of 7 lessons completed


Next

If you'd like to discuss your child's learning pattern,
you can contact Bu Rina.

Contact Bu Rina →
```

Hindari confetti besar kecuali sekali dan sangat subtle.

---


# 33A. Video Player Direction — YouTube Unlisted

V0.1 menggunakan **YouTube Unlisted** sebagai satu-satunya provider video materi.

## UX Principle

YouTube hanya berfungsi sebagai playback engine di dalam learner experience.

PromotorClass tetap mengendalikan:

- layout lesson,
- typography,
- spacing,
- context,
- reflection,
- resource,
- completion,
- next step.

YouTube mengendalikan bagian player yang memang menjadi bagian dari official embed.

## Allowed

```text
✓ YouTube Unlisted URL
✓ Official YouTube embed
✓ Responsive 16:9 player
✓ Clean surrounding layout
✓ Manual lesson completion
✓ Preview player di Lesson Editor
```

## Not Allowed

```text
✗ Menutupi logo/branding YouTube dengan overlay
✗ Cropping player untuk menyembunyikan UI YouTube
✗ Fake/custom controls yang menutupi official player
✗ Mencoba membuat YouTube terlihat sebagai white-label player
✗ Mengandalkan deprecated modestbranding parameter
```

## Player Presentation

Player harus tampil sederhana:

```text
Lesson title
Metadata

[ YouTube embedded player ]

Lesson content
Reflection
Resources

Complete lesson
```

Jangan tambahkan:

- decorative frame,
- gradient container,
- floating card,
- custom fake player chrome.

## Completion

Untuk V0.1:

```text
completion_rule = manual
```

Learner menekan:

```text
Complete lesson
```

Jangan membuat progress lesson bergantung pada watch percentage atau YouTube playback event di V0.1.

## Future Provider Abstraction

UI lesson tidak boleh hard-coded secara visual hanya untuk YouTube.

Gunakan konsep:

```text
video_provider
video_external_id
video_url
```

agar provider white-label dapat ditambahkan di masa depan tanpa redesign lesson experience.

---

# 34. Empty States

Copy harus concrete.

Programs:

```text
No programs yet

Create a program to start enrolling learners.

Create program
```

Learners:

```text
No learners yet

Share your program link or enroll an existing client.
```

Activity:

```text
No activity yet

Learner activity will appear here.
```

No illustrations diperlukan.

---

# 35. Loading States

Gunakan skeleton yang mengikuti layout nyata.

Jangan:

- spinner besar di tengah,
- loading animation dekoratif.

---

# 36. Error States

Contoh:

```text
We couldn't load this program.

Try again
```

Jika destructive:

```text
Changes couldn't be saved.
Your draft is still available locally.

Retry
```

---

# 37. Mobile Rules

Mobile bukan desktop yang dipersempit.

## Admin mobile

- single column,
- compact list,
- bottom nav,
- side panel berubah jadi full page,
- action menu menggunakan bottom sheet,
- table berubah jadi rows.

## Learner mobile

- reading width full minus 20–24px padding,
- sticky bottom next/complete control jika relevan,
- video full width,
- no sidebar.

---

# 38. Interaction Motion

Gunakan:

```text
150–180ms
```

Untuk:

- hover,
- selected state,
- panel open,
- dropdown,
- accordion.

Hindari:

- bouncing,
- spring berlebihan,
- scale-up cards,
- parallax,
- gradient animation.

---

# 39. Hover States

Admin desktop perlu hover subtle:

```text
row background:
#FAFAF8
```

Controls seperti:

```text
⋯
Edit
Follow up
```

boleh muncul pada hover.

---

# 40. Focus States

Semua keyboard-focusable element wajib punya visible focus ring.

Contoh:

```css
outline: 2px solid rgba(40,99,68,.30);
outline-offset: 2px;
```

---

# 41. Accessibility

Target minimum:

- WCAG AA color contrast,
- keyboard accessible,
- visible focus,
- semantic heading structure,
- button vs link semantic benar,
- form labels selalu tersedia,
- icon-only actions memiliki aria-label,
- progress tidak hanya dibedakan lewat warna.

---

# 42. PromotorFlow Integration UI

PromotorClass tidak meniru seluruh PromotorFlow.

Tampilkan hanya data yang relevan:

```text
PromotorFlow

Stage
Interested

Next action
Follow up about child assessment.

Open in PromotorFlow ↗
```

Jangan membuat pipeline editor di PromotorClass.

---

# 43. Human-in-the-Loop Follow-up

PromotorClass boleh memberikan recommendation.

Contoh:

```text
Next step

Follow up about child assessment.

Follow up →
```

Klik membuka:

```text
Suggested message

[editable textarea]

Open WhatsApp →
```

Tidak auto-send.

---

# 44. AI Use in UI

AI bukan visual centerpiece.

Jangan ada:

```text
✨ AI POWERED
Ask AI
Generate with AI
AI Insight
```

di semua tempat.

Jika AI membantu:

```text
Suggested next step
```

atau:

```text
Draft message
```

lebih baik.

AI harus terasa sebagai underlying capability, bukan branding gimmick.

---

# 45. Information Priority Framework

Setiap screen harus menentukan:

## Level 1 — Primary task

Apa yang user harus lakukan?

## Level 2 — Context

Data apa yang membantu keputusan?

## Level 3 — Metadata

Detail apa yang bisa dibuat secondary?

## Level 4 — Advanced

Apa yang hanya muncul jika dibutuhkan?

Jika semuanya terlihat sama penting, screen dianggap gagal.

---

# 46. Home Priority

Primary:

```text
Needs attention
```

Secondary:

```text
Recent activity
```

Tertiary:

```text
summary metrics
```

Jangan dibalik.

---

# 47. Program Priority

Primary:

```text
Curriculum / content
```

Secondary:

```text
learners
```

Tertiary:

```text
analytics
```

Settings:

contextual.

---

# 48. Learner Priority

Primary:

```text
content
```

Secondary:

```text
progress
```

Tertiary:

```text
recommendation
```

Jangan membuat progress lebih dominan daripada materi belajar.

---

# 49. Component Inventory — V0.1

Coding agent hanya perlu membangun komponen berikut terlebih dahulu.

## Foundation

- AppShell
- Sidebar
- MobileBottomNav
- TopBar
- PageHeader
- SectionHeader
- Divider
- Stack
- Inline
- Container

## Controls

- Button
- IconButton
- TextLink
- Input
- Textarea
- Select
- RadioGroup
- Checkbox
- Switch
- DropdownMenu

## Data

- DataRow
- LearnerRow
- ProgramRow
- ActivityRow
- StatusText
- ProgressBar
- Timeline
- EmptyState

## Overlay

- SidePanel
- Modal
- Popover
- BottomSheet
- Tooltip

## Learning

- CurriculumSection
- LessonRow
- LessonEditor
- ReflectionBlock
- ResourceRow
- LearnerProgress
- NextStepBlock
- LearningSignalTimeline

---

# 50. Components Explicitly Not Needed Yet

Do not create:

- generic DashboardCard,
- StatCard,
- GradientCard,
- FeatureCard,
- GlassCard,
- AIInsightCard,
- giant MetricWidget library.

Jika component bernama `Card` muncul terlalu sering dalam implementation, review struktur UI.

---

# 51. Screen Inventory — Revised Prototype

## Promotor

1. Home
2. Programs
3. New Program
4. Program Content
5. Lesson Editor
6. Program Learners
7. Program Analytics
8. Program Settings
9. Learners
10. Learner Side Panel
11. Activity
12. Templates
13. Account / Settings
14. Follow-up Draft

## Learner

15. Program Landing / Registration
16. Learner Home
17. Program Overview
18. Lesson Reader
19. Reflection State
20. Completion State

Total target:

```text
20 core screens/states
```

---

# 52. Prototype Demo Story

Clickable prototype harus menunjukkan satu narrative yang jelas.

## Scenario

### 1. Promotor opens Home

Melihat:

```text
Ayu Rahma
Completed program
Next step: Follow up
```

### 2. Click Ayu

Side panel terbuka.

Lihat:

- learning timeline,
- reflection,
- progress,
- PromotorFlow stage.

### 3. Click Follow up

Draft pesan terbuka.

### 4. Open Programs

Lihat program list.

### 5. Open Parenting Mini Class

Lihat curriculum hierarchy.

### 6. Open lesson

Masuk editor.

### 7. Switch to learner preview

Lihat lesson experience yang jauh lebih editorial.

### 8. Complete lesson

Program selesai.

### 9. Return to Promotor

Learning signal menjadi Next Action.

Prototype harus membuat hubungan:

```text
Learning → Signal → Next Action
```

terasa jelas tanpa penjelasan panjang.

---

# 53. Dummy Data Design Rules

Dummy data harus:

- realistis,
- konsisten antar layar,
- memakai tanggal yang masuk akal,
- menunjukkan variasi behavior,
- tidak terasa seperti lorem ipsum.

Primary dummy users:

```text
Ayu Rahma
Nina Wulandari
Dimas Pratama
Nadia Putri
Hendra Saputra
```

Program:

```text
7 Hari Mengenal Cara Belajar Anak
30 Hari Setelah Tes
Parenting Growth Program
7 Hari Memahami Potensi Remaja
```

---

# 54. Copy Style

Gunakan bahasa sederhana.

Admin:

```text
Needs attention
Recent activity
Next step
No activity for 7 days
Completed 2 hours ago
```

Learner:

```text
Continue
Complete lesson
Reflection
Your programs
Next
```

Jika UI menggunakan Indonesia penuh:

```text
Perlu ditindaklanjuti
Aktivitas terbaru
Langkah berikutnya
Tidak aktif selama 7 hari
Selesai 2 jam lalu
```

Jangan campur bahasa tanpa alasan.

---

# 55. Design Review Checklist

Sebelum screen dianggap selesai, review:

## Hierarchy

- [ ] Apakah primary task langsung jelas?
- [ ] Apakah heading terlalu banyak?
- [ ] Apakah metadata cukup secondary?
- [ ] Apakah semua area terasa sama penting?

## Layout

- [ ] Apakah ada card yang sebenarnya bisa menjadi section biasa?
- [ ] Apakah border digunakan terlalu banyak?
- [ ] Apakah whitespace konsisten?
- [ ] Apakah row/list lebih cocok daripada grid?

## Styling

- [ ] Tidak ada decorative gradient.
- [ ] Tidak ada glassmorphism.
- [ ] Radius maksimal mengikuti token.
- [ ] Static content tanpa shadow.
- [ ] Accent digunakan hemat.
- [ ] Emoji tidak digunakan sebagai UI icon.

## Components

- [ ] Pill hanya untuk bounded state.
- [ ] Primary button tidak berlebihan.
- [ ] Icon memiliki fungsi.
- [ ] Modal hanya digunakan jika benar-benar overlay task.

## Copy

- [ ] Tidak ada generic AI copy.
- [ ] Copy concrete.
- [ ] CTA menjelaskan action.
- [ ] Empty state tidak berbunga-bunga.

## Mobile

- [ ] Screen usable dari 360px.
- [ ] Table punya mobile alternative.
- [ ] Side panel berubah menjadi full page.
- [ ] Touch targets minimal 44px.

## Accessibility

- [ ] Keyboard navigation.
- [ ] Focus visible.
- [ ] Contrast AA.
- [ ] Form labels tersedia.
- [ ] Status tidak hanya bergantung pada warna.

---

# 56. AI-Slop Detection Checklist

Jika 3 atau lebih jawaban berikut adalah "ya", screen harus didesain ulang.

- Apakah ada 3+ rounded cards pada viewport pertama?
- Apakah ada gradient besar?
- Apakah ada greeting besar dengan emoji?
- Apakah ada 4 KPI boxes berjajar?
- Apakah hampir semua metadata berupa pill?
- Apakah terdapat icon pada setiap nav?
- Apakah banyak shadow dipakai untuk memberi hierarchy?
- Apakah semua CTA berupa filled buttons?
- Apakah whitespace terasa dekoratif bukan fungsional?
- Apakah screen bisa dengan mudah disebut "modern SaaS dashboard" tanpa tahu produknya?
- Apakah visual bisa dipakai untuk produk lain hanya dengan mengganti logo?
- Apakah produk kehilangan identitas "Learning Signal → Next Action"?

Jika ya:

> simplify.

---

# 57. Definition of Done — Design

Sebuah screen dianggap selesai ketika:

1. fungsi utama dapat dipahami dalam kurang dari 5–10 detik,
2. primary action jelas,
3. tidak ada elemen dekoratif tanpa fungsi,
4. information hierarchy kuat tanpa card berlebihan,
5. mobile behavior telah ditentukan,
6. loading/empty/error state tersedia,
7. keyboard/focus behavior tersedia,
8. copy sudah konkret,
9. integrasi PromotorFlow muncul hanya saat relevan,
10. desain masih terasa PromotorClass meski logo disembunyikan.

---

# 58. Final Design Principle

Setiap keputusan desain harus lolos pertanyaan:

> Apakah elemen ini membantu promotor memahami learner, mengambil keputusan, atau menjalankan action?

Jika tidak:

hapus.

Untuk learner:

> Apakah elemen ini membantu peserta memahami materi dan melanjutkan belajar?

Jika tidak:

hapus.

---

# 59. Product Signature

PromotorClass harus dikenali bukan karena:

- gradient,
- ilustrasi,
- warna,
- card style.

Tetapi karena pola produknya:

```text
Learning activity
      ↓
Learning signal
      ↓
Context
      ↓
Next step
      ↓
Human action
```

Visual signature utama:

```text
Learning Timeline
+
Next Step
```

Ini harus menjadi bagian paling khas dari desain.

---

# 60. Final Direction

Promotor/admin experience:

> compact, restrained, utility-first.

Learner experience:

> editorial, readable, calm.

PromotorFlow integration:

> contextual, actionable, secondary.

AI:

> invisible helper, not visual gimmick.

Overall:

> Quiet Utility.
