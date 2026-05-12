import { PrismaClient, IncidentStage } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminUsername = process.env.ADMIN_USERNAME ?? "admin";
  const adminEmail = adminUsername.includes("@") ? adminUsername : "admin@statushub.local";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "admin";
  const passwordHash = adminPassword.startsWith("$2") ? adminPassword : await bcrypt.hash(adminPassword, 12);

  await prisma.user.upsert({
    where: { email: adminEmail.toLowerCase() },
    update: {
      name: adminUsername,
      role: "admin",
      passwordHash,
      isActive: true
    },
    create: {
      email: adminEmail.toLowerCase(),
      name: adminUsername,
      role: "admin",
      passwordHash,
      isActive: true
    }
  });

  const [website, booking, payment, checkin, amos] = await Promise.all([
    prisma.application.upsert({
      where: { code: "WEB" },
      update: { statusPageOrder: 10 },
      create: { name: "Website", code: "WEB", ownerTeam: "Web Platform", statusPageLabel: "Website", statusPageOrder: 10, defaultStatus: "green" }
    }),
    prisma.application.upsert({
      where: { code: "BOOKING" },
      update: { statusPageOrder: 20 },
      create: { name: "Booking", code: "BOOKING", ownerTeam: "Booking Platform", statusPageLabel: "Booking", statusPageOrder: 20, defaultStatus: "green" }
    }),
    prisma.application.upsert({
      where: { code: "PAYMENT" },
      update: { statusPageOrder: 40 },
      create: { name: "Payment", code: "PAYMENT", ownerTeam: "Payments", statusPageLabel: "Payment", statusPageOrder: 40, defaultStatus: "green" }
    }),
    prisma.application.upsert({
      where: { code: "CHECKIN" },
      update: { statusPageOrder: 30 },
      create: { name: "Check-in", code: "CHECKIN", ownerTeam: "Guest Experience", statusPageLabel: "Check-in", statusPageOrder: 30, defaultStatus: "green" }
    }),
    prisma.application.upsert({
      where: { code: "AMOS" },
      update: { statusPageOrder: 50 },
      create: { name: "AMOS", code: "AMOS", ownerTeam: "AMOS Platform", statusPageLabel: "AMOS", statusPageOrder: 50, defaultStatus: "green" }
    })
  ]);

  const [outage, degradation, performance, maintenance] = await Promise.all([
    prisma.incidentType.upsert({
      where: { name: "Full Outage" },
      update: {},
      create: { name: "Full Outage", severityLevel: 1, defaultColor: "red", notifyTechnical: true, notifyBusiness: true, notifyExecutive: true }
    }),
    prisma.incidentType.upsert({
      where: { name: "Partial Degradation" },
      update: {},
      create: { name: "Partial Degradation", severityLevel: 2, defaultColor: "yellow", notifyTechnical: true, notifyBusiness: true, notifyExecutive: false }
    }),
    prisma.incidentType.upsert({
      where: { name: "Performance Issue" },
      update: {},
      create: { name: "Performance Issue", severityLevel: 2, defaultColor: "yellow", notifyTechnical: true, notifyBusiness: true, notifyExecutive: false }
    }),
    prisma.incidentType.upsert({
      where: { name: "Planned Maintenance" },
      update: {},
      create: { name: "Planned Maintenance", severityLevel: 3, defaultColor: "blue", notifyTechnical: true, notifyBusiness: false, notifyExecutive: false, isMaintenance: true }
    })
  ]);

  const groups = await Promise.all([
    upsertGroup("Website Technical Team", "Website responders and on-call engineers", "technical", ["web-oncall@example.local", "web-platform@example.local"]),
    upsertGroup("Booking Technical Team", "Booking responders and on-call engineers", "technical", ["booking-oncall@example.local"]),
    upsertGroup("Payment Technical Team", "Payment responders and on-call engineers", "technical", ["payment-oncall@example.local"]),
    upsertGroup("Check-in Technical Team", "Check-in responders and on-call engineers", "technical", ["checkin-oncall@example.local"]),
    upsertGroup("AMOS Technical Team", "AMOS responders and on-call engineers", "technical", ["amos-oncall@example.local"]),
    upsertGroup("Business Stakeholders", "Internal business distribution list", "business", ["business-stakeholders@example.local"]),
    upsertGroup("Executive Stakeholders", "Executive incident communications", "executive", ["executives@example.local"]),
    upsertGroup("Maintenance Audience", "Teams and stakeholders receiving maintenance notices", "maintenance", ["maintenance-audience@example.local"])
  ]);

  const [websiteTech, bookingTech, paymentTech, checkinTech, amosTech, business, executive, maintenanceAudience] = groups;
  for (const app of [website, booking, payment, checkin, amos]) {
    const technicalGroupId =
      app.code === "WEB" ? websiteTech.id :
      app.code === "BOOKING" ? bookingTech.id :
      app.code === "CHECKIN" ? checkinTech.id :
      app.code === "AMOS" ? amosTech.id :
      paymentTech.id;
    for (const type of [outage, degradation, performance, maintenance]) {
      await prisma.applicationGroupRule.upsert({
        where: { applicationId_incidentTypeId: { applicationId: app.id, incidentTypeId: type.id } },
        update: {},
        create: {
          applicationId: app.id,
          incidentTypeId: type.id,
          technicalGroupId,
          businessGroupId: business.id,
          executiveGroupId: executive.id,
          maintenanceGroupId: maintenanceAudience.id
        }
      });
    }
  }

  await upsertDependency({
    upstreamApplicationId: website.id,
    downstreamApplicationId: booking.id,
    moduleName: "Booking funnel",
    integrationName: "Website booking widget",
    impactDescription: "Customers may not be able to start or complete new reservations from the public website.",
    impactLevel: "red"
  });
  await upsertDependency({
    upstreamApplicationId: website.id,
    downstreamApplicationId: checkin.id,
    moduleName: "Online check-in",
    integrationName: "Website guest portal",
    impactDescription: "Guests may lose access to online check-in and reservation lookup from the website.",
    impactLevel: "yellow"
  });
  await upsertDependency({
    upstreamApplicationId: booking.id,
    downstreamApplicationId: payment.id,
    moduleName: "Reservation payment",
    integrationName: "Booking payment handoff",
    impactDescription: "Payment authorization can be blocked when reservation context cannot be created.",
    impactLevel: "yellow"
  });
  await upsertDependency({
    upstreamApplicationId: amos.id,
    downstreamApplicationId: booking.id,
    moduleName: "Flight operations handoff",
    integrationName: "AMOS to booking coordination",
    impactDescription: "Reservation operations may be delayed when AMOS cannot provide timely operational updates.",
    impactLevel: "yellow"
  });
  await upsertDependency({
    upstreamApplicationId: amos.id,
    downstreamApplicationId: checkin.id,
    moduleName: "Operational readiness sync",
    integrationName: "AMOS check-in advisory feed",
    impactDescription: "Check-in teams may lose operational readiness visibility when AMOS is unavailable.",
    impactLevel: "red"
  });

  const templateCopy: Record<IncidentStage, { subject: string; html: string; text: string }> = {
    started: {
      subject: "[Disruption] {{app_name}} - {{incident_type}}",
      html: "<h2>{{app_name}} service disruption</h2><p>{{summary}}</p><p>Our teams are working to restore normal service.</p><p><strong>Working teams:</strong> {{working_teams}}</p><p><strong>Next update:</strong> {{next_update_at}}</p>",
      text: "{{app_name}} service disruption\n\n{{summary}}\n\nOur teams are working to restore normal service.\n\nWorking teams: {{working_teams}}\nNext update: {{next_update_at}}"
    },
    update: {
      subject: "[Ongoing Issue] {{app_name}} - update",
      html: "<h2>{{app_name}} status update</h2><p>{{summary}}</p><p>The issue is still ongoing. Our technical teams continue to work on resolution.</p><p><strong>Working teams:</strong> {{working_teams}}</p><p><strong>Next update:</strong> {{next_update_at}}</p>",
      text: "{{app_name}} status update\n\n{{summary}}\n\nThe issue is still ongoing. Our technical teams continue to work on resolution.\n\nWorking teams: {{working_teams}}\nNext update: {{next_update_at}}"
    },
    resolved: {
      subject: "[Resolved] {{app_name}} - service restored",
      html: "<h2>{{app_name}} issue resolved</h2><p>{{summary}}</p><p>The service has returned to normal operation. Thank you for your patience.</p>",
      text: "{{app_name}} issue resolved\n\n{{summary}}\n\nThe service has returned to normal operation. Thank you for your patience."
    },
    maintenance: {
      subject: "[Planned Maintenance] {{app_name}}",
      html: "<h2>{{app_name}} planned maintenance</h2><p>{{summary}}</p><p>During the maintenance window, users may experience temporary disruption or degraded performance.</p><p><strong>Responsible teams:</strong> {{working_teams}}</p><p><strong>Next update:</strong> {{next_update_at}}</p>",
      text: "{{app_name}} planned maintenance\n\n{{summary}}\n\nDuring the maintenance window, users may experience temporary disruption or degraded performance.\n\nResponsible teams: {{working_teams}}\nNext update: {{next_update_at}}"
    }
  };

  for (const stage of Object.values(IncidentStage)) {
    const copy = templateCopy[stage];
    const existing = await prisma.messageTemplate.findFirst({ where: { stage, isDefault: true } });
    if (!existing) {
      await prisma.messageTemplate.create({
        data: {
          stage,
          subjectTemplate: copy.subject,
          bodyHtmlTemplate: copy.html,
          bodyTextTemplate: copy.text,
          isDefault: true
        }
      });
    } else {
      await prisma.messageTemplate.update({
        where: { id: existing.id },
        data: {
          subjectTemplate: copy.subject,
          bodyHtmlTemplate: copy.html,
          bodyTextTemplate: copy.text
        }
      });
    }
  }

  await upsertScopedTemplate({
    applicationId: amos.id,
    incidentTypeId: outage.id,
    stage: "started",
    subjectTemplate: "[Critical Outage] AMOS - operational service unavailable",
    bodyHtmlTemplate: "<h2>AMOS outage in progress</h2><p>AMOS is currently unavailable for operational users.</p><p>{{summary}}</p><p><strong>Working teams:</strong> {{working_teams}}</p><p><strong>Next update:</strong> {{next_update_at}}</p><p>StatusHub will continue to provide verified updates as recovery progresses.</p>",
    bodyTextTemplate: "AMOS outage in progress\n\nAMOS is currently unavailable for operational users.\n\n{{summary}}\n\nWorking teams: {{working_teams}}\nNext update: {{next_update_at}}\n\nStatusHub will continue to provide verified updates as recovery progresses."
  });
  await upsertScopedTemplate({
    applicationId: amos.id,
    incidentTypeId: performance.id,
    stage: "started",
    subjectTemplate: "[Performance Degradation] AMOS - service is slow or delayed",
    bodyHtmlTemplate: "<h2>AMOS performance degradation</h2><p>AMOS remains available, but users may experience slow response times or delayed workflows.</p><p>{{summary}}</p><p><strong>Working teams:</strong> {{working_teams}}</p><p><strong>Next update:</strong> {{next_update_at}}</p><p>Further updates will be shared after technical verification.</p>",
    bodyTextTemplate: "AMOS performance degradation\n\nAMOS remains available, but users may experience slow response times or delayed workflows.\n\n{{summary}}\n\nWorking teams: {{working_teams}}\nNext update: {{next_update_at}}\n\nFurther updates will be shared after technical verification."
  });
  await upsertScopedTemplate({
    applicationId: amos.id,
    incidentTypeId: outage.id,
    stage: "update",
    subjectTemplate: "[Update] AMOS outage - restoration work continues",
    bodyHtmlTemplate: "<h2>AMOS outage update</h2><p>The outage is still under active investigation and restoration work is ongoing.</p><p>{{summary}}</p><p><strong>Working teams:</strong> {{working_teams}}</p><p><strong>Next update:</strong> {{next_update_at}}</p>",
    bodyTextTemplate: "AMOS outage update\n\nThe outage is still under active investigation and restoration work is ongoing.\n\n{{summary}}\n\nWorking teams: {{working_teams}}\nNext update: {{next_update_at}}"
  });
  await upsertScopedTemplate({
    applicationId: amos.id,
    incidentTypeId: performance.id,
    stage: "update",
    subjectTemplate: "[Update] AMOS performance issue - stabilization in progress",
    bodyHtmlTemplate: "<h2>AMOS performance update</h2><p>AMOS is still online, but stabilization work is ongoing and some workflows may remain slower than normal.</p><p>{{summary}}</p><p><strong>Working teams:</strong> {{working_teams}}</p><p><strong>Next update:</strong> {{next_update_at}}</p>",
    bodyTextTemplate: "AMOS performance update\n\nAMOS is still online, but stabilization work is ongoing and some workflows may remain slower than normal.\n\n{{summary}}\n\nWorking teams: {{working_teams}}\nNext update: {{next_update_at}}"
  });
  await upsertScopedTemplate({
    applicationId: amos.id,
    incidentTypeId: outage.id,
    stage: "resolved",
    subjectTemplate: "[Resolved] AMOS - operational service restored",
    bodyHtmlTemplate: "<h2>AMOS restored</h2><p>AMOS service has been restored and operational workflows are returning to normal.</p><p>{{summary}}</p><p>We will continue monitoring closely for stability.</p>",
    bodyTextTemplate: "AMOS restored\n\nAMOS service has been restored and operational workflows are returning to normal.\n\n{{summary}}\n\nWe will continue monitoring closely for stability."
  });
  await upsertScopedTemplate({
    applicationId: amos.id,
    incidentTypeId: performance.id,
    stage: "resolved",
    subjectTemplate: "[Resolved] AMOS - performance normalized",
    bodyHtmlTemplate: "<h2>AMOS performance normalized</h2><p>AMOS response times have returned to expected levels.</p><p>{{summary}}</p><p>We will continue monitoring closely for stability.</p>",
    bodyTextTemplate: "AMOS performance normalized\n\nAMOS response times have returned to expected levels.\n\n{{summary}}\n\nWe will continue monitoring closely for stability."
  });

  await prisma.auditLog.create({
    data: {
      actorType: "system",
      actorName: "seed",
      action: "database.seeded",
      entityType: "System",
      entityId: "seed",
      payloadJson: { applications: 5, incidentTypes: 4, notificationGroups: 8, dependencies: 5 }
    }
  });
}

