import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { CreateCarDto } from '@/types/vehicle/create-car.dto';
import { UpdateCarDto } from '@/types/vehicle/update-car.dto';
import { CarFilterDto } from '@/types/vehicle/car-filter.dto';
import { AddUserCarDto } from '@/types/vehicle/add-user-car.dto';

@Injectable()
export class VehicleService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCarDto, createdById?: number) {
    try {
      const car = await this.prisma.car.create({
        data: { ...dto, createdById, createdByType: 'ADMIN' as any },
      });
      return car;
    } catch (e) {
      if (e.code === 'P2002')
        throw new BadRequestException('VIN must be unique');
      throw e;
    }
  }

  async update(id: number, dto: UpdateCarDto) {
    const exists = await this.prisma.car.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Car not found');
    try {
      return await this.prisma.car.update({ where: { id }, data: dto });
    } catch (e) {
      if (e.code === 'P2002')
        throw new BadRequestException('VIN must be unique');
      throw e;
    }
  }

  async remove(id: number) {
    await this.prisma.userCar.deleteMany({ where: { carId: id } });
    await this.prisma.car.delete({ where: { id } });
    return { success: true };
  }

  async findOne(id: number) {
    const car = await this.prisma.car.findUnique({ where: { id } });
    if (!car) throw new NotFoundException('Car not found');
    return car;
  }

  async findAll(query: CarFilterDto) {
    const {
      brand,
      model,
      yearFrom,
      yearTo,
      batterySizeFrom,
      batterySizeTo,
      search,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const where: any = {};
    if (brand) where.brand = { contains: brand, mode: 'insensitive' };
    if (model) where.model = { contains: model, mode: 'insensitive' };
    if (yearFrom || yearTo)
      where.year = { gte: yearFrom ?? undefined, lte: yearTo ?? undefined };
    if (batterySizeFrom || batterySizeTo)
      where.batterySize = {
        gte: batterySizeFrom ?? undefined,
        lte: batterySizeTo ?? undefined,
      };
    if (search)
      where.OR = [
        { brand: { contains: search, mode: 'insensitive' } },
        { model: { contains: search, mode: 'insensitive' } },
      ];

    if (query.createdByType) where.createdByType = query.createdByType as any;
    if (typeof query.createdById === 'number')
      where.createdById = query.createdById;
    if (query.onlySystemCars) where.createdByType = 'SYSTEM' as any;
    if (query.onlyUserCars) where.createdByType = 'USER' as any;

    const total = await this.prisma.car.count({ where });
    const data = await this.prisma.car.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
    });

    return { total, page, limit, data };
  }

  async addToUser(userId: number, dto: AddUserCarDto) {
    let carId = dto.carId;

        if (dto.vin) {
          const existingVin = await this.prisma.car.findUnique({
            where: { vin: dto.vin },
          });

          if (existingVin) {
            throw new BadRequestException('Car with this VIN already exists');
          }
        }

    if (dto.plateNumber) {
      const existingPlate = await this.prisma.userCar.findUnique({
        where: { plateNumber: dto.plateNumber },
      });

      if (existingPlate) {
        throw new BadRequestException('plateNumber already exists');
      }
    }
    if (!carId) {
      if (!dto.brand || !dto.model)
        throw new BadRequestException(
          'brand and model required for custom car'
        );

      console.log(dto);

      const create = await this.prisma.car.create({
        data: {
          brand: dto.brand,
          model: dto.model,
          year: dto.year ?? undefined,
          vin: dto.vin ?? undefined,
          batterySize: (dto as any).batterySize ?? undefined,
          rangeKm: (dto as any).rangeKm ?? undefined,
          createdById: userId,
          createdByType: 'USER' as any,
        },
      });
      carId = create.id;
    } else {
      const car = await this.prisma.car.findUnique({ where: { id: carId } });
      if (!car) throw new NotFoundException('Car not found');
    }

    // Ensure uniqueness per user+car? Allow multiple with different plateNumbers.
    try {
      const userCar = await this.prisma.userCar.create({
        data: {
          userId,
          carId,
          plateNumber: dto.plateNumber ?? undefined,
          color: dto.color ?? undefined,
        },
      });
      return userCar;
    } catch (e) {
      if (e.code === 'P2002')
        throw new BadRequestException('plateNumber must be unique');
      throw e;
    }
  }

  async removeFromUser(userId: number, userCarId: number) {
    const uc = await this.prisma.userCar.findUnique({
      where: { id: userCarId },
    });
    if (!uc || uc.userId !== userId)
      throw new NotFoundException('User car not found');
    await this.prisma.userCar.delete({ where: { id: userCarId } });
    return { success: true };
  }

  async getUserCars(userId: number) {
    return this.prisma.userCar.findMany({
      where: { userId },
      include: { car: true },
    });
  }

  // External sync
  async syncExternal() {
    // Replace with real external API call
    const externalCars = [
      {
        brand: 'Tesla',
        model: 'Model Y',
        year: 2022,
        batterySize: 75,
        rangeKm: 505,
        imageUrl: undefined,
        vin: undefined,
      },
      {
        brand: 'BYD',
        model: 'Atto 3',
        year: 2023,
        batterySize: 60.5,
        rangeKm: 420,
        imageUrl: undefined,
        vin: undefined,
      },
    ];

    let created = 0,
      updated = 0;

    for (const c of externalCars) {
      const where = c.vin
        ? { vin: c.vin }
        : ({
            brand_model_year: {
              brand: c.brand,
              model: c.model,
              year: c.year ?? 0,
            },
          } as any);
      const existing = await this.prisma.car.findFirst({
        where: c.vin
          ? { vin: c.vin }
          : { brand: c.brand, model: c.model, year: c.year ?? undefined },
      });
      if (existing) {
        // Do not overwrite ADMIN or USER-created cars
        if (existing.createdByType !== 'SYSTEM') {
          continue;
        }
        await this.prisma.car.update({
          where: { id: existing.id },
          data: {
            batterySize: c.batterySize,
            rangeKm: c.rangeKm,
            imageUrl: c.imageUrl,
            createdByType: 'SYSTEM' as any,
            createdById: null,
          },
        });
        updated++;
      } else {
        await this.prisma.car.create({
          data: {
            brand: c.brand,
            model: c.model,
            year: c.year ?? undefined,
            vin: c.vin ?? undefined,
            batterySize: c.batterySize ?? undefined,
            rangeKm: c.rangeKm ?? undefined,
            imageUrl: c.imageUrl ?? undefined,
            createdByType: 'SYSTEM' as any,
            createdById: null,
          },
        });
        created++;
      }
    }

    return { created, updated };
  }
}
