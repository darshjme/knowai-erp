import { useState, useEffect, useCallback } from 'react';
import Joyride, { STATUS, ACTIONS, EVENTS } from 'react-joyride';
import { useSelector } from 'react-redux';
import { HelpCircle } from 'lucide-react';

// ---------------------------------------------------------------------------
// Role-specific tour step definitions
// ---------------------------------------------------------------------------

const COMMON_WELCOME = (roleName) => ({
  target: 'body',
  placement: 'center',
  disableBeacon: true,
  title: `Welcome, ${roleName}!`,
});

const SIDEBAR_STEP = (target, title, content) => ({
  target: `a.sidebar-nav-item[href="${target}"]`,
  content,
  title,
  disableBeacon: true,
  spotlightClicks: true,
});

const ROLE_TOURS = {
  CEO: [
    { ...COMMON_WELCOME('CEO'), content: "Here's your executive overview. Let us walk you through the key areas of Know AI ERP tailored for you." },
    SIDEBAR_STEP('/dashboard', 'Executive Dashboard', 'This is your revenue dashboard with real-time KPIs, team metrics, and financial summaries.'),
    SIDEBAR_STEP('/analytics', 'Analytics', 'Deep-dive analytics across all departments. Monitor trends and make data-driven decisions.'),
    SIDEBAR_STEP('/team', 'Team Performance', 'Team performance at a glance. View headcount, productivity, and engagement metrics.'),
    SIDEBAR_STEP('/reports', 'Reports', 'Access all reports here — financial, operational, and strategic reports in one place.'),
    SIDEBAR_STEP('/leads', 'Sales Pipeline', 'Track your sales pipeline and monitor lead conversion rates.'),
    SIDEBAR_STEP('/invoices', 'Invoices', 'Overview of invoicing, accounts receivable, and payment status.'),
    SIDEBAR_STEP('/settings', 'Settings', 'Configure company-wide settings and manage access controls.'),
  ],

  CTO: [
    { ...COMMON_WELCOME('CTO'), content: "Welcome to your technical command center. Let's explore the tools that matter most to you." },
    SIDEBAR_STEP('/dashboard', 'Dashboard', 'Your technical dashboard with sprint velocity, system health, and deployment metrics.'),
    SIDEBAR_STEP('/projects', 'Projects', 'Manage all engineering projects, milestones, and deliverables.'),
    SIDEBAR_STEP('/tasks', 'Tasks', 'Track development tasks, bugs, and feature requests across teams.'),
    SIDEBAR_STEP('/team', 'Engineering Team', 'Review your engineering team structure, skills matrix, and capacity.'),
    SIDEBAR_STEP('/analytics', 'Technical Analytics', 'Code quality metrics, deployment frequency, and system performance analytics.'),
    SIDEBAR_STEP('/docs', 'Documentation', 'Technical documentation, architecture decisions, and knowledge base.'),
    SIDEBAR_STEP('/settings', 'Settings', 'Manage integrations, API keys, and technical configurations.'),
  ],

  CFO: [
    { ...COMMON_WELCOME('CFO'), content: "Your financial command center is ready. Here's how to navigate your key financial tools." },
    SIDEBAR_STEP('/dashboard', 'Financial Dashboard', 'Real-time financial overview including revenue, expenses, and cash flow.'),
    SIDEBAR_STEP('/invoices', 'Invoices', 'Manage all invoicing — create, send, and track payment statuses.'),
    SIDEBAR_STEP('/expenses', 'Expenses', 'Review and approve expense claims. Monitor department-level spending.'),
    SIDEBAR_STEP('/payroll', 'Payroll', 'Process payroll, view salary breakdowns, and manage compensation.'),
    SIDEBAR_STEP('/reports', 'Financial Reports', 'Generate P&L, balance sheets, and custom financial reports.'),
    SIDEBAR_STEP('/analytics', 'Financial Analytics', 'Trend analysis on revenue, costs, and financial forecasting.'),
    SIDEBAR_STEP('/clients', 'Clients', 'Client portfolio with billing history and account health.'),
  ],

  BRAND_FACE: [
    { ...COMMON_WELCOME('Brand Ambassador'), content: "Welcome! Here's your guide to managing brand presence and external relations." },
    SIDEBAR_STEP('/dashboard', 'Dashboard', 'Your personalized dashboard with brand metrics and upcoming events.'),
    SIDEBAR_STEP('/clients', 'Clients', 'Manage client relationships, meetings, and partnership opportunities.'),
    SIDEBAR_STEP('/leads', 'Leads', 'Track potential partnerships and inbound brand inquiries.'),
    SIDEBAR_STEP('/calendar', 'Calendar', 'Your schedule with events, appearances, and meetings.'),
    SIDEBAR_STEP('/chat', 'Communication', 'Stay connected with internal teams and external contacts.'),
    SIDEBAR_STEP('/docs', 'Brand Docs', 'Access brand guidelines, press kits, and marketing materials.'),
  ],

  ADMIN: [
    { ...COMMON_WELCOME('Admin'), content: "You have full system access. Let's walk through the administrative tools at your disposal." },
    SIDEBAR_STEP('/dashboard', 'Dashboard', 'System-wide overview with key operational metrics.'),
    SIDEBAR_STEP('/team', 'Team Management', 'Manage all users, roles, and permissions across the organization.'),
    SIDEBAR_STEP('/hr-dashboard', 'HR Dashboard', 'Human resources overview — attendance, leaves, and workforce analytics.'),
    SIDEBAR_STEP('/settings', 'System Settings', 'Configure system-wide settings, integrations, and security policies.'),
    SIDEBAR_STEP('/audit', 'Audit Log', 'Track all system activities, user actions, and security events.'),
    SIDEBAR_STEP('/reports', 'Reports', 'Generate reports from any department or module.'),
    SIDEBAR_STEP('/notifications', 'Notifications', 'Manage notification rules and system alerts.'),
  ],

  HR: [
    { ...COMMON_WELCOME('HR Manager'), content: "Your HR management hub is ready. Let's explore your people management tools." },
    SIDEBAR_STEP('/hr-dashboard', 'HR Dashboard', 'Your central hub for all HR metrics, attendance, and workforce data.'),
    SIDEBAR_STEP('/team', 'Team', 'View the full employee directory, org chart, and team structure.'),
    SIDEBAR_STEP('/leaves', 'Leave Management', 'Review and approve leave requests. Track leave balances.'),
    SIDEBAR_STEP('/payroll', 'Payroll', 'Process salaries, manage deductions, and generate pay slips.'),
    SIDEBAR_STEP('/hiring', 'Recruitment', 'Manage job postings, track applicants, and run the hiring pipeline.'),
    SIDEBAR_STEP('/documents', 'Documents', 'Store and manage employee documents, contracts, and policies.'),
    SIDEBAR_STEP('/complaints', 'Complaints', 'Handle employee grievances and workplace complaints confidentially.'),
  ],

  ACCOUNTING: [
    { ...COMMON_WELCOME('Accountant'), content: "Your accounting workspace is set up. Here are the tools you'll use daily." },
    SIDEBAR_STEP('/dashboard', 'Dashboard', 'Quick overview of pending transactions and financial summaries.'),
    SIDEBAR_STEP('/invoices', 'Invoices', 'Create and manage invoices, track payments, and reconcile accounts.'),
    SIDEBAR_STEP('/expenses', 'Expenses', 'Process expense claims, manage receipts, and categorize spending.'),
    SIDEBAR_STEP('/payroll', 'Payroll', 'Assist with payroll processing and salary disbursements.'),
    SIDEBAR_STEP('/reports', 'Financial Reports', 'Generate accounting reports, ledgers, and tax summaries.'),
    SIDEBAR_STEP('/clients', 'Clients', 'Manage client billing accounts and payment histories.'),
  ],

  PRODUCT_OWNER: [
    { ...COMMON_WELCOME('Product Owner'), content: "Welcome! Here's your product management toolkit in Know AI ERP." },
    SIDEBAR_STEP('/dashboard', 'Dashboard', 'Product metrics at a glance — feature progress, sprint status, and KPIs.'),
    SIDEBAR_STEP('/projects', 'Projects', 'Manage product roadmaps, epics, and feature prioritization.'),
    SIDEBAR_STEP('/tasks', 'Tasks', 'Create and manage user stories, tasks, and sprint backlogs.'),
    SIDEBAR_STEP('/goals', 'Goals', 'Set and track product OKRs and quarterly objectives.'),
    SIDEBAR_STEP('/analytics', 'Analytics', 'Product analytics — usage metrics, feature adoption, and user insights.'),
    SIDEBAR_STEP('/docs', 'Documentation', 'PRDs, specs, and product documentation in one place.'),
    SIDEBAR_STEP('/calendar', 'Calendar', 'Sprint planning, release dates, and stakeholder meetings.'),
  ],

  CONTENT_STRATEGIST: [
    { ...COMMON_WELCOME('Content Strategist'), content: "Your content workspace is ready. Let's explore the tools for planning and creating content." },
    SIDEBAR_STEP('/dashboard', 'Dashboard', 'Content performance metrics and upcoming deadlines.'),
    SIDEBAR_STEP('/tasks', 'Content Tasks', 'Manage your content calendar, assignments, and editorial pipeline.'),
    SIDEBAR_STEP('/projects', 'Campaigns', 'Track content campaigns and collaborative projects.'),
    SIDEBAR_STEP('/docs', 'Content Library', 'Access all drafts, published content, and style guides.'),
    SIDEBAR_STEP('/files', 'Media Files', 'Manage images, videos, and media assets for content.'),
    SIDEBAR_STEP('/calendar', 'Editorial Calendar', 'Plan and schedule content publication across channels.'),
    SIDEBAR_STEP('/analytics', 'Content Analytics', 'Track content performance, engagement, and reach metrics.'),
  ],

  BRAND_PARTNER: [
    { ...COMMON_WELCOME('Brand Partner'), content: "Welcome to your partner portal. Here's how to navigate your workspace." },
    SIDEBAR_STEP('/dashboard', 'Dashboard', 'Your partnership overview with key metrics and updates.'),
    SIDEBAR_STEP('/projects', 'Joint Projects', 'View and collaborate on partnership projects and campaigns.'),
    SIDEBAR_STEP('/docs', 'Shared Documents', 'Access partnership agreements, brand assets, and shared files.'),
    SIDEBAR_STEP('/calendar', 'Calendar', 'Scheduled meetings, events, and partnership milestones.'),
    SIDEBAR_STEP('/chat', 'Communication', 'Direct messaging with your internal contacts.'),
    SIDEBAR_STEP('/invoices', 'Invoices', 'View invoices and payment status for partnership engagements.'),
  ],

  SR_DEVELOPER: [
    { ...COMMON_WELCOME('Senior Developer'), content: "Your development environment is ready. Here are the tools to power your workflow." },
    SIDEBAR_STEP('/dashboard', 'Dashboard', 'Sprint progress, code review queue, and deployment status.'),
    SIDEBAR_STEP('/projects', 'Projects', 'Active projects, repositories, and technical milestones.'),
    SIDEBAR_STEP('/tasks', 'Tasks', 'Your assigned tasks, code reviews, and bug fixes.'),
    SIDEBAR_STEP('/time-tracking', 'Time Tracking', 'Log your hours against tasks and projects.'),
    SIDEBAR_STEP('/docs', 'Documentation', 'Technical docs, API references, and architecture guides.'),
    SIDEBAR_STEP('/files', 'Files', 'Shared files, design specs, and project assets.'),
    SIDEBAR_STEP('/goals', 'Goals', 'Track your personal and team performance goals.'),
    SIDEBAR_STEP('/calendar', 'Calendar', 'Sprint ceremonies, stand-ups, and meeting schedules.'),
  ],

  EDITOR: [
    { ...COMMON_WELCOME('Editor'), content: "Welcome! Your editorial workspace is all set. Let's walk through your key tools." },
    SIDEBAR_STEP('/dashboard', 'Dashboard', 'Editorial metrics, pending reviews, and upcoming deadlines.'),
    SIDEBAR_STEP('/tasks', 'Editing Tasks', 'Review queue — articles, copy, and content awaiting your review.'),
    SIDEBAR_STEP('/docs', 'Documents', 'Access drafts, style guides, and published content library.'),
    SIDEBAR_STEP('/files', 'Media Files', 'Images, graphics, and media assets for editorial use.'),
    SIDEBAR_STEP('/calendar', 'Editorial Calendar', 'Publication schedule and content deadlines.'),
    SIDEBAR_STEP('/chat', 'Team Chat', 'Coordinate with writers, designers, and content team.'),
  ],

  GRAPHIC_DESIGNER: [
    { ...COMMON_WELCOME('Graphic Designer'), content: "Your creative workspace is ready! Here's a quick tour of the tools you'll use." },
    SIDEBAR_STEP('/dashboard', 'Dashboard', 'Design requests, pending tasks, and project timelines.'),
    SIDEBAR_STEP('/tasks', 'Design Tasks', 'Your assigned design tasks, briefs, and revision requests.'),
    SIDEBAR_STEP('/projects', 'Projects', 'Active design projects and campaign deliverables.'),
    SIDEBAR_STEP('/files', 'Asset Library', 'Upload and manage design files, brand assets, and templates.'),
    SIDEBAR_STEP('/time-tracking', 'Time Tracking', 'Track time spent on each design project and task.'),
    SIDEBAR_STEP('/docs', 'Brand Guidelines', 'Access brand guidelines, style guides, and design specs.'),
    SIDEBAR_STEP('/calendar', 'Calendar', 'Deadlines, review sessions, and team meetings.'),
  ],

  JR_DEVELOPER: [
    { ...COMMON_WELCOME('Developer'), content: "Welcome! Here are your assigned tasks and tools to get started." },
    SIDEBAR_STEP('/tasks', 'Your Tasks', 'View your assigned tasks, bugs, and feature work.'),
    SIDEBAR_STEP('/time-tracking', 'Time Tracking', 'Track your time here — log hours against tasks daily.'),
    SIDEBAR_STEP('/docs', 'Documentation', 'Access docs and files — coding standards, onboarding guides, and references.'),
    SIDEBAR_STEP('/files', 'Files', 'Shared project files, design specs, and resources.'),
    SIDEBAR_STEP('/projects', 'Projects', 'View the projects you are contributing to.'),
    SIDEBAR_STEP('/calendar', 'Calendar', 'Sprint ceremonies and team meeting schedules.'),
    SIDEBAR_STEP('/chat', 'Team Chat', 'Reach out to your team for help and collaboration.'),
  ],

  GUY: [
    { ...COMMON_WELCOME('Team Member'), content: "Welcome aboard! Let's get you familiar with the platform." },
    SIDEBAR_STEP('/dashboard', 'Dashboard', 'Your personalized dashboard with relevant updates and tasks.'),
    SIDEBAR_STEP('/tasks', 'Tasks', 'View and manage your assigned tasks and to-dos.'),
    SIDEBAR_STEP('/calendar', 'Calendar', 'Check your schedule, meetings, and important dates.'),
    SIDEBAR_STEP('/time-tracking', 'Time Tracking', 'Log your daily work hours and activities.'),
    SIDEBAR_STEP('/chat', 'Chat', 'Connect with your teammates via instant messaging.'),
    SIDEBAR_STEP('/docs', 'Docs', 'Access shared documents and company resources.'),
    SIDEBAR_STEP('/leaves', 'Leaves', 'Request time off and check your leave balance.'),
  ],

  OFFICE_BOY: [
    { ...COMMON_WELCOME('Team Member'), content: "Welcome! Here's a quick guide to help you navigate the system." },
    SIDEBAR_STEP('/dashboard', 'Dashboard', 'Your daily overview with tasks and announcements.'),
    SIDEBAR_STEP('/tasks', 'Tasks', 'Check your assigned tasks and daily duties.'),
    SIDEBAR_STEP('/calendar', 'Calendar', 'View your schedule and upcoming events.'),
    SIDEBAR_STEP('/leaves', 'Leaves', 'Apply for leave and check your balance.'),
    SIDEBAR_STEP('/chat', 'Chat', 'Message your supervisor or team members.'),
    SIDEBAR_STEP('/complaints', 'Complaints', 'Report any issues or concerns.'),
  ],

  // ── Senior/Junior variants ──
  SR_ACCOUNTANT: [
    { ...COMMON_WELCOME('Senior Accountant'), content: "Your financial management workspace is ready. Let's walk through the accounting tools." },
    SIDEBAR_STEP('/dashboard', 'Financial Dashboard', 'Overview of transactions, pending approvals, and financial health.'),
    SIDEBAR_STEP('/invoices', 'Invoices', 'Create, send, and track all client invoices and payment statuses.'),
    SIDEBAR_STEP('/expenses', 'Expenses', 'Review expense claims, approve reimbursements, and categorize spending.'),
    SIDEBAR_STEP('/payroll', 'Payroll', 'Process monthly payroll, manage deductions, and generate payslips.'),
    SIDEBAR_STEP('/reports', 'Financial Reports', 'Generate P&L statements, tax reports, and financial summaries.'),
  ],
  JR_ACCOUNTANT: [
    { ...COMMON_WELCOME('Junior Accountant'), content: "Welcome! Here are the accounting tools you'll be working with." },
    SIDEBAR_STEP('/dashboard', 'Dashboard', 'Your tasks and pending items at a glance.'),
    SIDEBAR_STEP('/invoices', 'Invoices', 'Help create and track invoices assigned to you.'),
    SIDEBAR_STEP('/payroll', 'Payroll', 'Assist with payroll data entry and verification.'),
    SIDEBAR_STEP('/expenses', 'Expenses', 'Submit your expenses and assist with claim processing.'),
  ],

  SR_GRAPHIC_DESIGNER: [
    { ...COMMON_WELCOME('Senior Graphic Designer'), content: "Your creative studio is set up! Here's how to manage design work in Know AI." },
    SIDEBAR_STEP('/dashboard', 'Design Dashboard', 'Your design requests, deadlines, and project overview.'),
    SIDEBAR_STEP('/tasks', 'Design Tasks', 'Active design briefs, revision requests, and creative assignments.'),
    SIDEBAR_STEP('/projects', 'Projects', 'Brand campaigns, product design, and long-term creative projects.'),
    SIDEBAR_STEP('/files', 'Asset Library', 'Upload designs, manage brand assets, fonts, and templates.'),
    SIDEBAR_STEP('/time-tracking', 'Time Tracking', 'Log hours per design project for accurate billing.'),
    SIDEBAR_STEP('/docs', 'Brand Guidelines', 'Access and maintain brand guidelines and design systems.'),
  ],
  JR_GRAPHIC_DESIGNER: [
    { ...COMMON_WELCOME('Junior Graphic Designer'), content: "Welcome to the design team! Let's get you started." },
    SIDEBAR_STEP('/tasks', 'Your Design Tasks', 'View design briefs and assets assigned to you.'),
    SIDEBAR_STEP('/files', 'Files & Assets', 'Access shared design files, templates, and brand assets.'),
    SIDEBAR_STEP('/time-tracking', 'Time Tracking', 'Log your work hours on each design task.'),
    SIDEBAR_STEP('/docs', 'Guidelines', 'Reference brand guidelines and design standards.'),
  ],

  SR_EDITOR: [
    { ...COMMON_WELCOME('Senior Editor'), content: "Your editorial command center is ready. Here's your toolkit." },
    SIDEBAR_STEP('/dashboard', 'Editorial Dashboard', 'Pending reviews, publication schedule, and content metrics.'),
    SIDEBAR_STEP('/tasks', 'Editing Queue', 'Articles, copy, and content awaiting your editorial review.'),
    SIDEBAR_STEP('/docs', 'Content Library', 'All drafts, published pieces, and style guides.'),
    SIDEBAR_STEP('/email', 'Newsletter', 'Manage email campaigns and newsletter content.'),
    SIDEBAR_STEP('/files', 'Media', 'Images and media assets for editorial content.'),
    SIDEBAR_STEP('/analytics', 'Content Analytics', 'Track content performance and engagement metrics.'),
  ],
  JR_EDITOR: [
    { ...COMMON_WELCOME('Junior Editor'), content: "Welcome to the editorial team! Here's where your work lives." },
    SIDEBAR_STEP('/tasks', 'Your Tasks', 'Content pieces assigned to you for editing and review.'),
    SIDEBAR_STEP('/docs', 'Documents', 'Access drafts, style guides, and reference materials.'),
    SIDEBAR_STEP('/files', 'Files', 'Upload and manage content assets.'),
    SIDEBAR_STEP('/time-tracking', 'Time Tracking', 'Track time spent on each editorial task.'),
  ],

  SR_CONTENT_STRATEGIST: [
    { ...COMMON_WELCOME('Senior Content Strategist'), content: "Your content strategy workspace is ready. Let's plan great content!" },
    SIDEBAR_STEP('/dashboard', 'Strategy Dashboard', 'Content pipeline, campaign status, and performance overview.'),
    SIDEBAR_STEP('/tasks', 'Content Tasks', 'Plan, assign, and track content production across the team.'),
    SIDEBAR_STEP('/docs', 'Content Hub', 'Content calendar, briefs, style guides, and brand voice docs.'),
    SIDEBAR_STEP('/analytics', 'Performance', 'Content analytics — engagement, reach, and conversion tracking.'),
    SIDEBAR_STEP('/email', 'Email Campaigns', 'Plan and manage email marketing campaigns.'),
    SIDEBAR_STEP('/calendar', 'Editorial Calendar', 'Schedule content publication across all channels.'),
  ],
  JR_CONTENT_STRATEGIST: [
    { ...COMMON_WELCOME('Junior Content Strategist'), content: "Welcome! Here are the tools for your content work." },
    SIDEBAR_STEP('/tasks', 'Your Content Tasks', 'Content pieces and research assignments for you.'),
    SIDEBAR_STEP('/docs', 'Content Docs', 'Access briefs, templates, and reference materials.'),
    SIDEBAR_STEP('/files', 'Media Files', 'Upload and organize content assets.'),
    SIDEBAR_STEP('/time-tracking', 'Time Tracking', 'Log your content creation hours.'),
  ],

  SR_SCRIPT_WRITER: [
    { ...COMMON_WELCOME('Senior Script Writer'), content: "Your writing studio is ready. Let's explore your scriptwriting tools." },
    SIDEBAR_STEP('/dashboard', 'Writer Dashboard', 'Active scripts, deadlines, and project timelines.'),
    SIDEBAR_STEP('/tasks', 'Script Tasks', 'Scripts in progress, revision requests, and new briefs.'),
    SIDEBAR_STEP('/docs', 'Script Library', 'All scripts, treatments, storyboards, and reference docs.'),
    SIDEBAR_STEP('/projects', 'Video Projects', 'Video production projects and campaign scripts.'),
    SIDEBAR_STEP('/files', 'Media Reference', 'Video references, mood boards, and production assets.'),
    SIDEBAR_STEP('/time-tracking', 'Time Tracking', 'Track writing hours per project.'),
  ],
  JR_SCRIPT_WRITER: [
    { ...COMMON_WELCOME('Junior Script Writer'), content: "Welcome to the writing team! Let's get you started." },
    SIDEBAR_STEP('/tasks', 'Your Writing Tasks', 'Script assignments and revision requests for you.'),
    SIDEBAR_STEP('/docs', 'Scripts & Docs', 'Access script templates and reference materials.'),
    SIDEBAR_STEP('/files', 'Files', 'Upload drafts and access media references.'),
    SIDEBAR_STEP('/time-tracking', 'Time Tracking', 'Log your writing hours.'),
  ],

  SR_BRAND_STRATEGIST: [
    { ...COMMON_WELCOME('Senior Brand Strategist'), content: "Your brand strategy workspace is ready. Let's build the brand!" },
    SIDEBAR_STEP('/dashboard', 'Brand Dashboard', 'Brand metrics, campaign performance, and market insights.'),
    SIDEBAR_STEP('/clients', 'Client Relations', 'Manage brand partnerships and client collaborations.'),
    SIDEBAR_STEP('/leads', 'Opportunities', 'Track brand collaboration opportunities and inbound inquiries.'),
    SIDEBAR_STEP('/tasks', 'Strategy Tasks', 'Brand initiatives, campaign tasks, and strategic projects.'),
    SIDEBAR_STEP('/analytics', 'Brand Analytics', 'Brand awareness, sentiment, and market positioning data.'),
    SIDEBAR_STEP('/docs', 'Brand Assets', 'Brand guidelines, positioning docs, and campaign playbooks.'),
  ],
  JR_BRAND_STRATEGIST: [
    { ...COMMON_WELCOME('Junior Brand Strategist'), content: "Welcome! Here's your brand strategy toolkit." },
    SIDEBAR_STEP('/tasks', 'Your Tasks', 'Brand research, analysis, and strategy tasks assigned to you.'),
    SIDEBAR_STEP('/clients', 'Clients', 'View client profiles and partnership information.'),
    SIDEBAR_STEP('/docs', 'Brand Docs', 'Access brand guidelines and strategy documents.'),
    SIDEBAR_STEP('/files', 'Files', 'Brand assets and reference materials.'),
  ],

  DRIVER: [
    { ...COMMON_WELCOME('Driver'), content: "Welcome! Here's a quick guide to your daily tools." },
    SIDEBAR_STEP('/dashboard', 'Dashboard', 'Your daily schedule and assigned tasks.'),
    SIDEBAR_STEP('/tasks', 'Tasks', 'View your delivery and transport assignments.'),
    SIDEBAR_STEP('/calendar', 'Calendar', 'Check your schedule and upcoming routes.'),
    SIDEBAR_STEP('/leaves', 'Leaves', 'Request time off and view your leave balance.'),
    SIDEBAR_STEP('/payroll', 'Payroll', 'View your salary slips and payment history.'),
    SIDEBAR_STEP('/chat', 'Chat', 'Communicate with your coordinator.'),
  ],
};

