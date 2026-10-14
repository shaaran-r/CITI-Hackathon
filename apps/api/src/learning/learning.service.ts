import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import type { CreateLearningModuleDto } from './learning.dto.js';

@Injectable()
export class LearningService {
  constructor(private readonly prisma: PrismaService) {}

  async listPublished(): Promise<Record<string, unknown>[]> {
    const modules = await this.prisma.learningModule.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: [{ category: 'asc' }, { title: 'asc' }],
    });
    return modules.map((module) => this.present(module));
  }

  async listForFacilitator(facilitatorId: string): Promise<Record<string, unknown>[]> {
    const modules = await this.prisma.learningModule.findMany({
      where: { facilitatorId },
      orderBy: { updatedAt: 'desc' },
    });
    return modules.map((module) => this.present(module));
  }

  async create(
    facilitatorId: string,
    dto: CreateLearningModuleDto,
  ): Promise<Record<string, unknown>> {
    const priceInr = dto.priceInr ?? 0;
    if (dto.pricingModel === 'FREE' && priceInr !== 0) {
      throw new BadRequestException('Free modules must have a zero price');
    }
    if (dto.pricingModel !== 'FREE' && priceInr < 1) {
      throw new BadRequestException('Paid modules need a price greater than zero');
    }

    const module = await this.prisma.learningModule.create({
      data: {
        facilitatorId,
        title: dto.title.trim(),
        description: dto.description.trim(),
        category: dto.category.trim(),
        language: dto.language,
        lessons: JSON.stringify(dto.lessons.map((lesson) => lesson.trim()).filter(Boolean)),
        pricingModel: dto.pricingModel,
        priceInr,
      },
    });
    return this.present(module);
  }

  async publish(facilitatorId: string, moduleId: string): Promise<Record<string, unknown>> {
    const module = await this.prisma.learningModule.findFirst({
      where: { id: moduleId, facilitatorId },
    });
    if (!module) throw new NotFoundException('Learning module not found');
    const lessons = this.parseLessons(module.lessons);
    if (lessons.length === 0)
      throw new BadRequestException('Add at least one lesson before publishing');

    const published = await this.prisma.learningModule.update({
      where: { id: module.id },
      data: { status: 'PUBLISHED' },
    });
    return this.present(published);
  }

  private parseLessons(value: string): string[] {
    try {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed) && parsed.every((item) => typeof item === 'string')
        ? parsed
        : [];
    } catch {
      return [];
    }
  }

  private present(module: {
    id: string;
    facilitatorId: string;
    title: string;
    description: string;
    category: string;
    language: string;
    lessons: string;
    pricingModel: string;
    priceInr: number;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }): Record<string, unknown> {
    return {
      id: module.id,
      facilitatorId: module.facilitatorId,
      title: module.title,
      description: module.description,
      category: module.category,
      language: module.language,
      lessons: this.parseLessons(module.lessons),
      pricingModel: module.pricingModel,
      priceInr: module.priceInr,
      status: module.status,
      createdAt: module.createdAt,
      updatedAt: module.updatedAt,
    };
  }
}
