# PromotorClass — Product Requirements Document (PRD)
## V0.1

**Product:** PromotorClass  
**Version:** 0.1  
**Status:** Draft for implementation  
**Companion product:** PromotorFlow  
**Primary market:** Promotor / practitioner berbasis assessment, education, parenting, coaching, dan professional service  
**Initial beachhead:** Promotor STIFIn dan ekosistem sejenis  
**Primary platforms:** Responsive Web App / PWA  
**Design specification:** `PromotorClass_Design_Plan_Anti_AI_Slop.md`

---

# 1. Executive Summary

PromotorClass adalah **Client Education OS** yang membantu promotor mengubah pengetahuan mereka menjadi:

- lead magnet,
- program aftersales,
- program edukasi privat,
- program upsell,
- program berbayar.

PromotorClass bukan LMS generik.

Core value PromotorClass adalah menghubungkan:

```text
Learning Activity
      ↓
Learning Signal
      ↓
Business Context
      ↓
Next Action
      ↓
Human Follow-up
```

PromotorClass terintegrasi dengan PromotorFlow sehingga aktivitas belajar tidak berhenti sebagai metrik LMS seperti:

- views,
- watch time,
- completion percentage.

Sebaliknya, learning behavior diterjemahkan menjadi:

- lead intent,
- client context,
- recommended next step,
- follow-up opportunity,
- upsell opportunity,
- aftersales opportunity.

PromotorClass harus memungkinkan seorang promotor menjalankan program edukasi tanpa harus memahami LMS enterprise, automation builder, CRM, atau sistem marketing kompleks.

---

# 2. Problem Statement

Promotor dan professional service practitioner sering memiliki pengetahuan dan materi yang dapat digunakan untuk:

- edukasi calon pelanggan,
- meningkatkan conversion,
- menjelaskan layanan,
- mendampingi customer setelah pembelian,
- menjual layanan/program lanjutan.

Namun workflow tersebut biasanya tersebar di:

- WhatsApp,
- Google Drive,
- PDF,
- video,
- Zoom,
- Telegram,
- Instagram,
- notes,
- spreadsheet.

LMS generik menyelesaikan distribusi materi, tetapi tidak memahami hubungan bisnis antara:

```text
learner
lead
client
booking
assessment
follow-up
upsell
referral
```

Akibatnya:

1. promotor tidak tahu peserta mana yang memiliki intent tinggi,
2. aktivitas learner tidak menghasilkan follow-up yang actionable,
3. lead magnet berhenti di "orang sudah daftar",
4. aftersales tidak terstruktur,
5. customer lifecycle terputus,
6. promotor harus berpindah-pindah tool,
7. data learner dan data lead/client terpisah.

---

# 3. Product Vision

> Membantu promotor mengubah edukasi menjadi bagian aktif dari customer lifecycle.

Long-term vision:

```text
Discover
   ↓
Learn
   ↓
Engage
   ↓
Convert
   ↓
Deliver
   ↓
Upsell
   ↓
Retain
   ↓
Refer
```

PromotorClass menangani:

```text
Learn
Engage
Deliver
```

PromotorFlow menangani:

```text
Lead
Follow-up
Booking
Customer
Next Action
Opportunity
Referral
```

Keduanya menggunakan **shared contact identity**.

---

# 4. Product Principles

## 4.1 Learning is not the end goal

Completion bukan tujuan akhir.

Tujuan:

> aktivitas belajar membantu promotor memahami learner dan menentukan tindakan selanjutnya.

---

## 4.2 Human-in-the-loop

PromotorClass boleh:

- memberikan recommendation,
- membuat draft pesan,
- membuat Next Action.

PromotorClass tidak boleh secara default:

- mengirim WhatsApp otomatis,
- menghubungi learner tanpa action manusia,
- melakukan aggressive sales automation.

---

## 4.3 One contact, one identity

Learner di PromotorClass dan contact di PromotorFlow adalah entity yang sama.

Tidak boleh ada duplicate customer hanya karena seseorang enroll ke course.

---

## 4.4 Progressive complexity

V0.1 harus dapat digunakan oleh promotor non-teknis.

Hindari:

- workflow builder kompleks,
- CRM terminology berat,
- SCORM,
- LMS enterprise settings,
- nested configuration yang tidak perlu.