// ---------------------------------------------------------------------------
// Custom tooltip component
// ---------------------------------------------------------------------------

function TourTooltip({
  continuous,
  index,
  step,
  size,
  backProps,
  closeProps,
  primaryProps,
  skipProps,
  tooltipProps,
  isLastStep,
  dontShowAgain,
  onDontShowToggle,
}) {
  return (
    <div
      {...tooltipProps}
      style={{
        background: '#fff',
        borderRadius: 12,
        boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
        padding: 0,
        maxWidth: 380,
        minWidth: 300,
        fontFamily: "'Inter', -apple-system, sans-serif",
        overflow: 'hidden',
      }}
    >
      {/* Header bar */}
      <div
        style={{
          background: '#111827',
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>
          {step.title || 'Know AI Guide'}
        </span>
        <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: 500 }}>
          Step {index + 1} of {size}
        </span>
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, background: '#e8edf2' }}>
        <div
          style={{
            height: '100%',
            width: `${((index + 1) / size) * 100}%`,
            background: '#111827',
            transition: 'width 0.3s ease',
            borderRadius: '0 2px 2px 0',
          }}
        />
      </div>

      {/* Content */}
      <div style={{ padding: '20px 20px 16px' }}>
        <p style={{ margin: 0, color: '#10222F', fontSize: 14, lineHeight: 1.6 }}>
          {step.content}
        </p>
      </div>

      {/* Footer */}
      <div
        style={{
          padding: '12px 20px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {index === 0 && (
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer',
                fontSize: 12,
                color: '#6b7a8d',
                userSelect: 'none',
              }}
            >
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={onDontShowToggle}
                style={{ accentColor: '#111827', width: 14, height: 14 }}
              />
              Don't show again
            </label>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {index > 0 && (
            <button
              {...backProps}
              style={{
                background: 'transparent',
                border: '1px solid #d1d9e0',
                borderRadius: 8,
                padding: '7px 16px',
                fontSize: 13,
                fontWeight: 500,
                color: '#10222F',
                cursor: 'pointer',
              }}
            >
              Back
            </button>
          )}
          {!isLastStep && index === 0 && (
            <button
              {...skipProps}
              style={{
                background: 'transparent',
                border: 'none',
                padding: '7px 12px',
                fontSize: 13,
                color: '#6b7a8d',
                cursor: 'pointer',
              }}
            >
              Skip tour
            </button>
          )}
          {continuous && (
            <button
              {...primaryProps}
              style={{
                background: '#111827',
                border: 'none',
                borderRadius: 8,
                padding: '7px 20px',
                fontSize: 13,
                fontWeight: 600,
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              {isLastStep ? 'Finish' : 'Next'}
            </button>
          )}
          {!continuous && (
            <button
              {...closeProps}
              style={{
                background: '#111827',
                border: 'none',
                borderRadius: 8,
                padding: '7px 20px',
                fontSize: 13,
                fontWeight: 600,
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Floating help button
// ---------------------------------------------------------------------------

export function HelpFloatingButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      title="Start guided tour"
      style={{
        position: 'fixed',
        bottom: 28,
        right: 28,
        zIndex: 9998,
        width: 48,
        height: 48,
        borderRadius: '50%',
        background: '#111827',
        border: 'none',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: '0 4px 16px rgba(17,24,39,0.25)',
        transition: 'transform 0.2s, box-shadow 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.1)';
        e.currentTarget.style.boxShadow = '0 6px 24px rgba(17,24,39,0.35)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = '0 4px 16px rgba(17,24,39,0.25)';
      }}
    >
      <span style={{ fontSize: 22, fontWeight: 700, lineHeight: 1 }}>?</span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main HelpTour component
// ---------------------------------------------------------------------------

export default function HelpTour({ role }) {
  const { user } = useSelector((s) => s.auth);
  const userId = user?._id || user?.id || 'default';
  const storageKey = `knowai-tour-seen-${userId}`;

  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const effectiveRole = role || user?.role || 'GUY';
  const steps = ROLE_TOURS[effectiveRole] || ROLE_TOURS.GUY;

  // Auto-start on first login
  useEffect(() => {
    if (!user) return;
    const seen = localStorage.getItem(storageKey);
    if (!seen) {
      // Small delay to let the DOM render sidebar elements
      const timer = setTimeout(() => {
        setStepIndex(0);
        setRun(true);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [user, storageKey]);

  const handleJoyrideCallback = useCallback(
    (data) => {
      const { action, index, status, type } = data;

      if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
        setRun(false);
        setStepIndex(0);
        // Always persist — both "Skip tour" and "Finish" should prevent re-showing
        localStorage.setItem(storageKey, 'true');
        return;
      }

      if (type === EVENTS.STEP_AFTER) {
        if (action === ACTIONS.PREV) {
          setStepIndex(index - 1);
        } else {
          setStepIndex(index + 1);
        }
      }

      if (action === ACTIONS.CLOSE) {
        setRun(false);
        setStepIndex(0);
        localStorage.setItem(storageKey, 'true');
      }
    },
    [dontShowAgain, storageKey]
  );

  // Public method to restart tour (exposed via window for sidebar button)
  const restartTour = useCallback(() => {
    setStepIndex(0);
    setDontShowAgain(false);
    setRun(true);
  }, []);

  // Expose restart function globally so sidebar/floating button can trigger it
  useEffect(() => {
    window.__knowaiRestartTour = restartTour;
    return () => {
      delete window.__knowaiRestartTour;
    };
  }, [restartTour]);

  return (
    <>
      <Joyride
        steps={steps}
        run={run}
        stepIndex={stepIndex}
        continuous
        showSkipButton
        showProgress
        scrollToFirstStep
        disableOverlayClose
        disableCloseOnEsc={false}
        spotlightPadding={6}
        callback={handleJoyrideCallback}
        styles={{
          options: {
            zIndex: 10000,
            arrowColor: '#fff',
            overlayColor: 'rgba(16, 34, 47, 0.5)',
          },
        }}
        tooltipComponent={(props) => (
          <TourTooltip
            {...props}
            dontShowAgain={dontShowAgain}
            onDontShowToggle={() => setDontShowAgain((v) => !v)}
          />
        )}
        locale={{
          back: 'Back',
          close: 'Close',
          last: 'Finish',
          next: 'Next',
          skip: 'Skip tour',
        }}
      />
      <HelpFloatingButton onClick={restartTour} />
    </>
  );
}
