/* eslint-disable @typescript-eslint/no-explicit-any */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

// Deterministic IDs so relations are stable across reseeds.
const IDS = {
  // Roles
  roleHr: "role-hr-admin",
  roleTeacher: "role-teacher",
  roleMarketing: "role-marketing",
  // Departments
  deptHr: "dept-hr",
  deptAcademics: "dept-academics",
  deptMarketing: "dept-marketing",
  // Users / Employees
  uPriya: "user-priya", // HR Admin
  uArun: "user-arun", // Teacher
  uMeera: "user-meera", // Teacher
  uKabir: "user-kabir", // Marketing
  uSara: "user-sara", // Marketing
  uVikram: "user-vikram", // Teacher
  uNeha: "user-neha", // Marketing
  ePriya: "emp-priya",
  eArun: "emp-arun",
  eMeera: "emp-meera",
  eKabir: "emp-kabir",
  eSara: "emp-sara",
  eVikram: "emp-vikram",
  eNeha: "emp-neha",
} as const;

// Permission catalog (Section 6.2)
const PERMISSIONS = [
  "employee:create",
  "employee:edit",
  "employee:delete",
  "employee:view_all",
  "attendance:mark_own",
  "attendance:view_all",
  "attendance:override",
  "report:submit_teacher",
  "report:submit_marketing",
  "report:view_own",
  "report:view_all",
  "leave:request",
  "leave:approve",
  "analytics:view_org",
  "analytics:view_own",
  "notification:broadcast",
  "settings:manage",
  "audit:view",
];

const ROLE_PERMISSIONS: Record<string, string[]> = {
  [IDS.roleHr]: [
    "employee:create",
    "employee:edit",
    "employee:delete",
    "employee:view_all",
    "attendance:mark_own",
    "attendance:view_all",
    "attendance:override",
    "report:view_all",
    "leave:request",
    "leave:approve",
    "analytics:view_org",
    "notification:broadcast",
    "settings:manage",
    "audit:view",
  ],
  [IDS.roleTeacher]: [
    "attendance:mark_own",
    "report:submit_teacher",
    "report:view_own",
    "leave:request",
    "analytics:view_own",
  ],
  [IDS.roleMarketing]: [
    "attendance:mark_own",
    "report:submit_marketing",
    "report:view_own",
    "leave:request",
    "analytics:view_own",
  ],
};

