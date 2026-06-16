import { Module } from '@nestjs/common';
import { QuoteRequestService } from './quote-request.service';
import { QuoteRequestController } from './quote-request.controller';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [QuoteRequestController],
  providers: [QuoteRequestService, PrismaService],
})
export class QuoteRequestModule {}
