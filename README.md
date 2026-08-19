# LEGACY-X Frontend

Энэ repository-г одоогоор зориуд хоосон үлдээсэн. Frontend implementation, UI framework болон AdminPlus dashboard source энд хараахан ороогүй.

Одоогийн repository boundary:

| Repository | Role |
|---|---|
| `legacyxxx-backend` | LEGACY-X API, database, authentication, AdminPlus backend bridge |
| `legacyxxx-plugins` | CS2 CounterStrikeSharp plugins, including LEGACY-X AdminPlus DLL |
| `legacyxxx-frontend` | Дараагийн frontend implementation хийх reserved repository |

Frontend эхлүүлэх үед backend API-ийн үндсэн prefix нь `/api/v1`, AdminPlus API нь тусдаа staff-only backend endpoint байна. Backend-ийн service-role key, RCON password болон API secret энэ repository руу хэзээ ч орохгүй.