---

## 4.5 Content-first learner experience

Learner UI harus memprioritaskan materi belajar.

Promotor UI harus memprioritaskan action dan signal.

---

## 4.6 Privacy by design

PromotorClass tidak menyimpan fingerprint atau raw biometric data.

Data assessment yang disimpan di V0.1 hanya berupa business-level status/context jika memang diperlukan.

---

# 5. Goals

## Primary Goals

### G1

Promotor dapat membuat dan publish program tanpa bantuan teknis.

### G2

Learner dapat mendaftar dan belajar dengan friction minimal.

### G3

Promotor dapat melihat:

- siapa yang belajar,
- progress,
- reflection,
- engagement,
- intent signal.

### G4

Learning milestone dapat menghasilkan:

```text
Next Action
```

di PromotorFlow.

### G5

Promotor dapat menggunakan program untuk tiga use case utama:

- lead magnet,
- aftersales,
- upsell.

### G6

Satu learner/contact tetap konsisten di PromotorClass dan PromotorFlow.

---

# 6. Non-Goals V0.1

V0.1 tidak bertujuan menjadi:

- Moodle replacement,
- creator marketplace,
- community platform,
- webinar platform,
- native video hosting infrastructure,
- Zoom replacement,
- SCORM LMS,
- school LMS,
- student grading system,
- certification platform,
- complex marketing automation suite.

Explicitly out of scope:

- SCORM,
- live streaming,
- native Zoom integration,
- discussion forum,
- social community,
- gamification,
- badges,
- points,
- leaderboards,
- complex quizzes,
- exam proctoring,
- certificate designer,
- affiliate marketplace,
- template marketplace,
- creator revenue sharing,
- multi-branch controls,
- enterprise permission matrix,
- WhatsApp auto-send,
- native Android/iOS app,
- offline video download,
- AI full-course generator,
- AI autonomous sales agent,
- fingerprint storage,
- biometric processing.

---

# 7. Users

## 7.1 Promotor / Owner

Primary user.

Needs:

- membuat program,
- publish program,
- enroll learner,
- melihat progress,
- melihat reflection,
- melihat learner intent,
- melihat recommended next step,
- membuka learner di PromotorFlow,
- melakukan follow-up.

---

## 7.2 Learner

Can be:

- lead,
- existing client,
- aftersales customer,
- paid participant.

Needs:

- register,
- access program,
- continue lesson,
- complete lesson,
- submit reflection,
- download resource,
- see progress,
- contact promotor,
- move to next program.

---

## 7.3 Team Member

Not required in V0.1.

Future role.

---

# 8. Primary Use Cases

## UC1 — Free Lead Magnet

Example:

```text
Instagram
    ↓
Free Program Landing Page
    ↓
Register
    ↓
Contact created/matched
    ↓
Learner enrolled
    ↓
Learner progresses
    ↓
High intent detected
    ↓
Next Action in PromotorFlow
    ↓
Human follow-up
```

Example program:

> 7 Hari Mengenal Cara Belajar Anak

---

## UC2 — Aftersales Program

```text
Assessment / Service Completed
    ↓
PromotorFlow recommends enrollment
    ↓
Promotor enrolls client
    ↓
Client receives program
    ↓
Progress + reflections
    ↓
Program completion
    ↓
Next Action:
Offer Private Session
```

Example:

> 30 Hari Setelah Tes

---

## UC3 — Upsell Program

```text
Existing client
    ↓
Enroll in advanced program
    ↓
Course engagement
    ↓
CTA / completion
    ↓
Upsell signal
    ↓
Promotor follows up
```

---

## UC4 — Private Client Education

Promotor manually enrolls selected clients into a private program.

---

# 9. Product Information Architecture

## Promotor

```text
Home
Programs
Learners
Activity

Templates
PromotorFlow ↗

Account / Settings
```

---

## Learner

```text
Programs
Program Overview
Lesson
Completion
Profile
```

---

# 10. Promotor Home Requirements

## Purpose

Home is a **work queue**, not a generic analytics dashboard.

Primary section:

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

---

## Required Content

Each attention item must support:

```text
learner_name
program_name
learning_event
timestamp
business_context
recommended_next_step
action
```

Example:

