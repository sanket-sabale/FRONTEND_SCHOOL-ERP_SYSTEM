import type { TenantScopedQuery } from "@/lib/api/client";
import { academicStructureService } from "@/lib/api/academic-structure";
import type { StudentAcademicPlacementOption } from "@/features/students/types/student";

export const academicPlacementAdapter = {
  async getPlacementOptions(scope: TenantScopedQuery): Promise<StudentAcademicPlacementOption[]> {
    const placements = await academicStructureService.getPlacementOptions(scope);

    return placements.map((placement) => ({
      classId: placement.classId,
      className: placement.className,
      sectionId: placement.sectionId,
      sectionName: placement.sectionName,
    }));
  },

  async validatePlacement(scope: TenantScopedQuery, classId: string, sectionId: string): Promise<StudentAcademicPlacementOption> {
    const placement = await academicStructureService.validatePlacement(scope, classId, sectionId);

    return {
      classId: placement.classId,
      className: placement.className,
      sectionId: placement.sectionId,
      sectionName: placement.sectionName,
    };
  },
};
