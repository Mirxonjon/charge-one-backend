import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ConnectorTypeService } from './connector-type.service';
import { CreateConnectorTypeDto } from './types/create-connector-type.dto';
import { UpdateConnectorTypeDto } from './types/update-connector-type.dto';
import { ConnectorTypeResponseDto } from './types/connector-type-response.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Connector Types')
@ApiBearerAuth()
@Controller('connector-types')
export class ConnectorTypeController {
  constructor(private readonly connectorTypeService: ConnectorTypeService) {}

  @Post()
  //   @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create a new connector type' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'The connector type has been successfully created.',
    type: ConnectorTypeResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'ConnectorType name must be unique.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized.',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden. Requires ADMIN role.',
  })
  async create(@Body() createDto: CreateConnectorTypeDto) {
    return this.connectorTypeService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all connector types' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of all connector types.',
    type: [ConnectorTypeResponseDto],
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized.',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden. Requires ADMIN role.',
  })
  async findAll() {
    return this.connectorTypeService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a connector type by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The connector type details.',
    type: ConnectorTypeResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'ConnectorType not found.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized.',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden. Requires ADMIN role.',
  })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.connectorTypeService.findOne(id);
  }

  @Patch(':id')
  //   @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update a connector type' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The connector type has been successfully updated.',
    type: ConnectorTypeResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'ConnectorType not found.',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'ConnectorType name must be unique.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized.',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden. Requires ADMIN role.',
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateConnectorTypeDto
  ) {
    return this.connectorTypeService.update(id, updateDto);
  }

  @Delete(':id')
  //   @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a connector type' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'The connector type has been successfully deleted.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'ConnectorType not found.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized.',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden. Requires ADMIN role.',
  })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.connectorTypeService.remove(id);
  }
}