```text
Ayu Rahma

Completed:
7 Hari Mengenal Cara Belajar Anak

2 hours ago · 100%

Reflection:
"Kalau sudah main HP, anak saya sulit berhenti..."

Next step:
Follow up about child assessment.

Follow up →
```

---

## Summary Metrics

Allowed:

```text
174 active · 32 new this month · 67% avg completion
```

Avoid KPI cards.

---

# 11. Programs Requirements

## Program List

Required columns/fields:

```text
name
type
learner_count
status
last_updated
```

Program types:

```text
lead_magnet
aftersales
paid
private
challenge
```

V0.1 UI may expose only:

```text
Lead Magnet
Aftersales
Paid
Private
```

---

## Program Status

```text
draft
published
archived
```

---

## Create Program

Required fields:

```text
name
type
description
instructor
```

Optional:

```text
cover_image
public_slug
```

After create:

> user enters Program Content editor.

Do not use unnecessary setup wizard.

---

# 12. Curriculum Requirements

Hierarchy:

```text
Program
  └ Module / Section
      └ Lesson
```

Example:

```text
Introduction

01 Selamat Datang

Day 1

02 Anak bukan tidak mau belajar
03 Reflection

Day 2

04 Mengenali pola belajar anak
```

---

## Lesson Types V0.1

```text
video
text
image
download
reflection
cta
```

A lesson may combine:

```text
video + text + download
```

Reflection and CTA may be specialized blocks.

---

# 13. Lesson Editor Requirements

Fields:

```text
lesson_title
lesson_type
body
video_url
resources
completion_rule
visibility
estimated_duration
```

Completion rules:

```text
manual
content_viewed
video_completed
```

V0.1 may default to:

```text
manual
```

---

## Resource

Supported:

```text
PDF
image
external link
downloadable file
```

---

# 14. Reflection Requirements

Promotor can add:

```text
question
input_type
options
required
```

V0.1 input types:

```text
long_text
single_select
multi_select
```

Reflection answer must be stored against:

```text
contact_id
program_id
lesson_id
```

Reflection may create:

```text
contact insight
```

visible in PromotorFlow.

---

# 15. CTA Requirements

CTA types V0.1:

```text
whatsapp
book_session
open_promotorflow_booking
external_link
enroll_program
```

CTA data:

```text
label
type
destination
```

CTA events:

```text
cta.viewed
cta.clicked
```

CTA click can influence intent score.

---

# 16. Access & Enrollment

Program access:

```text
public
private
existing_client
manual
```

V0.1 minimum:

```text
public
private
manual
```

---

## Registration

Default fields:

```text
name *
phone *
email
```

Optional configurable questions:

```text
child_age
main_problem
existing_client
custom_question
```

Default public lead magnet should minimize friction.

---

# 17. Contact Identity Matching

When a learner registers:

1. normalize phone,
2. search existing contact,
3. optionally check email,
4. if match:
   - reuse existing `contact_id`,
5. if no match:
   - create new contact.

Phone should be primary initial matching key.

System must avoid creating duplicates whenever confidently matchable.

---

# 18. Learner Authentication

Preferred V0.1:

```text
magic link
```

Alternative future:

```text
OTP WhatsApp
OTP email
passwordless account
```

For public prototype/demo:

session-based access is acceptable.

---

# 19. Learner Home Requirements

Must show:

```text
Continue learning
Your programs
Recommended program (optional)
```

Priority:

```text
current lesson
progress context
continue action
```

Do not show analytics or gamification.

---

# 20. Lesson Reader Requirements

Must include:

```text
program context
lesson title
content
resources
reflection if applicable
completion action
previous/next navigation
```

Recommended content width:

```text
680–740px desktop
```

Mobile:

single column.

---

# 21. Progress Requirements

Track:

```text
enrolled
started
lesson completed
program progress %
completed
```

Program completion occurs when required lessons are completed.

---

# 22. Learners Page

Promotor must see:

```text
name
program
progress
intent
last_activity
learning_status
```

Learning status:

```text
active
completed
inactive
at_risk
```

Intent:

```text
cold
warm
hot
```

These are separate concepts.

---

# 23. Learner Detail

Desktop:

> right side panel.

Mobile:

> full-screen detail.

Required sections:

```text
identity
source
PromotorFlow stage
programs
progress
reflection
learning timeline
intent
next step
PromotorFlow link
```

