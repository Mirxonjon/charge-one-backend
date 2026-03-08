# Backend Integration Documentation for EV Simulator

Bu hujjat orqali backend dasturchilari Node.js OCPP Simulyatori qanday ishlashini va frontend dasturchilar mobil ilova/dashboard uchun qanday API & WebSockets larni ulashlari kerakligini tushunib olishlari mumkin.

## 1. Ulanish (WebSocket EndPoint - Simulytor uchun)

Simulyator backendga ulanish uchun quyidagi WebSocket URL manziliga so'rov tashlaydi:

```text
ws://localhost:9000/ocpp/<STATION_ID>
```
* **Port:** `9000` (Backend asosiy HTTP/REST portidan tashqari alohida WS port ishlatadi).
* **STATION_ID:** Zaryadlash stansiyasining noyob ID'si (simulyatorda standart qiymat: `CP001`).

---

## 2. OCPP Lifecycle xabarlari (Client -> Server)

Simulyator ishga tushganda yoki jarayon davomida quyidagi xabarlarni (`CALL`) yuboradi. Backend esa ularni qabul qilib mos ob'ekt qaytaradi (`CALLRESULT`).

1. **`BootNotification`**: Stansiya ilk bor tarmoqqa ulanganda yuboriladi. Backend uning ID sini bazadan tekshiradi va ulanishga ruxsat (`Accepted`) beradi.
2. **`StatusNotification`**: Stansiyadagi ulanish porti (connector) holati o'zgarganda (Available, Preparing, Charging, Faulted) yuboriladi. Bu backend orqali Frontendga socket sifatida e'lon qilinadi (`connector_status_changed`).
3. **`Heartbeat`**: Har N soniyada simulyator yuborganida backend joriy vaqtni qaytaradi (Stansiya "Tirik" ekanligini bildirish uchun).
4. **`StartTransaction`**: Mashina quvvatlaishni boshlashni ro'yxatdan o'tkazish uchun. (Backend yangi `ChargingSession` yaratadi).
5. **`MeterValues`**: Har 10 soniyada mashinaga qancha Energiya berilayotganligi va joriy quvvatlanish tezligi. (Frontend uchun animatsiyani harakatga keltirishga ishlatiladi - `session_meter_updated`).
6. **`StopTransaction`**: Stansiyada quvvatlanish haqiqatdan ham to'xtaganda.

---

## 3. Zaryadlashni Boshqarish (REST API - Frontend / App)

Foydalanuvchi mobil ilovaga kirib, "Quvvatlashni Boshlash" tugmasini bossa quyidagi API lar chaqirilishi kerak:

### 3.1. Quvvatlashni masofadan boshlash
Backend bu orqali OCPP stansiyaga `RemoteStartTransaction` kommandasini yuboradi.

**Endpoint:** `POST /v1/sessions/start`  
**Authorization:** Bearer Token (User)  
**Tana (Body):**
```json
{
  "connectorId": 1
}
```

### 3.2. Quvvatlashni masofadan to'xtatish
Kabelni uzishdan avval telefon orqali to'xtatish. Backend bu amalda `RemoteStopTransaction` yuboradi. OcppServer buni eplay olgachgina `ChargingSession` tugatiladi.

**Endpoint:** `POST /v1/sessions/stop/:sessionId`  
**Authorization:** Bearer Token (User)  

---

## 4. Real vaqt monitoringi (Socket.io - Frontend / App)

Mobil App yoki Admin Qism (Dashboard) ulanish portlari real vaqtda o'zgarishini ko'rsatib turish uchun asosiy Backend HTTP (masalan, `http://localhost:3000`) ga WebSocket orqali ulanadi.

**Voqealar (Events):**

* **`connector_status_changed`**  
  Stansiyadagi konnektor band bo'lganida yoki bo'shaganida keladi.
  ```json
  {
      "stationId": "CP001",
      "connectorId": 1,
      "status": "Available" | "Occupied" | "Out_Of_Service"
  }
  ```

* **`session_meter_updated`**  
  Quvvatlanish jarayonida chalg'itma animatsiyalari va joriy narxni ko'rsatish uchun har N soniyada backend tomonidan barcha onlayn mijozlarga tarqatiladi.
  ```json
  {
      "sessionId": 1001,
      "energyKwh": 12.3, // Qancha olingani
      "powerKw": 7.4,   // Quvvatlanish tezligi
      "cost": 30750     // Sarflangan mablag' (UZS)
  }
  ```

---
Barcha qismlar Prisma (PostgreSQL), NestJS WebSockets texnologiyasi asosida to'liq va tizimli integratsiya qilindi.
