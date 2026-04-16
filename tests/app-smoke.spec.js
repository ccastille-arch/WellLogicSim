import { test, expect } from '@playwright/test'

function buildCsv() {
  const headers = [
    'Timestamp',
    'Calculated Flow with Offset',
    'Run Status Comp #1',
    'Run Status Comp #2',
    'Compressor #1 Desire Flow SP For PID Murphy',
    'Compressor #2 Desire Flow SP For PID Murphy',
    'Fault Indication',
    'Flow Status Mode',
    'Hour Meter',
  ]

  for (let i = 1; i <= 4; i += 1) {
    headers.push(
      `Wellhead #${i} Injection Flow Rate From Customer PLC`,
      `Wellhead #${i} Setpoint From Customer PLC`,
      `Wellhead #${i} Injection Static Pressure From Customer PLC`,
      `Wellhead #${i} Injection Differential Prs From Customer PLC`,
      `Wellhead #${i} Injection Temp From Customer PLC`,
      `Wellhead #${i} Calculated Desired Flow`,
      `Wellhead #${i} Max Flow Rate`,
      `Well #${i} Analog Output ${i}`,
      `WellHead #${i} Running Status`,
      `Wellhead #${i} Yesterdays Total Flow`,
    )
  }

  const rows = [
    [
      '2026-04-13 00:00',
      '3200',
      'Running',
      'Running',
      '1600',
      '1600',
      '',
      'Auto',
      '12345',
      '0.800',
      '1.000',
      '805',
      '44',
      '138',
      '0.800',
      '1.200',
      '66',
      'Online',
      '0.790',
      '0.750',
      '0.750',
      '812',
      '46',
      '137',
      '0.750',
      '1.200',
      '65',
      'Online',
      '0.745',
      '0.800',
      '0.800',
      '818',
      '45',
      '136',
      '0.800',
      '1.200',
      '67',
      'Online',
      '0.798',
      '0.850',
      '0.800',
      '822',
      '47',
      '139',
      '0.800',
      '1.200',
      '66',
      'Online',
      '0.840',
    ],
    [
      '2026-04-13 00:15',
      '3180',
      'Running',
      'Running',
      '1590',
      '1590',
      '',
      'Auto',
      '12346',
      '0.805',
      '1.000',
      '806',
      '43',
      '138',
      '0.800',
      '1.200',
      '66',
      'Online',
      '0.795',
      '0.748',
      '0.750',
      '811',
      '45',
      '137',
      '0.750',
      '1.200',
      '65',
      'Online',
      '0.746',
      '0.802',
      '0.800',
      '817',
      '45',
      '136',
      '0.800',
      '1.200',
      '67',
      'Online',
      '0.799',
      '0.825',
      '0.800',
      '821',
      '46',
      '139',
      '0.800',
      '1.200',
      '66',
      'Online',
      '0.841',
    ],
  ]

  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n')
}

