import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "../../../../config/db";
import { WorkflowConfig } from "../../../../models/WorkflowConfig";
import { WorkflowService } from "../../../../domains/workflow/workflow.service";
import { LoggerService } from "../../../../domains/logs/logger.service";
import { authenticate } from "../../../../middlewares/auth";
import { withErrorHandling } from "../../../../middlewares/errors";
import { WorkflowConfigUpdateSchema } from "../../../../validators/validation";
import { SystemRole } from "../../../../enums/roles";

export const GET = withErrorHandling(async (req: NextRequest) => {
  await connectToDatabase();
  await authenticate(req, [SystemRole.ADMIN]);

  const config = await WorkflowService.getActiveWorkflow();
  return NextResponse.json({ success: true, steps: config.steps });
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  await connectToDatabase();
  const user = await authenticate(req, [SystemRole.ADMIN]);

  const body = await req.json();
  const validated = WorkflowConfigUpdateSchema.parse(body);

  let config = await WorkflowConfig.findOne({ isActive: true });
  if (!config) {
    config = new WorkflowConfig({ name: "Custom Dynamic Workflow", isActive: true });
  }

  // Update steps with validated data
  config.steps = validated.steps;
  await config.save();

  const logActor = { id: user.id, name: user.name, role: user.role };
  await LoggerService.logAudit(
    "WORKFLOW_CONFIG_UPDATED",
    `Admin ${user.name} modified the dynamic approval workflow configuration`,
    { steps: config.steps },
    logActor
  );

  return NextResponse.json({ success: true, steps: config.steps });
});
