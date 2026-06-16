import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateQuoteRequestDto } from './dto/create-quote-request.dto';
import { ConfigService } from '@nestjs/config';
import { QuoteRequest } from 'generated/prisma/client';

@Injectable()
export class QuoteRequestService {
  private readonly logger = new Logger(QuoteRequestService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async create(dto: CreateQuoteRequestDto): Promise<QuoteRequest> {
    // 1. Save to database via Prisma
    let quoteRequest = await this.prisma.quoteRequest.create({
      data: {
        name: dto.name,
        email: dto.email,
        companyName: dto.companyName,
        phoneNumber: dto.phoneNumber,
        projectType: dto.projectType,
        projectBudget: dto.projectBudget,
        projectDescription: dto.projectDescription,
        status: 'PENDING',
        webhookStatus: 'PENDING',
      },
    });

    const webhookUrl = this.configService.get<string>('MAKE_WEBHOOK_URL');

    if (!webhookUrl) {
      this.logger.warn('MAKE_WEBHOOK_URL is not configured in environment variables.');
      return this.prisma.quoteRequest.update({
        where: { id: quoteRequest.id },
        data: {
          webhookStatus: 'FAILED',
          webhookError: 'MAKE_WEBHOOK_URL is not configured.',
        },
      });
    }

    // 2. Trigger webhook to Make.com asynchronously/resiliently
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: quoteRequest.id,
          name: quoteRequest.name,
          email: quoteRequest.email,
          companyName: quoteRequest.companyName,
          phoneNumber: quoteRequest.phoneNumber,
          projectType: quoteRequest.projectType,
          projectBudget: quoteRequest.projectBudget,
          projectDescription: quoteRequest.projectDescription,
          createdAt: quoteRequest.createdAt,
        }),
      });

      if (response.ok) {
        quoteRequest = await this.prisma.quoteRequest.update({
          where: { id: quoteRequest.id },
          data: {
            webhookStatus: 'SUCCESS',
          },
        });
        this.logger.log(`Webhook triggered successfully for Quote Request ID: ${quoteRequest.id}`);
      } else {
        const errorText = await response.text().catch(() => 'No response body');
        const errorMessage = `HTTP ${response.status}: ${errorText}`;
        quoteRequest = await this.prisma.quoteRequest.update({
          where: { id: quoteRequest.id },
          data: {
            webhookStatus: 'FAILED',
            webhookError: errorMessage,
          },
        });
        this.logger.error(`Webhook failed for Quote Request ID ${quoteRequest.id}: ${errorMessage}`);
      }
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      quoteRequest = await this.prisma.quoteRequest.update({
        where: { id: quoteRequest.id },
        data: {
          webhookStatus: 'FAILED',
          webhookError: errorMessage,
        },
      });
      this.logger.error(`Webhook exception for Quote Request ID ${quoteRequest.id}: ${errorMessage}`);
    }

    return quoteRequest;
  }

  validateAdminKey(key: string): boolean {
    const adminKey = this.configService.get<string>('ADMIN_KEY') ?? 'GödöllőAdmin2026';
    return key === adminKey;
  }

  async findAll(): Promise<QuoteRequest[]> {
    return this.prisma.quoteRequest.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(id: number, status: string): Promise<QuoteRequest> {
    return this.prisma.quoteRequest.update({
      where: { id },
      data: { status },
    });
  }

  async remove(id: number): Promise<QuoteRequest> {
    return this.prisma.quoteRequest.delete({
      where: { id },
    });
  }

  async removeAll(): Promise<{ count: number }> {
    return this.prisma.quoteRequest.deleteMany({});
  }
}