function buildMockState() {
  const allPermissions = [
    'tile:admin',
    'tile:livedata',
    'tile:autopilot',
    'tile:marketing',
    'tile:sales',
    'tile:technical',
    'tile:quote',
    'tile:simulator',
    'tile:pipeline',
    'manage:users',
    'manage:roles',
    'manage:settings',
    'view:analytics',
    'manage:quotes',
  ]

  const roles = [
    { id: 'admin', name: 'Admin', permissions: ['*'], is_system: true },
    {
      id: 'tech',
      name: 'Tech',
      permissions: ['tile:simulator', 'tile:livedata', 'tile:technical'],
      is_system: true,
    },
    {
      id: 'viewer',
      name: 'Viewer',
      permissions: ['tile:livedata', 'tile:marketing', 'tile:sales', 'tile:technical', 'tile:quote', 'tile:autopilot'],
      is_system: true,
    },
  ]

  const users = [
    { username: 'cody', name: 'Cody Castille', role_id: 'admin', role_name: 'Admin', permissions: ['*'] },
    {
      username: 'techteam',
      name: 'Tech Team',
      role_id: 'tech',
      role_name: 'Tech',
      permissions: ['tile:simulator', 'tile:livedata', 'tile:technical'],
    },
    {
      username: 'guest',
      name: 'Guest User',
      role_id: 'viewer',
      role_name: 'Viewer',
      permissions: ['tile:livedata', 'tile:marketing', 'tile:sales', 'tile:technical', 'tile:quote', 'tile:autopilot'],
    },
  ]

  const quotes = [
    {
      id: 1,
      customerName: 'Pioneer Sample',
      padName: 'Wolfcamp A',
      basin: 'Permian - Delaware',
      wellCount: 4,
      compressorCount: 2,
      estimatedValue: 180000,
      salesRep: 'Cody',
      status: 'Quoted',
      createdAt: '2026-04-10T15:00:00.000Z',
      createdBy: 'cody',
      contactName: 'Jane Doe',
      contactPhone: '555-000-1111',
      contactEmail: 'jane@example.com',
      notes: 'Initial quote ready',
      history: [{ at: '2026-04-10T15:00:00.000Z', by: 'cody', action: 'Created quote' }],
    },
  ]

  const activity = [
    { user: 'Cody Castille', action: 'Navigated to sales', tile_id: 'sales', timestamp: '2026-04-14T20:00:00.000Z' },
  ]

  const settings = {
    forumPublic: true,
    quoteViewers: ['cody'],
    well_setpoint_overrides: { 0: 0.8, 1: 0.75, 2: 0.8, 3: 0.8 },
  }

  return {
    allPermissions,
    roles,
    users,
    quotes,
    activity,
    settings,
    csv: buildCsv(),
    summary: {
      totalUsers: 3,
      activeUsers7d: 3,
      totalQuotes: 1,
      pipelineValue: 180000,
    },
    tileUsage: {
      7: [
        { tile_id: 'sales', visits: 12, unique_users: 3 },
        { tile_id: 'livedata', visits: 8, unique_users: 2 },
      ],
      30: [
        { tile_id: 'sales', visits: 31, unique_users: 3 },
        { tile_id: 'livedata', visits: 20, unique_users: 3 },
        { tile_id: 'simulator', visits: 14, unique_users: 2 },
      ],
      90: [
        { tile_id: 'sales', visits: 70, unique_users: 3 },
        { tile_id: 'livedata', visits: 48, unique_users: 3 },
        { tile_id: 'simulator', visits: 24, unique_users: 2 },
      ],
    },
    userActivity: [
      {
        username: 'cody',
        name: 'Cody Castille',
        role_id: 'admin',
        total_actions: 42,
        top_tile: 'sales',
        last_active: '2026-04-14T20:00:00.000Z',
      },
    ],
    mlink: {
      panel: {
        timestamps: [1713200400],
        datapoints: [
          { alias: 'Hour Meter', value: '12345', units: 'hours', desc: 'Hour Meter' },
          { alias: 'Well 1 Injection Gas Flow Rate', value: '0.800', units: 'MMSCFD', desc: 'Well 1 Flow' },
          { alias: 'Well 2 Injection Gas Flow Rate', value: '0.750', units: 'MMSCFD', desc: 'Well 2 Flow' },
          { alias: 'Well 3 Injection Gas Flow Rate', value: '0.800', units: 'MMSCFD', desc: 'Well 3 Flow' },
          { alias: 'Well 4 Injection Gas Flow Rate', value: '0.800', units: 'MMSCFD', desc: 'Well 4 Flow' },
        ],
      },
      compA: {
        timestamps: [1713200400],
        datapoints: [
          { alias: 'Driver Speed', value: '1200', units: 'RPM', desc: 'Driver Speed' },
          { alias: 'Suction Pressure', value: '82', units: 'PSI', desc: 'Suction Pressure' },
          { alias: 'Discharge Pressure', value: '640', units: 'PSI', desc: 'Discharge Pressure' },
          { alias: 'Discharge Temperature', value: '210', units: 'deg F', desc: 'Discharge Temperature' },
          { alias: 'Engine Oil Pressure', value: '52', units: 'PSI', desc: 'Engine Oil Pressure' },
          { alias: 'Compressor Oil Pressure', value: '48', units: 'PSI', desc: 'Compressor Oil Pressure' },
          { alias: 'System Voltage', value: '24.2', units: 'VDC', desc: 'System Voltage' },
        ],
      },
      compB: {
        timestamps: [1713200400],
        datapoints: [
          { alias: 'Driver Speed', value: '1180', units: 'RPM', desc: 'Driver Speed' },
          { alias: 'Suction Pressure', value: '80', units: 'PSI', desc: 'Suction Pressure' },
          { alias: 'Discharge Pressure', value: '635', units: 'PSI', desc: 'Discharge Pressure' },
          { alias: 'Discharge Temperature', value: '208', units: 'deg F', desc: 'Discharge Temperature' },
          { alias: 'Engine Oil Pressure', value: '51', units: 'PSI', desc: 'Engine Oil Pressure' },
          { alias: 'Compressor Oil Pressure', value: '47', units: 'PSI', desc: 'Compressor Oil Pressure' },
          { alias: 'System Voltage', value: '24.1', units: 'VDC', desc: 'System Voltage' },
        ],
      },
      runReport: {
        ReportSummary: {
          Running: { Pct: 0.92, Hrs: 22.1 },
          Stopped: { Hrs: 1.2 },
          Faulted: { Hrs: 0.7 },
        },
        ReportDetail: [
          { StatusStr: 'Running', DurationHrs: 8.2 },
          { StatusStr: 'Faulted', DurationHrs: 0.7, Reason: 'High Temp' },
        ],
      },
    },
  }
}

