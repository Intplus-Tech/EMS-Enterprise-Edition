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
      vendorName: "Olamide Adenuga",
      vendorBankDetails: {
        accountNumber: "0019283746",
        bankName: "Access Bank",
        accountName: "Olamide Adenuga"
      },
      requiredPaymentDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5),
      status: "UPLOADED_TO_BANK"
    },
    {
      requestNumber: "REQ-0039",
      departmentId: mktDept._id,
      initiatorId: initiatorUser._id,
      category: "Annual Marketing Conference",
      description: "Covers booth, travel, and collateral for the SaaS Connect conference in September.",
      amount: 38500,
      supportingDocument: "Invoice_Q3.pdf",
      vendorName: "Emeka Kalu",
      vendorBankDetails: {
        accountNumber: "1012938475",
        bankName: "Zenith Bank",
        accountName: "Emeka Kalu"
      },
      requiredPaymentDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3),
      status: "UPLOADED_TO_BANK"
    },
    {
      requestNumber: "REQ-0037",
      departmentId: legalDept._id,
      initiatorId: initiatorUser._id,
      category: "Annual Marketing Conference",
      description: "Renewal of legal stationeries & compliance document filings.",
      amount: 9000,
      supportingDocument: "Invoice_Q3.pdf",
      vendorName: "Olamide Adenuga",
      vendorBankDetails: {
        accountNumber: "0019283746",
        bankName: "Access Bank",
        accountName: "Olamide Adenuga"
      },
      requiredPaymentDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 10),
      status: "UPLOADED_TO_BANK"
    },
    {
      requestNumber: "REQ-0518",
      departmentId: techDept._id,
      initiatorId: initiatorUser._id,
      category: "Server Node Replacement",
      description: "Initial request for server node replacement. Vendor quote attached. Urgent requirement to maintain redundancy in Node Cluster 4.",
      amount: 1250000,
      supportingDocument: "Invoice_Q3.pdf",
      vendorName: "Blessing Okafor",
      vendorBankDetails: {
        accountNumber: "0012933746",
        bankName: "Access Bank",
        accountName: "Blessing Okafor"
      },
      requiredPaymentDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2),
      status: "UPLOADED_TO_BANK"
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
        bankName: "Access Bank",
        accountName: "James Okafor"
      },
      requiredPaymentDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 4),
      status: "INSUFFICIENT_BUDGET"
    },
    {
      requestNumber: "REQ-2101",
      departmentId: techDept._id,
      initiatorId: initiatorUser._id,
      category: "Q3 IT Infrastructure Upgrade",
      description: "Urgent replacement of failed server nodes in the Lagos data center to prevent downtime. Budget approved for Q3.",
      amount: 12450000,
      supportingDocument: "Invoice_Q3.pdf",
      vendorName: "Blessing Okafor",
      vendorBankDetails: {
        accountNumber: "0012933746",
        bankName: "Access Bank",
        accountName: "Blessing Okafor"
      },
      requiredPaymentDate: new Date("2026-07-15"),
      status: "PAID",
      paymentReference: "TXN-2026-0789-1234",
      paymentReceipt: "payment_receipt_2101.pdf",
      paymentDate: new Date("2026-07-15T14:32:00")
    },
    {
      requestNumber: "REQ-0040",
      departmentId: mktDept._id,
      initiatorId: initiatorUser._id,
      category: "Annual Marketing Conference",
      description: "SaaS Marketing conference registration and venue deposit.",
      amount: 9500,
      supportingDocument: "Invoice_Q3.pdf",
      vendorName: "Emeka Kalu",
      vendorBankDetails: {
        accountNumber: "1012938475",
        bankName: "Zenith Bank",
        accountName: "Emeka Kalu"
      },
      requiredPaymentDate: new Date("2026-07-12"),
      status: "PAID",
      paymentReference: "CASH-2026-03",
      paymentReceipt: "receipt_cash_0040.pdf",
      paymentDate: new Date("2026-07-12T10:15:00")
    },
    {
      requestNumber: "REQ-0039-PAID",
      departmentId: legalDept._id,
      initiatorId: initiatorUser._id,
      category: "Legal Compliance Fee",
      description: "Annual statutory corporate filings and legal compliance fees.",
      amount: 7000,
      supportingDocument: "Invoice_Q3.pdf",
      vendorName: "Olamide Adenuga",
      vendorBankDetails: {
        accountNumber: "0019283746",
        bankName: "Access Bank",
        accountName: "Olamide Adenuga"
      },
      requiredPaymentDate: new Date("2026-07-10"),
      status: "PAID",
      paymentReference: "CHQ-2026-042",
      paymentReceipt: "receipt_cheque_0039.pdf",
      paymentDate: new Date("2026-07-10T11:00:00")
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
