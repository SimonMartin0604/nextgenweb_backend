import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Headers,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { QuoteRequestService } from './quote-request.service';
import { CreateQuoteRequestDto } from './dto/create-quote-request.dto';
import { UpdateQuoteRequestDto } from './dto/update-quote-request.dto';
import { QuoteRequest } from '../generated/client';

@Controller('quote-requests')
export class QuoteRequestController {
  constructor(private readonly quoteRequestService: QuoteRequestService) {}

  @Post()
  @UsePipes(new ValidationPipe({ transform: true }))
  async create(@Body() createQuoteRequestDto: CreateQuoteRequestDto): Promise<QuoteRequest> {
    return this.quoteRequestService.create(createQuoteRequestDto);
  }

  @Get()
  async findAll(@Headers('x-admin-key') adminKey?: string): Promise<QuoteRequest[]> {
    if (!adminKey || !this.quoteRequestService.validateAdminKey(adminKey)) {
      throw new ForbiddenException('Érvénytelen adminisztrátori kulcs.');
    }
    return this.quoteRequestService.findAll();
  }

  @Patch(':id')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateQuoteRequestDto,
    @Headers('x-admin-key') adminKey?: string,
  ): Promise<QuoteRequest> {
    if (!adminKey || !this.quoteRequestService.validateAdminKey(adminKey)) {
      throw new ForbiddenException('Érvénytelen adminisztrátori kulcs.');
    }
    return this.quoteRequestService.updateStatus(id, updateDto.status);
  }

  @Delete(':id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Headers('x-admin-key') adminKey?: string,
  ): Promise<QuoteRequest> {
    if (!adminKey || !this.quoteRequestService.validateAdminKey(adminKey)) {
      throw new ForbiddenException('Érvénytelen adminisztrátori kulcs.');
    }
    return this.quoteRequestService.remove(id);
  }

  @Delete()
  async removeAll(@Headers('x-admin-key') adminKey?: string): Promise<{ count: number }> {
    if (!adminKey || !this.quoteRequestService.validateAdminKey(adminKey)) {
      throw new ForbiddenException('Érvénytelen adminisztrátori kulcs.');
    }
    return this.quoteRequestService.removeAll();
  }
}
