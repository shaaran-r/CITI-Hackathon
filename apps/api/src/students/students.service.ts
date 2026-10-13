import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import type { UpdateStudentDto } from './students.dto.js';

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  async getById(studentId: string): Promise<Record<string, unknown>> {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: { profile: true },
    });
    if (!student) throw new NotFoundException('Student profile not found');
    return {
      id: student.id,
      displayName: student.displayName,
      gradeLevel: student.gradeLevel,
      profile: student.profile
        ? {
            ...student.profile,
            interests: JSON.parse(student.profile.interests) as string[],
            strengths: JSON.parse(student.profile.strengths) as string[],
          }
        : null,
    };
  }

  async update(studentId: string, data: UpdateStudentDto): Promise<Record<string, unknown>> {
    const student = await this.prisma.student.update({
      where: { id: studentId },
      data,
    });
    return { id: student.id, displayName: student.displayName, gradeLevel: student.gradeLevel };
  }
}
