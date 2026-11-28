// Browser-side DSH plugin UI. The module is loaded by dsh-client-modules.
window.__ModuleLoader__.load({
  id: '@sususgh/gamer-dsh-plugin',
  factory: (require) => {
    const React = require('react');
    const h = React.createElement;

    const COPY = {
      zh: {
        title: 'Gamer 游戏智能体', subtitle: 'PC 游戏控制中心 · Android 手机伴侣', version: '版本 1.0.5',
        overview: '运行状态', ready: 'DSH 插件入口已加载',
        desktop: '桌面端控制台', desktopValue: '界面框架已提供，游戏运行时尚未接入',
        android: 'Android 手机伴侣', androidValue: '通信服务尚未接入',
        vision: '视觉识别', visionValue: '尚未接入',
        automation: '自动游戏控制', automationValue: '尚未接入，不会执行游戏操作',
        pairing: '设备二维码配对', pairingHint: '连接 Android 手机后，可通过二维码建立安全配对。',
        qrUnavailable: '二维码配对服务尚未接入',
        qrDetail: '当前版本还没有桌面端配对服务器，暂时无法生成真实、可扫描的连接二维码。',
        qrNote: '不会显示伪造二维码，也不会误报设备已连接。',
        roadmap: '接下来', roadmapText: '先完成桌面端配对服务与 Android Companion，再启用二维码生成、双端认证和设备状态同步。',
        repo: '查看 GitHub 项目与开发进度', language: '界面语言', chinese: '简体中文', english: 'English',
        summary: '查看 Gamer 状态、语言选项与 Android 配对进度。',
        status: '未连接', noGameControl: '当前版本不会控制游戏或发送键鼠/触控指令。'
      },
      en: {
        title: 'Gamer AI Agent', subtitle: 'PC game control center · Android companion', version: 'Version 1.0.5',
        overview: 'Runtime status', ready: 'Native DSH plugin entry loaded',
        desktop: 'Desktop control center', desktopValue: 'UI shell is present; game runtime is not connected',
        android: 'Android companion', androidValue: 'Communication service is not connected',
        vision: 'Visual perception', visionValue: 'Not implemented',
        automation: 'Automatic gameplay', automationValue: 'Not implemented; no game actions are executed',
        pairing: 'QR device pairing', pairingHint: 'Pair an Android phone securely after the companion service is available.',
        qrUnavailable: 'QR pairing service is not connected',
        qrDetail: 'The desktop pairing service must be running locally. Set the same custom port here and in the startup script to generate a real QR code.',
        qrNote: 'No fake QR code is shown and no device is reported as connected.',
        roadmap: 'Next steps', roadmapText: 'Implement the desktop pairing service and Android companion before enabling QR generation, two-sided authentication and device status sync.',
        repo: 'View GitHub project and development progress', language: 'Language', chinese: '简体中文', english: 'English',
        summary: 'View Gamer status, language options and Android pairing progress.',
        status: 'Disconnected', noGameControl: 'This release does not control games or send keyboard, mouse or touch input.'
      }
    };

    function StatusTile({ label, value }) {
      return h('div', {
        style: { minWidth: 0, padding: '13px', borderRadius: '12px',
          background: 'var(--dsw-alias-bg-layer-2, rgba(127,127,127,.07))',
          border: '1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.18))' }
      },
        h('div', { style: { fontSize: '12px', color: 'var(--dsw-alias-label-tertiary, #888)', marginBottom: '6px' } }, label),
        h('div', { style: { fontSize: '13px', lineHeight: 1.55, fontWeight: 600 } }, value)
      );
    }

    function GamerConfig() {
      const [language, setLanguage] = React.useState('zh');
      const [pairState, setPairState] = React.useState('正在连接桌面配对服务…');
      const [qr, setQr] = React.useState('');
      const [host, setHost] = React.useState('');
      const [remaining, setRemaining] = React.useState(0);
      const [error, setError] = React.useState('');
      const [busy, setBusy] = React.useState(false);
      const [addresses, setAddresses] = React.useState([]);
      const [port, setPort] = React.useState(() => { try { return localStorage.getItem('gamer.desktop.port') || '8765'; } catch { return '8765'; } });
      const c = COPY[language];
      const validPort = /^([1-9][0-9]{0,4})$/.test(port) && Number(port) <= 65535;
      const base = 'http://127.0.0.1:' + (validPort ? port : '8765');

      const generateQr = React.useCallback(async (selectedHost) => {
        if (!selectedHost) return;
        setBusy(true); setError(''); setPairState('正在生成安全二维码…');
        try {
          const response = await fetch(base + '/api/pairing/start', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ host: selectedHost }),
            cache: 'no-store'
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || ('HTTP ' + response.status));
          if (!data.qrDataUrl || !data.expiresAt) throw new Error('桌面服务未返回有效二维码');
          setQr(data.qrDataUrl);
          setHost(data.host + ':' + data.port);
          setRemaining(Math.max(0, Math.floor((data.expiresAt - Date.now()) / 1000)));
          setPairState('二维码已生成 · 等待手机扫码');
        } catch (e) {
          setQr(''); setPairState('二维码生成失败'); setError(e.message || String(e));
        } finally { setBusy(false); }
      }, [base]);

      const detectAndGenerate = React.useCallback(async () => {
        setBusy(true); setError(''); setPairState('正在检测桌面配对服务…');
        try {
          const response = await fetch(base + '/api/network/interfaces', { cache: 'no-store' });
          if (!response.ok) throw new Error('桌面配对服务返回 HTTP ' + response.status);
          const data = await response.json();
          const list = Array.isArray(data.addresses) ? data.addresses : [];
          setAddresses(list);
          if (!list.length) throw new Error('未发现可供手机访问的局域网 IPv4 地址；请让电脑和手机连接同一 Wi-Fi。');
          const selected = list[0].address;
          await generateQr(selected);
        } catch (e) {
          setQr(''); setPairState('桌面配对服务不可用');
          setError((e.message || String(e)) + '。请先在电脑运行 Gamer 桌面端启动脚本，并确认本机端口 ' + port + ' 可用；如修改端口，请确保启动脚本与此处填写一致。');
          setBusy(false);
        }
      }, [generateQr, base]);

      React.useEffect(() => {
        let alive = true;
        const boot = async () => { if (alive) await detectAndGenerate(); };
        boot();
        return () => { alive = false; };
      }, [detectAndGenerate]);

      React.useEffect(() => {
        if (!qr || remaining <= 0) return undefined;
        const timer = setInterval(() => setRemaining(value => Math.max(0, value - 1)), 1000);
        return () => clearInterval(timer);
      }, [qr, remaining > 0]);

      React.useEffect(() => {
        if (qr && remaining === 0) {
          setQr('');
          setPairState('二维码已过期，正在自动刷新…');
          const address = host.split(':')[0];
          if (address) generateQr(address);
        }
      }, [remaining, qr, host, generateQr]);

      const revoke = async () => {
        try {
          await fetch(base + '/api/pairing/stop', { method: 'POST' });
          setQr(''); setRemaining(0); setPairState('二维码已撤销');
        } catch (e) { setError('撤销失败：' + (e.message || String(e))); }
      };

      return h('section', { style: { display: 'flex', flexDirection: 'column', gap: '18px', width: '100%', color: 'var(--dsw-alias-label-primary, inherit)' } },
        h('header', { style: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' } },
          h('div', null,
            h('div', { style: { fontSize: '19px', fontWeight: 700 } }, c.title),
            h('div', { style: { marginTop: '5px', fontSize: '12px', color: 'var(--dsw-alias-label-tertiary, #888)' } }, c.subtitle),
            h('div', { style: { marginTop: '5px', fontSize: '11px', color: 'var(--dsw-alias-label-tertiary, #888)' } }, '版本 1.0.2')
          ),
          h('div', { role: 'group', 'aria-label': c.language, style: { display: 'flex', gap: '4px', padding: '3px', borderRadius: '10px', background: 'var(--dsw-alias-bg-layer-2, rgba(127,127,127,.08))' } },
            ...[['zh', c.chinese], ['en', c.english]].map(([key, label]) => h('button', {
              key, type: 'button', onClick: () => setLanguage(key), 'aria-pressed': language === key,
              style: { border: 0, borderRadius: '7px', padding: '7px 10px', cursor: 'pointer', fontSize: '12px',
                color: language === key ? 'var(--dsw-alias-label-primary, inherit)' : 'var(--dsw-alias-label-tertiary, #888)',
                background: language === key ? 'var(--dsw-alias-bg-layer-1, rgba(127,127,127,.14))' : 'transparent' }
            }, label))
          )
        ),
        h('section', { style: { display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(180px,220px)', gap: '18px', alignItems: 'center', padding: '16px', borderRadius: '14px', border: '1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.22))' } },
          h('div', { style: { minWidth: 0 } },
            h('div', { style: { fontSize: '15px', fontWeight: 700 } }, c.pairing),
            h('p', { style: { fontSize: '12px', lineHeight: 1.65, color: 'var(--dsw-alias-label-secondary, #777)' } }, '页面加载后会自动连接本机 Gamer 桌面服务并生成真实二维码。电脑与手机需要处于同一局域网。可自定义桌面服务端口，并与启动脚本中的端口保持一致。'),
            h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', margin: '10px 0' } },
            h('label', { htmlFor: 'gamer-local-port', style: { fontSize: '12px' } }, '桌面服务端口 / Desktop port'),
            h('input', { id: 'gamer-local-port', type: 'number', min: 1, max: 65535, step: 1, value: port, onChange: e => setPort(e.target.value), onBlur: () => { try { localStorage.setItem('gamer.desktop.port', port); } catch {} }, style: { width: '92px', padding: '7px 9px', borderRadius: '8px', border: '1px solid var(--dsw-alias-border-l2, #aaa)', background: 'var(--dsw-alias-bg-layer-1, transparent)', color: 'inherit' } }),
            h('button', { type: 'button', disabled: busy || !validPort, onClick: () => { try { localStorage.setItem('gamer.desktop.port', port); } catch {} detectAndGenerate(); }, style: { borderRadius: '8px', padding: '7px 10px' } }, '应用端口并重连')
          ),
          !validPort ? h('p', { role: 'alert', style: { color: '#c45b50', fontSize: '12px' } }, '端口必须是 1–65535 的整数。') : null,
          h('div', { style: { fontSize: '13px', fontWeight: 650 } }, pairState),
            host ? h('p', { style: { fontSize: '12px', color: 'var(--dsw-alias-label-secondary, #777)' } }, '电脑地址：' + host) : null,
            h('p', { style: { fontSize: '12px', color: 'var(--dsw-alias-label-secondary, #777)' } }, qr ? ('有效期：' + Math.floor(remaining / 60) + ':' + String(remaining % 60).padStart(2, '0')) : '有效期：未生成'),
            error ? h('p', { role: 'alert', style: { color: '#c45b50', fontSize: '12px', lineHeight: 1.6 } }, error) : null,
            addresses.length > 1 ? h('label', { style: { display: 'block', fontSize: '12px', marginTop: '8px' } }, '可用网络：',
              h('select', { value: host.split(':')[0], onChange: e => generateQr(e.target.value), style: { marginLeft: '6px', maxWidth: '100%' } },
                ...addresses.map(item => h('option', { key: item.address, value: item.address }, item.name + ' · ' + item.address))
              )
            ) : null,
            h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' } },
              h('button', { type: 'button', disabled: busy, onClick: detectAndGenerate, style: { border: 0, borderRadius: '8px', padding: '9px 13px', cursor: busy ? 'wait' : 'pointer' } }, busy ? '正在处理…' : '重新生成二维码'),
              h('button', { type: 'button', disabled: !qr, onClick: revoke, style: { borderRadius: '8px', padding: '9px 13px', cursor: qr ? 'pointer' : 'not-allowed' } }, '撤销二维码')
            ),
            h('p', { style: { fontSize: '11px', lineHeight: 1.55, color: 'var(--dsw-alias-label-tertiary, #888)' } }, '安全提示：二维码仅包含 5 分钟有效的一次性配对令牌，不包含模型 API Key。扫码识别不等于认证完成；Android Companion 尚未接入前不会显示已连接。')
          ),
          h('div', { style: { minHeight: '190px', borderRadius: '12px', border: '1px dashed var(--dsw-alias-border-l2, rgba(127,127,127,.35))', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px' } },
            qr ? h('img', { src: qr, alt: 'Gamer 一次性设备配对二维码', style: { width: '100%', maxWidth: '190px', imageRendering: 'pixelated' } }) : h('div', { style: { fontSize: '12px', color: 'var(--dsw-alias-label-tertiary, #888)', textAlign: 'center' } }, '等待真实二维码…'),
            h('div', { style: { fontSize: '12px', fontWeight: 650 } }, qr ? 'QR · READY' : 'QR · PENDING')
          )
        ),
        h('section', { style: { padding: '14px', borderRadius: '12px', background: 'var(--dsw-alias-bg-layer-2, rgba(127,127,127,.06))' } },
          h('div', { style: { fontSize: '13px', fontWeight: 700, marginBottom: '5px' } }, c.overview),
          h('div', { style: { fontSize: '12px', lineHeight: 1.65, color: 'var(--dsw-alias-label-secondary, #777)' } }, 'DSH 插件界面与桌面配对服务通过本机回环地址通信。若服务未启动，请先运行桌面端启动脚本。端口可在上方自定义；若仍出现 Failed to fetch，请检查服务是否运行、端口是否一致以及 DSH 是否允许本地网络访问。游戏控制、视觉识别和 Android 双端认证仍需各自运行时实现。')
        ),
        h('a', { href: 'https://github.com/sususgh/Gamer-DSH-Plugin', target: '_blank', rel: 'noreferrer',
          style: { fontSize: '12px', color: 'var(--dsw-alias-label-link, #4b91d1)', textDecoration: 'none' } }, c.repo + ' ↗')
      );
    }

    function apply(ctx) {
      ctx.slots.inject('plugins.bundle.config', () => ctx.slots.register({
        name: 'plugins.bundle.config',
        key: '@sususgh/gamer-dsh-plugin'
      }, ({ view }) => view === 'summary'
        ? h('span', null, 'Gamer · PC + Android game-agent integration')
        : h(GamerConfig)
      ));
    }

    return { inject: ['slots'], apply };
  }
});
