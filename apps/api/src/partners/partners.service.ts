import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import type {
  CreatePartnerApplicationDto,
  UpdatePartnerApplicationStatusDto,
} from './partners.dto.js';

@Injectable()
export class PartnersService {
  constructor(private readonly prisma: PrismaService) {}

  async submit(dto: CreatePartnerApplicationDto): Promise<Record<string, unknown>> {
    if (!dto.consentAccepted) {
      throw new BadRequestException('Consent is required to submit a partner application');
    }
    const application = await this.prisma.partnerApplication.create({
      data: {
        partnerType: dto.partnerType,
        contactName: dto.contactName.trim(),
        organizationName: dto.organizationName?.trim() || null,
        email: dto.email.trim().toLocaleLowerCase(),
        website: dto.website?.trim() || null,
        state: dto.state?.trim() || null,
        district: dto.district?.trim() || null,
        focusAreas: JSON.stringify(dto.focusAreas.map((item) => item.trim()).filter(Boolean)),
        message: dto.message.trim(),
        consentAt: new Date(),
      },
    });
    return this.present(application);
  }

  async listForReview(): Promise<Record<string, unknown>[]> {
    const applications = await this.prisma.partnerApplication.findMany({
      where: { status: 'PENDING_REVIEW' },
      orderBy: { createdAt: 'asc' },
    });
    return applications.map((application) => this.present(application));
  }

  async updateStatus(
    applicationId: string,
    facilitatorId: string,
    dto: UpdatePartnerApplicationStatusDto,
  ): Promise<Record<string, unknown>> {
    const existing = await this.prisma.partnerApplication.findUnique({
      where: { id: applicationId },
    });
    if (!existing) throw new NotFoundException('Partner application not found');
    const updated = await this.prisma.partnerApplication.update({
      where: { id: applicationId },
      data: { status: dto.status, reviewedById: facilitatorId },
    });
    return this.present(updated);
  }

  private parseFocusAreas(value: string): string[] {
    try {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed) && parsed.every((item) => typeof item === 'string')
        ? parsed
        : [];
    } catch {
      return [];
    }
  }

  private present(application: {
    id: string;
    partnerType: string;
    contactName: string;
    organizationName: string | null;
    email: string;
    website: string | null;
    state: string | null;
    district: string | null;
    focusAreas: string;
    message: string;
    status: string;
    createdAt: Date;
  }): Record<string, unknown> {
    return {
      id: application.id,
      partnerType: application.partnerType,
      contactName: application.contactName,
      organizationName: application.organizationName,
      email: application.email,
      website: application.website,
      state: application.state,
      district: application.district,
      focusAreas: this.parseFocusAreas(application.focusAreas),
      message: application.message,
      status: application.status,
      createdAt: application.createdAt,
    };
  }
}
