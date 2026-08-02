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

  const salesBudget = new BudgetPeriod({
    departmentId: salesDept._id,
    periodName: `${currentYear}-July`,
    totalBudget: 10000000,
    utilisedBudget: 0,
    pendingBudget: 0,
    startDate: julyStart,
    endDate: julyEnd
  });

  const legalBudget = new BudgetPeriod({
    departmentId: legalDept._id,
    periodName: `${currentYear}-July`,
    totalBudget: 8000000,
    utilisedBudget: 7000,
    pendingBudget: 0,
    startDate: julyStart,
    endDate: julyEnd
  });

  await engBudget.save();
  await mktBudget.save();
  await techBudget.save();
  await salesBudget.save();
  await legalBudget.save();
  console.log("Budgets created.");

  // 4. Create Users (with hashed passwords)
  const adminPassword = await AuthService.hashPassword("admin123");
  const initPassword = await AuthService.hashPassword("init123");
  const appPassword = await AuthService.hashPassword("app123");
  const headPassword = await AuthService.hashPassword("head123");
  const officerPassword = await AuthService.hashPassword("officer123");
  const managerPassword = await AuthService.hashPassword("manager123");

  const userDocs: Array<InstanceType<typeof User>> = [];

  // Global / Unrestricted accounts (no department restriction)
  const adminUser = new User({
    email: "admin@mailinator.com",
    name: "Alice Admin (Global)",
    role: SystemRole.ADMIN,
    passwordHash: adminPassword,
    isActive: true,
  });

  const headUser = new User({
    email: "head@mailinator.com",
    name: "Helen Head (Global)",
    role: SystemRole.FINANCE_HEAD,
    passwordHash: headPassword,
    isActive: true,
  });

  const officerUser = new User({
    email: "officer@mailinator.com",
    name: "Jane Doe (Global Officer)",
    role: SystemRole.FINANCE_OFFICER,
    passwordHash: officerPassword,
    isActive: true,
  });

  const managerUser = new User({
    email: "manager@mailinator.com",
    name: "Jerry Doe (Global Manager)",
    role: SystemRole.FINANCE_MANAGER,
    passwordHash: managerPassword,
    isActive: true,
  });

  // Default Engineering Initiator & Approver for demo requests backwards-compatibility
  const initiatorUser = new User({
    email: "initiator@mailinator.com",
    name: "Ian Initiator",
    role: SystemRole.INITIATOR,
    departmentId: engDept._id,
    passwordHash: initPassword,
    isActive: true,
  });

  const approverUser = new User({
    email: "approver@mailinator.com",
    name: "Audrey Approver",
    role: SystemRole.APPROVER,
    departmentId: engDept._id,
    passwordHash: appPassword,
    isActive: true,
  });

  userDocs.push(adminUser, headUser, officerUser, managerUser, initiatorUser, approverUser);

  // Department definitions map for full matrix seeding
  const deptList = [
    { key: "eng", dept: engDept, name: "Engineering" },
    { key: "mkt", dept: mktDept, name: "Marketing" },
    { key: "sales", dept: salesDept, name: "Sales" },
    { key: "tech", dept: techDept, name: "Technology" },
    { key: "legal", dept: legalDept, name: "Legal" },
  ];

  // Only the two department-scoped roles are seeded per department. Finance
  // officer/manager/head and admin are enterprise-wide, so they exist once
  // (above) — seeding a copy per department would have created accounts the
  // system has no notion of, e.g. an "Engineering Finance Head".
  for (const { key, dept, name } of deptList) {
    userDocs.push(new User({
      email: `initiator.${key}@mailinator.com`,
      name: `${name} Initiator`,
      role: SystemRole.INITIATOR,
      departmentId: dept._id,
      passwordHash: initPassword,
      isActive: true,
    }));

    userDocs.push(new User({
      email: `approver.${key}@mailinator.com`,
      name: `${name} Approver`,
      role: SystemRole.APPROVER,
      departmentId: dept._id,
      passwordHash: appPassword,
      isActive: true,
    }));
  }

  for (const u of userDocs) {
    await u.save();
  }
  console.log(`Default and per-department users seeded (${userDocs.length} users total).`);

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

  // Seed rows declare a single `supportingDocument` for readability; expand it
  // into the attachment list the app actually uses so a fresh install starts on
  // the current shape rather than relying on the legacy read-through.
  const requestsWithAttachments = requests.map((r) => ({
    ...r,
    supportingDocuments: r.supportingDocument
      ? [{ name: r.supportingDocument, url: r.supportingDocument, uploadedById: r.initiatorId, uploadedAt: new Date() }]
      : [],
  }));

  await ExpenseRequest.insertMany(requestsWithAttachments);
  console.log("Mock requests seeded.");

  await LoggerService.logAudit(
    "SYSTEM_SEED",
    "Database successfully re-seeded with demo master data: Technology, Legal, Marketing departments, Budgets, mock request profiles, and active workflow configuration."
  );

  return { success: true, message: "Database seeded successfully" };
}
