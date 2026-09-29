# ERD CleanGo

ERD lengkap dan penjelasan cardinality berada di
[DATABASE.md](DATABASE.md#erd). File tunggal tersebut menjadi sumber kebenaran
agar diagram tidak berbeda dengan migration aktif.

Relasi inti:

```mermaid
flowchart TD
  AU[auth.users] --> P[profiles]
  P --> A[addresses]
  P --> B[bookings]
  C[categories] --> S[services]
  S --> SI[service_inclusions]
  S --> B
  CL[cleaners] --> B
  CL --> CS[cleaner_schedules]
  CL --> LOC[cleaner_locations]
  B --> H[booking_status_history]
  B --> CS
  B --> LOC
  B --> PAY[payments]
  B --> R[reviews]
  B --> SR[support_requests]
  B --> ETA[eta_predictions]
  B --> RISK[booking_risk_predictions]
  B --> N[notifications]
  PC[promo_codes] --> PU[promo_usages]
  B --> PU
  P --> AC[ai_conversations]
  AC --> AM[ai_messages]
```
