"use client";

import { WorkflowTab } from "../../../components/WorkflowTab";
import { useDashboard } from "../DashboardProvider";

export default function WorkflowPage() {
  const {
    currentUser,
    workflowSteps,
    workflowMessage,
    handleStepDetailChange,
    moveWorkflowStep,
    handleSaveWorkflowConfig,
  } = useDashboard();

  if (currentUser?.role !== "ADMIN") return null;

  return (
    <WorkflowTab
      currentUser={currentUser}
      workflowSteps={workflowSteps}
      workflowMessage={workflowMessage}
      handleStepDetailChange={handleStepDetailChange}
      moveWorkflowStep={moveWorkflowStep}
      handleSaveWorkflowConfig={handleSaveWorkflowConfig}
    />
  );
}