async function installMockApi(page) {
  const state = buildMockState()

  await page.route('**/api/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const method = request.method()
    const path = url.pathname
    const auth = request.headers().authorization || ''
    const token = auth.replace(/^Bearer\s+/i, '')

    const userByToken = {
      'admin-token': state.users[0],
      'tech-token': state.users[1],
      'viewer-token': state.users[2],
    }

    const json = async () => {
      const body = request.postData()
      return body ? JSON.parse(body) : {}
    }

    const ok = (body) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(body),
      })

    if (path === '/api/auth/me') {
      const user = userByToken[token]
      if (!user) {
        return route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'Unauthorized' }) })
      }
      return ok({ user })
    }

    if (path === '/api/auth/signup' && method === 'POST') {
      const body = await json()
      const newUser = {
        username: String(body.firstName || 'guest').toLowerCase(),
        name: `${body.firstName || 'Guest'} ${body.lastName || 'User'}`.trim(),
        role_id: 'viewer',
        role_name: 'Viewer',
        permissions: state.roles.find((role) => role.id === 'viewer').permissions,
      }
      return ok({ token: 'viewer-token', user: newUser })
    }

    if (path === '/api/auth/login' && method === 'POST') {
      const body = await json()
      const username = String(body.username || '').toLowerCase()
      if (username === 'cody') return ok({ token: 'admin-token', user: state.users[0] })
      if (username === 'techteam') return ok({ token: 'tech-token', user: state.users[1] })
      return ok({ token: 'viewer-token', user: state.users[2] })
    }

    if (path === '/api/auth/logout') return ok({ success: true })

    if (path === '/api/settings' && method === 'GET') return ok(state.settings)
    if (path === '/api/settings' && method === 'PATCH') {
      Object.assign(state.settings, await json())
      return ok(state.settings)
    }

    if (path === '/api/roles' && method === 'GET') {
      return ok({ roles: state.roles, allPermissions: state.allPermissions })
    }

    if (path === '/api/roles' && method === 'POST') {
      const body = await json()
      state.roles.push({ ...body, is_system: false })
      return ok({ success: true })
    }

    if (path.startsWith('/api/roles/') && method === 'PATCH') {
      const roleId = path.split('/').pop()
      const role = state.roles.find((item) => item.id === roleId)
      Object.assign(role, await json())
      return ok(role)
    }

    if (path.startsWith('/api/roles/') && method === 'DELETE') {
      const roleId = path.split('/').pop()
      state.roles = state.roles.filter((item) => item.id !== roleId)
      return ok({ success: true })
    }

    if (path === '/api/users' && method === 'GET') return ok(state.users)
    if (path === '/api/users' && method === 'POST') {
      const body = await json()
      state.users.push({ ...body, role_name: body.role_id, permissions: [] })
      return ok({ success: true })
    }

    if (path.includes('/role') && method === 'PATCH') {
      const username = path.split('/')[3]
      const user = state.users.find((item) => item.username === username)
      const body = await json()
      user.role_id = body.role_id
      user.role_name = body.role_id
      return ok(user)
    }

    if (path.includes('/name') && method === 'PATCH') {
      const username = path.split('/')[3]
      const user = state.users.find((item) => item.username === username)
      const body = await json()
      user.name = body.name
      return ok(user)
    }

    if (path.endsWith('/reset-password') && method === 'POST') return ok({ success: true })

    if (path.startsWith('/api/users/') && method === 'DELETE') {
      const username = path.split('/').pop()
      state.users = state.users.filter((item) => item.username !== username)
      return ok({ success: true })
    }

    if (path === '/api/quotes' && method === 'GET') return ok(state.quotes)
    if (path === '/api/quotes' && method === 'POST') {
      const body = await json()
      const newQuote = {
        id: state.quotes.length + 1,
        status: 'New',
        createdAt: '2026-04-15T12:00:00.000Z',
        createdBy: 'guest',
        history: [{ at: '2026-04-15T12:00:00.000Z', by: 'guest', action: 'Created quote' }],
        ...body,
      }
      state.quotes.unshift(newQuote)
      return ok(newQuote)
    }

    if (path.startsWith('/api/quotes/') && method === 'PATCH') {
      const id = Number(path.split('/').pop())
      const quote = state.quotes.find((item) => item.id === id)
      Object.assign(quote, await json())
      return ok(quote)
    }

    if (path.startsWith('/api/quotes/') && method === 'DELETE') {
      const id = Number(path.split('/').pop())
      state.quotes = state.quotes.filter((item) => item.id !== id)
      return ok({ success: true })
    }

    if (path === '/api/activity' && method === 'GET') return ok(state.activity)
    if (path === '/api/activity' && method === 'POST') {
      const body = await json()
      state.activity.unshift({
        user: userByToken[token]?.name || 'Guest User',
        action: body.action,
        tile_id: body.tile_id,
        timestamp: '2026-04-15T12:00:00.000Z',
      })
      return ok({ success: true })
    }

    if (path === '/api/analytics/summary') return ok(state.summary)
    if (path === '/api/analytics/user-activity') return ok(state.userActivity)
    if (path === '/api/analytics/tile-usage') {
      const days = Number(url.searchParams.get('days') || 30)
      return ok(state.tileUsage[days] || state.tileUsage[30])
    }

    if (path === '/api/data/settings' && method === 'GET') return ok(state.settings)
    if (path === '/api/data/settings' && method === 'PATCH') {
      Object.assign(state.settings, await json())
      return ok(state.settings)
    }

    if (path === '/api/mlink/device') {
      const deviceId = url.searchParams.get('deviceId')
      if (deviceId === '2504-504495') return ok(state.mlink.panel)
      if (deviceId === '2504-505561') return ok(state.mlink.compA)
      if (deviceId === '2504-505472') return ok(state.mlink.compB)
      return ok({ timestamps: [], datapoints: [] })
    }

    if (path === '/api/mlink/runreport') return ok(state.mlink.runReport)

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({}),
    })
  })

  await page.route('**/data/klondike_cop0001.csv', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/csv',
      body: state.csv,
    })
  })
}