function daysAgo(n: number): Date {
  const d = new Date();
  d.setHours(9, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}
function daysFromNow(n: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d;
}
function todayAt(h: number, m = 0): Date {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

async function main() {
  console.log("Seeding Implex Edu HRMS…");

  // ----- Permissions -----
  const permMap: Record<string, string> = {};
  for (const name of PERMISSIONS) {
    const p = await db.permission.upsert({
      where: { name },
      update: {},
      create: {
        id: `perm-${name.replace(/[:]/g, "-")}`,
        name,
        description: name,
      },
    });
    permMap[name] = p.id;
  }

  // ----- Roles -----
  await db.role.upsert({
    where: { id: IDS.roleHr },
    update: {},
    create: {
      id: IDS.roleHr,
      name: "hr_admin",
      label: "HR Admin",
      description: "Full HR administration access",
    },
  });
  await db.role.upsert({
    where: { id: IDS.roleTeacher },
    update: {},
    create: {
      id: IDS.roleTeacher,
      name: "teacher",
      label: "Teacher",
      description: "Teaching staff — daily class reporting",
    },
  });
  await db.role.upsert({
    where: { id: IDS.roleMarketing },
    update: {},
    create: {
      id: IDS.roleMarketing,
      name: "marketing",
      label: "Marketing",
      description: "Sales & marketing — leads, deals, calls",
    },
  });

  // ----- Role <-> Permission -----
  await db.rolePermission.deleteMany({});
  for (const [roleId, perms] of Object.entries(ROLE_PERMISSIONS)) {
    for (const permName of perms) {
      await db.rolePermission.create({
        data: { roleId, permissionId: permMap[permName] },
      });
    }
  }

  // ----- Departments -----
  await db.department.upsert({
    where: { id: IDS.deptHr },
    update: {},
    create: {
      id: IDS.deptHr,
      name: "Human Resources",
      code: "HR",
      description: "People operations & administration",
    },
  });
  await db.department.upsert({
    where: { id: IDS.deptAcademics },
    update: {},
    create: {
      id: IDS.deptAcademics,
      name: "Academics",
      code: "ACAD",
      description: "Teaching & curriculum delivery",
    },
  });
  await db.department.upsert({
    where: { id: IDS.deptMarketing },
    update: {},
    create: {
      id: IDS.deptMarketing,
      name: "Marketing & Sales",
      code: "MKT",
      description: "Lead generation, pipeline, revenue",
    },
  });

  // ----- Users + Profiles + Employees -----
  type EmpSeed = {
    userId: string;
    empId: string;
    email: string;
    name: string;
    code: string;
    dept: string;
    designation: string;
    roleId: string;
    managerEmpId?: string;
    phone?: string;
    bio?: string;
    joinDaysAgo: number;
  };

  const employees: EmpSeed[] = [
    {
      userId: IDS.uPriya, empId: IDS.ePriya, email: "priya.sharma@implexedu.in",
      name: "Priya Sharma", code: "IMP-HR-001", dept: IDS.deptHr,
      designation: "HR Manager", roleId: IDS.roleHr,
      phone: "+91 98200 11223", bio: "HR lead with 8 yrs in ed-tech people ops.",
      joinDaysAgo: 720,
    },
    {
      userId: IDS.uArun, empId: IDS.eArun, email: "arun.iyer@implexedu.in",
      name: "Arun Iyer", code: "IMP-ACAD-001", dept: IDS.deptAcademics,
      designation: "Senior Physics Faculty", roleId: IDS.roleTeacher,
      managerEmpId: IDS.ePriya,
      phone: "+91 98211 44556", bio: "Physics faculty for JEE/NEET batches.",
      joinDaysAgo: 540,
    },
    {
      userId: IDS.uMeera, empId: IDS.eMeera, email: "meera.nair@implexedu.in",
      name: "Meera Nair", code: "IMP-ACAD-002", dept: IDS.deptAcademics,
      designation: "Mathematics Faculty", roleId: IDS.roleTeacher,
      managerEmpId: IDS.ePriya,
      phone: "+91 98222 77889", bio: "Maths faculty — foundation & advanced.",
      joinDaysAgo: 410,
    },
    {
      userId: IDS.uVikram, empId: IDS.eVikram, email: "vikram.rao@implexedu.in",
      name: "Vikram Rao", code: "IMP-ACAD-003", dept: IDS.deptAcademics,
      designation: "Chemistry Faculty", roleId: IDS.roleTeacher,
      managerEmpId: IDS.ePriya,
      phone: "+91 98300 22114", bio: "Chemistry specialist, NEET track.",
      joinDaysAgo: 220,
    },
    {
      userId: IDS.uKabir, empId: IDS.eKabir, email: "kabir.menon@implexedu.in",
      name: "Kabir Menon", code: "IMP-MKT-001", dept: IDS.deptMarketing,
      designation: "Marketing Lead", roleId: IDS.roleMarketing,
      managerEmpId: IDS.ePriya,
      phone: "+91 98400 55667", bio: "Growth & partnerships.",
      joinDaysAgo: 365,
    },
    {
      userId: IDS.uSara, empId: IDS.eSara, email: "sara.khan@implexedu.in",
      name: "Sara Khan", code: "IMP-MKT-002", dept: IDS.deptMarketing,
      designation: "Inside Sales Rep", roleId: IDS.roleMarketing,
      managerEmpId: IDS.eKabir,
      phone: "+91 98500 99001", bio: "Inbound conversions.",
      joinDaysAgo: 180,
    },
    {
      userId: IDS.uNeha, empId: IDS.eNeha, email: "neha.joshi@implexedu.in",
      name: "Neha Joshi", code: "IMP-MKT-003", dept: IDS.deptMarketing,
      designation: "Field Sales Rep", roleId: IDS.roleMarketing,
      managerEmpId: IDS.eKabir,
      phone: "+91 98600 11234", bio: "On-ground events & school tie-ups.",
      joinDaysAgo: 95,
    },
  ];

  for (const e of employees) {
    await db.user.upsert({
      where: { id: e.userId },
      update: {},
      create: {
        id: e.userId,
        email: e.email,
        passwordHash: "demo-hash-implex",
        emailVerified: new Date(),
      },
    });
    await db.profile.upsert({
      where: { userId: e.userId },
      update: {},
      create: {
        id: `prof-${e.userId}`,
        userId: e.userId,
        displayName: e.name,
        phone: e.phone,
        bio: e.bio,
        avatarUrl: null,
      },
    });
    await db.employee.upsert({
      where: { id: e.empId },
      update: {},
      create: {
        id: e.empId,
        userId: e.userId,
        employeeCode: e.code,
        departmentId: e.dept,
        designation: e.designation,
        joinDate: daysAgo(e.joinDaysAgo),
        employmentStatus: "active",
        reportingManagerId: e.managerEmpId ?? null,
      },
    });
    // user_role link (idempotent)
    const existing = await db.userRole.findFirst({
      where: { userId: e.userId, roleId: e.roleId },
    });
    if (!existing) {
      await db.userRole.create({
        data: { userId: e.userId, roleId: e.roleId },
      });
    }
  }

  // ----- Holidays -----
  await db.holiday.deleteMany({});
  const holidays = [
    { name: "Republic Day", date: daysFromNow(-180) },
    { name: "Holi", date: daysFromNow(-120) },
    { name: "Independence Day", date: daysFromNow(-30) },
    { name: "Gandhi Jayanti", date: daysFromNow(20) },
    { name: "Diwali", date: daysFromNow(55) },
    { name: "Christmas", date: daysFromNow(85) },
  ];
  for (const h of holidays) {
    await db.holiday.create({
      data: { name: h.name, holidayDate: h.date, description: "Public holiday" },
    });
  }

  // ----- Attendance (last 14 days for all employees) -----
  await db.attendance.deleteMany({});
  const allEmpIds = employees.map((e) => e.empId);
  for (let d = 0; d < 14; d++) {
    for (const empId of allEmpIds) {
      // skip sundays
      const date = daysAgo(d);
      if (date.getDay() === 0) continue;
      const rand = (empId.charCodeAt(0) + d) % 10;
      let status = "present";
      let checkIn: Date | null = todayAt(9, (rand * 3) % 50);
      let checkOut: Date | null = todayAt(18, (rand * 4) % 40);
      if (rand === 1) {
        status = "half_day";
        checkOut = todayAt(13, 30);
      } else if (rand === 2 && d > 0) {
        status = "on_leave";
        checkIn = null;
        checkOut = null;
      } else if (rand === 3 && d > 2) {
        status = "absent";
        checkIn = null;
        checkOut = null;
      }
      // Use the actual date for check-in/out to keep history meaningful
      const ci = checkIn ? new Date(date.getTime() + checkIn.getHours() * 3600000 + checkIn.getMinutes() * 60000) : null;
      const co = checkOut ? new Date(date.getTime() + checkOut.getHours() * 3600000 + checkOut.getMinutes() * 60000) : null;
      await db.attendance.create({
        data: {
          employeeId: empId,
          attendanceDate: date,
          checkInAt: ci,
          checkOutAt: co,
          status,
          markedById: empId,
          note: status === "absent" ? "Auto-marked" : null,
        },
      });
    }
  }

  // ----- Teacher reports (last 10 working days for Arun, Meera, Vikram) -----
  await db.teacherReport.deleteMany({});
  await db.teacherClass.deleteMany({});
  const teachers = [IDS.eArun, IDS.eMeera, IDS.eVikram];
  const batches = ["JEE-A", "JEE-B", "NEET-A", "Foundation-10", "Foundation-11"];
  const subjectsByTeacher: Record<string, string[]> = {
    [IDS.eArun]: ["Physics", "Physics Lab"],
    [IDS.eMeera]: ["Algebra", "Calculus"],
    [IDS.eVikram]: ["Organic Chemistry", "Inorganic Chemistry"],
  };
  for (let d = 1; d <= 10; d++) {
    for (const tId of teachers) {
      // ~85% submission rate
      if ((tId.charCodeAt(0) + d) % 10 === 7) continue;
      const date = daysAgo(d);
      if (date.getDay() === 0) continue;
      const tr = await db.teacherReport.create({
        data: {
          employeeId: tId,
          reportDate: date,
          notes: d % 3 === 0 ? "Doubt session conducted after class." : null,
        },
      });
      const classCount = ((tId.charCodeAt(0) + d) % 3) + 1; // 1..3
      for (let c = 0; c < classCount; c++) {
        const subject = subjectsByTeacher[tId][c % subjectsByTeacher[tId].length];
        await db.teacherClass.create({
          data: {
            teacherReportId: tr.id,
            batch: batches[(tId.charCodeAt(0) + c) % batches.length],
            subject,
            topicsCovered: [
              "Kinematics — motion equations",
              "Rotational dynamics",
              "Thermodynamics laws",
              "Integration techniques",
              "Coordination compounds",
              "Periodic trends",
            ][(tId.charCodeAt(0) + c + d) % 6],
            studentsAttended: 18 + ((tId.charCodeAt(0) + c + d) % 22),
            assignmentsChecked: d % 2 === 0,
          },
        });
      }
    }
  }

  // ----- Marketing reports (calls + meetings, last 10 days for Kabir, Sara, Neha) -----
  await db.marketingReport.deleteMany({});
  await db.marketingMeeting.deleteMany({});
  await db.marketingCall.deleteMany({});
  const marketers = [IDS.eKabir, IDS.eSara, IDS.eNeha];
  const callOutcomes = ["connected", "voicemail", "no_answer", "callback_scheduled"];
  for (let d = 1; d <= 10; d++) {
    for (const mId of marketers) {
      if ((mId.charCodeAt(0) + d) % 7 === 5) continue;
      const date = daysAgo(d);
      if (date.getDay() === 0) continue;
      const mr = await db.marketingReport.create({
        data: {
          employeeId: mId,
          reportDate: date,
          notes: d % 4 === 0 ? "Strong inbound flow from campaign." : null,
        },
      });
      const callCount = 4 + ((mId.charCodeAt(0) + d) % 6);
      for (let c = 0; c < callCount; c++) {
        await db.marketingCall.create({
          data: {
            marketingReportId: mr.id,
            contactName: ["R. Gupta", "S. Patel", "A. Reddy", "M. Singh", "L. Fernandes", "D. Bose"][c % 6],
            contactPhone: `+91 9${(800000000 + c * 11111 + d * 7).toString().slice(0, 9)}`,
            outcome: callOutcomes[(mId.charCodeAt(0) + c + d) % 4],
            notes: c % 2 === 0 ? "Sent brochure." : null,
          },
        });
      }
      const meetCount = d % 2;
      for (let m = 0; m < meetCount; m++) {
        await db.marketingMeeting.create({
          data: {
            marketingReportId: mr.id,
            counterparty: ["Bright Future Academy", "St. Xavier School", "Greenwood Inst.", "City Tuition Centre"][m % 4],
            purpose: "Partnership pitch",
            outcome: m === 0 ? "Positive — demo scheduled" : "Follow-up needed",
            durationMinutes: 30 + (m * 15),
          },
        });
      }
    }
  }

  // ----- Leads -----
  await db.marketingLead.deleteMany({});
  await db.marketingFollowup.deleteMany({});
  await db.marketingDeal.deleteMany({});
  const leadSeeds = [
    { owner: IDS.eKabir, name: "Bright Future Academy", status: "qualified", value: 450000, source: "referral" },
    { owner: IDS.eKabir, name: "St. Xavier School", status: "contacted", value: 320000, source: "event" },
    { owner: IDS.eSara, name: "Aarav Sharma (Parent)", status: "new", value: 85000, source: "ads" },
    { owner: IDS.eSara, name: "Priya Reddy (Parent)", status: "contacted", value: 95000, source: "website" },
    { owner: IDS.eSara, name: "Mehta Family", status: "converted", value: 120000, source: "referral" },
    { owner: IDS.eNeha, name: "Greenwood Institute", status: "qualified", value: 560000, source: "outbound" },
    { owner: IDS.eNeha, name: "City Tuition Centre", status: "lost", value: 180000, source: "event" },
    { owner: IDS.eNeha, name: "Sunrise Classes", status: "new", value: 75000, source: "outbound" },
    { owner: IDS.eKabir, name: "DPS Alumni Group", status: "contacted", value: 220000, source: "referral" },
    { owner: IDS.eSara, name: "R. Bose (Parent)", status: "qualified", value: 60000, source: "ads" },
  ];
  for (const l of leadSeeds) {
    const created = daysAgo(((l.name.length * 3) % 18) + 1);
    const lead = await db.marketingLead.create({
      data: {
        ownerEmployeeId: l.owner,
        name: l.name,
        contactPhone: "+91 98" + (Math.floor(Math.random() * 90000000) + 10000000),
        contactEmail: l.name.toLowerCase().replace(/[^a-z]/g, ".") + "@example.in",
        source: l.source,
        status: l.status,
        estimatedValue: l.value,
        createdAt: created,
      },
    });
    // follow-ups
    await db.marketingFollowup.create({
      data: {
        leadId: lead.id,
        dueDate: daysFromNow((l.name.length % 5) - 1),
        task: "Send detailed brochure & pricing",
        done: l.status === "converted" || l.status === "lost",
      },
    });
    if (l.status === "qualified" || l.status === "converted" || l.status === "contacted") {
      const stage = l.status === "converted" ? "won" : l.status === "qualified" ? "proposal" : "prospecting";
      await db.marketingDeal.create({
        data: {
          leadId: lead.id,
          ownerEmployeeId: l.owner,
          title: `${l.name} — engagement`,
          stage,
          revenueAmount: l.value,
          closedAt: l.status === "converted" ? daysAgo(1) : null,
        },
      });
    }
  }

  // ----- Leave requests -----
  await db.leaveRequest.deleteMany({});
  const leaveSeeds = [
    { emp: IDS.eArun, type: "casual", start: daysFromNow(3), end: daysFromNow(4), reason: "Family function", status: "pending" },
    { emp: IDS.eMeera, type: "sick", start: daysAgo(2), end: daysAgo(2), reason: "Fever", status: "approved", approver: IDS.ePriya, decided: daysAgo(2) },
    { emp: IDS.eKabir, type: "earned", start: daysFromNow(10), end: daysFromNow(14), reason: "Annual vacation", status: "pending" },
    { emp: IDS.eVikram, type: "casual", start: daysFromNow(1), end: daysFromNow(1), reason: "Personal work", status: "pending" },
    { emp: IDS.eSara, type: "sick", start: daysAgo(5), end: daysAgo(5), reason: "Migraine", status: "rejected", approver: IDS.ePriya, decided: daysAgo(5) },
    { emp: IDS.eNeha, type: "unpaid", start: daysFromNow(20), end: daysFromNow(22), reason: "Outstation event", status: "pending" },
  ];
  for (const l of leaveSeeds) {
    await db.leaveRequest.create({
      data: {
        employeeId: l.emp,
        leaveType: l.type,
        startDate: l.start,
        endDate: l.end,
        reason: l.reason,
        status: l.status,
        approvedById: l.approver ?? null,
        decidedAt: l.decided ?? null,
      },
    });
  }

  // ----- Notifications -----
  await db.notification.deleteMany({});
  const notifSeeds = [
    { user: IDS.uArun, type: "leave.approved", title: "Leave approved", body: "Your sick leave on was approved by Priya Sharma.", t: daysAgo(2) },
    { user: IDS.uPriya, type: "leave.requested", title: "New leave request", body: "Arun Iyer requested casual leave.", t: daysAgo(0) },
    { user: IDS.uPriya, type: "leave.requested", title: "New leave request", body: "Kabir Menon requested earned leave (5 days).", t: daysAgo(0) },
    { user: IDS.uKabir, type: "report.reminder", title: "Daily report reminder", body: "Submit your marketing report for today.", t: daysAgo(0) },
    { user: IDS.uArun, type: "report.reminder", title: "Daily report reminder", body: "Submit your teacher report for today.", t: daysAgo(0) },
    { user: IDS.uPriya, type: "announcement", title: "Org-wide: New leave policy", body: "Casual leave accrual increased to 1.5/month.", t: daysAgo(1) },
  ];
  for (const n of notifSeeds) {
    await db.notification.create({
      data: {
        userId: n.user,
        type: n.type,
        title: n.title,
        body: n.body,
        payload: "{}",
        createdAt: n.t,
        readAt: n.t.getTime() < Date.now() - 86400000 ? n.t : null,
      },
    });
  }

  // ----- Audit logs -----
  await db.auditLog.deleteMany({});
  const auditSeeds = [
    { actor: IDS.ePriya, action: "employee.create", table: "employees", target: IDS.eNeha, after: { name: "Neha Joshi", code: "IMP-MKT-003" }, t: daysAgo(95) },
    { actor: IDS.ePriya, action: "leave.approve", table: "leave_requests", target: "lr-1", after: { status: "approved" }, t: daysAgo(2) },
    { actor: IDS.ePriya, action: "attendance.override", table: "attendance", target: "att-1", after: { status: "present" }, t: daysAgo(1) },
    { actor: IDS.eKabir, action: "deal.stage_change", table: "marketing_deals", target: "d-1", after: { stage: "proposal" }, t: daysAgo(3) },
    { actor: IDS.ePriya, action: "settings.update", table: "settings", target: "s-1", after: { key: "report_reminder_time", value: "18:00" }, t: daysAgo(4) },
  ];
  for (const a of auditSeeds) {
    await db.auditLog.create({
      data: {
        actorId: a.actor,
        action: a.action,
        targetTable: a.table,
        targetId: a.target,
        beforeState: null,
        afterState: JSON.stringify(a.after),
        ipAddress: "10.0.0." + (Math.floor(Math.random() * 200) + 2),
        createdAt: a.t,
      },
    });
  }

  // ----- Settings -----
  await db.settings.deleteMany({});
  await db.settings.create({ data: { key: "report_reminder_time", value: JSON.stringify("18:00") } });
  await db.settings.create({ data: { key: "monthly_revenue_target", value: JSON.stringify(1500000) } });
  await db.settings.create({ data: { key: "org_name", value: JSON.stringify("Implex Edu") } });
  await db.settings.create({ data: { key: "leave_balances", value: JSON.stringify({ casual: 12, sick: 8, earned: 20, unpaid: 0 }) } });

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
