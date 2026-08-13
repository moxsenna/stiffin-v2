# Referral API Draft Contracts

> **DRAFT FOR B4.5**
> **NOT SHARED CONTRACT V1**

## 1. Learner Query Endpoints

### `GET /api/v1/referrals/summary`
Retrieves learner referral code, WhatsApp share text, progress metrics, and masked referral history.

**Response**:
```json
{
  "code": "7X9K4Q",
  "shareUrl": "https://rina.id/p/7-hari-mengenal-cara-belajar-anak?ref=7X9K4Q",
  "whatsappShareText": "Halo! Saya ikut program edukasi STIFIn di Rina Prameswari...",
  "stats": {
    "totalInvited": 12,
    "engagedCount": 7,
    "qualifiedCount": 3,
    "rewardsEarned": 3
  },
  "history": [
    {
      "id": "ref_hist_1",
      "maskedName": "Budi S••••",
      "programTitle": "7 Hari Mengenal Cara Belajar Anak",
      "status": "QUALIFIED",
      "rewardStatus": "ISSUED",
      "rewardTitle": "Voucher Diskon 20%",
      "createdAt": "2026-08-10T10:00:00Z"
    }
  ]
}
```

## 2. Promotor Overview & Audit Endpoints

### `GET /api/v1/promotor/referrals/overview`
Retrieves promoter dashboard KPIs, top referrers leaderboard, and fraud audit list.

**Response**:
```json
{
  "activeProgram": {
    "id": "ref_prog_1",
    "name": "Program Referral Ajak Teman 2026",
    "status": "ACTIVE",
    "attributionWindowDays": 30,
    "rewardHoldDays": 7
  },
  "kpis": {
    "totalVisits": 142,
    "totalEngaged": 45,
    "totalQualified": 18,
    "conversionRate": 12.6,
    "totalRewardsIssued": 18
  },
  "topReferrers": [
    {
      "contactId": "cnt_ayu",
      "name": "Ayu Prameswari",
      "invitedCount": 12,
      "engagedCount": 7,
      "qualifiedCount": 3
    }
  ],
  "auditList": [
    {
      "id": "attr_audit_1",
      "referrerName": "Nina Anjani",
      "referredName": "Doni Kurnia",
      "status": "PENDING",
      "riskSignals": ["SAME_SUBNET_HASH"],
      "createdAt": "2026-08-12T14:20:00Z"
    }
  ]
}
```
