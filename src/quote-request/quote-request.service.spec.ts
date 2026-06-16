import { Test, TestingModule } from '@nestjs/testing';
import { QuoteRequestService } from './quote-request.service';
import { PrismaService } from '../prisma.service';
import { ConfigService } from '@nestjs/config';
import { CreateQuoteRequestDto } from './dto/create-quote-request.dto';

describe('QuoteRequestService', () => {
  let service: QuoteRequestService;
  let prisma: PrismaService;
  let configService: ConfigService;

  const mockQuoteRequest = {
    id: 1,
    name: 'Gábor Gödöllő',
    email: 'gabor@example.hu',
    companyName: 'Gödöllő KKV Kft.',
    phoneNumber: '+36301234567',
    projectType: 'Webfejlesztés + Automatizáció',
    projectBudget: '500,000 - 1,000,000 Ft',
    projectDescription: 'Szeretnénk egy modern honlapot ügyfélkezelő rendszerrel összekötve.',
    status: 'PENDING',
    webhookStatus: 'PENDING',
    webhookError: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockDto: CreateQuoteRequestDto = {
    name: 'Gábor Gödöllő',
    email: 'gabor@example.hu',
    companyName: 'Gödöllő KKV Kft.',
    phoneNumber: '+36301234567',
    projectType: 'Webfejlesztés + Automatizáció',
    projectBudget: '500,000 - 1,000,000 Ft',
    projectDescription: 'Szeretnénk egy modern honlapot ügyfélkezelő rendszerrel összekötve.',
  };

  const mockPrisma = {
    quoteRequest: {
      create: jest.fn().mockResolvedValue(mockQuoteRequest),
      update: jest.fn(),
    },
  };

  const mockConfig = {
    get: jest.fn().mockReturnValue('https://hook.make.com/mock-id'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuoteRequestService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<QuoteRequestService>(QuoteRequestService);
    prisma = module.get<PrismaService>(PrismaService);
    configService = module.get<ConfigService>(ConfigService);

    // Reset mocks and global fetch
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should save to database and successfully call Make.com webhook', async () => {
      // Mock fetch response for success
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
      });

      // Mock update to return success status
      const updatedRequest = { ...mockQuoteRequest, webhookStatus: 'SUCCESS' };
      mockPrisma.quoteRequest.update.mockResolvedValue(updatedRequest);

      const result = await service.create(mockDto);

      expect(prisma.quoteRequest.create).toHaveBeenCalledWith({
        data: {
          name: mockDto.name,
          email: mockDto.email,
          companyName: mockDto.companyName,
          phoneNumber: mockDto.phoneNumber,
          projectType: mockDto.projectType,
          projectBudget: mockDto.projectBudget,
          projectDescription: mockDto.projectDescription,
          status: 'PENDING',
          webhookStatus: 'PENDING',
        },
      });

      expect(global.fetch).toHaveBeenCalledWith('https://hook.make.com/mock-id', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.any(String),
      });

      // Assert webhook payload content
      const fetchCallArgs = (global.fetch as jest.Mock).mock.calls[0];
      const payload = JSON.parse(fetchCallArgs[1].body);
      expect(payload.id).toBe(mockQuoteRequest.id);
      expect(payload.name).toBe(mockQuoteRequest.name);

      expect(prisma.quoteRequest.update).toHaveBeenCalledWith({
        where: { id: mockQuoteRequest.id },
        data: { webhookStatus: 'SUCCESS' },
      });

      expect(result.webhookStatus).toBe('SUCCESS');
    });

    it('should handle webhook HTTP failure, record FAILED status, and return saved record', async () => {
      // Mock fetch response for failure (e.g. 500 error)
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        text: jest.fn().mockResolvedValue('Internal Server Error'),
      });

      // Mock update to return failed status
      const failedRequest = {
        ...mockQuoteRequest,
        webhookStatus: 'FAILED',
        webhookError: 'HTTP 500: Internal Server Error',
      };
      mockPrisma.quoteRequest.update.mockResolvedValue(failedRequest);

      const result = await service.create(mockDto);

      expect(prisma.quoteRequest.create).toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalled();
      expect(prisma.quoteRequest.update).toHaveBeenCalledWith({
        where: { id: mockQuoteRequest.id },
        data: {
          webhookStatus: 'FAILED',
          webhookError: 'HTTP 500: Internal Server Error',
        },
      });

      expect(result.webhookStatus).toBe('FAILED');
      expect(result.webhookError).toBe('HTTP 500: Internal Server Error');
    });

    it('should handle fetch exception, record FAILED status, and return saved record', async () => {
      // Mock fetch to throw network error
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network connection timeout'));

      const failedRequest = {
        ...mockQuoteRequest,
        webhookStatus: 'FAILED',
        webhookError: 'Network connection timeout',
      };
      mockPrisma.quoteRequest.update.mockResolvedValue(failedRequest);

      const result = await service.create(mockDto);

      expect(prisma.quoteRequest.create).toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalled();
      expect(prisma.quoteRequest.update).toHaveBeenCalledWith({
        where: { id: mockQuoteRequest.id },
        data: {
          webhookStatus: 'FAILED',
          webhookError: 'Network connection timeout',
        },
      });

      expect(result.webhookStatus).toBe('FAILED');
      expect(result.webhookError).toBe('Network connection timeout');
    });

    it('should handle missing MAKE_WEBHOOK_URL configuration', async () => {
      mockConfig.get.mockReturnValue(undefined);

      const failedRequest = {
        ...mockQuoteRequest,
        webhookStatus: 'FAILED',
        webhookError: 'MAKE_WEBHOOK_URL is not configured.',
      };
      mockPrisma.quoteRequest.update.mockResolvedValue(failedRequest);

      const result = await service.create(mockDto);

      expect(prisma.quoteRequest.create).toHaveBeenCalled();
      expect(global.fetch).not.toHaveBeenCalled();
      expect(prisma.quoteRequest.update).toHaveBeenCalledWith({
        where: { id: mockQuoteRequest.id },
        data: {
          webhookStatus: 'FAILED',
          webhookError: 'MAKE_WEBHOOK_URL is not configured.',
        },
      });
      expect(result.webhookStatus).toBe('FAILED');
    });
  });

  describe('validateAdminKey', () => {
    it('should return true for matching admin key', () => {
      mockConfig.get.mockReturnValue('GödöllőAdmin2026');
      expect(service.validateAdminKey('GödöllőAdmin2026')).toBe(true);
    });

    it('should return false for incorrect key', () => {
      mockConfig.get.mockReturnValue('GödöllőAdmin2026');
      expect(service.validateAdminKey('WrongKey')).toBe(false);
    });
  });

  describe('findAll', () => {
    it('should call prisma.quoteRequest.findMany and return requests', async () => {
      const requests = [mockQuoteRequest];
      mockPrisma.quoteRequest.findMany = jest.fn().mockResolvedValue(requests);

      const result = await service.findAll();

      expect(prisma.quoteRequest.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(requests);
    });
  });

  describe('updateStatus', () => {
    it('should update and return updated request', async () => {
      const updated = { ...mockQuoteRequest, status: 'CONTACTED' };
      mockPrisma.quoteRequest.update.mockResolvedValue(updated);

      const result = await service.updateStatus(1, 'CONTACTED');

      expect(prisma.quoteRequest.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: 'CONTACTED' },
      });
      expect(result.status).toBe('CONTACTED');
    });
  });

  describe('remove', () => {
    it('should delete and return deleted request', async () => {
      mockPrisma.quoteRequest.delete = jest.fn().mockResolvedValue(mockQuoteRequest);

      const result = await service.remove(1);

      expect(prisma.quoteRequest.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result).toEqual(mockQuoteRequest);
    });
  });

  describe('removeAll', () => {
    it('should call prisma.quoteRequest.deleteMany and return count', async () => {
      const mockResult = { count: 5 };
      mockPrisma.quoteRequest.deleteMany = jest.fn().mockResolvedValue(mockResult);

      const result = await service.removeAll();

      expect(prisma.quoteRequest.deleteMany).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });
  });
});