---

# 24. Learning Timeline

Events displayed chronologically.

Example:

```text
Aug 11  Program completed
Aug 11  Reflection submitted
Aug 10  Reached 80%
Aug 10  Lesson completed
Aug 10  Enrolled
```

Timeline is a signature PromotorClass pattern.

---

# 25. Intent Score

V0.1 uses transparent rule-based scoring.

Example:

```text
Enrollment              +10
First lesson completed  +10
50% reached             +20
80% reached             +20
Program completed       +20
CTA clicked             +20
```

Maximum:

```text
100
```

Suggested labels:

```text
0–39   Cold
40–69  Warm
70–100 Hot
```

Final thresholds may be configurable later.

---

# 26. Next Step Engine

V0.1 uses deterministic rules.

Example:

```text
IF
program_type = lead_magnet
AND progress >= 80
AND contact.assessment_status != completed

THEN
recommended_next_step =
"Follow up about assessment"
```

Example:

```text
IF
program_type = aftersales
AND program_completed = true
AND private_session_status = none

THEN
recommended_next_step =
"Offer Private Session"
```

Example:

```text
IF
no_activity_days >= 7
AND progress < 50

THEN
recommended_next_step =
"Send friendly reminder"
```

The system must display:

```text
recommendation
reason
```

Recommendation must not appear as unexplained AI magic.

---

# 27. Automation V0.1

No visual workflow builder.

Use program-level toggles / predefined rules.

Supported:

```text
on enrollment
on 50% progress
on 80% progress
on completion
on CTA click
on inactivity
```

Actions:

```text
mark engaged
update intent
create Next Action
create activity
create tag
```

Not supported:

```text
auto-send WhatsApp
complex branching
delays with visual workflow
webhook builder
```

---

# 28. PromotorFlow Integration

PromotorClass should integrate through a shared platform/domain model where possible.

Shared:

```text
organization
user
contact
tags
events
billing
```

PromotorFlow owns:

```text
lead
pipeline
booking
next_action
opportunity
assessment_status
referral
```

PromotorClass owns:

```text
program
module
lesson
enrollment
progress
reflection
learning_activity
```

---

# 29. Cross-App Actions

PromotorClass may:

```text
read contact
read lead stage
read assessment status
create next action
append learning event
append insight
update intent signal
```

PromotorClass should not:

```text
edit full sales pipeline
manage payment
replace PromotorFlow lead management
```

---

# 30. Event Model

Shared event bus / internal event log should support:

```text
program.created
program.published

learner.registered
learner.enrolled

lesson.started
lesson.completed

program.progress_50
program.progress_80
program.completed

reflection.submitted

cta.viewed
cta.clicked

learner.inactive

next_action.created
```

Each event should include:

```text
event_id
organization_id
contact_id
actor_id
program_id
lesson_id (optional)
event_type
payload
created_at
```

---

# 31. Core Data Model

## organization

```text
id
name
slug
created_at
```

---

## user

```text
id
organization_id
name
email
phone
role
created_at
```

---

## contact

```text
id
organization_id
name
phone
email
source
created_at
updated_at
```

---

## program

```text
id
organization_id
title
slug
description
type
status
access_type
instructor_user_id
cover_asset_id
created_at
updated_at
published_at
```

---

## module

```text
id
program_id
title
position
release_rule
created_at
```

---

## lesson

```text
id
module_id
title
type
body
video_url
estimated_duration
completion_rule
position
is_required
created_at
updated_at
```

---

## lesson_resource

```text
id
lesson_id
type
title
asset_url
position
```

---

## reflection_question

```text
id
lesson_id
question
input_type
options_json
is_required
```

---

## enrollment

```text
id
program_id
contact_id
status
progress_percent
intent_score
learning_status
enrolled_at
started_at
completed_at
last_activity_at
```

---

## lesson_progress

```text
id
enrollment_id
lesson_id
status
started_at
completed_at
```

---

## reflection_response

```text
id
enrollment_id
lesson_id
question_id
response_json
submitted_at
```

---

## cta

```text
id
lesson_id
label
type
destination
```

---

## learning_event

```text
id
organization_id
contact_id
program_id
lesson_id
event_type
payload_json
created_at
```

---

## program_automation_rule

