import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SITE_URL = 'https://testawareness.vercel.app';

// ── Module titles ─────────────────────────────────────────────────────────────
const MODULE_TITLES: Record<string, string> = {
  // Developer
  'dev-module1':  'The Logging Tax',
  'dev-module2':  'Serverless Cost Traps',
  'dev-module3':  'The Egress Trap',
  'dev-module6':  'Database Query Costs',
  'dev-module9':  'Multi-Region Architecture',
  'dev-module10': 'The Serverless Trap',
  'dev-module11': 'Storage Cost Patterns',
  'dev-module12': 'Queue and Event Cost',
  'dev-module13': 'The Retry Storm',
  'dev-module14': 'Caching Economics',
  'dev-module15': 'RDS Proxy & Connection Pooling',
  'dev-module16': 'S3 Request Cost Patterns',
  // DevOps
  'dev-module4':      'IaC Cost Review',
  'dev-module5':      'CI/CD Pipeline Costs',
  'dev-module7':      'Auto-scaling Tuning',
  'dev-module8':      'Container Platform Costs',
  'devops-module5':   'Cost Anomaly Detection',
  'devops-module6':   'Reserved Instances Strategy',
  'devops-module7':   'Kubernetes Cost Management',
  'devops-module8':   'Multi-Account Cost Governance',
  'devops-module9':   'Network Cost Architecture',
  'devops-module10':  'Observability Cost Management',
  'devops-module11':  'Spot Instance Strategies',
  'devops-module12':  'RDS Cost Optimization',
  // PM
  'pm-module1': 'The $47k Feature',
  'pm-module2': 'Unit Economics',
  'pm-module3': 'Feature Cost Estimation',
  'pm-module4': 'Budget Conversations',
  'pm-module5': 'Data Feature Costs',
  'pm-module6': 'Roadmap Prioritisation',
  'pm-module7': 'Cloud Cost Reporting',
  'pm-module8': 'Vendor & Licensing',
  'pm-module9': 'FinOps Culture',
  // CTO
  'cto-module1': 'Savings Plans & RIs',
  'cto-module2': 'Build vs Buy TCO',
  'cto-module3': 'Vendor Negotiation',
  'cto-module4': 'FinOps Culture',
  'cto-module5': 'Architecture Trade-offs',
  'cto-module6': 'Cloud Strategy',
  'cto-module7': 'Cost Governance',
  'cto-module8': 'Executive Reporting',
  // Finance
  'fin-module1': 'Invoice Anatomy',
  'fin-module2': 'Showback vs Chargeback',
  'fin-module3': 'Cloud Budgeting',
  'fin-module4': 'Variance Reporting',
  'fin-module5': 'Cost Allocation',
  'fin-module6': 'Forecasting',
  'fin-module7': 'Business Case',
  'fin-module8': 'FinOps Maturity',
  // Architect
  'arch-module1': 'Resilience Cost Tiers',
  'arch-module2': 'Data Transfer Costs',
  'arch-module3': 'Right-sizing',
  'arch-module4': 'Spot / Reserved / On-Demand',
  'arch-module5': 'Serverless Architecture',
  'arch-module6': 'Multi-Region Strategy',
  'arch-module7': 'Database Architecture',
  'arch-module8': 'Cost-Aware Design Patterns',
};

// ── Track definitions (mirrors auth.js) ───────────────────────────────────────
const TRACKS: Record<string, { name: string; icon: string; modules: string[] }> = {
  pm: {
    name: 'Product Manager', icon: '📋',
    modules: ['pm-module1','pm-module2','pm-module3','pm-module4','pm-module5',
              'pm-module6','pm-module7','pm-module8','pm-module9'],
  },
  developer: {
    name: 'Developer', icon: '👨‍💻',
    modules: ['dev-module1','dev-module2','dev-module3','dev-module6',
              'dev-module9','dev-module10','dev-module11','dev-module12',
              'dev-module13','dev-module14','dev-module15','dev-module16'],
  },
  devops: {
    name: 'DevOps', icon: '🔧',
    modules: ['dev-module4','dev-module5','dev-module7','dev-module8',
              'devops-module5','devops-module6','devops-module7','devops-module8',
              'devops-module9','devops-module10','devops-module11','devops-module12'],
  },
  cto: {
    name: 'CTO', icon: '🏛️',
    modules: ['cto-module1','cto-module2','cto-module3','cto-module4',
              'cto-module5','cto-module6','cto-module7','cto-module8'],
  },
  finance: {
    name: 'Finance', icon: '💼',
    modules: ['fin-module1','fin-module2','fin-module3','fin-module4',
              'fin-module5','fin-module6','fin-module7','fin-module8'],
  },
  architect: {
    name: 'Cloud Architect', icon: '🏗️',
    modules: ['arch-module1','arch-module2','arch-module3','arch-module4',
              'arch-module5','arch-module6','arch-module7','arch-module8'],
  },
};