async function upsertDependency(input: {
  upstreamApplicationId: string;
  downstreamApplicationId: string;
  moduleName: string;
  integrationName: string;
  impactDescription: string;
  impactLevel: "green" | "yellow" | "red" | "blue";
}) {
  await prisma.applicationDependency.upsert({
    where: {
      upstreamApplicationId_downstreamApplicationId_moduleName_integrationName: {
        upstreamApplicationId: input.upstreamApplicationId,
        downstreamApplicationId: input.downstreamApplicationId,
        moduleName: input.moduleName,
        integrationName: input.integrationName
      }
    },
    update: {
      impactDescription: input.impactDescription,
      impactLevel: input.impactLevel,
      isActive: true
    },
    create: input
  });
}

async function upsertGroup(name: string, description: string, groupType: "technical" | "business" | "executive" | "maintenance", emails: string[]) {
  const group = await prisma.notificationGroup.upsert({
    where: { name },
    update: {},
    create: { name, description, groupType }
  });

  for (const email of emails) {
    await prisma.notificationGroupMember.upsert({
      where: { notificationGroupId_email: { notificationGroupId: group.id, email } },
      update: {},
      create: {
        notificationGroupId: group.id,
        email,
        displayName: email.split("@")[0]
      }
    });
  }
  return group;
}

async function upsertScopedTemplate(input: {
  applicationId: string;
  incidentTypeId: string;
  stage: IncidentStage;
  subjectTemplate: string;
  bodyHtmlTemplate: string;
  bodyTextTemplate: string;
}) {
  const existing = await prisma.messageTemplate.findFirst({
    where: {
      applicationId: input.applicationId,
      incidentTypeId: input.incidentTypeId,
      stage: input.stage
    }
  });

  if (!existing) {
    await prisma.messageTemplate.create({
      data: {
        ...input,
        isDefault: false
      }
    });
    return;
  }

  await prisma.messageTemplate.update({
    where: { id: existing.id },
    data: {
      subjectTemplate: input.subjectTemplate,
      bodyHtmlTemplate: input.bodyHtmlTemplate,
      bodyTextTemplate: input.bodyTextTemplate
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