```text
id
program_id
trigger_type
action_type
action_config_json
enabled
```

---

# 32. Program Analytics

V0.1 metrics:

```text
enrolled
started
50% reached
80% reached
completed
CTA clicked
average progress
```

Funnel:

```text
Enrollment
→ Started
→ 50%
→ Completed
→ CTA
```

Do not add analytics that cannot drive decisions.

---

# 33. Promotor Home Signals

System should prioritize attention items based on:

```text
high intent
CTA click
program completion
reflection insight
inactivity
aftersales completion
```

Suggested priority:

```text
P1 CTA clicked
P1 program completed + sales opportunity
P1 high intent >= 80

P2 meaningful reflection
P2 progress >= 80

P3 inactivity
```

---

# 34. Notifications

V0.1 in-app notifications only.

Supported:

```text
new enrollment
program completed
hot learner
at-risk learner
CTA clicked
```

External push/email may come later.

---

# 35. Search

Promotor should be able to search:

```text
learner
program
```

Search may initially be simple client-side/server-side text matching.

---

# 36. Templates

V0.1 starter templates:

```text
7 Hari Mengenal Cara Belajar Anak
30 Hari Setelah Tes
14 Hari Komunikasi Orang Tua & Anak
7 Hari Memahami Potensi Remaja
Personal Development Journey
```

Template should copy:

```text
program structure
modules
lessons
CTA placeholders
reflection questions
automation presets
```

User must be able to edit all copied content.

---

# 37. Media Handling

V0.1 supported:

```text
image upload
PDF/document upload
external video URL
external link
```

Do not build custom video transcoding initially.

Prefer:

```text
YouTube unlisted
Vimeo
external hosted video
```

or compatible storage later.

---

# 38. Landing Page / Registration

Each public program receives:

```text
/{promotor-slug}/{program-slug}
```

Example:

```text
rina.promotorclass.id/belajar-anak
```

Required:

```text
program title
description
instructor
benefits
registration form
primary CTA
```

No full page builder V0.1.

Customization:

```text
logo
cover image
accent color
headline
description
```

---

# 39. Pricing / Commerce

Direct paid checkout is not required for V0.1.

`paid` program type may be manually enrolled.

Future:

```text
product
checkout
payment
subscription
```

Potential integration with shared payment system can be added later.

---

# 40. Privacy & Data Handling

Do not store:

```text
fingerprints
raw biometric scans
biometric templates
```

Do not replicate official assessment algorithm.

If assessment context is needed, store only business metadata such as:

```text
assessment_status
assessment_date
result_category (optional and permissioned)
```

Data protection requirements:

- encryption in transit,
- secure session,
- role-based organization isolation,
- contact deletion,
- export readiness,
- audit-ready event timestamps.

---

# 41. Security Requirements

Minimum:

- HTTPS,
- secure cookies,
- CSRF protection where applicable,
- input validation,
- authorization on every organization-scoped resource,
- file type/size validation,
- rate limiting registration/login,
- no secrets in client code,
- tenant isolation.

---

# 42. Performance Requirements

Target V0.1:

```text
mobile-first
```

Core pages should feel responsive on mid-range Android devices.

Targets:

- initial usable screen < 3 seconds on ordinary mobile connection where practical,
- avoid heavy chart libraries,
- lazy-load media,
- do not load all learner data at once,
- use pagination/infinite loading for large lists.

---

# 43. Responsive Requirements

Supported minimum viewport:

```text
360px
```

Promotor desktop:

```text
1024px+
```

Behavior:

- table → stacked rows on mobile,
- learner side panel → full screen on mobile,
- sidebar → bottom nav,
- curriculum remains editable without horizontal overflow,
- lesson reader optimized for mobile reading.

---

# 44. Accessibility Requirements

Minimum:

- WCAG AA contrast,
- keyboard navigable desktop interface,
- visible focus states,
- semantic HTML,
- labeled inputs,
- proper button/link semantics,
- accessible progress labels,
- status not represented by color only.

---

# 45. Design Requirements

Implementation must follow:

```text
PromotorClass_Design_Plan_Anti_AI_Slop.md
```

Mandatory direction:

```text
Quiet Utility
```

Key constraints:

- no decorative gradient,
- no glassmorphism,
- no giant radius,
- no card-everywhere layout,
- no emoji system icons,
- no generic four-KPI dashboard,
- no excessive pills,
- no static-content shadows,
- no giant hero greeting.