// ── Slack helpers ─────────────────────────────────────────────────────────────
async function slackGet(token: string, method: string, params: Record<string, string>) {
  const url = new URL(`https://slack.com/api/${method}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

async function slackPost(token: string, method: string, body: unknown) {
  const res = await fetch(`https://slack.com/api/${method}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function lookupSlackUserId(token: string, email: string): Promise<string | null> {
  const data = await slackGet(token, 'users.lookupByEmail', { email });
  return data.ok ? data.user.id : null;
}

async function sendDM(token: string, userId: string, text: string, blocks: unknown[]) {
  const { channel } = await slackPost(token, 'conversations.open', { users: userId });
  if (!channel?.id) return;
  await slackPost(token, 'chat.postMessage', {
    channel: channel.id,
    text,
    blocks,
  });
}

// ── Main handler ──────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  // Auth check — require Bearer token matching CRON_SECRET
  const cronSecret = Deno.env.get('CRON_SECRET');
  const auth = req.headers.get('Authorization');
  if (cronSecret && auth !== `Bearer ${cronSecret}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  const slackToken = Deno.env.get('SLACK_BOT_TOKEN')!;

  // Fetch all non-owner profiles with a track
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('is_owner', false)
    .not('track', 'is', null);

  if (error) return new Response(JSON.stringify({ error }), { status: 500 });
  if (!profiles?.length) return new Response('No members found', { status: 200 });

  const results: { email: string; status: string }[] = [];

  for (const profile of profiles) {
    const track = TRACKS[profile.track];
    if (!track) continue;

    // Get this user's completed modules
    const { data: progress } = await supabase
      .from('progress')
      .select('module_id')
      .eq('user_id', profile.id);

    const completedIds = (progress || []).map((p: { module_id: string }) => p.module_id);
    const completedInTrack = track.modules.filter(m => completedIds.includes(m));
    const completed = completedInTrack.length;
    const total = track.modules.length;
    const pct = Math.round((completed / total) * 100);
    const nextModule = track.modules.find(m => !completedIds.includes(m));

    // Look up Slack user
    const slackUserId = await lookupSlackUserId(slackToken, profile.email);
    if (!slackUserId) {
      results.push({ email: profile.email, status: 'slack_user_not_found' });
      continue;
    }

    // Build message
    const firstName = profile.name.split(' ')[0];
    const progressBar = buildProgressBar(pct);

    let blocks: unknown[];
    let text: string;

    if (!nextModule) {
      // All done
      text = `🎉 ${firstName} has completed their FinOps track!`;
      blocks = [
        { type: 'section', text: { type: 'mrkdwn',
          text: `*Hey ${firstName}!* 🎉 You've completed the *${track.icon} ${track.name}* track — all ${total} modules done! Great work.` } },
      ];
    } else {
      const title = MODULE_TITLES[nextModule] || nextModule;
      const url = `${SITE_URL}/${nextModule}.html`;
      text = `Your weekly FinOps reminder: next up — ${title}`;
      blocks = [
        { type: 'section', text: { type: 'mrkdwn',
          text: `*Hey ${firstName}! 👋 Your weekly FinOps reminder.*` } },
        { type: 'section', fields: [
          { type: 'mrkdwn', text: `*Track*\n${track.icon} ${track.name}` },
          { type: 'mrkdwn', text: `*Progress*\n${progressBar} ${pct}%  (${completed}/${total})` },
        ]},
        { type: 'section', text: { type: 'mrkdwn',
          text: `*👉 Next module:* <${url}|${title}>\n_~5 min · pick up where you left off_` } },
        { type: 'actions', elements: [
          { type: 'button', text: { type: 'plain_text', text: '▶ Start module', emoji: true },
            url, style: 'primary' },
        ]},
        { type: 'divider' },
        { type: 'context', elements: [
          { type: 'mrkdwn', text: `💸 FinOps Academy · <${SITE_URL}|Open platform> · You're receiving this because your team enrolled you.` },
        ]},
      ];
    }

    await sendDM(slackToken, slackUserId, text, blocks);
    results.push({ email: profile.email, status: 'sent' });
  }

  return new Response(JSON.stringify({ sent: results.filter(r => r.status === 'sent').length, results }), {
    headers: { 'Content-Type': 'application/json' },
  });
});

function buildProgressBar(pct: number): string {
  const filled = Math.round(pct / 10);
  return '█'.repeat(filled) + '░'.repeat(10 - filled);
}