async function gotoAs(page, token) {
  if (token) {
    await page.addInitScript((value) => {
      window.localStorage.setItem('welllogic_token', value)
    }, token)
  }
  await installMockApi(page)
  await page.goto('/')
}

test.describe('Pad Logic smoke coverage', () => {
  test('public flow covers home, marketing, live data, quote, sales demo, and presentation', async ({ page }) => {
    await installMockApi(page)
    await page.goto('/')

    await page.getByPlaceholder('First Name').fill('Cole')
    await page.getByPlaceholder('Last Name').fill('Hooten')
    await page.getByRole('button', { name: 'Continue' }).click()

    await expect(page.getByText('See a Real Pad Logic System')).toBeVisible()

    await page.getByRole('button', { name: /Marketing Material/i }).click()
    await expect(page.getByText('Marketing Materials')).toBeVisible()
    await page.getByRole('button', { name: /Sales Sheets/i }).click()
    await expect(page.getByText('Sales Sheets & Leave-Behinds')).toBeVisible()
    await page.getByRole('button', { name: /Slide Deck/i }).click()
    await expect(page.getByText('Presentation Deck')).toBeVisible()
    await page.getByRole('button', { name: /Downloads/i }).click()
    await expect(page.getByText('SCADA AWI Register Map')).toBeVisible()
    await page.getByRole('button', { name: /Back to Setup/i }).click()

    await page.getByRole('button', { name: /View Live Data/i }).click()
    await expect(page.getByText('Live Field Data - Pad Logic in Production')).toBeVisible()
    await page.getByRole('button', { name: 'Run History' }).click()
    await expect(page.getByText("Yesterday's Run Report")).toBeVisible()
    await page.getByRole('button', { name: '30-Day Field Data' }).click()
    await expect(page.getByText('Klondike COP0001 - 30-Day Field Data')).toBeVisible()
    await page.getByRole('button', { name: 'Well 1' }).click()
    await expect(page.getByText('Desired Rate')).toBeVisible()
    await page.getByRole('button', { name: 'Back' }).click()

    await page.getByRole('button', { name: /Request a Quote/i }).click()
    await page.getByPlaceholder('Company name').fill('Service Compression')
    await page.getByPlaceholder('e.g. Wolfcamp 14H').fill('Klondike Pad')
    await page.getByRole('button', { name: 'Submit Quote Request' }).click()
    await expect(page.getByText('Quote Request Submitted')).toBeVisible()
    await page.getByRole('button', { name: 'Back to Home' }).click()

    await page.getByRole('button', { name: /Sales Demo/i }).click()
    await expect(page.getByText('Pad Logic Custom Demo Setup')).toBeVisible()
    await page.getByRole('button', { name: /Skip questionnaire/i }).click()
    await expect(page.getByText('Sales Demo')).toBeVisible()
    await page.getByRole('button', { name: /Break It/i }).click()
    await expect(page.getByText('Gas Supply', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: /Home/i }).click()

    await page.getByRole('button', { name: /START CUSTOMER PRESENTATION/i }).click()
    await expect(page.getByText('Pad Logic Presentation')).toBeVisible()
    await page.locator('input[type="file"]').first().setInputFiles({
      name: 'narration.mp3',
      mimeType: 'audio/mpeg',
      buffer: Buffer.from('pad logic narration'),
    })
    await page.getByRole('button', { name: /Start Presentation/i }).click()
    await expect(page.getByRole('button', { name: /Pause/i })).toBeVisible()
    await page.getByRole('button', { name: /Pause/i }).click()
    await page.getByRole('button', { name: /Resume/i }).click()
    await page.getByRole('button', { name: /Exit/i }).click()
    await expect(page.getByText('See a Real Pad Logic System')).toBeVisible()
  })

  test('admin flow covers dashboard, pipeline, and simulator controls', async ({ page }) => {
    await gotoAs(page, 'admin-token')

    await page.getByRole('button', { name: /ADMIN DASHBOARD/i }).click()
    await expect(page.getByText('Admin Dashboard')).toBeVisible()
    await page.getByRole('button', { name: 'Roles' }).click()
    await expect(page.getByRole('button', { name: /\+ Create New Role/i })).toBeVisible()
    await page.getByRole('button', { name: 'Analytics' }).click()
    await expect(page.getByText('Tile Usage')).toBeVisible()
    await page.getByRole('button', { name: 'Settings' }).click()
    await expect(page.getByText('Forum visible to all users')).toBeVisible()
    await page.getByRole('button', { name: 'Back' }).click()

    await page.getByRole('button', { name: 'Sales Pipeline', exact: true }).click()
    await expect(page.getByText('Quote & Sales Pipeline')).toBeVisible()
    await page.getByRole('button', { name: '+ New Quote' }).click()
    await page.locator('input').first().fill('Pad Logic Prospect')
    await page.getByRole('button', { name: 'Save Quote' }).click()
    await expect(page.getByText('Pad Logic Prospect')).toBeVisible()
    await page.getByRole('button', { name: 'List View' }).click()
    await expect(page.getByText('Pioneer Sample')).toBeVisible()
    await page.getByRole('button', { name: /Back/i }).first().click()

    await page.getByRole('button', { name: /Tech Simulator/i }).click()
    await expect(page.getByText('Commissioning Setup')).toBeVisible()
    await page.getByRole('button', { name: /Launch Simulator/i }).click()
    await expect(page.getByText(/Running:/)).toBeVisible()
    await page.getByRole('button', { name: /Dashboard/i }).click()
    await expect(page.getByText('WellHead Choke Ctrl 1_Mode')).toBeVisible()
    await page.getByRole('button', { name: /Values/i }).click()
    await expect(page.getByText('Power Supply Voltage')).toBeVisible()
    await page.getByRole('button', { name: /Start-Up/i }).click()
    await expect(page.getByText(/Compressor Max Flow Rate/i)).toBeVisible()
    await page.getByRole('button', { name: /Events/i }).click()
    await expect(page.getByText('Compressor Control')).toBeVisible()
    await page.getByRole('button', { name: /Start/i }).nth(1).click()
    await page.getByRole('button', { name: /Stop/i }).nth(1).click()
    await page.getByTitle('Admin Tuning').click()
    await expect(page.getByText('Admin Access')).toBeVisible()
    await page.getByPlaceholder('Password').fill('sc2026')
    await page.getByRole('button', { name: 'Login' }).click()
    await expect(page.getByText(/Admin - Simulation Tuning/i)).toBeVisible()
  })
})