---

# 46. Prototype / MVP Screen Inventory

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

---

# 47. Main Demo Scenario

Prototype and QA should support this full path.

## Scenario A — Lead Magnet

```text
1. Promotor opens Home
2. Sees Ayu completed program
3. Opens Ayu
4. Reads reflection
5. Sees Next Step
6. Opens follow-up draft
7. Opens PromotorFlow
8. Goes to Programs
9. Opens Parenting Mini Class
10. Reviews curriculum
11. Opens learner preview
12. Completes lesson
13. Program completion event fires
14. CTA clicked
15. Promotor Home receives new signal
```

---

# 48. Dummy Data

## Promotor

```text
Name:
Rina Maharani

Public Name:
Bu Rina — Promotor & Parenting Educator

City:
Bandung

Instagram:
@rinasahabatkeluarga
```

---

## Program A

```text
7 Hari Mengenal Cara Belajar Anak

Type:
Lead Magnet

Status:
Published

Learners:
84

Average progress:
67%

Completed:
44

CTA clicked:
15
```

---

## Program B

```text
30 Hari Setelah Tes — Kenali Diri Lebih Dalam

Type:
Aftersales

Status:
Published

Learners:
31

Average progress:
72%

Private Session clicks:
8
```

---

## Program C

```text
Parenting Growth Program

Type:
Paid

Status:
Draft

Price reference:
Rp299.000

Modules:
5

Lessons:
23
```

---

## Ayu Rahma

```text
Source:
Instagram

Interest:
Parenting

Child:
13 years

PromotorFlow stage:
Interested

Program:
7 Hari Mengenal Cara Belajar Anak

Progress:
100%

Intent:
92 / Hot

Reflection:
"Kalau sudah main HP, anak saya sulit berhenti dan kalau diingatkan sering jadi konflik."

Next Action:
Follow up about child assessment.
```

---

## Nina Wulandari

```text
Source:
Google Maps

Program:
7 Hari Mengenal Cara Belajar Anak

Progress:
86%

Intent:
87 / Hot

Reflection:
"Anak saya kelas 8 dan belakangan sulit diajak belajar."

Next Action:
Personal check-in.
```

---

## Dimas Pratama

```text
Source:
Referral

Existing client:
Yes

Assessment:
Completed

Program:
30 Hari Setelah Tes

Progress:
100%

Intent:
78 / Warm

CTA:
Private Session clicked

Next Action:
Offer Private Session.
```

---

## Nadia Putri

```text
Source:
Parenting Seminar

Program:
7 Hari Mengenal Cara Belajar Anak

Progress:
21%

Last activity:
7 days ago

Intent:
34 / Cold

Learning status:
At Risk

Next Action:
Send friendly reminder.
```

---

# 49. Success Metrics

## North Star

```text
Meaningful Learning Milestones per Active Promotor per Week
```

Combined business metric:

```text
Learning Signals → Completed Next Actions
```

---

## Product Metrics

Track:

```text
programs published / promotor
learners enrolled / program
learner start rate
50% reach rate
completion rate
reflection submission rate
CTA click rate
hot learner rate
next action creation rate
next action completion rate
```

---

# 50. Validation Metrics

PromotorClass is considered useful if pilot users show:

### Activation

Promotor publishes at least one program.

### Learner activation

At least one learner starts.

### Behavioral value

Promotor opens learner detail / learning signal.

### Business value

Promotor completes a Next Action caused by learning activity.

### Retention signal

Promotor checks learner activity repeatedly across multiple days/weeks.

---

# 51. MVP Exit Criteria

V0.1 is ready for pilot if:

- [ ] Promotor can create a program.
- [ ] Promotor can create modules and lessons.
- [ ] Promotor can publish a public/private program.
- [ ] Learner can register.
- [ ] Existing contact can be matched.
- [ ] Learner can complete lessons.
- [ ] Progress updates correctly.
- [ ] Reflection can be submitted.
- [ ] CTA can be clicked.
- [ ] Intent score updates.
- [ ] Learner appears in promotor learner list.
- [ ] Learner detail shows timeline.
- [ ] Program completion can create Next Action.
- [ ] Promotor can open a follow-up draft.
- [ ] PromotorFlow integration surface exists.
- [ ] UI passes anti-AI-slop checklist.
- [ ] Mobile works from 360px.
- [ ] Tenant data is isolated.

