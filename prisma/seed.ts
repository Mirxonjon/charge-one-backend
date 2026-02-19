import { PrismaClient, ConnectorStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Ensure roles
  const adminRole = await prisma.role.upsert({ where: { name: 'ADMIN' }, update: {}, create: { name: 'ADMIN' } });
  const userRole = await prisma.role.upsert({ where: { name: 'USER' }, update: {}, create: { name: 'USER' } });

  // Default admin
  const defaultAdminPhone = '+998900000001';
  const defaultAdminPassword = 'Admin123!';
  const existingAdmin = await prisma.user.findUnique({ where: { phone: defaultAdminPhone } });
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

  // Seed two operators
  const op1 = await prisma.operator.upsert({
    where: { id: 1 },
    update: {},
    create: {
      title: 'GreenCharge LLC',
      contact: '+1 555-100-2000',
      bankName: 'First National',
      bankAccount: 'US1234567890',
      bankMfo: '12345',
    },
  });

  const op2 = await prisma.operator.upsert({
    where: { id: 2 },
    update: {},
    create: {
      title: 'VoltCity Inc.',
      contact: '+1 555-300-4000',
    },
  });

  // Seed stations
  const st1 = await prisma.chargingStation.create({
    data: {
      operatorId: op1.id,
      title: 'Downtown Station',
      address: '123 Main St',
      latitude: 40.7128,
      longitude: -74.0060,
      powerType: 'AC',
      isActive: true,
      workingHours: '24/7',
    },
  });

  const st2 = await prisma.chargingStation.create({
    data: {
      operatorId: op2.id,
      title: 'Airport Station',
      address: '1 Terminal Rd',
      latitude: 40.6413,
      longitude: -73.7781,
      powerType: 'DC',
      isActive: true,
      workingHours: '06:00-23:00',
    },
  });

  // Seed connectors
  await prisma.connector.createMany({
    data: [
      { stationId: st1.id, type: 'CCS2', powerKw: 150, status: ConnectorStatus.AVAILABLE, pricePerKwh: 0.25 },
      { stationId: st1.id, type: 'Type2', powerKw: 22, status: ConnectorStatus.AVAILABLE, pricePerKwh: 0.20 },
      { stationId: st2.id, type: 'CHAdeMO', powerKw: 50, status: ConnectorStatus.OUT_OF_SERVICE, pricePerKwh: 0.30 },
    ],
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
