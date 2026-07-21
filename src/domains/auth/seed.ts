import { connectToDatabase } from "../../config/db";
import { User } from "../../models/User";
import { Department } from "../../models/Department";
import { BudgetPeriod } from "../../models/BudgetPeriod";
import { WorkflowConfig } from "../../models/WorkflowConfig";
import { ExpenseRequest } from "../../models/ExpenseRequest";
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
  await ExpenseRequest.deleteMany({});
  
  // 2. Create Departments
  const engDept = new Department({ name: "Engineering", description: "Product development and engineering team" });
  const mktDept = new Department({ name: "Marketing", description: "Growth, campaigns, and advertising" });
  const salesDept = new Department({ name: "Sales", description: "Enterprise sales and accounts" });
  const techDept = new Department({ name: "Technology", description: "IT infrastructure, servers, and operations" });
  const legalDept = new Department({ name: "Legal", description: "Legal counsel, retentions, and litigation" });
  await engDept.save();
  await mktDept.save();
  await salesDept.save();
  await techDept.save();
  await legalDept.save();
  
  console.log("Departments created.");

  // 3. Create Budget Periods
  const currentYear = new Date().getFullYear();
  const julyStart = new Date(currentYear, 6, 1);
  const julyEnd = new Date(currentYear, 6, 31, 23, 59, 59);

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
    totalBudget: 12545000,
    utilisedBudget: 545000,
    pendingBudget: 0,
    startDate: julyStart,
    endDate: julyEnd
  });

  const techBudget = new BudgetPeriod({
    departmentId: techDept._id,
    periodName: `${currentYear}-July`,
    totalBudget: 12545000,
    utilisedBudget: 1211000,
    pendingBudget: 30000,
    startDate: julyStart,
    endDate: julyEnd
  });

  await engBudget.save();
  await mktBudget.save();
  await techBudget.save();
  console.log("Budgets created.");

  // 4. Create Users (with hashed passwords)
  const adminPassword = await AuthService.hashPassword("admin123");
  const initPassword = await AuthService.hashPassword("init123");
  const appPassword = await AuthService.hashPassword("app123");
  const headPassword = await AuthService.hashPassword("head123");
  const officerPassword = await AuthService.hashPassword("officer123");
  const managerPassword = await AuthService.hashPassword("manager123");

  const adminUser = new User({
    email: "admin@spendflow.com",
    name: "Alice Admin",
    role: SystemRole.ADMIN,
    passwordHash: adminPassword,
    isActive: true,
  });

  const initiatorUser = new User({
    email: "initiator@spendflow.com",
    name: "Ian Initiator",
    role: SystemRole.INITIATOR,
    departmentId: engDept._id,
    passwordHash: initPassword,
    isActive: true,
  });

  const approverUser = new User({
    email: "approver@spendflow.com",
    name: "Audrey Approver",
    role: SystemRole.APPROVER,
    departmentId: engDept._id,
    passwordHash: appPassword,
    isActive: true,
  });

  const headUser = new User({
    email: "head@spendflow.com",
    name: "Helen Head",
    role: SystemRole.FINANCE_HEAD,
    passwordHash: headPassword,
    isActive: true,
  });

  const officerUser = new User({
    email: "officer@spendflow.com",
    name: "Jane Doe", // matches "Jane Doe" from the mockups
    role: SystemRole.FINANCE_OFFICER,
    passwordHash: officerPassword,
    isActive: true,
  });

  const managerUser = new User({
    email: "manager@spendflow.com",
    name: "Jerry Doe", // matches "Jerry Doe" from workflow stepper
    role: SystemRole.FINANCE_MANAGER,
    passwordHash: managerPassword,
    isActive: true,
  });

  await adminUser.save();
  await initiatorUser.save();
  await approverUser.save();
  await headUser.save();
  await officerUser.save();
  await managerUser.save();
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
        minAmount: 100,
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

  // 6. Seed Mock Expense Requests matching Screenshot layouts
  const requests = [
    {
      requestNumber: "REQ-0041",
      departmentId: techDept._id,
      initiatorId: initiatorUser._id,
      category: "Q3 IT Infrastructure Upgrade",
      description: "Replacement of 12 aging servers ahead of Q4 peak load — vendor quote attached.",
      amount: 38500,
      supportingDocument: "Invoice_Q3.pdf",
      vendorName: "James Okafor",
      vendorBankDetails: {
        accountNumber: "0019283746",
        bankName: "Access Bank PLC",
        accountName: "James Okafor"
      },
      requiredPaymentDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5),
      status: "SENT_TO_FINANCE"
    },
    {
      requestNumber: "REQ-0039",
      departmentId: mktDept._id,
      initiatorId: initiatorUser._id,
      category: "Annual Marketing Conference Spend",
      description: "Covers booth, travel, and collateral for the SaaS Connect conference in September.",
      amount: 12800,
      supportingDocument: "Invoice_Q3.pdf",
      vendorName: "Priya Nair",
      vendorBankDetails: {
        accountNumber: "0019283746",
        bankName: "Access Bank PLC",
        accountName: "Priya Nair"
      },
      requiredPaymentDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3),
      status: "RETURNED"
    },
    {
      requestNumber: "REQ-0037",
      departmentId: legalDept._id,
      initiatorId: initiatorUser._id,
      category: "Legal Retainer Renewal",
      description: "Renewal of existing retainer with Hartley & Co., no scope changes.",
      amount: 9000,
      supportingDocument: "Invoice_Q3.pdf",
      vendorName: "Tom Blaine",
      vendorBankDetails: {
        accountNumber: "0019283746",
        bankName: "Access Bank PLC",
        accountName: "Tom Blaine"
      },
      requiredPaymentDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 10),
      status: "SENT_TO_FINANCE"
    },
    {
      requestNumber: "REQ-0044",
      departmentId: techDept._id,
      initiatorId: initiatorUser._id,
      category: "Emergency Data Centre Cooling Unit",
      description: "Exceeds departmental cap by ₦21,000. Risk of downtime without immediate replacement.",
      amount: 61000,
      supportingDocument: "Invoice_Q3.pdf",
      vendorName: "James Okafor",
      vendorBankDetails: {
        accountNumber: "0019283746",
        bankName: "Access Bank PLC",
        accountName: "James Okafor"
      },
      requiredPaymentDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 4),
      status: "INSUFFICIENT_BUDGET"
    },
    {
      requestNumber: "REQ-2024-0512", // Completed Request (Image 3)
      departmentId: techDept._id,
      initiatorId: initiatorUser._id,
      category: "Q3 Server Maintenance",
      description: "The Q3 server maintenance fee reflects an increase of 15% due to the critical emergency replacement of industrial-grade cooling fans within our primary data center. During pre-scheduled inspections, the existing units showed signs of imminent mechanical failure, which would have compromised the uptime of core transaction processing systems. This replacement was not included in the original annual maintenance quote but is vital for operational continuity.",
      amount: 35000,
      supportingDocument: "Invoice_Q3.pdf",
      vendorName: "James Okafor",
      vendorBankDetails: {
        accountNumber: "0019283746",
        bankName: "Access Bank PLC",
        accountName: "James Okafor"
      },
      requiredPaymentDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
      status: "PAID",
      paymentReference: "TXN-10928374-RELEASE",
      paymentDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1)
    },
    {
      requestNumber: "REQ-0044-REJ",
      departmentId: techDept._id,
      initiatorId: initiatorUser._id,
      category: "Legal Retainer Renewal",
      description: "Exceeds departmental cap by ₦21,000. Risk of downtime without immediate replacement.",
      amount: 61000,
      supportingDocument: "Invoice_Q3.pdf",
      vendorName: "James Okafor",
      vendorBankDetails: {
        accountNumber: "0019283746",
        bankName: "Access Bank PLC",
        accountName: "James Okafor"
      },
      requiredPaymentDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
      status: "REJECTED"
    }
  ];

  await ExpenseRequest.insertMany(requests);
  console.log("Mock requests seeded.");

  await LoggerService.logAudit(
    "SYSTEM_SEED",
    "Database successfully re-seeded with demo master data: Technology, Legal, Marketing departments, Budgets, mock request profiles, and active workflow configuration."
  );

  return { success: true, message: "Database seeded successfully" };
}