---

# 52. Acceptance Criteria — Home

- [ ] No generic KPI-card grid.
- [ ] Needs Attention is primary.
- [ ] Each signal has reason.
- [ ] Each recommended action is understandable.
- [ ] Promotor can open learner directly.
- [ ] Promotor can initiate follow-up.
- [ ] Recent Activity is chronological.
- [ ] Mobile layout remains readable.

---

# 53. Acceptance Criteria — Program Builder

- [ ] Creating program requires minimal fields.
- [ ] User is sent directly to content editing.
- [ ] Modules can be created.
- [ ] Lessons can be created.
- [ ] Lessons can be reordered.
- [ ] Lesson type is visible.
- [ ] Required/optional lesson can be configured.
- [ ] Draft/published state is clear.
- [ ] No unnecessary wizard modal.

---

# 54. Acceptance Criteria — Learner

- [ ] Learner sees current program.
- [ ] Learner can continue last unfinished lesson.
- [ ] Lesson content is readable.
- [ ] Learner can submit reflection.
- [ ] Learner can complete lesson.
- [ ] Progress updates immediately.
- [ ] Completion screen shows relevant next action.
- [ ] Learner experience is visually separate from admin UI.

---

# 55. Acceptance Criteria — Integration

- [ ] Same phone does not create duplicate contact when matched.
- [ ] Learning event appears on contact timeline.
- [ ] Reflection can become customer insight.
- [ ] High intent signal is visible in PromotorFlow context.
- [ ] Program completion can create Next Action.
- [ ] PromotorClass never auto-sends WhatsApp.
- [ ] PromotorFlow remains authority for business pipeline.

---

# 56. Technical Architecture Direction

Recommended architecture:

```text
Shared Platform
│
├ Auth
├ Organization
├ Contact
├ Events
├ Files
└ Billing (future)

PromotorFlow
│
├ Leads
├ Pipeline
├ Booking
├ Next Actions
└ Opportunities

PromotorClass
│
├ Programs
├ Lessons
├ Enrollments
├ Progress
├ Reflections
└ Learning Signals
```

Prefer modular monolith initially.

Avoid premature microservices.

---

# 57. Suggested Initial Stack

Not binding, but suitable for vibe coding:

```text
Frontend:
Next.js / React

UI:
custom components
CSS variables / Tailwind with strict design tokens

Backend:
Next.js server / Node

Database:
PostgreSQL

ORM:
Prisma / Drizzle

Auth:
passwordless or managed auth

Storage:
S3-compatible / Cloudflare R2

Deployment:
Cloudflare / Vercel-compatible architecture
```

Implementation should prioritize maintainability over framework novelty.

---

# 58. API / Service Boundaries

Suggested logical modules:

```text
contacts
programs
lessons
enrollments
progress
reflections
events
signals
next-actions
```

Every write should verify:

```text
organization_id
```

ownership.

---

# 59. Future V0.2 Candidates

Only after V0.1 usage validates demand:

- scheduled lesson release,
- cohort/challenge dates,
- email/WhatsApp notification integration,
- paid checkout,
- simple quiz,
- certificates,
- program templates marketplace,
- team member access,
- learner tags,
- advanced lead scoring,
- AI-assisted course draft,
- AI reflection summary,
- AI recommended next action,
- branch-level analytics.

---

# 60. Long-Term Expansion

Potential ecosystem:

```text
PromotorFlow
Business OS

PromotorClass
Client Education OS

PromotorPages
Landing / Campaign

Commerce
Checkout / Product / Payment

Branch OS
Team / Performance / Activation
```

Shared identity and event architecture should make future modules possible without rebuilding customer data.

---

# 61. Final Product Boundary

PromotorFlow answers:

> Siapa yang perlu saya tindaklanjuti dan apa tindakan berikutnya?

PromotorClass answers:

> Apa yang dipelajari customer dan sinyal apa yang muncul dari aktivitas mereka?

Combined:

> Siapa customer ini, apa yang sedang mereka pelajari, apa yang mereka butuhkan, dan apa tindakan terbaik berikutnya?

That is the product.
