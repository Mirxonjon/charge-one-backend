import { PrismaClient, ConnectorStatus, LegalDocumentType, Language } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Ensure roles
  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: { name: 'ADMIN' },
  });
  const userRole = await prisma.role.upsert({
    where: { name: 'USER' },
    update: {},
    create: { name: 'USER' },
  });

  // Default admin
  const defaultAdminPhone = '+998900000001';
  const defaultAdminPassword = 'Admin123!';
  const existingAdmin = await prisma.user.findUnique({
    where: { phone: defaultAdminPhone },
  });
  if (!existingAdmin) {
    const hash = await bcrypt.hash(defaultAdminPassword, 12);
    await prisma.user.create({
      data: {
        phone: defaultAdminPhone,
        password: hash,
        isVerified: true,
        roleId: adminRole.id,
        firstName: 'Default',
        lastName: 'Admin',
      },
    });
    console.log('Default admin created');
  } else {
    console.log('Default admin already exists');
  }

  // Seed Operators
  const operators = [
    {
      id: 1,
      title: 'Tok Bor',
      color: '#00A86B',
      contact: '+998 71 200 01 23',
      bankName: 'Ipoteka Bank',
      bankAccount: '20208000123456789001',
      bankMfo: '00444',
    },
    {
      id: 2,
      title: 'Megawatt Charging',
      color: '#2979FF',
      contact: '+998 90 123 45 67',
      bankName: 'Kapitalbank',
      bankAccount: '20208000987654321002',
      bankMfo: '01088',
    },
    {
      id: 3,
      title: 'UzCharge',
      color: '#2ECC71',
      contact: '+998 93 555 77 88',
      bankName: 'Asakabank',
      bankAccount: '20208000567890123403',
      bankMfo: '01155',
    },
    {
      id: 4,
      title: 'Silk Road Energy',
      color: '#FF6F00',
      contact: '+998 97 222 33 44',
      bankName: 'Hamkorbank',
      bankAccount: '20208000432109876504',
      bankMfo: '00083',
    },
  ];

  for (const op of operators) {
    await prisma.operator.upsert({
      where: { id: op.id },
      update: {
        title: op.title,
        color: op.color,
        contact: op.contact,
        bankName: op.bankName,
        bankAccount: op.bankAccount,
        bankMfo: op.bankMfo,
      },
      create: op,
    });
  }
  console.log('Operators seeded');

  // Seed Connector Types
  const connectorTypes = [
    { id: 1, name: 'CCS1', picture: 'https://sbhlbjekwivoppvmxyyk.supabase.co/storage/v1/object/public/connectors/CCS1.png' },
    { id: 2, name: 'CCS2', picture: 'https://sbhlbjekwivoppvmxyyk.supabase.co/storage/v1/object/public/connectors/CCS2.png' },
    { id: 3, name: 'CHAdeMO', picture: 'https://sbhlbjekwivoppvmxyyk.supabase.co/storage/v1/object/public/connectors/CHAdeMO.png' },
    { id: 4, name: 'GBT AC', picture: 'https://sbhlbjekwivoppvmxyyk.supabase.co/storage/v1/object/public/connectors/GBT_AC.png' },
    { id: 5, name: 'GBT DC', picture: 'https://sbhlbjekwivoppvmxyyk.supabase.co/storage/v1/object/public/connectors/GBT_DC.png' },
    { id: 6, name: 'Tesla Supercharger', picture: 'https://sbhlbjekwivoppvmxyyk.supabase.co/storage/v1/object/public/connectors/Tesla_Supercharger.png' },
    { id: 7, name: 'Type 1', picture: 'https://sbhlbjekwivoppvmxyyk.supabase.co/storage/v1/object/public/connectors/Type1.png' },
    { id: 8, name: 'Type 2', picture: 'https://sbhlbjekwivoppvmxyyk.supabase.co/storage/v1/object/public/connectors/Type2.png' },
  ];

  for (const ct of connectorTypes) {
    await prisma.connectorType.upsert({
      where: { name: ct.name },
      update: { picture: ct.picture },
      create: { name: ct.name, picture: ct.picture },
    });
  }
  console.log('Connector types seeded');

  // Seed Charging Stations (with Connectors & Pricing)
  const stations = [
    {
      id: 1, operatorId: 1, title: 'Tashkent Central Station',
      address: 'Amir Temur Avenue 12, Tashkent', latitude: 41.3111, longitude: 69.2797,
      powerType: 'DC' as const, workingHours: '24/7', ocppStationId: 'CP001',
      pricing: { pricePerKwh: 3800, idleFee: 50 },
      connectors: [
        { connectorNumber: 1, typeId: 2, powerKw: 150, status: 'AVAILABLE' as const },
        { connectorNumber: 2, typeId: 8, powerKw: 22, status: 'OCCUPIED' as const },
      ],
    },
    {
      id: 2, operatorId: 2, title: 'Chilonzor Charging Hub',
      address: 'Chilonzor District 5, Tashkent', latitude: 41.2756, longitude: 69.2034,
      powerType: 'AC' as const, workingHours: '24/7', ocppStationId: 'CP002',
      pricing: { pricePerKwh: 1800, idleFee: 30 },
      connectors: [
        { connectorNumber: 1, typeId: 8, powerKw: 22, status: 'AVAILABLE' as const },
      ],
    },
    {
      id: 3, operatorId: 3, title: 'Tashkent City Mall Station',
      address: 'Tashkent City Mall Parking', latitude: 41.2995, longitude: 69.2401,
      powerType: 'DC' as const, workingHours: '08:00-23:00', ocppStationId: 'CP003',
      pricing: { pricePerKwh: 2700, idleFee: 40 },
      connectors: [
        { connectorNumber: 1, typeId: 2, powerKw: 120, status: 'AVAILABLE' as const },
        { connectorNumber: 2, typeId: 3, powerKw: 50, status: 'OUT_OF_SERVICE' as const },
      ],
    },
    {
      id: 4, operatorId: 4, title: 'Samarkand Supercharge',
      address: 'Registan Street, Samarkand', latitude: 39.6542, longitude: 66.9597,
      powerType: 'DC' as const, workingHours: '24/7', ocppStationId: 'CP004',
      pricing: { pricePerKwh: 4000, idleFee: 60 },
      connectors: [
        { connectorNumber: 1, typeId: 2, powerKw: 150, status: 'AVAILABLE' as const },
      ],
    },
    {
      id: 5, operatorId: 1, title: 'Tashkent Airport Charging',
      address: 'Tashkent International Airport Parking', latitude: 41.2579, longitude: 69.2812,
      powerType: 'DC' as const, workingHours: '24/7', ocppStationId: 'CP005',
      pricing: { pricePerKwh: 3200, idleFee: 55 },
      connectors: [
        { connectorNumber: 1, typeId: 2, powerKw: 120, status: 'OCCUPIED' as const },
        { connectorNumber: 2, typeId: 8, powerKw: 22, status: 'AVAILABLE' as const },
      ],
    },
    {
      id: 6, operatorId: 2, title: 'Mega Planet Mall Station',
      address: 'Mega Planet Mall Parking', latitude: 41.3385, longitude: 69.3349,
      powerType: 'AC' as const, workingHours: '10:00-22:00', ocppStationId: 'CP006',
      pricing: { pricePerKwh: 1500, idleFee: 25 },
      connectors: [
        { connectorNumber: 1, typeId: 8, powerKw: 22, status: 'AVAILABLE' as const },
      ],
    },
    {
      id: 7, operatorId: 3, title: 'Bukhara EV Point',
      address: 'Bukhara City Center', latitude: 39.7747, longitude: 64.4286,
      powerType: 'DC' as const, workingHours: '24/7', ocppStationId: 'CP007',
      pricing: { pricePerKwh: 2800, idleFee: 45 },
      connectors: [
        { connectorNumber: 1, typeId: 5, powerKw: 120, status: 'AVAILABLE' as const },
      ],
    },
    {
      id: 8, operatorId: 4, title: 'Namangan Charge Station',
      address: 'Namangan Central Parking', latitude: 40.9983, longitude: 71.6726,
      powerType: 'AC' as const, workingHours: '24/7', ocppStationId: 'CP008',
      pricing: { pricePerKwh: 2000, idleFee: 35 },
      connectors: [
        { connectorNumber: 1, typeId: 4, powerKw: 22, status: 'OUT_OF_SERVICE' as const },
      ],
    },
    {
      id: 9, operatorId: 1, title: 'Andijan EV Station',
      address: 'Andijan City Mall Parking', latitude: 40.7821, longitude: 72.3442,
      powerType: 'AC' as const, workingHours: '09:00-22:00', ocppStationId: 'CP009',
      pricing: { pricePerKwh: 1600, idleFee: 28 },
      connectors: [
        { connectorNumber: 1, typeId: 7, powerKw: 11, status: 'AVAILABLE' as const },
      ],
    },
    {
      id: 10, operatorId: 2, title: 'Fergana Charging Hub',
      address: 'Fergana Central Parking', latitude: 40.3894, longitude: 71.7843,
      powerType: 'DC' as const, workingHours: '24/7', ocppStationId: 'CP010',
      pricing: { pricePerKwh: 3500, idleFee: 50 },
      connectors: [
        { connectorNumber: 1, typeId: 2, powerKw: 150, status: 'AVAILABLE' as const },
      ],
    },
  ];

  for (const s of stations) {
    const { pricing, connectors, ...stationData } = s;

    // Upsert station
    const station = await prisma.chargingStation.upsert({
      where: { ocppStationId: stationData.ocppStationId },
      update: {
        title: stationData.title,
        address: stationData.address,
        latitude: stationData.latitude,
        longitude: stationData.longitude,
        powerType: stationData.powerType,
        workingHours: stationData.workingHours,
        operatorId: stationData.operatorId,
      },
      create: {
        id: stationData.id,
        title: stationData.title,
        address: stationData.address,
        latitude: stationData.latitude,
        longitude: stationData.longitude,
        powerType: stationData.powerType,
        workingHours: stationData.workingHours,
        ocppStationId: stationData.ocppStationId,
        operatorId: stationData.operatorId,
      },
    });

    // Upsert pricing
    await prisma.stationPricing.upsert({
      where: { stationId: station.id },
      update: { pricePerKwh: pricing.pricePerKwh, idleFee: pricing.idleFee },
      create: { stationId: station.id, pricePerKwh: pricing.pricePerKwh, idleFee: pricing.idleFee },
    });

    // Upsert each connector
    for (const c of connectors) {
      await prisma.connector.upsert({
        where: { stationId_connectorNumber: { stationId: station.id, connectorNumber: c.connectorNumber } },
        update: { typeId: c.typeId, powerKw: c.powerKw, status: c.status },
        create: { stationId: station.id, connectorNumber: c.connectorNumber, typeId: c.typeId, powerKw: c.powerKw, status: c.status },
      });
    }
  }
  console.log('Charging stations seeded');

  // Seed Legal Documents
  console.log('Seeding Legal Documents...');

  // 1. Privacy Policy
  await prisma.legalDocument.deleteMany({ where: { type: LegalDocumentType.PRIVACY } });
  await prisma.legalDocument.create({
    data: {
      type: LegalDocumentType.PRIVACY,
      version: '1.1',
      isActive: true,
      translations: {
        create: [
          {
            language: Language.RU,
            title: "Политика конфиденциальности",
            content: "<p><b>1. Общие положения</b><br>Charge One уважает конфиденциальность пользователей и обязуется защищать персональные данные в соответствии с применимым законодательством.</p><p><b>2. Какие данные мы собираем</b><br>Мы можем собирать: номер телефона, имя, фамилию, дату рождения (по желанию), данные о зарядных сессиях, информацию об устройстве и использовании приложения.</p><p><b>3. Цели обработки данных</b><br>Данные используются для аутентификации, предоставления услуг, обработки платежей, улучшения сервиса и обеспечения безопасности.</p><p><b>4. Геолокация</b><br>Данные о местоположении используются только для отображения ближайших зарядных станций и навигации.</p><p><b>5. Камера</b><br>В текущей версии приложения камера не используется. В будущем может использоваться для сканирования QR-кодов.</p><p><b>6. Передача данных третьим лицам</b><br>Данные могут передаваться операторам зарядных станций, платежным провайдерам и техническим партнерам исключительно для предоставления услуг.</p><p><b>7. Хранение данных</b><br>Данные хранятся только в течение срока, необходимого для выполнения целей обработки или требований законодательства.</p><p><b>8. Безопасность</b><br>Мы применяем технические и организационные меры для защиты данных от несанкционированного доступа.</p><p><b>9. Права пользователя</b><br>Пользователь имеет право на доступ, исправление и удаление своих персональных данных.</p><p><b>10. Дети</b><br>Сервис не предназначен для лиц младше 13 лет.</p><p><b>11. Изменения политики</b><br>Мы можем обновлять данную Политику. Обновления публикуются в приложении.</p><p><b>12. Контакты</b><br>Email: ssupport@charge-one.uz</p>"
          },
          {
            language: Language.UZ,
            title: "Maxfiylik siyosati",
            content: "<p><b>1. Umumiy qoidalar</b><br>Charge One foydalanuvchilar maxfiyligini hurmat qiladi va shaxsiy ma'lumotlarni himoya qiladi.</p><p><b>2. Yig'iladigan ma'lumotlar</b><br>Telefon raqam, ism, familiya, tug‘ilgan sana (ixtiyoriy), zaryadlash ma'lumotlari, qurilma va ilova ishlatilishi haqidagi ma'lumotlar yig'ilishi mumkin.</p><p><b>3. Maqsadlar</b><br>Ma'lumotlar autentifikatsiya, xizmat ko‘rsatish, to‘lovlarni amalga oshirish va xavfsizlik uchun ishlatiladi.</p><p><b>4. Geolokatsiya</b><br>Faqat yaqin stansiyalarni ko‘rsatish uchun ishlatiladi.</p><p><b>5. Kamera</b><br>Hozir ishlatilmaydi, kelajakda QR kod uchun ishlatilishi mumkin.</p><p><b>6. Uchinchi tomon</b><br>Ma'lumotlar xizmat ko‘rsatish uchun hamkorlarga uzatilishi mumkin.</p><p><b>7. Saqlash</b><br>Ma'lumotlar zarur muddat davomida saqlanadi.</p><p><b>8. Xavfsizlik</b><br>Ma'lumotlar himoyalangan.</p><p><b>9. Foydalanuvchi huquqlari</b><br>Ko‘rish, o‘zgartirish va o‘chirish huquqi mavjud.</p><p><b>10. Bolalar</b><br>13 yoshgacha mo‘ljallanmagan.</p><p><b>11. O‘zgarishlar</b><br>Siyosat yangilanishi mumkin.</p><p><b>12. Aloqa</b><br>Email: support@charge-one.uz</p>"
          },
          {
            language: Language.EN,
            title: "Privacy Policy",
            content: "<p><b>1. General</b><br>Charge One respects user privacy and processes personal data in accordance with applicable laws.</p><p><b>2. Data We Collect</b><br>We may collect phone number, name, date of birth (optional), charging session data, device information, and usage data.</p><p><b>3. Purpose of Processing</b><br>Data is used for authentication, service delivery, payments, security, and service improvement.</p><p><b>4. Location</b><br>Used only to display nearby charging stations and navigation.</p><p><b>5. Camera</b><br>Not used currently. May be used for QR code scanning in the future.</p><p><b>6. Data Sharing</b><br>Data may be shared with station operators, payment providers, and technical partners.</p><p><b>7. Data Retention</b><br>Data is stored only as long as necessary.</p><p><b>8. Security</b><br>We implement measures to protect personal data.</p><p><b>9. User Rights</b><br>Users can access, correct, or delete their data.</p><p><b>10. Children</b><br>Not intended for users under 13.</p><p><b>11. Updates</b><br>This policy may be updated.</p><p><b>12. Contact</b><br>Email: support@charge-one.uz</p>"
          }
        ]
      }
    }
  });

  // 2. Terms of Service
  await prisma.legalDocument.deleteMany({ where: { type: LegalDocumentType.TERMS } });
  await prisma.legalDocument.create({
    data: {
      type: LegalDocumentType.TERMS,
      version: '1.1',
      isActive: true,
      translations: {
        create: [
          {
            language: Language.RU,
            title: "Пользовательское соглашение",
            content: "<p><b>1. Общие положения</b><br>Настоящее Пользовательское соглашение регулирует использование приложения Charge One. Используя приложение, пользователь соглашается с условиями данного соглашения.</p><p><b>2. Регистрация и аккаунт</b><br>Пользователь обязан предоставить достоверную информацию. Пользователь несет ответственность за безопасность своего аккаунта.</p><p><b>3. Описание сервиса</b><br>Charge One предоставляет доступ к сети зарядных станций электромобилей, управляемых третьими лицами.</p><p><b>4. Платежи</b><br>Все платежи осуществляются через сторонние платежные системы. Пользователь соглашается оплачивать все оказанные услуги.</p><p><b>5. Ограничение ответственности</b><br>Charge One не несет ответственности за перебои, ошибки или недоступность зарядных станций, управляемых третьими сторонами.</p><p><b>6. Отказ от гарантий</b><br>Сервис предоставляется «как есть» без каких-либо гарантий, явных или подразумеваемых.</p><p><b>7. Запрещенное использование</b><br>Пользователь обязуется не использовать сервис в незаконных целях или с нарушением законодательства.</p><p><b>8. Приостановка и прекращение</b><br>Мы оставляем за собой право ограничить или прекратить доступ пользователя при нарушении условий.</p><p><b>9. Интеллектуальная собственность</b><br>Все права на приложение принадлежат Charge One.</p><p><b>10. Изменения</b><br>Мы можем изменять условия в любое время. Продолжение использования означает согласие with changes.</p><p><b>11. Применимое право</b><br>Соглашение регулируется законодательством Республики Узбекистан.</p><p><b>12. Контакты</b><br>Email: support@charge-one.uz</p>"
          },
          {
            language: Language.UZ,
            title: "Foydalanuvchi kelishuvi",
            content: "<p><b>1. Umumiy qoidalar</b><br>Ushbu kelishuv Charge One ilovasidan foydalanishni tartibga soladi. Ilovadan foydalanish orqali foydalanuvchi ushbu shartlarga rozilik bildiradi.</p><p><b>2. Ro'yxatdan o'tish</b><br>Foydalanuvchi to‘g‘ri ma'lumot kiritishi shart va akkaunt xavfsizligi uchun javob beradi.</p><p><b>3. Xizmat tavsifi</b><br>Charge One uchinchi tomon tomonidan boshqariladigan zaryadlash stansiyalariga kirishni ta'minlaydi.</p><p><b>4. To‘lovlar</b><br>To‘lovlar tashqi to‘lov tizimlari orqali amalga oshiriladi.</p><p><b>5. Javobgarlikni cheklash</b><br>Charge One uchinchi tomon xizmatlaridagi nosozliklar uchun javobgar emas.</p><p><b>6. Kafolatdan voz kechish</b><br>Xizmat “qanday bo‘lsa, shunday” taqdim etiladi.</p><p><b>7. Taqiqlangan foydalanish</b><br>Noqonuniy foydalanish taqiqlanadi.</p><p><b>8. To‘xtatish</b><br>Qoidalar buzilganda xizmatdan foydalanish cheklanishi mumkin.</p><p><b>9. Intellektual mulk</b><br>Barcha huquqlar Charge One ga tegishli.</p><p><b>10. O‘zgarishlar</b><br>Kelishuv o‘zgartirilishi mumkin.</p><p><b>11. Qonunchilik</b><br>O‘zbekiston Respublikasi qonunchiligiga muvofiq tartibga solinadi.</p><p><b>12. Aloqa</b><br>Email: support@charge-one.uz</p>"
          },
          {
            language: Language.EN,
            title: "Terms of Service",
            content: "<p><b>1. General</b><br>These Terms govern the use of the Charge One application. By using the app, you agree to these Terms.</p><p><b>2. Account</b><br>Users must provide accurate information and are responsible for account security.</p><p><b>3. Service Description</b><br>Charge One provides access to EV charging stations operated by third parties.</p><p><b>4. Payments</b><br>Payments are processed via third-party providers. Users agree to pay for services.</p><p><b>5. Limitation of Liability</b><br>Charge One is not liable for failures or interruptions of third-party services.</p><p><b>6. Disclaimer</b><br>The service is provided “as is” without warranties of any kind.</p><p><b>7. Prohibited Use</b><br>Illegal use of the service is prohibited.</p><p><b>8. Suspension</b><br>We may suspend or terminate access for violations.</p><p><b>9. Intellectual Property</b><br>All rights belong to Charge One.</p><p><b>10. Changes</b><br>Terms may be updated at any time.</p><p><b>11. Governing Law</b><br>These Terms are governed by the laws of the Republic of Uzbekistan.</p><p><b>12. Contact</b><br>Email: support@charge-one.uz</p>"
          }
        ]
      }
    }
  });

  console.log('Seed completed');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
