import {
    Injectable,
    NotFoundException,
    ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateConnectorTypeDto } from './types/create-connector-type.dto';
import { UpdateConnectorTypeDto } from './types/update-connector-type.dto';
import { ConnectorType } from '@prisma/client';

@Injectable()
export class ConnectorTypeService {
    constructor(private readonly prisma: PrismaService) { }

    async create(createDto: CreateConnectorTypeDto): Promise<ConnectorType> {
        const existingType = await this.prisma.connectorType.findUnique({
            where: { name: createDto.name },
        });

        if (existingType) {
            throw new ConflictException(`Connector type with name '${createDto.name}' already exists.`);
        }

        return this.prisma.connectorType.create({
            data: createDto,
        });
    }

    async findAll(): Promise<ConnectorType[]> {
        return this.prisma.connectorType.findMany({
            orderBy: { id: 'desc' },
        });
    }

    async findOne(id: number): Promise<ConnectorType> {
        const connectorType = await this.prisma.connectorType.findUnique({
            where: { id },
        });

        if (!connectorType) {
            throw new NotFoundException(`Connector type with ID ${id} not found.`);
        }

        return connectorType;
    }

    async update(id: number, updateDto: UpdateConnectorTypeDto): Promise<ConnectorType> {
        await this.findOne(id);

        if (updateDto.name) {
            const existingType = await this.prisma.connectorType.findFirst({
                where: {
                    name: updateDto.name,
                    id: { not: id },
                },
            });

            if (existingType) {
                throw new ConflictException(`Connector type with name '${updateDto.name}' already exists.`);
            }
        }

        return this.prisma.connectorType.update({
            where: { id },
            data: updateDto,
        });
    }

    async remove(id: number): Promise<ConnectorType> {
        await this.findOne(id);

        return this.prisma.connectorType.delete({
            where: { id },
        });
    }
}
