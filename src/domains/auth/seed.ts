import { connectToDatabase } from "../../config/db";
import { User } from "../../models/User";
import { Department } from "../../models/Department";
import { BudgetPeriod } from "../../models/BudgetPeriod";
import { WorkflowConfig } from "../../models/WorkflowConfig";
import { AuthService } from "./auth.service";
import { SystemRole } from "../../enums/roles";
import { LoggerService } from "../logs/logger.service";

export async function runDatabaseSeed() {
  await connectToDatabase();
  console.log("Starting database seeding...");

  // 1. Clean existing collections to ensure a fresh demo state
  await User.deleteMany({});
  await Department.deleteMany({});
  await BudgetPeriod.deleteMany({});
  await WorkflowConfig.deleteMany({});
  
  // 2. Create Departments
  const engDept = new Department({ name: "Engineering", description: "Product development and engineering team" });
  const mktDept = new Department({ name: "Marketing", description: "Growth, campaigns, and advertising" });
  const salesDept = new Department({ name: "Sales", description: "Enterprise sales and accounts" });
  await engDept.save();
  await mktDept.save();
  await salesDept.save();
  
  console.log("Departments created.");

  // 3. Create Budget Periods for July 2026 (matching the spec date)
  const currentYear = new Date().getFullYear();
  const julyStart = new Date(currentYear, 6, 1); // July 1st
  const julyEnd = new Date(currentYear, 6, 31, 23, 59, 59); // July 31st

  const engBudget = new BudgetPeriod({
    departmentId: engDept._id,
    periodName: `${currentYear}-July`,
    totalBudget: 50000,
    utilisedBudget: 0,
    pendingBudget: 0,
    startDate: julyStart,
    endDate: julyEnd
  });

  const mktBudget = new BudgetPeriod({
    departmentId: mktDept._id,
    periodName: `${currentYear}-July`,
    totalBudget: 25000,
    utilisedBudget: 0,
    pendingBudget: 0,
    startDate: julyStart,
    endDate: julyEnd
  });

  await engBudget.save();
  await mktBudget.save();
  console.log("Budgets created.");

  // 4. Create Users (with hashed passwords)
  const adminPassword = await AuthService.hashPassword("admin123");
  const initPassword = await AuthService.hashPassword("init123");
  const appPassword = await AuthService.hashPassword("app123");
  const headPassword = await AuthService.hashPassword("head123");
  const officerPassword = await AuthService.hashPassword("officer123");
  const managerPassword = await AuthService.hashPassword("manager123");

  const users = [
    {
      email: "admin@spendflow.com",
      name: "Alice Admin",
      role: SystemRole.ADMIN,
      passwordHash: adminPassword,
      isActive: true,
    },
    {
      email: "initiator@spendflow.com",
      name: "Ian Initiator",
      role: SystemRole.INITIATOR,
      departmentId: engDept._id,
      passwordHash: initPassword,
      isActive: true,
    },
    {
      email: "approver@spendflow.com",
      name: "Audrey Approver",
      role: SystemRole.APPROVER,
      departmentId: engDept._id,
      passwordHash: appPassword,
      isActive: true,
    },
    {
      email: "head@spendflow.com",
      name: "Helen Head (Finance Head)",
      role: SystemRole.FINANCE_HEAD,
      passwordHash: headPassword,
      isActive: true,
    },
    {
      email: "officer@spendflow.com",
      name: "Oscar Officer (Finance Officer)",
      role: SystemRole.FINANCE_OFFICER,
      passwordHash: officerPassword,
      isActive: true,
    },
    {
      email: "manager@spendflow.com",
      name: "Marcus Manager (Finance Manager)",
      role: SystemRole.FINANCE_MANAGER,
      passwordHash: managerPassword,
      isActive: true,
    }
  ];

  await User.insertMany(users);
  console.log("Default users seeded.");

  // 5. Create Default Active Workflow configuration
  const defaultWorkflow = new WorkflowConfig({
    name: "Standard Dynamic Lifecycle",
    isActive: true,
    steps: [
      {
        stepIndex: 0,
        stepName: "Departmental Manager Review",
        role: SystemRole.APPROVER,
        minAmount: 0,
        requiresAllApprovals: false
      },
      {
        stepIndex: 1,
        stepName: "Finance Audit & Bank Upload",
        role: SystemRole.FINANCE_OFFICER,
        minAmount: 100, // Only trigger if request is >= $100 (demonstrates amount skip)
        requiresAllApprovals: false
      },
      {
        stepIndex: 2,
        stepName: "Payment Release Authorization",
        role: SystemRole.FINANCE_MANAGER,
        minAmount: 0,
        requiresAllApprovals: false
      }
    ]
  });
  await defaultWorkflow.save();
  console.log("Default Workflow Config seeded.");

  await LoggerService.logAudit(
    "SYSTEM_SEED",
    "Database successfully re-seeded with demo master data: engineering/marketing departments, budgets, default users, and active workflow configuration."
  );

  return { success: true, message: "Database seeded successfully" };
}
